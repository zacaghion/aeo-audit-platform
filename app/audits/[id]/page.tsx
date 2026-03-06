import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import { AuditDetail } from "./audit-detail";

export default async function AuditDetailPage({ params }: { params: { id: string } }) {
  const audit = await prisma.audit.findUnique({
    where: { id: params.id },
    include: {
      hotel: true,
      prompts: {
        orderBy: { promptNumber: "asc" },
        include: { responses: true },
      },
    },
  });

  if (!audit) notFound();

  return <AuditDetail audit={JSON.parse(JSON.stringify(audit))} />;
}
