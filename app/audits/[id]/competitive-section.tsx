"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import type { AnalysisOutput } from "@/types";

function threatColor(level: string): string {
  switch (level.toLowerCase()) {
    case "high":
      return "#ef4444";
    case "medium":
      return "#f59e0b";
    case "low":
    default:
      return "#6366f1";
  }
}

function threatBadgeVariant(
  level: string,
): "destructive" | "warning" | "secondary" {
  switch (level.toLowerCase()) {
    case "high":
      return "destructive";
    case "medium":
      return "warning";
    case "low":
    default:
      return "secondary";
  }
}

const tooltipStyle = {
  backgroundColor: "hsl(var(--card))",
  border: "1px solid hsl(var(--border))",
};

export function CompetitiveSection({ analysis }: { analysis: AnalysisOutput }) {
  const cp = analysis.competitive_positioning;
  const cg = analysis.content_gaps;

  const chartData = useMemo(
    () =>
      [...(cp.primary_competitors || [])]
        .sort((a, b) => b.total_mentions - a.total_mentions)
        .map((c) => ({
          name: c.name,
          mentions: c.total_mentions,
          threat_level: c.threat_level,
        })),
    [cp.primary_competitors],
  );

  const chartHeight = chartData.length * 50 + 50;

  return (
    <div className="space-y-6">
      {/* ── Competitive Positioning ── */}
      <Card>
        <CardHeader>
          <CardTitle>Competitive Positioning</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Narrative */}
          {cp.narrative && (
            <div className="prose prose-invert prose-sm max-w-none whitespace-pre-wrap text-muted-foreground">
              {cp.narrative}
            </div>
          )}

          {/* Share of Voice Horizontal Bar Chart */}
          {chartData.length > 0 && (
            <div>
              <h4 className="text-sm font-medium mb-3">Share of Voice</h4>
              <ResponsiveContainer width="100%" height={chartHeight}>
                <BarChart
                  data={chartData}
                  layout="vertical"
                  margin={{ top: 0, right: 16, bottom: 0, left: 120 }}
                >
                  <XAxis
                    type="number"
                    tick={{
                      fill: "hsl(var(--muted-foreground))",
                      fontSize: 12,
                    }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={110}
                    tick={{
                      fill: "hsl(var(--muted-foreground))",
                      fontSize: 12,
                    }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="mentions" radius={[0, 4, 4, 0]}>
                    {chartData.map((entry) => (
                      <Cell
                        key={entry.name}
                        fill={threatColor(entry.threat_level)}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Competitor Detail Table */}
          {cp.primary_competitors?.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead className="text-right">Mentions</TableHead>
                  <TableHead>Threat</TableHead>
                  <TableHead>Categories</TableHead>
                  <TableHead>Strength</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cp.primary_competitors.map((c) => (
                  <TableRow key={c.name}>
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell className="text-right font-mono">
                      {c.total_mentions}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={threatBadgeVariant(c.threat_level)}
                        className="capitalize text-xs"
                      >
                        {c.threat_level}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {c.categories_dominated?.map((cat) => (
                          <Badge
                            key={cat}
                            variant="outline"
                            className="text-xs"
                          >
                            {cat}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-xs">
                      {c.what_they_do_right}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* ── Advantages & Disadvantages ── */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Left Column: Advantages */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Competitive Advantages</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Recognized */}
            <div>
              <h4 className="text-sm font-medium text-emerald-400 mb-2">
                Recognized
              </h4>
              {cp.competitive_advantages_recognized?.length > 0 ? (
                <ul className="space-y-2">
                  {cp.competitive_advantages_recognized.map((item, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-2 text-sm text-muted-foreground"
                    >
                      <span className="shrink-0 mt-0.5 h-1.5 w-1.5 rounded-full bg-emerald-400" />
                      {item}
                    </li>
                  ))}
                </ul>
              ) : (
                <span className="text-sm text-muted-foreground">None</span>
              )}
            </div>

            {/* Missing */}
            <div>
              <h4 className="text-sm font-medium text-amber-400 mb-2">
                Missing
              </h4>
              {cp.competitive_advantages_missing?.length > 0 ? (
                <ul className="space-y-2">
                  {cp.competitive_advantages_missing.map((item, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-2 text-sm text-muted-foreground"
                    >
                      <span className="shrink-0 mt-0.5 h-1.5 w-1.5 rounded-full bg-amber-400" />
                      {item}
                    </li>
                  ))}
                </ul>
              ) : (
                <span className="text-sm text-muted-foreground">None</span>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Right Column: Disadvantages */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Competitive Disadvantages
            </CardTitle>
          </CardHeader>
          <CardContent>
            {cp.competitive_disadvantages?.length > 0 ? (
              <ul className="space-y-2">
                {cp.competitive_disadvantages.map((item, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-2 text-sm text-muted-foreground"
                  >
                    <span className="shrink-0 mt-0.5 h-1.5 w-1.5 rounded-full bg-red-400" />
                    {item}
                  </li>
                ))}
              </ul>
            ) : (
              <span className="text-sm text-muted-foreground">None</span>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Content Gaps ── */}
      <Card>
        <CardHeader>
          <CardTitle>Content Gaps</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Narrative */}
          {cg.narrative && (
            <div className="prose prose-invert prose-sm max-w-none whitespace-pre-wrap text-muted-foreground">
              {cg.narrative}
            </div>
          )}

          {/* 3-column grid */}
          <div className="grid md:grid-cols-3 gap-4">
            {/* Missing Topics */}
            <div>
              <h4 className="text-sm font-medium mb-2">Missing Topics</h4>
              {cg.missing_topics?.length > 0 ? (
                <ul className="space-y-2">
                  {cg.missing_topics.map((item, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-2 text-sm text-muted-foreground"
                    >
                      <span className="shrink-0 mt-0.5 h-1.5 w-1.5 rounded-full bg-muted-foreground" />
                      {item}
                    </li>
                  ))}
                </ul>
              ) : (
                <span className="text-sm text-muted-foreground">None</span>
              )}
            </div>

            {/* Underrepresented Features */}
            <div>
              <h4 className="text-sm font-medium mb-2">
                Underrepresented Features
              </h4>
              {cg.underrepresented_features?.length > 0 ? (
                <ul className="space-y-2">
                  {cg.underrepresented_features.map((item, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-2 text-sm text-muted-foreground"
                    >
                      <span className="shrink-0 mt-0.5 h-1.5 w-1.5 rounded-full bg-muted-foreground" />
                      {item}
                    </li>
                  ))}
                </ul>
              ) : (
                <span className="text-sm text-muted-foreground">None</span>
              )}
            </div>

            {/* Missing Use Cases */}
            <div>
              <h4 className="text-sm font-medium mb-2">Missing Use Cases</h4>
              {cg.missing_use_cases?.length > 0 ? (
                <ul className="space-y-2">
                  {cg.missing_use_cases.map((item, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-2 text-sm text-muted-foreground"
                    >
                      <span className="shrink-0 mt-0.5 h-1.5 w-1.5 rounded-full bg-muted-foreground" />
                      {item}
                    </li>
                  ))}
                </ul>
              ) : (
                <span className="text-sm text-muted-foreground">None</span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
