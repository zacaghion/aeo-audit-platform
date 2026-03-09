export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { runAudit } from "@/lib/audit-runner";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const audit = await prisma.audit.findUnique({
    where: { id: params.id },
    include: {
      brand: true,
      prompts: {
        orderBy: { promptNumber: "asc" },
        include: { responses: true },
      },
    },
  });
  if (!audit) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(audit);
}

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const audit = await prisma.audit.findUnique({ where: { id: params.id } });
  if (!audit) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (audit.status === "COMPLETE") return NextResponse.json({ message: "Already complete" });

  runAudit(audit.id).catch((e) => console.error("Resume audit failed:", e));
  return NextResponse.json({ message: "Audit resumed", auditId: audit.id });
}
