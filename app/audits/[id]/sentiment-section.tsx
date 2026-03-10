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
} from "recharts";
import {
  PROVIDER_COLORS,
  getProviderColor,
  SENTIMENT_COLORS,
  CHART_TOOLTIP_STYLE,
  CHART_ANIM,
  AXIS_STYLE,
  GRID_STYLE,
} from "@/lib/chart-theme";
import type { AnalysisOutput } from "@/types";

/* ── helpers ─────────────────────────────────────────────────────────── */

function sentimentColor(sentiment: string): string {
  switch (sentiment.toLowerCase()) {
    case "positive":
      return "#10b981";
    case "negative":
      return "#ef4444";
    case "mixed":
    default:
      return "#f59e0b";
  }
}

function sentimentBadgeVariant(
  sentiment: string,
): "success" | "destructive" | "warning" {
  switch (sentiment.toLowerCase()) {
    case "positive":
      return "success";
    case "negative":
      return "destructive";
    case "mixed":
    default:
      return "warning";
  }
}

function scoreRingColor(score: number): string {
  if (score >= 67) return "#10B981";
  if (score >= 34) return "#F59E0B";
  return "#EF4444";
}

/* ── Score Ring ──────────────────────────────────────────────────────── */

function ScoreRing({ score }: { score: number }) {
  const size = 140;
  const radius = 54;
  const stroke = 8;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color = scoreRingColor(score);

  return (
    <div className="flex flex-col items-center gap-2">
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#1F2937"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 800ms ease-out" }}
        />
      </svg>
      <div
        className="absolute flex flex-col items-center justify-center"
        style={{ width: size, height: size }}
      >
        <span className="text-4xl font-bold font-mono" style={{ color }}>
          {score}
        </span>
        <span className="text-xs text-[#6B7280]">/ 100</span>
      </div>
    </div>
  );
}

/* ── Custom bar label ────────────────────────────────────────────────── */

function BarLabel(props: {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  value?: number;
}) {
  const { x = 0, y = 0, width = 0, height = 0, value = 0 } = props;
  if (value < 8 || width < 28) return null;
  return (
    <text
      x={x + width / 2}
      y={y + height / 2 + 4}
      textAnchor="middle"
      fill="#fff"
      fontSize={11}
      fontWeight={600}
    >
      {value}%
    </text>
  );
}

/* ── Main Component ──────────────────────────────────────────────────── */

export function SentimentSection({ analysis }: { analysis: AnalysisOutput }) {
  const sa = analysis.sentiment_analysis;

  /* Stacked bar data: distribute score into positive / mixed / negative */
  const stackedData = useMemo(
    () =>
      Object.entries(sa.provider_comparison || {}).map(([name, data]) => {
        const s = data.score;
        const positive = Math.round(Math.max(0, s - 33) * (100 / 67));
        const negative = Math.round(Math.max(0, 67 - s) * (100 / 67));
        const mixed = Math.max(0, 100 - positive - negative);
        return { provider: name, positive, mixed, negative };
      }),
    [sa.provider_comparison],
  );

  const barData = useMemo(
    () =>
      Object.entries(sa.provider_comparison || {}).map(([name, data]) => ({
        name,
        score: data.score,
        sentiment: data.sentiment,
      })),
    [sa.provider_comparison],
  );

  const cardClass = "bg-[#111827] border border-[#1F2937] rounded-xl";

  return (
    <div className="space-y-6">
      {/* ── Narrative ────────────────────────────────────────────────── */}
      {sa.narrative && (
        <Card className={cardClass}>
          <CardContent className="pt-6">
            <div className="prose prose-invert prose-sm max-w-none whitespace-pre-wrap text-[#9CA3AF]">
              {sa.narrative}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Score Ring + Overall Sentiment Badge ─────────────────────── */}
      <Card className={cardClass}>
        <CardHeader>
          <CardTitle className="text-white">Sentiment Score</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center gap-6">
          <div className="relative flex items-center justify-center">
            <ScoreRing score={sa.sentiment_score} />
          </div>
          <Badge
            variant={sentimentBadgeVariant(sa.overall_sentiment)}
            className="text-sm px-3 py-1 capitalize"
          >
            {sa.overall_sentiment}
          </Badge>
        </CardContent>
      </Card>

      {/* ── Horizontal Stacked Bars – Sentiment by Provider ──────────── */}
      {stackedData.length > 0 && (
        <Card className={cardClass}>
          <CardHeader>
            <CardTitle className="text-white">
              Sentiment by Provider
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer
              width="100%"
              height={Math.max(200, stackedData.length * 52 + 32)}
            >
              <BarChart
                data={stackedData}
                layout="vertical"
                margin={{ top: 4, right: 24, bottom: 4, left: 12 }}
                barCategoryGap="20%"
              >
                <XAxis
                  type="number"
                  domain={[0, 100]}
                  hide
                />
                <YAxis
                  type="category"
                  dataKey="provider"
                  width={100}
                  {...AXIS_STYLE}
                  tick={(tickProps: { x: number; y: number; payload: { value: string } }) => {
                    const { x, y, payload } = tickProps;
                    const color = getProviderColor(payload.value);
                    return (
                      <g transform={`translate(${x},${y})`}>
                        <circle cx={-12} cy={0} r={4} fill={color} />
                        <text
                          x={-22}
                          y={0}
                          dy={4}
                          textAnchor="end"
                          fill="#9CA3AF"
                          fontSize={12}
                          className="capitalize"
                        >
                          {payload.value}
                        </text>
                      </g>
                    );
                  }}
                />
                <Tooltip
                  contentStyle={CHART_TOOLTIP_STYLE}
                  labelStyle={{ color: "#F9FAFB", fontWeight: 600 }}
                  itemStyle={{ color: "#D1D5DB" }}
                  formatter={(value: number, name: string) => [
                    `${value}%`,
                    name.charAt(0).toUpperCase() + name.slice(1),
                  ]}
                />
                <Bar
                  dataKey="positive"
                  stackId="sentiment"
                  fill="#10B981"
                  radius={[4, 0, 0, 4]}
                  label={<BarLabel />}
                  {...CHART_ANIM}
                />
                <Bar
                  dataKey="mixed"
                  stackId="sentiment"
                  fill="#F59E0B"
                  radius={[0, 0, 0, 0]}
                  label={<BarLabel />}
                  {...CHART_ANIM}
                />
                <Bar
                  dataKey="negative"
                  stackId="sentiment"
                  fill="#EF4444"
                  radius={[0, 4, 4, 0]}
                  label={<BarLabel />}
                  {...CHART_ANIM}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* ── Theme Tags – 3 Column Grid ───────────────────────────────── */}
      <div className="grid md:grid-cols-3 gap-4">
        {/* Positive Themes */}
        <Card className={cardClass}>
          <CardHeader>
            <CardTitle className="text-base text-white">
              Positive Themes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {sa.positive_themes?.length > 0 ? (
                sa.positive_themes.map((theme) => (
                  <span
                    key={theme}
                    className="rounded-full px-3 py-1 text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                  >
                    {theme}
                  </span>
                ))
              ) : (
                <span className="text-sm text-[#6B7280]">None</span>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Negative Themes */}
        <Card className={cardClass}>
          <CardHeader>
            <CardTitle className="text-base text-white">
              Negative Themes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {sa.negative_themes?.length > 0 ? (
                sa.negative_themes.map((theme) => (
                  <span
                    key={theme}
                    className="rounded-full px-3 py-1 text-xs font-medium bg-red-500/10 text-red-400 border border-red-500/20"
                  >
                    {theme}
                  </span>
                ))
              ) : (
                <span className="text-sm text-[#6B7280]">None</span>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Gaps */}
        <Card className={cardClass}>
          <CardHeader>
            <CardTitle className="text-base text-white">Gaps</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {sa.neutral_gaps?.length > 0 ? (
                sa.neutral_gaps.map((gap) => (
                  <span
                    key={gap}
                    className="rounded-full px-3 py-1 text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20"
                  >
                    {gap}
                  </span>
                ))
              ) : (
                <span className="text-sm text-[#6B7280]">None</span>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Inaccuracies ─────────────────────────────────────────────── */}
      {sa.inaccuracies?.length > 0 && (
        <Card className={`${cardClass} border-red-500/50`}>
          <CardHeader>
            <CardTitle className="text-base text-red-400">
              Inaccuracies Found
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {sa.inaccuracies.map((item, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2 text-sm text-[#9CA3AF]"
                >
                  <span className="shrink-0 mt-0.5 h-1.5 w-1.5 rounded-full bg-red-400" />
                  {item}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
