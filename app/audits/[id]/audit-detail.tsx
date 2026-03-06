"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Download, Eye, TrendingUp, Shield, AlertTriangle } from "lucide-react";
import { OverviewTab } from "./overview-tab";
import { RawDataTab } from "./raw-data-tab";
import { AnalysisTab } from "./analysis-tab";
import type { AuditSummary, AnalysisOutput } from "@/types";

interface AuditData {
  id: string;
  status: string;
  summary: AuditSummary | null;
  analysis: AnalysisOutput | null;
  completedAt: string | null;
  hotel: { name: string; location: string; competitors: string };
  prompts: Array<{
    id: string;
    promptNumber: number;
    promptText: string;
    category: string;
    intent: string;
    expectedMention: string;
    responses: Array<{
      id: string;
      provider: string;
      model: string;
      answer: string;
      hotelMentioned: boolean;
      mentionPosition: string | null;
      mentionSentiment: string | null;
      competitorsMentioned: string[];
      competitorCount: number;
      answerLength: number;
      status: string;
    }>;
  }>;
}

export function AuditDetail({ audit }: { audit: AuditData }) {
  const summary = audit.summary;
  const analysis = audit.analysis;

  const handleExport = async () => {
    const res = await fetch(`/api/export?auditId=${audit.id}`);
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `aeo-audit-${audit.hotel.name.replace(/\s+/g, "-").toLowerCase()}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold">{audit.hotel.name}</h1>
            <Badge variant={audit.status === "COMPLETE" ? "success" : "secondary"}>
              {audit.status.replace("_", " ")}
            </Badge>
          </div>
          <p className="text-muted-foreground mt-1">{audit.hotel.location}</p>
        </div>
        {audit.status === "COMPLETE" && (
          <Button onClick={handleExport} variant="outline">
            <Download className="mr-2 h-4 w-4" /> Export XLSX
          </Button>
        )}
      </div>

      {summary && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Mention Rate</CardTitle>
              <Eye className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold font-mono">{summary.mentionRate}%</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Visibility</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold font-mono">
                {analysis?.brand_visibility?.overall_score ?? "—"}/100
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Sentiment</CardTitle>
              <Shield className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold font-mono">
                {analysis?.sentiment_analysis?.sentiment_score ?? "—"}/100
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Top Threat</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-lg font-bold font-mono truncate">
                {summary.topCompetitors?.[0]?.name ?? "—"}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="raw">Raw Data</TabsTrigger>
          {analysis && <TabsTrigger value="analysis">Analysis</TabsTrigger>}
          {analysis && <TabsTrigger value="recommendations">Recommendations</TabsTrigger>}
        </TabsList>
        <TabsContent value="overview">
          <OverviewTab audit={audit} />
        </TabsContent>
        <TabsContent value="raw">
          <RawDataTab prompts={audit.prompts} />
        </TabsContent>
        {analysis && (
          <TabsContent value="analysis">
            <AnalysisTab analysis={analysis} />
          </TabsContent>
        )}
        {analysis && (
          <TabsContent value="recommendations">
            <RecommendationsTab recommendations={analysis.recommendations} />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}

function RecommendationsTab({ recommendations }: { recommendations: AnalysisOutput["recommendations"] }) {
  if (!recommendations) return null;

  return (
    <div className="space-y-6 mt-4">
      {recommendations.new_content_to_create?.length > 0 && (
        <Card>
          <CardHeader><CardTitle>New Content to Create</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recommendations.new_content_to_create.map((item, i) => (
                <div key={i} className="rounded border p-3 space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge variant={item.priority === "high" ? "destructive" : item.priority === "medium" ? "warning" : "secondary"}>
                      {item.priority}
                    </Badge>
                    <Badge variant="outline">{item.type}</Badge>
                    <span className="font-medium">{item.topic}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">{item.rationale}</p>
                  {item.suggested_scope && <p className="text-xs text-muted-foreground">Scope: {item.suggested_scope}</p>}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {recommendations.quick_wins?.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Quick Wins</CardTitle></CardHeader>
          <CardContent>
            <ol className="list-decimal list-inside space-y-2">
              {recommendations.quick_wins.map((item, i) => (
                <li key={i} className="text-sm">{item}</li>
              ))}
            </ol>
          </CardContent>
        </Card>
      )}

      {recommendations.long_term_plays?.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Long-Term Plays</CardTitle></CardHeader>
          <CardContent>
            <ol className="list-decimal list-inside space-y-2">
              {recommendations.long_term_plays.map((item, i) => (
                <li key={i} className="text-sm">{item}</li>
              ))}
            </ol>
          </CardContent>
        </Card>
      )}

      {recommendations.structured_data_recommendations?.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Structured Data / Technical</CardTitle></CardHeader>
          <CardContent>
            <ul className="list-disc list-inside space-y-1">
              {recommendations.structured_data_recommendations.map((item, i) => (
                <li key={i} className="text-sm">{item}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {recommendations.third_party_actions?.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Third-Party Actions</CardTitle></CardHeader>
          <CardContent>
            <ul className="list-disc list-inside space-y-1">
              {recommendations.third_party_actions.map((item, i) => (
                <li key={i} className="text-sm">{item}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
