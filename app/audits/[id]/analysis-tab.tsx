"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import type { AnalysisOutput } from "@/types";

export function AnalysisTab({ analysis }: { analysis: AnalysisOutput }) {
  return (
    <div className="space-y-6 mt-4">
      {analysis.executive_summary && (
        <Card>
          <CardHeader><CardTitle>Executive Summary</CardTitle></CardHeader>
          <CardContent>
            <div className="prose prose-invert prose-sm max-w-none whitespace-pre-wrap">
              {analysis.executive_summary}
            </div>
          </CardContent>
        </Card>
      )}

      {analysis.sentiment_analysis && (
        <Card>
          <CardHeader><CardTitle>Sentiment Analysis</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {analysis.sentiment_analysis.narrative && (
              <div className="prose prose-invert prose-sm max-w-none whitespace-pre-wrap text-muted-foreground">
                {analysis.sentiment_analysis.narrative}
              </div>
            )}
            <div className="flex items-center gap-4">
              <div className="text-center">
                <div className="text-3xl font-bold font-mono">{analysis.sentiment_analysis.sentiment_score}</div>
                <div className="text-xs text-muted-foreground">Overall Score</div>
              </div>
              <Badge variant={
                analysis.sentiment_analysis.overall_sentiment === "positive" ? "success" :
                analysis.sentiment_analysis.overall_sentiment === "negative" ? "destructive" : "secondary"
              }>
                {analysis.sentiment_analysis.overall_sentiment}
              </Badge>
            </div>

            {analysis.sentiment_analysis.provider_comparison && (
              <div className="grid grid-cols-5 gap-2">
                {Object.entries(analysis.sentiment_analysis.provider_comparison).map(([prov, data]) => (
                  <div key={prov} className="text-center rounded border p-3">
                    <div className="text-lg font-bold font-mono">{data.score}</div>
                    <div className="text-xs capitalize text-muted-foreground">{prov}</div>
                    <Badge variant="outline" className="text-xs mt-1">{data.sentiment}</Badge>
                  </div>
                ))}
              </div>
            )}

            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <h4 className="text-sm font-medium mb-2 text-emerald-400">Positive Themes</h4>
                <div className="flex flex-wrap gap-1">
                  {analysis.sentiment_analysis.positive_themes?.map((t, i) => (
                    <Badge key={i} variant="success" className="text-xs">{t}</Badge>
                  ))}
                </div>
              </div>
              <div>
                <h4 className="text-sm font-medium mb-2 text-red-400">Negative Themes</h4>
                <div className="flex flex-wrap gap-1">
                  {analysis.sentiment_analysis.negative_themes?.map((t, i) => (
                    <Badge key={i} variant="destructive" className="text-xs">{t}</Badge>
                  ))}
                </div>
              </div>
              <div>
                <h4 className="text-sm font-medium mb-2 text-amber-400">Gaps</h4>
                <div className="flex flex-wrap gap-1">
                  {analysis.sentiment_analysis.neutral_gaps?.map((t, i) => (
                    <Badge key={i} variant="warning" className="text-xs">{t}</Badge>
                  ))}
                </div>
              </div>
            </div>

            {analysis.sentiment_analysis.inaccuracies?.length > 0 && (
              <div className="rounded border border-red-500/30 bg-red-500/10 p-4">
                <h4 className="text-sm font-medium text-red-400 mb-2">Inaccuracies Detected</h4>
                <ul className="list-disc list-inside space-y-1 text-sm">
                  {analysis.sentiment_analysis.inaccuracies.map((item, i) => <li key={i}>{item}</li>)}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {analysis.brand_visibility && (
        <Card>
          <CardHeader><CardTitle>Brand Visibility</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {analysis.brand_visibility.narrative && (
              <div className="prose prose-invert prose-sm max-w-none whitespace-pre-wrap text-muted-foreground">
                {analysis.brand_visibility.narrative}
              </div>
            )}
            <div className="flex items-center gap-6">
              <div className="text-center">
                <div className="text-4xl font-bold font-mono">{analysis.brand_visibility.overall_score}</div>
                <div className="text-xs text-muted-foreground">Overall Score</div>
              </div>
              <div className="flex-1 space-y-2">
                {Object.entries(analysis.brand_visibility.provider_scores || {}).map(([prov, score]) => (
                  <div key={prov} className="flex items-center gap-2">
                    <span className="w-20 text-xs capitalize">{prov}</span>
                    <div className="flex-1 h-3 rounded-full bg-secondary overflow-hidden">
                      <div className="h-full rounded-full bg-primary" style={{ width: `${score}%` }} />
                    </div>
                    <span className="font-mono text-xs w-8 text-right">{score}</span>
                  </div>
                ))}
              </div>
            </div>

            {analysis.brand_visibility.provider_ranking?.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-2">Provider Ranking (Best to Worst)</h4>
                <div className="flex gap-2">
                  {analysis.brand_visibility.provider_ranking.map((p, i) => (
                    <Badge key={p} variant={i === 0 ? "success" : "outline"} className="capitalize">
                      #{i + 1} {p}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {analysis.brand_visibility.strongest_queries?.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-2">Strongest Queries</h4>
                <div className="space-y-1">
                  {analysis.brand_visibility.strongest_queries.slice(0, 10).map((q) => (
                    <div key={q.promptNumber} className="flex items-center gap-2 text-sm">
                      <span className="font-mono text-xs text-muted-foreground">#{q.promptNumber}</span>
                      <span className="flex-1 truncate">{q.prompt}</span>
                      <div className="flex gap-1">
                        {q.providers_mentioned.map((p) => (
                          <Badge key={p} variant="outline" className="text-xs capitalize">{p}</Badge>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {analysis.competitive_positioning && (
        <Card>
          <CardHeader><CardTitle>Competitive Positioning</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {analysis.competitive_positioning.narrative && (
              <div className="prose prose-invert prose-sm max-w-none whitespace-pre-wrap text-muted-foreground">
                {analysis.competitive_positioning.narrative}
              </div>
            )}
            {analysis.competitive_positioning.primary_competitors?.length > 0 && (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Competitor</TableHead>
                    <TableHead className="text-right">Mentions</TableHead>
                    <TableHead>Threat</TableHead>
                    <TableHead>Categories</TableHead>
                    <TableHead>Strength</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {analysis.competitive_positioning.primary_competitors.map((c) => (
                    <TableRow key={c.name}>
                      <TableCell className="font-medium">{c.name}</TableCell>
                      <TableCell className="text-right font-mono">{c.total_mentions}</TableCell>
                      <TableCell>
                        <Badge variant={c.threat_level === "high" ? "destructive" : c.threat_level === "medium" ? "warning" : "secondary"}>
                          {c.threat_level}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs">{c.categories_dominated?.join(", ")}</TableCell>
                      <TableCell className="text-xs max-w-[200px] truncate">{c.what_they_do_right}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <h4 className="text-sm font-medium mb-2 text-emerald-400">Advantages Recognized</h4>
                <ul className="list-disc list-inside space-y-1 text-sm">
                  {analysis.competitive_positioning.competitive_advantages_recognized?.map((a, i) => <li key={i}>{a}</li>)}
                </ul>
              </div>
              <div>
                <h4 className="text-sm font-medium mb-2 text-amber-400">Advantages Missing</h4>
                <ul className="list-disc list-inside space-y-1 text-sm">
                  {analysis.competitive_positioning.competitive_advantages_missing?.map((a, i) => <li key={i}>{a}</li>)}
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {analysis.content_gaps && (
        <Card>
          <CardHeader><CardTitle>Content Gaps</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {analysis.content_gaps.narrative && (
              <div className="prose prose-invert prose-sm max-w-none whitespace-pre-wrap text-muted-foreground">
                {analysis.content_gaps.narrative}
              </div>
            )}
            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <h4 className="text-sm font-medium mb-2">Missing Topics</h4>
                <ul className="list-disc list-inside space-y-1 text-sm">
                  {analysis.content_gaps.missing_topics?.map((t, i) => <li key={i}>{t}</li>)}
                </ul>
              </div>
              <div>
                <h4 className="text-sm font-medium mb-2">Underrepresented Features</h4>
                <ul className="list-disc list-inside space-y-1 text-sm">
                  {analysis.content_gaps.underrepresented_features?.map((t, i) => <li key={i}>{t}</li>)}
                </ul>
              </div>
              <div>
                <h4 className="text-sm font-medium mb-2">Missing Use Cases</h4>
                <ul className="list-disc list-inside space-y-1 text-sm">
                  {analysis.content_gaps.missing_use_cases?.map((t, i) => <li key={i}>{t}</li>)}
                </ul>
              </div>
            </div>

            {analysis.content_gaps.provider_specific_gaps && (
              <Accordion type="single" collapsible>
                {Object.entries(analysis.content_gaps.provider_specific_gaps).map(([prov, gaps]) => (
                  <AccordionItem key={prov} value={prov}>
                    <AccordionTrigger className="capitalize">{prov} Specific Gaps</AccordionTrigger>
                    <AccordionContent>
                      <ul className="list-disc list-inside space-y-1 text-sm">
                        {(gaps as string[]).map((g, i) => <li key={i}>{g}</li>)}
                      </ul>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
