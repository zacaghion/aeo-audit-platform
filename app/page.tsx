export const dynamic = "force-dynamic";

import Link from "next/link";
import { prisma } from "@/lib/db";
import { BarChart3, Plus } from "lucide-react";
import { DeleteAuditButton } from "@/components/delete-audit-button";

function StatusBadge({ status, totalResponses, maxResponses }: { status: string; totalResponses: number; maxResponses: number }) {
  const label = status === "QUERYING"
    ? `Querying ${totalResponses}/${maxResponses}`
    : status.replace("_", " ");

  if (status === "COMPLETE") {
    return (
      <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-medium rounded-full px-2.5 py-0.5">
        {label}
      </span>
    );
  }
  if (status === "ERROR") {
    return (
      <span className="bg-red-500/10 text-red-400 border border-red-500/20 text-xs font-medium rounded-full px-2.5 py-0.5">
        {label}
      </span>
    );
  }
  return (
    <span className="bg-amber-500/10 text-amber-400 border border-amber-500/20 text-xs font-medium rounded-full px-2.5 py-0.5">
      {label}
    </span>
  );
}

export default async function DashboardPage() {
  const audits = await prisma.audit.findMany({
    include: { brand: true, prompts: { include: { responses: true } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Audits</h1>
          <p className="text-muted-foreground mt-1">Answer Engine Optimization audits</p>
        </div>
        <Link href="/audits/new" className="bg-indigo-500 hover:bg-indigo-600 text-white font-semibold px-6 py-3 rounded-xl shadow-lg transition-colors inline-flex items-center">
          <Plus className="mr-2 h-4 w-4" />
          New Audit
        </Link>
      </div>

      <div className="bg-[#111827] border border-[#1F2937] rounded-xl">
        <div className="p-6">
          <h2 className="text-lg font-semibold">Recent Audits</h2>
          <p className="text-sm text-muted-foreground">All AEO audits across your brands</p>
        </div>
        <div className="px-6 pb-6">
          {audits.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No audits yet. Create your first audit to get started.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {audits.map((audit) => {
                const totalResponses = audit.prompts.reduce((s, p) => s + p.responses.length, 0);
                const maxResponses = audit.prompts.length * 5;
                const auditSummary = audit.summary as Record<string, unknown> | null;
                const mentionRate = auditSummary ? (auditSummary.mentionRate as number) : 0;
                return (
                  <div key={audit.id} className="flex items-center justify-between rounded-lg border border-[#1F2937] p-4 hover:-translate-y-0.5 hover:shadow-lg transition-all duration-200">
                    <Link
                      href={`/audits/${audit.slug || audit.id}`}
                      className="flex-1 flex items-center justify-between min-w-0"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center space-x-3">
                          <span className="font-medium">{audit.brand.name}</span>
                          <StatusBadge status={audit.status} totalResponses={totalResponses} maxResponses={maxResponses} />
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {audit.brand.location ? `${audit.brand.location} · ` : ""}{audit.prompts.length} prompts &middot;{" "}
                          {new Date(audit.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      {auditSummary && (
                        <div className="text-right font-mono text-sm">
                          <div className="flex items-center gap-2 justify-end">
                            <span className="text-primary font-semibold">
                              {mentionRate}% mention rate
                            </span>
                            <div className="w-24 h-1.5 rounded-full bg-[#1F2937] overflow-hidden">
                              <div className="h-full rounded-full bg-emerald-500" style={{ width: `${mentionRate}%` }} />
                            </div>
                          </div>
                          <div className="text-muted-foreground">
                            {(auditSummary.providersQueried as string[])?.length ?? 0} providers
                          </div>
                        </div>
                      )}
                    </Link>
                    <div className="ml-3">
                      <DeleteAuditButton auditId={audit.id} brandName={audit.brand.name} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
