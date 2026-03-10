"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Trophy } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Legend } from "recharts";
import { METRIC_DEFINITIONS } from "@/lib/metric-definitions";

interface BenchmarkScore {
  name: string;
  isTarget: boolean;
  visibility: number;
  mentionRate: number;
  sentiment: number;
}

interface BenchmarkData {
  rank: number;
  totalCompetitors: number;
  scores: BenchmarkScore[];
}

function getPercentileLabel(rank: number, total: number): string {
  if (total <= 2) return rank === 1 ? "Leader" : "Runner-up";
  const pct = ((total - rank) / (total - 1)) * 100;
  if (pct >= 80) return "Top 20%";
  if (pct >= 60) return "Top 40%";
  if (pct >= 40) return "Top 60%";
  if (pct >= 20) return "Bottom 40%";
  return "Bottom 20%";
}

const BRAND_COLORS = ["#6366f1", "#10b981", "#f59e0b", "#ef4444", "#3b82f6", "#8b5cf6", "#06b6d4", "#ec4899"];

export function BenchmarkTab({ benchmark }: { benchmark: BenchmarkData }) {
  const sorted = [...benchmark.scores].sort((a, b) => b.visibility - a.visibility);

  const barData = sorted.map((s) => ({
    name: s.isTarget ? `${s.name} (you)` : s.name,
    visibility: s.visibility,
    isTarget: s.isTarget,
  }));

  const radarMetrics = ["visibility", "mentionRate", "sentiment"] as const;
  const radarData = radarMetrics.map((metric) => {
    const point: Record<string, string | number> = {
      metric: metric === "mentionRate" ? "Mention Rate" : metric.charAt(0).toUpperCase() + metric.slice(1),
    };
    sorted.forEach((s) => {
      point[s.name] = s[metric];
    });
    return point;
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Trophy className="h-5 w-5" /> Competitive Ranking</CardTitle></CardHeader>
        <CardContent>
          <div className="flex items-center gap-8">
            <div className="text-center">
              <div className="text-6xl font-bold font-mono bg-gradient-to-r from-amber-400 to-orange-400 bg-clip-text text-transparent">
                #{benchmark.rank}
              </div>
              <div className="text-sm text-muted-foreground mt-1">of {benchmark.totalCompetitors}</div>
            </div>
            <div>
              <Badge
                variant={benchmark.rank === 1 ? "success" : benchmark.rank <= Math.ceil(benchmark.totalCompetitors / 2) ? "warning" : "destructive"}
                className="text-sm px-3 py-1"
              >
                {getPercentileLabel(benchmark.rank, benchmark.totalCompetitors)}
              </Badge>
              <p className="text-sm text-muted-foreground mt-2 max-w-md">
                {benchmark.rank === 1
                  ? "You lead your competitive set in AI visibility."
                  : `${sorted[0]?.name} leads with a visibility score of ${sorted[0]?.visibility}. You trail by ${sorted[0]?.visibility - (sorted.find((s) => s.isTarget)?.visibility ?? 0)} points.`}
              </p>
              <p className="text-xs text-gray-500 mt-2 max-w-md">{METRIC_DEFINITIONS.rank}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-base">Visibility Comparison</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={sorted.length * 55 + 40}>
              <BarChart data={barData} layout="vertical" margin={{ left: 10 }}>
                <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
                <Bar dataKey="visibility" radius={[0, 4, 4, 0]}>
                  {barData.map((d, i) => (
                    <Cell key={i} fill={d.isTarget ? "#6366f1" : "hsl(var(--muted-foreground)/0.4)"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Multi-Metric Radar</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={350}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="hsl(var(--border))" />
                <PolarAngleAxis dataKey="metric" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                {sorted.map((s, i) => (
                  <Radar
                    key={s.name}
                    name={s.name}
                    dataKey={s.name}
                    stroke={s.isTarget ? "#6366f1" : BRAND_COLORS[i % BRAND_COLORS.length]}
                    fill={s.isTarget ? "#6366f1" : BRAND_COLORS[i % BRAND_COLORS.length]}
                    fillOpacity={s.isTarget ? 0.25 : 0.08}
                    strokeWidth={s.isTarget ? 2 : 1}
                  />
                ))}
                <Legend wrapperStyle={{ fontSize: 12 }} />
              </RadarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Detailed Comparison</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Rank</TableHead>
                <TableHead>Brand</TableHead>
                <TableHead className="text-right">Visibility</TableHead>
                <TableHead className="text-right">Mention Rate</TableHead>
                <TableHead className="text-right">Sentiment</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.map((s, i) => (
                <TableRow key={s.name} className={s.isTarget ? "bg-primary/5" : ""}>
                  <TableCell className="font-mono font-medium">#{i + 1}</TableCell>
                  <TableCell className={s.isTarget ? "font-semibold" : ""}>
                    {s.name} {s.isTarget && <Badge variant="outline" className="ml-2 text-xs">You</Badge>}
                  </TableCell>
                  <TableCell className="text-right font-mono">{s.visibility}</TableCell>
                  <TableCell className="text-right font-mono">{s.mentionRate}%</TableCell>
                  <TableCell className="text-right font-mono">{s.sentiment}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
