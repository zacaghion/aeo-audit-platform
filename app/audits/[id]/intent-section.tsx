"use client";

import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend,
} from "recharts";
import { INTENT_COLORS, VALID_INTENTS, hasIntentData, intentBadgeClass } from "@/lib/category-utils";
import { CHART_TOOLTIP_STYLE, CHART_ANIM, AXIS_STYLE, GRID_STYLE } from "@/lib/chart-theme";
import { cn } from "@/lib/utils";

interface PromptData {
  promptNumber: number;
  promptText: string;
  category: string;
  intent?: string;
  responses: Array<{
    provider: string;
    brandMentioned: boolean;
    mentionPosition: string | null;
    status: string;
  }>;
}

const POSITION_MAP: Record<string, number> = { "1st": 1, "2nd": 2, "3rd": 3, "4th": 4, "5th+": 5, "passing": 6 };

function avgPosition(responses: Array<{ mentionPosition: string | null; brandMentioned: boolean }>): string {
  const positions = responses
    .filter((r) => r.brandMentioned && r.mentionPosition)
    .map((r) => POSITION_MAP[r.mentionPosition!] || 6);
  if (positions.length === 0) return "--";
  const avg = positions.reduce((a, b) => a + b, 0) / positions.length;
  return avg.toFixed(1);
}

function getHeatCellStyle(rate: number, color: string): { backgroundColor: string; textClass: string } {
  if (rate === 0) return { backgroundColor: "#1F2937", textClass: "text-gray-600" };
  const opacity = Math.min(0.15 + (rate / 100) * 0.6, 0.75);
  return { backgroundColor: `${color}${Math.round(opacity * 255).toString(16).padStart(2, "0")}`, textClass: "text-white" };
}

export function IntentSection({ prompts }: { prompts: PromptData[] }) {
  const [activeQueryTab, setActiveQueryTab] = useState("discovery");

  const showIntent = hasIntentData(prompts);

  const intentStats = useMemo(() => {
    if (!showIntent) return [];
    const stats: Record<string, { total: number; mentioned: number; positions: number[] }> = {};
    for (const intent of VALID_INTENTS) {
      stats[intent] = { total: 0, mentioned: 0, positions: [] };
    }
    for (const p of prompts) {
      const intent = p.intent?.toLowerCase();
      if (!intent || !stats[intent]) continue;
      const successes = p.responses.filter((r) => r.status === "success");
      for (const r of successes) {
        stats[intent].total++;
        if (r.brandMentioned) {
          stats[intent].mentioned++;
          if (r.mentionPosition) stats[intent].positions.push(POSITION_MAP[r.mentionPosition] || 6);
        }
      }
    }
    return VALID_INTENTS.map((intent) => {
      const s = stats[intent];
      return {
        intent,
        promptCount: prompts.filter((p) => p.intent?.toLowerCase() === intent).length,
        total: s.total,
        mentioned: s.mentioned,
        mentionRate: s.total > 0 ? Math.round((s.mentioned / s.total) * 100) : 0,
        avgPos: s.positions.length > 0 ? (s.positions.reduce((a, b) => a + b, 0) / s.positions.length).toFixed(1) : "--",
      };
    }).sort((a, b) => a.mentionRate - b.mentionRate);
  }, [prompts, showIntent]);

  const providers = useMemo(() => {
    return Array.from(new Set(prompts.flatMap((p) => p.responses.map((r) => r.provider))));
  }, [prompts]);

  const heatmapData = useMemo(() => {
    if (!showIntent) return [];
    return VALID_INTENTS.map((intent) => {
      const intentPrompts = prompts.filter((p) => p.intent?.toLowerCase() === intent);
      const providerRates: Record<string, number> = {};
      let totalAll = 0, mentionedAll = 0;
      for (const prov of providers) {
        let total = 0, mentioned = 0;
        for (const p of intentPrompts) {
          for (const r of p.responses.filter((r) => r.provider === prov && r.status === "success")) {
            total++; totalAll++;
            if (r.brandMentioned) { mentioned++; mentionedAll++; }
          }
        }
        providerRates[prov] = total > 0 ? Math.round((mentioned / total) * 100) : 0;
      }
      return { intent, providerRates, overall: totalAll > 0 ? Math.round((mentionedAll / totalAll) * 100) : 0 };
    });
  }, [prompts, providers, showIntent]);

  const categoryIntentData = useMemo(() => {
    if (!showIntent) return [];
    const categories = Array.from(new Set(prompts.map((p) => p.category)));
    return categories.map((cat) => {
      const catPrompts = prompts.filter((p) => p.category === cat);
      const row: Record<string, number> = { name: 0 };
      for (const intent of VALID_INTENTS) {
        row[intent] = catPrompts.filter((p) => p.intent?.toLowerCase() === intent).length;
      }
      return { name: cat, ...row };
    });
  }, [prompts, showIntent]);

  const insights = useMemo(() => {
    if (intentStats.length === 0) return [];
    const sorted = [...intentStats].sort((a, b) => a.mentionRate - b.mentionRate);
    const weakest = sorted[0];
    const strongest = sorted[sorted.length - 1];
    const lines: string[] = [];

    if (weakest && weakest.mentionRate < 50) {
      const desc = weakest.intent === "transactional"
        ? "these are high-intent queries where buyers are ready to act. Improving visibility here has the highest revenue impact."
        : weakest.intent === "discovery"
        ? "you're not being recommended to new prospects exploring options."
        : weakest.intent === "comparison"
        ? "users comparing alternatives aren't finding you. See the Competitive tab for details."
        : "users looking for your brand directly may not be finding you consistently.";
      lines.push(`${weakest.intent.charAt(0).toUpperCase() + weakest.intent.slice(1)} queries have the lowest mention rate at ${weakest.mentionRate}% -- ${desc}`);
    }
    if (strongest) {
      lines.push(`Your brand is strongest on ${strongest.intent} queries (${strongest.mentionRate}%).`);
    }
    const overall = intentStats.reduce((a, b) => a + b.mentioned, 0) / Math.max(intentStats.reduce((a, b) => a + b.total, 0), 1) * 100;
    const belowAvg = intentStats.filter((s) => s.mentionRate < overall);
    if (belowAvg.length > 0) {
      lines.push(`${belowAvg.map((s) => s.intent).join(" and ")} queries are below your overall ${Math.round(overall)}% average.`);
    }
    return lines;
  }, [intentStats]);

  const queryDataByIntent = useMemo(() => {
    if (!showIntent) return {};
    const result: Record<string, { strongest: typeof prompts; weakest: typeof prompts }> = {};
    for (const intent of VALID_INTENTS) {
      const intentPrompts = prompts.filter((p) => p.intent?.toLowerCase() === intent);
      const scored = intentPrompts.map((p) => {
        const successes = p.responses.filter((r) => r.status === "success");
        const mentioned = successes.filter((r) => r.brandMentioned);
        return { ...p, rate: successes.length > 0 ? mentioned.length / successes.length : 0 };
      });
      const sorted = scored.sort((a, b) => b.rate - a.rate);
      result[intent] = {
        strongest: sorted.filter((p) => p.rate > 0).slice(0, 5),
        weakest: sorted.filter((p) => p.rate === 0).slice(0, 5),
      };
    }
    return result;
  }, [prompts, showIntent]);

  if (!showIntent) {
    return (
      <Card className="bg-[#111827] border border-[#1F2937] rounded-xl">
        <CardContent className="py-12 text-center">
          <p className="text-gray-400 text-lg">No intent data available</p>
          <p className="text-gray-500 text-sm mt-2">Run a new audit to see intent analysis.</p>
        </CardContent>
      </Card>
    );
  }

  const pieData = intentStats.map((s) => ({ name: s.intent, value: s.promptCount }));
  const totalPromptCount = pieData.reduce((a, b) => a + b.value, 0);
  const lowestMentionIntent = intentStats[0]?.intent;

  return (
    <div className="space-y-6">
      {/* Row 1: Distribution + Performance Table */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card className="bg-[#111827] border border-[#1F2937] rounded-xl">
          <CardHeader>
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">Query Intent Distribution</p>
            <CardTitle className="text-base">How prompts break down by commercial intent</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center">
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={2} {...CHART_ANIM}>
                  {pieData.map((d) => (
                    <Cell key={d.name} fill={INTENT_COLORS[d.name] || "#6B7280"} />
                  ))}
                </Pie>
                <Tooltip contentStyle={CHART_TOOLTIP_STYLE} formatter={(value: number, name: string) => [`${value} prompts`, name]} />
                <text x="50%" y="48%" textAnchor="middle" fill="#fff" fontSize={28} fontWeight={700}>{totalPromptCount}</text>
                <text x="50%" y="58%" textAnchor="middle" fill="#6B7280" fontSize={12}>prompts</text>
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-wrap gap-3 mt-2">
              {pieData.map((d) => (
                <div key={d.name} className="flex items-center gap-1.5 text-xs">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: INTENT_COLORS[d.name] }} />
                  <span className="text-gray-400 capitalize">{d.name}</span>
                  <span className="text-gray-500">{d.value} ({totalPromptCount > 0 ? Math.round((d.value / totalPromptCount) * 100) : 0}%)</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[#111827] border border-[#1F2937] rounded-xl">
          <CardHeader>
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">Intent Performance</p>
            <CardTitle className="text-base">Mention rate by query intent</CardTitle>
          </CardHeader>
          <CardContent>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-500 text-xs">
                  <th className="text-left pb-2">Intent</th>
                  <th className="text-right pb-2">Prompts</th>
                  <th className="text-right pb-2">Mentioned</th>
                  <th className="text-right pb-2">Rate</th>
                  <th className="text-right pb-2">Avg Pos</th>
                </tr>
              </thead>
              <tbody>
                {intentStats.map((s) => (
                  <tr key={s.intent} className={cn("border-t border-[#1F2937]", s.intent === lowestMentionIntent && "bg-red-500/5")}>
                    <td className="py-2">
                      <Badge className={`text-xs capitalize ${intentBadgeClass(s.intent)}`}>{s.intent}</Badge>
                    </td>
                    <td className="text-right text-gray-400 py-2">{s.promptCount}</td>
                    <td className="text-right text-gray-400 py-2">{s.mentioned}</td>
                    <td className={cn("text-right font-mono py-2", s.intent === lowestMentionIntent ? "text-red-400 font-semibold" : "text-white")}>{s.mentionRate}%</td>
                    <td className="text-right font-mono text-gray-400 py-2">{s.avgPos}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>

      {/* Row 2: Intent x Provider Heatmap */}
      <Card className="bg-[#111827] border border-[#1F2937] rounded-xl">
        <CardHeader>
          <CardTitle>Intent x Provider Heatmap</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className="text-left text-gray-400 text-xs pb-2 pr-4">Intent</th>
                {providers.map((prov) => (
                  <th key={prov} className="text-center text-gray-400 text-xs pb-2 px-2 capitalize">{prov}</th>
                ))}
                <th className="text-center text-gray-400 text-xs pb-2 px-2">Overall</th>
              </tr>
            </thead>
            <tbody>
              {heatmapData.map((row) => (
                <tr key={row.intent}>
                  <td className="py-1.5 pr-4 capitalize text-gray-300 text-sm">{row.intent}</td>
                  {providers.map((prov) => {
                    const rate = row.providerRates[prov] || 0;
                    const style = getHeatCellStyle(rate, INTENT_COLORS[row.intent] || "#6B7280");
                    return (
                      <td key={prov} className="py-1.5 px-2 text-center" title={`${row.intent} on ${prov}: ${rate}%`}>
                        <span className={cn("inline-block rounded px-2 py-0.5 text-xs font-mono", style.textClass)} style={{ backgroundColor: style.backgroundColor }}>
                          {rate}%
                        </span>
                      </td>
                    );
                  })}
                  <td className="py-1.5 px-2 text-center">
                    <span className={cn("inline-block rounded px-2 py-0.5 text-xs font-mono font-semibold", getHeatCellStyle(row.overall, INTENT_COLORS[row.intent] || "#6B7280").textClass)} style={{ backgroundColor: getHeatCellStyle(row.overall, INTENT_COLORS[row.intent] || "#6B7280").backgroundColor }}>
                      {row.overall}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Row 3: Cross-analysis + Insights */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card className="bg-[#111827] border border-[#1F2937] rounded-xl">
          <CardHeader>
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">Intent by Category</p>
            <CardTitle className="text-base">How intent distributes across prompt categories</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={categoryIntentData} margin={{ top: 16, right: 16, bottom: 0, left: 0 }}>
                <CartesianGrid {...GRID_STYLE} />
                <XAxis dataKey="name" {...AXIS_STYLE} />
                <YAxis {...AXIS_STYLE} />
                <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
                {VALID_INTENTS.map((intent) => (
                  <Bar key={intent} dataKey={intent} stackId="a" fill={INTENT_COLORS[intent]} radius={0} {...CHART_ANIM} />
                ))}
                <Legend wrapperStyle={{ fontSize: 11 }} formatter={(v: string) => v.charAt(0).toUpperCase() + v.slice(1)} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="bg-[#111827] border border-[#1F2937] rounded-xl">
          <CardHeader>
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">Key Insights</p>
            <CardTitle className="text-base">What the intent data reveals</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {insights.map((line, i) => (
              <div key={i} className="flex items-start gap-3">
                <span className="shrink-0 mt-1 w-1.5 h-1.5 rounded-full bg-indigo-500" />
                <p className="text-sm text-gray-300">{line}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Row 4: Strongest/Weakest Queries by Intent (tabbed) */}
      <Card className="bg-[#111827] border border-[#1F2937] rounded-xl">
        <CardHeader>
          <CardTitle>Queries by Intent</CardTitle>
          <div className="flex gap-1 mt-2">
            {VALID_INTENTS.map((intent) => (
              <button
                key={intent}
                onClick={() => setActiveQueryTab(intent)}
                className={cn(
                  "px-3 py-1.5 text-xs font-medium rounded-md capitalize transition-colors",
                  activeQueryTab === intent
                    ? "text-white" : "text-gray-400 hover:text-gray-200 hover:bg-white/5"
                )}
                style={activeQueryTab === intent ? { backgroundColor: INTENT_COLORS[intent] + "33", color: INTENT_COLORS[intent] } : undefined}
              >
                {intent}
              </button>
            ))}
          </div>
        </CardHeader>
        <CardContent>
          {queryDataByIntent[activeQueryTab] && (
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h4 className="text-sm font-medium text-emerald-400 mb-3">Strongest Queries</h4>
                <div className="space-y-2">
                  {queryDataByIntent[activeQueryTab].strongest.length > 0 ? queryDataByIntent[activeQueryTab].strongest.map((p) => (
                    <div key={p.promptNumber} className="flex items-start gap-2 text-sm">
                      <span className="font-mono text-xs text-gray-500 shrink-0 mt-0.5">#{p.promptNumber}</span>
                      <span className="text-gray-300">{p.promptText}</span>
                    </div>
                  )) : (
                    <p className="text-sm text-gray-500">No mentions found for {activeQueryTab} queries</p>
                  )}
                </div>
              </div>
              <div>
                <h4 className="text-sm font-medium text-red-400 mb-3">Weakest Queries (no mentions)</h4>
                <div className="space-y-2">
                  {queryDataByIntent[activeQueryTab].weakest.length > 0 ? queryDataByIntent[activeQueryTab].weakest.map((p) => (
                    <div key={p.promptNumber} className="flex items-start gap-2 text-sm">
                      <span className="font-mono text-xs text-gray-500 shrink-0 mt-0.5">#{p.promptNumber}</span>
                      <span className="text-gray-300">{p.promptText}</span>
                    </div>
                  )) : (
                    <p className="text-sm text-gray-500">All {activeQueryTab} queries returned mentions</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
