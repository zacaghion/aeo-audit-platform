"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Trophy } from "lucide-react";

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
  const pct = ((total - rank) / (total - 1)) * 100;
  if (pct >= 80) return "Top 20%";
  if (pct >= 60) return "Top 40%";
  if (pct >= 40) return "Top 60%";
  if (pct >= 20) return "Bottom 40%";
  return "Bottom 20%";
}

export function BenchmarkTab({ benchmark }: { benchmark: BenchmarkData }) {
  const sorted = [...benchmark.scores].sort((a, b) => b.visibility - a.visibility);
  const maxVisibility = Math.max(...sorted.map((s) => s.visibility), 1);

  return (
    <div className="space-y-6 mt-4">
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Trophy className="h-5 w-5" /> Competitive Ranking</CardTitle></CardHeader>
        <CardContent>
          <div className="flex items-center gap-6">
            <div className="text-center">
              <div className="text-5xl font-bold font-mono">#{benchmark.rank}</div>
              <div className="text-sm text-muted-foreground mt-1">of {benchmark.totalCompetitors}</div>
            </div>
            <div>
              <Badge variant={benchmark.rank === 1 ? "success" : benchmark.rank <= Math.ceil(benchmark.totalCompetitors / 2) ? "warning" : "destructive"} className="text-sm px-3 py-1">
                {benchmark.totalCompetitors > 2 ? getPercentileLabel(benchmark.rank, benchmark.totalCompetitors) : benchmark.rank === 1 ? "Leader" : "Runner-up"}
              </Badge>
              <p className="text-sm text-muted-foreground mt-2">
                {benchmark.rank === 1
                  ? "You lead your competitive set in AI visibility."
                  : `${sorted[0]?.name} leads with a visibility score of ${sorted[0]?.visibility}.`}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Visibility Comparison</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {sorted.map((s, i) => (
            <div key={s.name} className="flex items-center gap-3">
              <span className="font-mono text-sm text-muted-foreground w-6">#{i + 1}</span>
              <span className={`w-32 text-sm truncate ${s.isTarget ? "font-bold text-primary" : ""}`}>
                {s.name} {s.isTarget ? "(you)" : ""}
              </span>
              <div className="flex-1 h-6 rounded bg-secondary overflow-hidden">
                <div
                  className={`h-full rounded ${s.isTarget ? "bg-primary" : "bg-muted-foreground/40"}`}
                  style={{ width: `${(s.visibility / maxVisibility) * 100}%` }}
                />
              </div>
              <span className="font-mono text-sm w-8 text-right">{s.visibility}</span>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Detailed Comparison</CardTitle></CardHeader>
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
                <TableRow key={s.name} className={s.isTarget ? "bg-primary/5 font-medium" : ""}>
                  <TableCell className="font-mono">#{i + 1}</TableCell>
                  <TableCell>
                    {s.name} {s.isTarget && <Badge variant="outline" className="ml-2 text-xs">You</Badge>}
                  </TableCell>
                  <TableCell className="text-right font-mono">{s.visibility}/100</TableCell>
                  <TableCell className="text-right font-mono">{s.mentionRate}%</TableCell>
                  <TableCell className="text-right font-mono">{s.sentiment}/100</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
