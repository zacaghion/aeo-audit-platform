"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Copy, Check, ExternalLink, ChevronRight, Loader2, Sparkles } from "lucide-react";
import { PROVIDER_COLORS } from "@/lib/chart-theme";
import { cn } from "@/lib/utils";
import type { AnalysisOutput } from "@/types";

/* ── Helpers ── */

function impactBadge(impact?: string) {
  if (!impact) return null;
  const lower = impact.toLowerCase();
  let cls = "bg-gray-500/20 text-gray-400 border-transparent";
  if (lower.includes("high")) cls = "bg-emerald-500/20 text-emerald-400 border-transparent";
  else if (lower.includes("medium")) cls = "bg-amber-500/20 text-amber-400 border-transparent";
  return <Badge className={`text-xs ${cls}`}>{impact} impact</Badge>;
}

function effortBadge(effort?: string) {
  if (!effort) return null;
  const lower = effort.toLowerCase();
  let cls = "bg-sky-500/20 text-sky-400 border-transparent";
  if (lower.includes("high")) cls = "bg-rose-500/20 text-rose-400 border-transparent";
  else if (lower.includes("medium")) cls = "bg-amber-500/20 text-amber-400 border-transparent";
  return <Badge className={`text-xs ${cls}`}>{effort} effort</Badge>;
}

function priorityBadge(priority: string) {
  const lower = priority.toLowerCase();
  let cls = "bg-gray-500 text-white text-xs font-bold px-2.5 py-0.5 rounded-full";
  if (lower === "high") cls = "bg-red-500 text-white text-xs font-bold px-2.5 py-0.5 rounded-full";
  else if (lower === "medium") cls = "bg-amber-500 text-white text-xs font-bold px-2.5 py-0.5 rounded-full";
  return <span className={cls}>{priority} priority</span>;
}

function ActionItem({
  item,
  dismissed,
}: {
  item: string | { action: string; steps?: string[]; estimated_impact?: string; effort?: string };
  dismissed: boolean;
}) {
  if (dismissed) return null;
  if (typeof item === "string") {
    return (
      <Card className="bg-[#111827] border border-[#1F2937] rounded-xl">
        <CardContent className="pt-6">
          <div className="flex items-start gap-2">
            <ChevronRight className="h-4 w-4 mt-0.5 shrink-0 text-gray-500" />
            <p className="text-sm text-gray-300">{item}</p>
          </div>
        </CardContent>
      </Card>
    );
  }
  return (
    <Card className="bg-[#111827] border border-[#1F2937] rounded-xl">
      <CardContent className="pt-6 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          {impactBadge(item.estimated_impact)}
          {effortBadge(item.effort)}
        </div>
        <div className="flex items-start gap-2">
          <ChevronRight className="h-4 w-4 mt-0.5 shrink-0 text-gray-500" />
          <p className="text-sm font-medium text-white">{item.action}</p>
        </div>
        {item.steps && item.steps.length > 0 && (
          <ol className="space-y-1 pl-6 text-sm text-gray-300">
            {item.steps.map((step, j) => (
              <li key={j} className="flex items-start gap-2">
                <span className="text-indigo-400 font-semibold">{j + 1}.</span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}

/* ── Types ── */

interface BrandInfo {
  name: string;
  website?: string;
  category?: string;
  features?: string;
  competitors: string;
}

interface PromptInfo {
  promptNumber: number;
  promptText: string;
  category: string;
  responses: Array<{ brandMentioned: boolean; status: string }>;
}

interface Props {
  recommendations: AnalysisOutput["recommendations"];
  brand: BrandInfo;
  analysis: AnalysisOutput;
  prompts: PromptInfo[];
  mentionRate?: number;
}

/* ── Sub-tab definitions ── */

type SubTab = "existing" | "new-content" | "quick-wins" | "long-term" | "tech";

const SUB_TABS: Array<{ id: SubTab; label: string; emoji: string }> = [
  { id: "existing", label: "Update Existing", emoji: "🔧" },
  { id: "new-content", label: "New Content", emoji: "✏️" },
  { id: "quick-wins", label: "Quick Wins", emoji: "⚡" },
  { id: "long-term", label: "Long-Term Plays", emoji: "🎯" },
  { id: "tech", label: "Tech Recs", emoji: "🛠" },
];

/* ── Main Component ── */

export function RecommendationsSection({ recommendations, brand, analysis, prompts, mentionRate }: Props) {
  const [activeTab, setActiveTab] = useState<SubTab>("existing");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [dismissed] = useState<Set<string>>(() => new Set());
  const [checkedTechnical, setCheckedTechnical] = useState<Set<number>>(() => new Set());
  const [generatedContent, setGeneratedContent] = useState<Record<number, string>>({});
  const [generating, setGenerating] = useState<Record<number, boolean>>({});
  const [generateError, setGenerateError] = useState<Record<number, string>>({});

  function handleCopy(text: string, id: string) {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  function toggleTechnical(index: number) {
    setCheckedTechnical((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }

  /* ── Build audit context for content generation ── */

  function buildAuditContext(item: AnalysisOutput["recommendations"]["new_content_to_create"][0]) {
    const vis = analysis.brand_visibility;
    const comp = analysis.competitive_positioning;

    const weakCats = Object.entries(vis.category_scores || {})
      .filter(([, s]) => s < 50)
      .map(([c, s]) => `${c} (${s}%)`)
      .slice(0, 5);

    const topComps = comp.primary_competitors
      ?.slice(0, 3)
      .map((c) => `${c.name} (${c.total_mentions} mentions)`) || [];

    const competitiveGapReason = comp.primary_competitors?.[0]?.what_they_do_right || "they have more comprehensive content";

    // Map target_queries indices to actual prompt texts + missed prompts
    const targetQueryTexts: string[] = [];
    if (item.target_queries?.length > 0) {
      for (const idx of item.target_queries) {
        const p = prompts.find((pr) => pr.promptNumber === idx);
        if (p) targetQueryTexts.push(p.promptText);
      }
    }
    // Add missed prompts relevant to this content type
    const missedPrompts = prompts
      .filter((p) => p.responses.filter((r) => r.status === "success").every((r) => !r.brandMentioned))
      .slice(0, 5)
      .map((p) => p.promptText);
    for (const mp of missedPrompts) {
      if (!targetQueryTexts.includes(mp)) targetQueryTexts.push(mp);
    }

    return {
      visibilityScore: vis.overall_score,
      mentionRate: mentionRate ?? 0,
      sentimentScore: analysis.sentiment_analysis?.sentiment_score,
      weakestCategories: weakCats,
      topCompetitors: topComps,
      competitiveGapReason,
      targetQueries: targetQueryTexts.slice(0, 8),
    };
  }

  async function handleGenerate(index: number) {
    const item = recommendations.new_content_to_create[index];
    if (!item) return;

    setGenerating((prev) => ({ ...prev, [index]: true }));
    setGenerateError((prev) => ({ ...prev, [index]: "" }));

    try {
      const ctx = buildAuditContext(item);
      const res = await fetch("/api/generate-content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contentType: item.type,
          topic: item.topic,
          draftOutline: item.draft_outline,
          rationale: item.rationale,
          suggestedScope: item.suggested_scope,
          brandName: brand.name,
          brandWebsite: brand.website,
          brandCategory: brand.category,
          brandFeatures: brand.features,
          competitors: brand.competitors,
          auditContext: ctx,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setGenerateError((prev) => ({ ...prev, [index]: data.error || "Failed to generate" }));
      } else {
        setGeneratedContent((prev) => ({ ...prev, [index]: data.content }));
      }
    } catch {
      setGenerateError((prev) => ({ ...prev, [index]: "Network error" }));
    } finally {
      setGenerating((prev) => ({ ...prev, [index]: false }));
    }
  }

  /* ── Count items per tab ── */

  const technicalItems = [
    ...(recommendations.structured_data_recommendations ?? []).map((t) => ({ label: t, category: "Structured Data" })),
    ...(recommendations.third_party_actions ?? []).map((t) => ({ label: t, category: "Third-Party" })),
  ];

  const counts: Record<SubTab, number> = {
    existing: recommendations.existing_content_to_update?.length ?? 0,
    "new-content": recommendations.new_content_to_create?.length ?? 0,
    "quick-wins": recommendations.quick_wins?.length ?? 0,
    "long-term": recommendations.long_term_plays?.length ?? 0,
    tech: technicalItems.length,
  };

  const visibleTabs = SUB_TABS.filter((t) => counts[t.id] > 0);

  // Default to first visible tab
  const effectiveTab = visibleTabs.find((t) => t.id === activeTab) ? activeTab : visibleTabs[0]?.id ?? "existing";

  return (
    <div className="space-y-6">
      {/* ── Sub-tab bar ── */}
      <div className="flex gap-1 border-b border-[#1F2937] pb-0">
        {visibleTabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "px-4 py-2.5 text-sm font-medium transition-all duration-200 border-b-2 -mb-px",
              effectiveTab === tab.id
                ? "border-indigo-500 text-indigo-400"
                : "border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-600"
            )}
          >
            {tab.emoji} {tab.label}
            <span className="ml-1.5 text-xs text-gray-500">({counts[tab.id]})</span>
          </button>
        ))}
      </div>

      {/* ════════════════════════════════════════════
          Tab: Update Existing
         ════════════════════════════════════════════ */}
      {effectiveTab === "existing" && recommendations.existing_content_to_update?.length > 0 && (
        <div className="space-y-4">
          {recommendations.existing_content_to_update.map((item, i) => {
            const itemId = `existing-${i}`;
            if (dismissed.has(itemId)) return null;

            const pageUrl = item.page_url || item.url;
            const hasNewFields = !!item.current_state;
            const currentState = item.current_state || item.issue || "";
            const suggestedRevision = item.suggested_revision || item.fix || "";
            const estimatedImpact = item.estimated_impact || item.expected_impact;

            return (
              <Card key={i} className="bg-[#111827] border border-[#1F2937] rounded-xl">
                <CardHeader className="pb-3">
                  <div className="flex flex-wrap items-center gap-2">
                    {impactBadge(estimatedImpact)}
                    {effortBadge(item.effort)}
                    {item.page_type && <Badge variant="outline" className="text-xs">{item.page_type}</Badge>}
                    {priorityBadge(item.priority)}
                  </div>
                  {pageUrl && (
                    <a
                      href={pageUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-sm text-sky-400 hover:text-sky-300 hover:underline truncate mt-1"
                    >
                      <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">{pageUrl}</span>
                    </a>
                  )}
                </CardHeader>
                <CardContent className="space-y-4">
                  {currentState && (
                    <div>
                      <span className="text-xs font-medium text-red-400 uppercase tracking-wide">
                        {hasNewFields ? "Current State" : "Issue"}
                      </span>
                      <div className="mt-1.5 border-l-4 border-red-500 bg-red-500/10 p-4 rounded-r-lg">
                        <p className="text-sm text-red-300">{currentState}</p>
                      </div>
                    </div>
                  )}
                  {suggestedRevision && (
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-emerald-400 uppercase tracking-wide">
                          {hasNewFields ? "Suggested Revision" : "Fix"}
                        </span>
                        <button
                          className="bg-indigo-500 hover:bg-indigo-600 text-white text-xs font-medium px-3 py-1 rounded-md transition-colors inline-flex items-center"
                          onClick={() => handleCopy(suggestedRevision, itemId)}
                        >
                          {copiedId === itemId ? (
                            <><Check className="h-3.5 w-3.5 mr-1 text-white" />Copied</>
                          ) : (
                            <><Copy className="h-3.5 w-3.5 mr-1" />Copy</>
                          )}
                        </button>
                      </div>
                      <div className="mt-1.5 border-l-4 border-emerald-500 bg-emerald-500/10 p-4 rounded-r-lg">
                        <p className="text-sm text-emerald-300">{suggestedRevision}</p>
                      </div>
                    </div>
                  )}
                  {item.rationale && <p className="text-sm text-gray-400">{item.rationale}</p>}
                  {item.steps && item.steps.length > 0 && (
                    <ol className="space-y-1 text-sm text-gray-300">
                      {item.steps.map((step, j) => (
                        <li key={j} className="flex items-start gap-2">
                          <span className="text-indigo-400 font-semibold">{j + 1}.</span>
                          <span>{step}</span>
                        </li>
                      ))}
                    </ol>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* ════════════════════════════════════════════
          Tab: New Content
         ════════════════════════════════════════════ */}
      {effectiveTab === "new-content" && recommendations.new_content_to_create?.length > 0 && (
        <div className="space-y-4">
          {recommendations.new_content_to_create.map((item, i) => {
            const itemId = `new-content-${i}`;
            if (dismissed.has(itemId)) return null;
            const isGenerating = generating[i] ?? false;
            const content = generatedContent[i];
            const error = generateError[i];

            return (
              <Card key={i} className="bg-[#111827] border border-[#1F2937] rounded-xl">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base text-white">{item.topic}</CardTitle>
                  <div className="flex flex-wrap items-center gap-2 mt-1">
                    <Badge variant="outline" className="text-xs">{item.type}</Badge>
                    {priorityBadge(item.priority)}
                    {impactBadge(item.estimated_impact)}
                    {effortBadge(item.effort)}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {item.draft_outline && item.draft_outline.length > 0 && (
                    <div>
                      <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">Draft Outline</span>
                      <div className="mt-1.5 rounded-md bg-[#1F2937]/50 border border-[#1F2937] px-3 py-2">
                        {item.draft_outline.map((line, j) => (
                          <p key={j} className="text-sm text-gray-300 pl-4">{line}</p>
                        ))}
                      </div>
                    </div>
                  )}
                  <p className="text-sm text-gray-400">{item.rationale}</p>
                  {item.suggested_scope && (
                    <div>
                      <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">Scope</span>
                      <p className="text-sm text-gray-300 mt-1">{item.suggested_scope}</p>
                    </div>
                  )}
                  {item.target_providers?.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-xs text-gray-400 mr-1">Target providers:</span>
                      {item.target_providers.map((provider) => (
                        <Badge key={provider} variant="secondary" className="text-xs inline-flex items-center">
                          <span
                            className="inline-block w-2 h-2 rounded-full mr-1"
                            style={{ backgroundColor: PROVIDER_COLORS[provider.toLowerCase()] || '#6366F1' }}
                          />
                          {provider}
                        </Badge>
                      ))}
                    </div>
                  )}

                  {/* Generate Content button */}
                  {!content && (
                    <button
                      onClick={() => handleGenerate(i)}
                      disabled={isGenerating}
                      className="bg-indigo-500 hover:bg-indigo-600 disabled:bg-indigo-500/50 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors inline-flex items-center gap-2"
                    >
                      {isGenerating ? (
                        <><Loader2 className="h-4 w-4 animate-spin" />Generating...</>
                      ) : (
                        <><Sparkles className="h-4 w-4" />Generate Content</>
                      )}
                    </button>
                  )}
                  {error && <p className="text-sm text-red-400">{error}</p>}

                  {/* Generated content panel */}
                  {content && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-emerald-400 uppercase tracking-wide">
                          Generated Content
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleGenerate(i)}
                            disabled={isGenerating}
                            className="text-gray-400 hover:text-gray-200 text-xs font-medium px-2 py-1 rounded transition-colors inline-flex items-center gap-1"
                          >
                            {isGenerating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                            Regenerate
                          </button>
                          <button
                            className="bg-indigo-500 hover:bg-indigo-600 text-white text-xs font-medium px-3 py-1 rounded-md transition-colors inline-flex items-center"
                            onClick={() => handleCopy(content, `gen-${i}`)}
                          >
                            {copiedId === `gen-${i}` ? (
                              <><Check className="h-3.5 w-3.5 mr-1 text-white" />Copied</>
                            ) : (
                              <><Copy className="h-3.5 w-3.5 mr-1" />Copy Content</>
                            )}
                          </button>
                        </div>
                      </div>
                      <div className="border-l-4 border-emerald-500 bg-emerald-500/5 p-4 rounded-r-lg">
                        <div className="prose prose-invert prose-sm max-w-none whitespace-pre-wrap text-gray-300">
                          {content}
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* ════════════════════════════════════════════
          Tab: Quick Wins
         ════════════════════════════════════════════ */}
      {effectiveTab === "quick-wins" && recommendations.quick_wins?.length > 0 && (
        <div className="space-y-3">
          {recommendations.quick_wins.map((item, i) => (
            <ActionItem key={i} item={item} dismissed={dismissed.has(`quick-win-${i}`)} />
          ))}
        </div>
      )}

      {/* ════════════════════════════════════════════
          Tab: Long-Term Plays
         ════════════════════════════════════════════ */}
      {effectiveTab === "long-term" && recommendations.long_term_plays?.length > 0 && (
        <div className="space-y-3">
          {recommendations.long_term_plays.map((item, i) => (
            <ActionItem key={i} item={item} dismissed={dismissed.has(`long-term-${i}`)} />
          ))}
        </div>
      )}

      {/* ════════════════════════════════════════════
          Tab: Tech Recommendations
         ════════════════════════════════════════════ */}
      {effectiveTab === "tech" && technicalItems.length > 0 && (
        <Card className="bg-[#111827] border border-[#1F2937] rounded-xl">
          <CardContent className="pt-6">
            <ul className="space-y-3">
              {technicalItems.map((item, i) => {
                const isChecked = checkedTechnical.has(i);
                return (
                  <li
                    key={i}
                    className="flex items-start gap-3 cursor-pointer group transition-all duration-200"
                    onClick={() => toggleTechnical(i)}
                  >
                    <span
                      className={`mt-0.5 shrink-0 flex items-center justify-center h-5 w-5 rounded-full border-2 transition-all duration-200 ${
                        isChecked
                          ? "border-emerald-500 bg-emerald-500/20"
                          : "border-gray-600 group-hover:border-gray-400"
                      }`}
                    >
                      {isChecked && <Check className="h-3 w-3 text-emerald-400" />}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <Badge variant="outline" className="text-xs shrink-0">{item.category}</Badge>
                      </div>
                      <p className={`text-sm transition-all duration-200 ${isChecked ? "line-through text-gray-600" : "text-gray-300"}`}>
                        {item.label}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
