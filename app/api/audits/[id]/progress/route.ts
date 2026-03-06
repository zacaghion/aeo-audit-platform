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
            include: { prompts: { include: { _count: { select: { responses: true } } } } },
          });

          if (!audit) {
            send({ error: "Audit not found" });
            controller.close();
            return false;
          }

          const totalResponses = audit.prompts.reduce((s, p) => s + p._count.responses, 0);

          if (audit.status !== lastStatus || totalResponses !== lastCount) {
            lastStatus = audit.status;
            lastCount = totalResponses;
            send({
              status: audit.status,
              totalPrompts: audit.prompts.length,
              totalResponses,
              maxResponses: audit.prompts.length * 5,
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
