export const dynamic = "force-dynamic";

import Link from "next/link";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BarChart3, Plus } from "lucide-react";
import { DeleteAuditButton } from "@/components/delete-audit-button";

const statusColors: Record<string, string> = {
  PENDING: "secondary",
  GENERATING_PROMPTS: "warning",
  QUERYING: "warning",
  ANALYZING: "warning",
  BENCHMARKING: "warning",
  COMPLETE: "success",
  ERROR: "destructive",
};

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
        <Link href="/audits/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New Audit
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Audits</CardTitle>
          <CardDescription>All AEO audits across your brands</CardDescription>
        </CardHeader>
        <CardContent>
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
                return (
                  <div key={audit.id} className="flex items-center justify-between rounded-lg border p-4 transition-colors hover:bg-muted/50">
                    <Link
                      href={`/audits/${audit.id}`}
                      className="flex-1 flex items-center justify-between min-w-0"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center space-x-3">
                          <span className="font-medium">{audit.brand.name}</span>
                          <Badge variant={statusColors[audit.status] as "default"}>
                            {audit.status === "QUERYING"
                              ? `Querying ${totalResponses}/${maxResponses}`
                              : audit.status.replace("_", " ")}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {audit.brand.location ? `${audit.brand.location} · ` : ""}{audit.prompts.length} prompts &middot;{" "}
                          {new Date(audit.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      {auditSummary && (
                        <div className="text-right font-mono text-sm">
                          <div className="text-primary font-semibold">
                            {auditSummary.mentionRate as number}% mention rate
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
        </CardContent>
      </Card>
    </div>
  );
}
