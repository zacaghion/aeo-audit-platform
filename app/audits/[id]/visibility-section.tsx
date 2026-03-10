"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
  LabelList,
  CartesianGrid,
} from "recharts";
import type { AnalysisOutput } from "@/types";
import { PROVIDER_COLORS, getProviderColor, CHART_TOOLTIP_STYLE, CHART_ANIM, AXIS_STYLE, GRID_STYLE } from "@/lib/chart-theme";
import { METRIC_DEFINITIONS } from "@/lib/metric-definitions";

function ScoreRing({ score }: { score: number }) {
  const radius = 54;
  const stroke = 8;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color = score <= 33 ? "#EF4444" : score <= 66 ? "#F59E0B" : "#10B981";

  return (
    <div className="flex flex-col items-center gap-2">
      <svg width={140} height={140} className="-rotate-90">
        <circle
          cx={70}
          cy={70}
          r={radius}
          fill="none"
          stroke="hsl(var(--muted))"
          strokeWidth={stroke}
        />
        <circle
          cx={70}
          cy={70}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 800ms ease-out' }}
        />
      </svg>
      <div className="absolute flex flex-col items-center justify-center" style={{ width: 140, height: 140 }}>
        <span className="text-4xl font-bold font-mono">{score}</span>
        <span className="text-xs text-muted-foreground">/ 100</span>
      </div>
    </div>
  );
}

export function VisibilitySection({ analysis }: { analysis: AnalysisOutput }) {
  const vis = analysis.brand_visibility;

  const providerData = useMemo(
    () =>
      Object.entries(vis.provider_scores || {}).map(([name, score]) => ({
        name,
        score,
      })),
    [vis.provider_scores],
  );

  const categoryData = useMemo(
    () =>
      Object.entries(vis.category_scores || {})
        .map(([name, score]) => ({ name, score }))
        .sort((a, b) => a.score - b.score),
    [vis.category_scores],
  );

  return (
    <div className="space-y-6">
      {vis.narrative && (
        <Card className="bg-[#111827] border border-[#1F2937] rounded-xl">
          <CardContent className="pt-6">
            <div className="prose prose-invert prose-sm max-w-none whitespace-pre-wrap text-muted-foreground">
              {vis.narrative}
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="bg-[#111827] border border-[#1F2937] rounded-xl">
        <CardHeader>
          <CardTitle>Overall Visibility Score</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center gap-3">
          <div className="relative flex items-center justify-center">
            <ScoreRing score={vis.overall_score} />
          </div>
          <p className="text-xs text-gray-500 text-center max-w-md">{METRIC_DEFINITIONS.visibility}</p>
        </CardContent>
      </Card>

      {providerData.length > 0 && (
        <Card className="bg-[#111827] border border-[#1F2937] rounded-xl">
          <CardHeader>
            <CardTitle>Visibility by Provider</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={providerData} margin={{ top: 16, right: 16, bottom: 0, left: 0 }}>
                <CartesianGrid {...GRID_STYLE} />
                <XAxis
                  dataKey="name"
                  {...AXIS_STYLE}
                />
                <YAxis
                  domain={[0, 100]}
                  {...AXIS_STYLE}
                />
                <Tooltip contentStyle={CHART_TOOLTIP_STYLE} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
                <ReferenceLine
                  y={vis.overall_score}
                  stroke="hsl(var(--muted-foreground))"
                  strokeDasharray="4 4"
                  label={{
                    value: `Avg ${vis.overall_score}`,
                    fill: "hsl(var(--muted-foreground))",
                    fontSize: 11,
                    position: "right",
                  }}
                />
                <Bar dataKey="score" radius={[4, 4, 0, 0]} {...CHART_ANIM} barSize={40}>
                  {providerData.map((entry) => (
                    <Cell key={entry.name} fill={getProviderColor(entry.name)} />
                  ))}
                  <LabelList position="top" fill="#fff" fontSize={11} fontWeight={600} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {categoryData.length > 0 && (
        <Card className="bg-[#111827] border border-[#1F2937] rounded-xl">
          <CardHeader>
            <CardTitle>Category Scores</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={Math.max(250, categoryData.length * 40)}>
              <BarChart
                data={categoryData}
                layout="vertical"
                margin={{ top: 0, right: 16, bottom: 0, left: 120 }}
              >
                <CartesianGrid {...GRID_STYLE} />
                <XAxis
                  type="number"
                  domain={[0, 100]}
                  {...AXIS_STYLE}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={110}
                  {...AXIS_STYLE}
                />
                <Tooltip contentStyle={CHART_TOOLTIP_STYLE} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
                <Bar dataKey="score" radius={[0, 4, 4, 0]} {...CHART_ANIM} barSize={40}>
                  {categoryData.map((entry) => (
                    <Cell
                      key={entry.name}
                      fill={entry.score >= 50 ? "#10b981" : entry.score >= 25 ? "#f59e0b" : "#ef4444"}
                    />
                  ))}
                  <LabelList position="top" fill="#fff" fontSize={11} fontWeight={600} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {vis.provider_ranking?.length > 0 && (
        <Card className="bg-[#111827] border border-[#1F2937] rounded-xl">
          <CardHeader>
            <CardTitle>Provider Ranking</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              {vis.provider_ranking.map((provider, i) => (
                <div key={provider} className="flex items-center gap-2">
                  <Badge
                    variant={i === 0 ? "success" : "outline"}
                    className="font-mono text-xs"
                  >
                    #{i + 1}
                  </Badge>
                  <span className="text-sm capitalize font-medium">{provider}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid md:grid-cols-2 gap-4">
        {vis.strongest_queries?.length > 0 && (
          <Card className="bg-[#111827] border border-[#1F2937] rounded-xl">
            <CardHeader>
              <CardTitle className="text-base">Strongest Queries</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {vis.strongest_queries.slice(0, 5).map((q) => (
                <div key={q.promptNumber} className="space-y-1">
                  <div className="flex items-start gap-2 text-sm">
                    <span className="font-mono text-xs text-muted-foreground shrink-0">
                      #{q.promptNumber}
                    </span>
                    <span className="flex-1">{q.prompt}</span>
                  </div>
                  <div className="flex flex-wrap gap-1 pl-6">
                    {q.providers_mentioned.map((p) => (
                      <Badge key={p} variant="outline" className="text-xs capitalize">
                        {p}
                      </Badge>
                    ))}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {vis.weakest_queries?.length > 0 && (
          <Card className="bg-[#111827] border border-[#1F2937] rounded-xl">
            <CardHeader>
              <CardTitle className="text-base">Weakest Queries</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {vis.weakest_queries.slice(0, 5).map((q) => (
                <div key={q.promptNumber} className="space-y-1">
                  <div className="flex items-start gap-2 text-sm">
                    <span className="font-mono text-xs text-muted-foreground shrink-0">
                      #{q.promptNumber}
                    </span>
                    <span className="flex-1">{q.prompt}</span>
                  </div>
                  <div className="flex flex-wrap gap-1 pl-6">
                    {q.providers_mentioned.length > 0 ? (
                      q.providers_mentioned.map((p) => (
                        <Badge key={p} variant="outline" className="text-xs capitalize">
                          {p}
                        </Badge>
                      ))
                    ) : (
                      <Badge variant="destructive" className="text-xs">
                        No mentions
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
