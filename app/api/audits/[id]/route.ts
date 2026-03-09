export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

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
