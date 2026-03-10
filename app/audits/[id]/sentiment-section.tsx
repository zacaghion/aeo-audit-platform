"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
} from "recharts";
import type { AnalysisOutput } from "@/types";

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

function ScoreRing({ score }: { score: number }) {
  const radius = 54;
  const stroke = 8;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

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
          stroke="hsl(var(--primary))"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <div
        className="absolute flex flex-col items-center justify-center"
        style={{ width: 140, height: 140 }}
      >
        <span className="text-4xl font-bold font-mono">{score}</span>
        <span className="text-xs text-muted-foreground">/ 100</span>
      </div>
    </div>
  );
}

const tooltipStyle = {
  backgroundColor: "hsl(var(--card))",
  border: "1px solid hsl(var(--border))",
};

export function SentimentSection({ analysis }: { analysis: AnalysisOutput }) {
  const sa = analysis.sentiment_analysis;

  const radarData = useMemo(
    () =>
      Object.entries(sa.provider_comparison || {}).map(([name, data]) => ({
        provider: name,
        score: data.score,
      })),
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

  return (
    <div className="space-y-6">
      {/* Narrative */}
      {sa.narrative && (
        <Card>
          <CardContent className="pt-6">
            <div className="prose prose-invert prose-sm max-w-none whitespace-pre-wrap text-muted-foreground">
              {sa.narrative}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Score Ring + Overall Sentiment Badge */}
      <Card>
        <CardHeader>
          <CardTitle>Sentiment Score</CardTitle>
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

      {/* Radar Chart – Sentiment by Provider */}
      {radarData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Sentiment by Provider</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={350}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="hsl(var(--border))" />
                <PolarAngleAxis
                  dataKey="provider"
                  tick={{
                    fill: "hsl(var(--muted-foreground))",
                    fontSize: 12,
                  }}
                />
                <PolarRadiusAxis
                  domain={[0, 100]}
                  tick={{
                    fill: "hsl(var(--muted-foreground))",
                    fontSize: 10,
                  }}
                  axisLine={false}
                />
                <Radar
                  dataKey="score"
                  stroke="#8b5cf6"
                  fill="#8b5cf6"
                  fillOpacity={0.35}
                />
                <Tooltip contentStyle={tooltipStyle} />
              </RadarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Bar Chart – Provider Sentiment Bars */}
      {barData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Provider Sentiment Bars</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={barData}
                margin={{ top: 16, right: 16, bottom: 0, left: 0 }}
              >
                <XAxis
                  dataKey="name"
                  tick={{
                    fill: "hsl(var(--muted-foreground))",
                    fontSize: 12,
                  }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  domain={[0, 100]}
                  tick={{
                    fill: "hsl(var(--muted-foreground))",
                    fontSize: 12,
                  }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="score" radius={[4, 4, 0, 0]}>
                  {barData.map((entry) => (
                    <Cell
                      key={entry.name}
                      fill={sentimentColor(entry.sentiment)}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Theme Tags – 3 Column Grid */}
      <div className="grid md:grid-cols-3 gap-4">
        {/* Positive Themes */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Positive Themes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {sa.positive_themes?.length > 0 ? (
                sa.positive_themes.map((theme) => (
                  <Badge key={theme} variant="success" className="text-xs">
                    {theme}
                  </Badge>
                ))
              ) : (
                <span className="text-sm text-muted-foreground">None</span>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Negative Themes */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Negative Themes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {sa.negative_themes?.length > 0 ? (
                sa.negative_themes.map((theme) => (
                  <Badge
                    key={theme}
                    variant="destructive"
                    className="text-xs"
                  >
                    {theme}
                  </Badge>
                ))
              ) : (
                <span className="text-sm text-muted-foreground">None</span>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Gaps */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Gaps</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {sa.neutral_gaps?.length > 0 ? (
                sa.neutral_gaps.map((gap) => (
                  <Badge key={gap} variant="warning" className="text-xs">
                    {gap}
                  </Badge>
                ))
              ) : (
                <span className="text-sm text-muted-foreground">None</span>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Inaccuracies */}
      {sa.inaccuracies?.length > 0 && (
        <Card className="border-red-500/50">
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
                  className="flex items-start gap-2 text-sm text-muted-foreground"
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
