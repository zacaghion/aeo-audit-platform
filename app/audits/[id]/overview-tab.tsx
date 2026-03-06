"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import type { AuditSummary } from "@/types";

const PROVIDER_COLORS: Record<string, string> = {
  claude: "#8b5cf6",
  chatgpt: "#10b981",
  perplexity: "#3b82f6",
  gemini: "#f59e0b",
  grok: "#ef4444",
};

const HEATMAP_COLORS = [
  "bg-red-900/50", "bg-red-800/50", "bg-orange-700/50", "bg-amber-600/50",
  "bg-yellow-500/50", "bg-lime-500/50", "bg-green-500/50", "bg-emerald-500/50",
];

function getHeatColor(rate: number): string {
  const idx = Math.min(Math.floor(rate / 12.5), 7);
  return HEATMAP_COLORS[idx];
}

interface Props {
  audit: {
    summary: AuditSummary | null;
    prompts: Array<{
      category: string;
      responses: Array<{
        provider: string;
        hotelMentioned: boolean;
        competitorsMentioned: string[];
      }>;
    }>;
  };
}

export function OverviewTab({ audit }: Props) {
  const summary = audit.summary;

  const competitorData = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const p of audit.prompts) {
      for (const r of p.responses) {
        const comps = r.competitorsMentioned as string[];
        for (const c of comps) {
          counts[c] = (counts[c] || 0) + 1;
        }
      }
    }
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15)
      .map(([name, count]) => ({ name, count }));
  }, [audit.prompts]);

  if (!summary) {
    return <div className="py-12 text-center text-muted-foreground">Audit in progress...</div>;
  }

  const categories = Object.keys(summary.mentionRateByCategory || {});
  const providers = summary.providersQueried || [];

  return (
    <div className="space-y-6 mt-4">
      <Card>
        <CardHeader><CardTitle>Category x Provider Heatmap</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th className="text-left p-2 font-medium text-muted-foreground">Category</th>
                  {providers.map((p) => (
                    <th key={p} className="p-2 text-center font-medium capitalize text-muted-foreground">{p}</th>
                  ))}
                  <th className="p-2 text-center font-medium text-muted-foreground">Overall</th>
                </tr>
              </thead>
              <tbody>
                {categories.map((cat) => (
                  <tr key={cat} className="border-t border-border/50">
                    <td className="p-2 font-medium">{cat}</td>
                    {providers.map((prov) => {
                      const rate = summary.crossTab?.[cat]?.[prov] ?? 0;
                      return (
                        <td key={prov} className="p-2 text-center">
                          <span className={`inline-block rounded px-2 py-1 font-mono text-xs ${getHeatColor(rate)}`}>
                            {rate}%
                          </span>
                        </td>
                      );
                    })}
                    <td className="p-2 text-center">
                      <span className={`inline-block rounded px-2 py-1 font-mono text-xs font-semibold ${getHeatColor(summary.mentionRateByCategory[cat] || 0)}`}>
                        {summary.mentionRateByCategory[cat] || 0}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Competitor Mentions</CardTitle></CardHeader>
        <CardContent>
          {competitorData.length > 0 ? (
            <ResponsiveContainer width="100%" height={Math.max(300, competitorData.length * 30)}>
              <BarChart data={competitorData} layout="vertical" margin={{ left: 160 }}>
                <XAxis type="number" />
                <YAxis type="category" dataKey="name" width={150} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                  {competitorData.map((_, i) => (
                    <Cell key={i} fill={`hsl(226, 70%, ${55 + i * 2}%)`} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-muted-foreground text-center py-8">No competitor data</p>
          )}
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-base">Mention Rate by Provider</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              {providers.map((p) => {
                const rate = summary.mentionRateByProvider?.[p] ?? 0;
                return (
                  <div key={p} className="flex items-center gap-3">
                    <span className="w-24 text-sm capitalize">{p}</span>
                    <div className="flex-1 h-4 rounded-full bg-secondary overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width: `${rate}%`, backgroundColor: PROVIDER_COLORS[p] || "#6366f1" }} />
                    </div>
                    <span className="font-mono text-sm w-12 text-right">{rate}%</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Summary Stats</CardTitle></CardHeader>
          <CardContent>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between"><dt className="text-muted-foreground">Total Prompts</dt><dd className="font-mono">{summary.totalPrompts}</dd></div>
              <div className="flex justify-between"><dt className="text-muted-foreground">Total Responses</dt><dd className="font-mono">{summary.totalResponses}</dd></div>
              <div className="flex justify-between"><dt className="text-muted-foreground">Overall Mention Rate</dt><dd className="font-mono">{summary.mentionRate}%</dd></div>
              <div className="flex justify-between"><dt className="text-muted-foreground">Avg Answer Length</dt><dd className="font-mono">{summary.avgAnswerLength?.toLocaleString()} chars</dd></div>
              <div className="flex justify-between"><dt className="text-muted-foreground">Providers Queried</dt><dd className="font-mono">{providers.length}</dd></div>
            </dl>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
