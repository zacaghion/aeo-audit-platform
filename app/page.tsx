export const dynamic = "force-dynamic";

import Link from "next/link";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BarChart3, Plus, TrendingUp, Eye, Shield, AlertTriangle } from "lucide-react";

const statusColors: Record<string, string> = {
  PENDING: "secondary",
  GENERATING_PROMPTS: "warning",
  QUERYING: "warning",
  ANALYZING: "warning",
  COMPLETE: "success",
  ERROR: "destructive",
};

export default async function DashboardPage() {
  const audits = await prisma.audit.findMany({
    include: { brand: true, prompts: { include: { responses: true } } },
    orderBy: { createdAt: "desc" },
  });

  const latestComplete = audits.find((a) => a.status === "COMPLETE");
  const summary = latestComplete?.summary as Record<string, unknown> | null;
  const analysis = latestComplete?.analysis as Record<string, unknown> | null;

  const mentionRate = summary ? (summary.mentionRate as number) : null;
  const visScore = analysis
    ? ((analysis.brand_visibility as Record<string, unknown>)?.overall_score as number)
    : null;
  const sentimentScore = analysis
    ? ((analysis.sentiment_analysis as Record<string, unknown>)?.sentiment_score as number)
    : null;

  const topCompetitors = summary
    ? (summary.topCompetitors as Array<{ name: string; count: number }>)?.slice(0, 3)
    : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground mt-1">Answer Engine Optimization audits</p>
        </div>
        <Link href="/audits/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New Audit
          </Button>
        </Link>
      </div>

      {latestComplete && (
        <>
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Mention Rate</CardTitle>
                <Eye className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold font-mono">{mentionRate ?? "—"}%</div>
                <p className="text-xs text-muted-foreground mt-1">Across all providers</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Visibility Score</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold font-mono">{visScore ?? "—"}/100</div>
                <p className="text-xs text-muted-foreground mt-1">Brand visibility index</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Sentiment</CardTitle>
                <Shield className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold font-mono">{sentimentScore ?? "—"}/100</div>
                <p className="text-xs text-muted-foreground mt-1">Overall sentiment score</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Top Threat</CardTitle>
                <AlertTriangle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold font-mono truncate">
                  {topCompetitors?.[0]?.name ?? "—"}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {topCompetitors?.[0]?.count ? `${topCompetitors[0].count} mentions` : "Most mentioned competitor"}
                </p>
              </CardContent>
            </Card>
          </div>
        </>
      )}

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
                  <Link
                    key={audit.id}
                    href={`/audits/${audit.id}`}
                    className="flex items-center justify-between rounded-lg border p-4 transition-colors hover:bg-muted/50"
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
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
