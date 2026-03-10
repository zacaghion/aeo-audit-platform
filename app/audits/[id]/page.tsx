export const dynamic = "force-dynamic";

import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import { AuditDetail } from "./audit-detail";
import { AuditProgress } from "./audit-progress";

export default async function AuditDetailPage({ params }: { params: { id: string } }) {
  const audit = await prisma.audit.findFirst({
    where: { OR: [{ slug: params.id }, { id: params.id }] },
    include: {
      brand: true,
      prompts: {
        orderBy: { promptNumber: "asc" },
        include: { responses: true },
      },
    },
  });

  if (!audit) notFound();

  const data = JSON.parse(JSON.stringify(audit));

  if (audit.status !== "COMPLETE" && audit.status !== "ERROR") {
    return <AuditProgress audit={data} />;
  }

  return <AuditDetail audit={data} />;
}
