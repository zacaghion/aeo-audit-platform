export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: Record<string, unknown>) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      let lastStatus = "";
      let lastCount = 0;

      const check = async () => {
        try {
          const audit = await prisma.audit.findUnique({
            where: { id: params.id },
            include: {
              prompts: {
                include: {
                  responses: { select: { provider: true, status: true } },
                },
              },
            },
          });

          if (!audit) {
            send({ error: "Audit not found" });
            controller.close();
            return false;
          }

          const allResponses = audit.prompts.flatMap((p) => p.responses);
          const totalResponses = allResponses.length;

          // Provider-level breakdown
          const providerProgress: Record<string, { total: number; errors: number }> = {};
          for (const r of allResponses) {
            if (!providerProgress[r.provider]) {
              providerProgress[r.provider] = { total: 0, errors: 0 };
            }
            providerProgress[r.provider].total++;
            if (r.status === "error") providerProgress[r.provider].errors++;
          }

          const config = audit.config as { providers?: string[] } | null;
          const expectedProviders = config?.providers?.length || 1;

          if (audit.status !== lastStatus || totalResponses !== lastCount) {
            lastStatus = audit.status;
            lastCount = totalResponses;
            send({
              status: audit.status,
              totalPrompts: audit.prompts.length,
              totalResponses,
              maxResponses: audit.prompts.length * expectedProviders,
              providerProgress,
            });
          }

          if (audit.status === "COMPLETE" || audit.status === "ERROR") {
            controller.close();
            return false;
          }
          return true;
        } catch {
          controller.close();
          return false;
        }
      };

      const poll = async () => {
        const shouldContinue = await check();
        if (shouldContinue) setTimeout(poll, 2000);
      };

      await poll();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
