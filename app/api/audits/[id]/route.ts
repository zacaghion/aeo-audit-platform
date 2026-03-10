export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { runAudit } from "@/lib/audit-runner";

function findAudit(idOrSlug: string, include?: Record<string, unknown>) {
  return prisma.audit.findFirst({
    where: { OR: [{ slug: idOrSlug }, { id: idOrSlug }] },
    ...include,
  });
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const audit = await findAudit(params.id, {
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
  const audit = await findAudit(params.id, {
    include: { prompts: { include: { responses: true }, orderBy: { promptNumber: "asc" } } },
  }) as Awaited<ReturnType<typeof prisma.audit.findFirst>> & { prompts: Array<{ id: string; promptNumber: number; responses: Array<{ id: string }> }> } | null;
  if (!audit) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (audit.status === "COMPLETE") return NextResponse.json({ message: "Already complete" });

  // Clean up duplicate prompts: keep the one with the most responses per promptNumber
  const byNumber: Record<number, typeof audit.prompts> = {};
  for (const p of audit.prompts) {
    if (!byNumber[p.promptNumber]) byNumber[p.promptNumber] = [];
    byNumber[p.promptNumber].push(p);
  }
  for (const [, dupes] of Object.entries(byNumber)) {
    if (dupes.length > 1) {
      dupes.sort((a, b) => b.responses.length - a.responses.length);
      for (const dupe of dupes.slice(1)) {
        await prisma.response.deleteMany({ where: { promptId: dupe.id } });
        await prisma.prompt.delete({ where: { id: dupe.id } });
      }
    }
  }

  runAudit(audit.id).catch((e) => console.error("Resume audit failed:", e));
  return NextResponse.json({ message: "Audit resumed (duplicates cleaned)", auditId: audit.id });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const audit = await findAudit(params.id, { include: { prompts: true } }) as Awaited<ReturnType<typeof prisma.audit.findFirst>> & { prompts: Array<{ id: string }> } | null;
  if (!audit) return NextResponse.json({ error: "Not found" }, { status: 404 });
  for (const p of audit.prompts) {
    await prisma.response.deleteMany({ where: { promptId: p.id } });
  }
  await prisma.prompt.deleteMany({ where: { auditId: audit.id } });
  await prisma.audit.delete({ where: { id: audit.id } });
  return NextResponse.json({ message: "Audit deleted" });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const { status } = await req.json();
  if (!["ERROR", "COMPLETE"].includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }
  const audit = await findAudit(params.id);
  if (!audit) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await prisma.audit.update({ where: { id: audit.id }, data: { status } });
  return NextResponse.json({ message: `Audit marked as ${status}` });
}
