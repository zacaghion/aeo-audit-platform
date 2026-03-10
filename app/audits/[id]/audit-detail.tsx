"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Download, Eye, TrendingUp, Shield, AlertTriangle, Trophy,
  LayoutDashboard, MessageSquare, Swords, Lightbulb, Database,
} from "lucide-react";
import { DeleteAuditButton } from "@/components/delete-audit-button";
import { useCountUp } from "@/lib/use-count-up";
import { OverviewSection } from "./overview-tab";
import { VisibilitySection } from "./visibility-section";
import { SentimentSection } from "./sentiment-section";
import { CompetitiveSection } from "./competitive-section";
import { BenchmarkTab } from "./benchmark-tab";
import { RecommendationsSection } from "./recommendations-section";
import { RawDataTab } from "./raw-data-tab";
import type { AuditSummary, AnalysisOutput } from "@/types";

interface AuditData {
  id: string;
  status: string;
  summary: AuditSummary | null;
  analysis: AnalysisOutput | null;
  completedAt: string | null;
  brand: { name: string; location: string; competitors: string };
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
      brandMentioned: boolean;
      mentionPosition: string | null;
      mentionSentiment: string | null;
      competitorsMentioned: string[];
      competitorCount: number;
      answerLength: number;
      status: string;
    }>;
  }>;
}

const SECTIONS = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "visibility", label: "Visibility", icon: Eye },
  { id: "sentiment", label: "Sentiment", icon: MessageSquare },
  { id: "competitive", label: "Competitive", icon: Swords },
  { id: "benchmark", label: "Benchmark", icon: Trophy },
  { id: "recommendations", label: "Improve", icon: Lightbulb },
  { id: "raw", label: "Raw Data", icon: Database },
];

function AnimatedNumber({ value, suffix = "" }: { value: number | null | undefined; suffix?: string }) {
  const num = useCountUp(value ?? 0);
  if (value == null) return <>—{suffix}</>;
  return <>{num}{suffix}</>;
}

export function AuditDetail({ audit }: { audit: AuditData }) {
  const router = useRouter();
  const [activeSection, setActiveSection] = useState("overview");
  const summary = audit.summary;
  const analysis = audit.analysis;

  const handleExport = async () => {
    const res = await fetch(`/api/export?auditId=${audit.id}`);
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `aeo-audit-${audit.brand.name.replace(/\s+/g, "-").toLowerCase()}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const visibleSections = SECTIONS.filter((s) => {
    if (s.id === "benchmark" && !analysis?.benchmark) return false;
    if (["visibility", "sentiment", "competitive", "recommendations"].includes(s.id) && !analysis) return false;
    return true;
  });

  return (
    <div className="flex gap-6 min-h-[calc(100vh-5rem)]">
      {/* Sidebar */}
      <aside className="w-56 shrink-0 border-r border-border pr-4">
        <div className="sticky top-20 space-y-6">
          <div>
            <h2 className="font-semibold text-lg truncate">{audit.brand.name}</h2>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant={audit.status === "COMPLETE" ? "success" : "secondary"} className="text-xs">
                {audit.status.replace("_", " ")}
              </Badge>
            </div>
            {audit.brand.location && <p className="text-xs text-muted-foreground mt-1">{audit.brand.location}</p>}
          </div>

          <nav className="space-y-1">
            {visibleSections.map((section) => {
              const Icon = section.icon;
              return (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={cn(
                    "flex items-center gap-2.5 w-full rounded-md px-3 py-2 text-sm font-medium transition-all duration-200",
                    activeSection === section.id
                      ? "bg-indigo-500/10 text-indigo-400 border-l-2 border-l-indigo-500"
                      : "text-gray-400 hover:bg-white/5 hover:text-gray-200"
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {section.label}
                </button>
              );
            })}
          </nav>

          <div className="space-y-2 pt-4 border-t border-border">
            {audit.status === "COMPLETE" && (
              <Button onClick={handleExport} variant="outline" size="sm" className="w-full justify-start border-[#374151] text-gray-400 hover:text-white">
                <Download className="mr-2 h-4 w-4" /> Export
              </Button>
            )}
            <DeleteAuditButton
              auditId={audit.id}
              brandName={audit.brand.name}
              variant="full"
              onDeleted={() => router.push("/")}
            />
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 min-w-0 space-y-6">
        {/* Score Cards */}
        {summary && activeSection === "overview" && (
          <div className="grid gap-4 md:grid-cols-5">
            <Card className="bg-[#111827] border border-[#1F2937] rounded-xl border-t-2 border-t-emerald-500">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-xs font-medium text-gray-400 uppercase tracking-wider">Mention Rate</CardTitle>
                <Eye className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold font-mono text-white">
                  <AnimatedNumber value={summary.mentionRate} suffix="%" />
                </div>
              </CardContent>
            </Card>
            <Card className="md:col-span-2 bg-[#111827] border border-[#1F2937] rounded-xl border-t-2 border-t-indigo-500">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-xs font-medium text-gray-400 uppercase tracking-wider">Visibility</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-5xl font-bold font-mono text-white">
                  <AnimatedNumber value={analysis?.brand_visibility?.overall_score} suffix="/100" />
                </div>
              </CardContent>
            </Card>
            <Card className="bg-[#111827] border border-[#1F2937] rounded-xl border-t-2 border-t-violet-500">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-xs font-medium text-gray-400 uppercase tracking-wider">Sentiment</CardTitle>
                <Shield className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold font-mono text-white">
                  <AnimatedNumber value={analysis?.sentiment_analysis?.sentiment_score} suffix="/100" />
                </div>
              </CardContent>
            </Card>
            <Card className="bg-[#111827] border border-[#1F2937] rounded-xl border-t-2 border-t-amber-500">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-xs font-medium text-gray-400 uppercase tracking-wider">
                  {analysis?.benchmark ? "Rank" : "Top Threat"}
                </CardTitle>
                {analysis?.benchmark ? <Trophy className="h-4 w-4 text-muted-foreground" /> : <AlertTriangle className="h-4 w-4 text-muted-foreground" />}
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold font-mono text-white">
                  {analysis?.benchmark
                    ? `#${analysis.benchmark.rank} of ${analysis.benchmark.totalCompetitors}`
                    : summary.topCompetitors?.[0]?.name ?? "—"}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Section Content */}
        {activeSection === "overview" && <OverviewSection audit={audit} />}
        {activeSection === "visibility" && analysis && <VisibilitySection analysis={analysis} />}
        {activeSection === "sentiment" && analysis && <SentimentSection analysis={analysis} />}
        {activeSection === "competitive" && analysis && <CompetitiveSection analysis={analysis} />}
        {activeSection === "benchmark" && analysis?.benchmark && <BenchmarkTab benchmark={analysis.benchmark} />}
        {activeSection === "recommendations" && analysis && <RecommendationsSection recommendations={analysis.recommendations} />}
        {activeSection === "raw" && <RawDataTab prompts={audit.prompts} />}
      </div>
    </div>
  );
}
