"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useMemo } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  LabelList, CartesianGrid,
} from "recharts";
import type { AuditSummary } from "@/types";
import { PROVIDER_COLORS, getProviderColor, CHART_TOOLTIP_STYLE, CHART_ANIM, AXIS_STYLE, GRID_STYLE } from "@/lib/chart-theme";
import { INTENT_COLORS, VALID_INTENTS, hasIntentData } from "@/lib/category-utils";

function getHeatCellStyle(rate: number, providerColor: string): { backgroundColor: string; textClass: string } {
  if (rate === 0) return { backgroundColor: "#1F2937", textClass: "text-gray-600" };
  let opacityHex: string;
  if (rate >= 100) opacityHex = "FF";
  else if (rate >= 75) opacityHex = "CC";
  else if (rate >= 50) opacityHex = "99";
  else if (rate >= 25) opacityHex = "66";
  else opacityHex = "33";
  return { backgroundColor: `${providerColor}${opacityHex}`, textClass: "text-white" };
}

interface Props {
  audit: {
    summary: AuditSummary | null;
    prompts: Array<{
      category: string;
      intent?: string;
      responses: Array<{
        provider: string;
        brandMentioned: boolean;
        competitorsMentioned: string[];
        status?: string;
      }>;
    }>;
  };
}

export { OverviewTab as OverviewSection };
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
      {/* ── Heatmap ── */}
      <div className="bg-[#111827] border border-[#1F2937] rounded-xl p-6">
        <p className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-1">Performance</p>
        <h3 className="text-xl font-semibold text-white mb-4">Category × Provider Heatmap</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className="text-left p-2 font-medium text-gray-400">Category</th>
                {providers.map((p) => (
                  <th key={p} className="p-2 text-center font-medium capitalize text-gray-400">
                    <span className="inline-flex items-center justify-center">
                      <span className="inline-block w-2 h-2 rounded-full mr-1.5" style={{ backgroundColor: PROVIDER_COLORS[p] || '#6366F1' }} />
                      {p}
                    </span>
                  </th>
                ))}
                <th className="p-2 text-center font-medium text-gray-400">
                  <span className="inline-flex items-center justify-center">
                    <span className="inline-block w-2 h-2 rounded-full mr-1.5" style={{ backgroundColor: '#6366F1' }} />
                    Overall
                  </span>
                </th>
              </tr>
            </thead>
            <tbody>
              {categories.map((cat) => (
                <tr key={cat} className="border-t border-[#1F2937]">
                  <td className="p-2 font-medium text-white">{cat}</td>
                  {providers.map((prov) => {
                    const rate = summary.crossTab?.[cat]?.[prov] ?? 0;
                    const providerColor = getProviderColor(prov);
                    const cellStyle = getHeatCellStyle(rate, providerColor);
                    return (
                      <td key={prov} className="p-2 text-center">
                        <span
                          className={`inline-block rounded-md px-2 py-1 font-mono text-xs font-medium ${cellStyle.textClass}`}
                          style={{ backgroundColor: cellStyle.backgroundColor }}
                          title={`${cat} on ${prov}: ${rate}%`}
                        >
                          {rate}%
                        </span>
                      </td>
                    );
                  })}
                  <td className="p-2 text-center">
                    {(() => {
                      const rate = summary.mentionRateByCategory[cat] || 0;
                      const cellStyle = getHeatCellStyle(rate, "#6366F1");
                      return (
                        <span
                          className={`inline-block rounded-md px-2 py-1 font-mono text-xs font-medium ${cellStyle.textClass}`}
                          style={{ backgroundColor: cellStyle.backgroundColor }}
                          title={`${cat} on Overall: ${rate}%`}
                        >
                          {rate}%
                        </span>
                      );
                    })()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Radar + Visibility ── */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card className="bg-[#111827] border border-[#1F2937] rounded-xl">
          <CardHeader>
            <CardTitle className="text-base text-white">Category Coverage</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <RadarChart data={categories.map((cat) => ({ category: cat, rate: summary.mentionRateByCategory[cat] || 0 }))}>
                <PolarGrid stroke="#1F2937" />
                <PolarAngleAxis dataKey="category" tick={{ fontSize: 11, fill: "#6B7280" }} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 10, fill: "#6B7280" }} />
                <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
                <Radar dataKey="rate" stroke="#6366f1" fill="#6366f1" fillOpacity={0.3} {...CHART_ANIM} />
              </RadarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card className="bg-[#111827] border border-[#1F2937] rounded-xl">
          <CardHeader>
            <CardTitle className="text-base text-white">Visibility by Provider</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={providers.map((p) => ({ provider: p, rate: summary.mentionRateByProvider?.[p] ?? 0 }))}>
                <CartesianGrid {...GRID_STYLE} />
                <XAxis dataKey="provider" {...AXIS_STYLE} />
                <YAxis domain={[0, 100]} {...AXIS_STYLE} />
                <Tooltip contentStyle={CHART_TOOLTIP_STYLE} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
                <Bar dataKey="rate" radius={[4, 4, 0, 0]} {...CHART_ANIM} barSize={40}>
                  <LabelList position="top" fill="#fff" fontSize={11} fontWeight={600} />
                  {providers.map((p) => (
                    <Cell key={p} fill={getProviderColor(p)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* ── Competitor Mentions ── */}
      <Card className="bg-[#111827] border border-[#1F2937] rounded-xl">
        <CardHeader>
          <CardTitle className="text-base text-white">Competitor Mentions</CardTitle>
        </CardHeader>
        <CardContent>
          {competitorData.length > 0 ? (
            <ResponsiveContainer width="100%" height={Math.max(300, competitorData.length * 30)}>
              <BarChart data={competitorData} layout="vertical" margin={{ left: 160 }}>
                <CartesianGrid {...GRID_STYLE} />
                <XAxis type="number" {...AXIS_STYLE} />
                <YAxis type="category" dataKey="name" width={150} {...AXIS_STYLE} />
                <Tooltip contentStyle={CHART_TOOLTIP_STYLE} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
                <Bar dataKey="count" radius={[0, 4, 4, 0]} {...CHART_ANIM} barSize={40}>
                  <LabelList position="top" fill="#fff" fontSize={11} fontWeight={600} />
                  {competitorData.map((_, i) => (
                    <Cell key={i} fill={`hsl(226, 70%, ${55 + i * 2}%)`} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-gray-500 text-center py-8">No competitor data</p>
          )}
        </CardContent>
      </Card>

      {/* ── Mention Rate + Summary ── */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card className="bg-[#111827] border border-[#1F2937] rounded-xl">
          <CardHeader>
            <CardTitle className="text-base text-white">Mention Rate by Provider</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {providers.map((p) => {
                const rate = summary.mentionRateByProvider?.[p] ?? 0;
                return (
                  <div key={p} className="flex items-center gap-3">
                    <span className="w-24 text-sm capitalize text-gray-300">{p}</span>
                    <div className="flex-1 h-4 rounded-full bg-[#1F2937] overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width: `${rate}%`, backgroundColor: getProviderColor(p) }} />
                    </div>
                    <span className="font-mono text-sm w-12 text-right text-white">{rate}%</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
        <Card className="bg-[#111827] border border-[#1F2937] rounded-xl">
          <CardHeader>
            <CardTitle className="text-base text-white">Summary Stats</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between"><dt className="text-gray-400">Total Prompts</dt><dd className="font-mono text-white">{summary.totalPrompts}</dd></div>
              <div className="flex justify-between"><dt className="text-gray-400">Total Responses</dt><dd className="font-mono text-white">{summary.totalResponses}</dd></div>
              <div className="flex justify-between"><dt className="text-gray-400">Overall Mention Rate</dt><dd className="font-mono text-white">{summary.mentionRate}%</dd></div>
              <div className="flex justify-between"><dt className="text-gray-400">Avg Answer Length</dt><dd className="font-mono text-white">{summary.avgAnswerLength?.toLocaleString()} chars</dd></div>
              <div className="flex justify-between"><dt className="text-gray-400">Providers Queried</dt><dd className="font-mono text-white">{providers.length}</dd></div>
            </dl>
          </CardContent>
        </Card>
      </div>

      {/* Intent Performance (only for audits with intent data) */}
      {hasIntentData(audit.prompts) && (() => {
        const intentData = VALID_INTENTS.map((intent) => {
          let total = 0, mentioned = 0;
          for (const p of audit.prompts) {
            if (p.intent?.toLowerCase() !== intent) continue;
            for (const r of p.responses) {
              if (r.status && r.status !== "success") continue;
              total++;
              if (r.brandMentioned) mentioned++;
            }
          }
          return { intent, rate: total > 0 ? Math.round((mentioned / total) * 100) : 0 };
        });
        return (
          <Card className="bg-[#111827] border border-[#1F2937] rounded-xl">
            <CardHeader>
              <CardTitle className="text-base text-white">Intent Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={intentData} layout="vertical" margin={{ left: 90, right: 16 }}>
                  <CartesianGrid {...GRID_STYLE} />
                  <XAxis type="number" domain={[0, 100]} {...AXIS_STYLE} />
                  <YAxis type="category" dataKey="intent" {...AXIS_STYLE} tick={{ fontSize: 11, fill: "#9CA3AF" }} width={85} />
                  <Tooltip contentStyle={CHART_TOOLTIP_STYLE} formatter={(v: number) => [`${v}%`, "Mention Rate"]} />
                  <Bar dataKey="rate" radius={[0, 4, 4, 0]} barSize={20} {...CHART_ANIM}>
                    {intentData.map((d) => (
                      <Cell key={d.intent} fill={INTENT_COLORS[d.intent] || "#6B7280"} />
                    ))}
                    <LabelList position="right" fill="#fff" fontSize={11} fontWeight={600} formatter={(v: number) => `${v}%`} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        );
      })()}
    </div>
  );
}
