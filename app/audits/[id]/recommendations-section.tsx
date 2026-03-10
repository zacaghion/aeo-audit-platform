"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Copy, Check, ExternalLink, ChevronRight } from "lucide-react";
import { PROVIDER_COLORS } from "@/lib/chart-theme";
import type { AnalysisOutput } from "@/types";

/* ── Helpers ── */

function impactBadge(impact?: string) {
  if (!impact) return null;
  const lower = impact.toLowerCase();
  let cls = "bg-gray-500/20 text-gray-400 border-transparent";
  if (lower.includes("high")) cls = "bg-emerald-500/20 text-emerald-400 border-transparent";
  else if (lower.includes("medium")) cls = "bg-amber-500/20 text-amber-400 border-transparent";
  return (
    <Badge className={`text-xs ${cls}`}>
      {impact} impact
    </Badge>
  );
}

function effortBadge(effort?: string) {
  if (!effort) return null;
  const lower = effort.toLowerCase();
  let cls = "bg-sky-500/20 text-sky-400 border-transparent";
  if (lower.includes("high")) cls = "bg-rose-500/20 text-rose-400 border-transparent";
  else if (lower.includes("medium")) cls = "bg-amber-500/20 text-amber-400 border-transparent";
  return (
    <Badge className={`text-xs ${cls}`}>
      {effort} effort
    </Badge>
  );
}

function priorityBadge(priority: string) {
  const lower = priority.toLowerCase();
  let cls = "bg-gray-500 text-white text-xs font-bold px-2.5 py-0.5 rounded-full";
  if (lower === "high") cls = "bg-red-500 text-white text-xs font-bold px-2.5 py-0.5 rounded-full";
  else if (lower === "medium") cls = "bg-amber-500 text-white text-xs font-bold px-2.5 py-0.5 rounded-full";
  return (
    <span className={cls}>
      {priority} priority
    </span>
  );
}

/* ── ActionItem: shared layout for quick_wins / long_term_plays ── */

function ActionItem({
  item,
  dismissed,
  id,
}: {
  item: string | { action: string; steps?: string[]; estimated_impact?: string; effort?: string };
  dismissed: boolean;
  id: string;
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

/* ── Main Component ── */

export function RecommendationsSection({
  recommendations,
}: {
  recommendations: AnalysisOutput["recommendations"];
}) {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState<Set<string>>(() => new Set());
  const [checkedTechnical, setCheckedTechnical] = useState<Set<number>>(
    () => new Set(),
  );

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

  /* ── Derived data ── */

  const technicalItems = [
    ...(recommendations.structured_data_recommendations ?? []).map((t) => ({
      label: t,
      category: "Structured Data",
    })),
    ...(recommendations.third_party_actions ?? []).map((t) => ({
      label: t,
      category: "Third-Party",
    })),
  ];

  return (
    <div className="space-y-10">
      {/* ═══════════════════════════════════════════════
          1. Existing Content to Update (most actionable)
         ═══════════════════════════════════════════════ */}
      {recommendations.existing_content_to_update?.length > 0 && (
        <div className="space-y-4">
          <div>
            <p className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-1">Actionable</p>
            <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
              🔧 Existing Content to Update
              <Badge variant="secondary" className="text-xs">
                {recommendations.existing_content_to_update.length} items
              </Badge>
            </h3>
          </div>
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
                    {/* Top row: impact / effort / page_type badges */}
                    <div className="flex flex-wrap items-center gap-2">
                      {impactBadge(estimatedImpact)}
                      {effortBadge(item.effort)}
                      {item.page_type && (
                        <Badge variant="outline" className="text-xs">
                          {item.page_type}
                        </Badge>
                      )}
                      {priorityBadge(item.priority)}
                    </div>

                    {/* Page URL */}
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
                    {/* Current State */}
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

                    {/* Suggested Revision */}
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
                              <>
                                <Check className="h-3.5 w-3.5 mr-1 text-white" />
                                Copied
                              </>
                            ) : (
                              <>
                                <Copy className="h-3.5 w-3.5 mr-1" />
                                Copy
                              </>
                            )}
                          </button>
                        </div>
                        <div className="mt-1.5 border-l-4 border-emerald-500 bg-emerald-500/10 p-4 rounded-r-lg">
                          <p className="text-sm text-emerald-300">{suggestedRevision}</p>
                        </div>
                      </div>
                    )}

                    {/* Rationale */}
                    {item.rationale && (
                      <p className="text-sm text-gray-400">
                        {item.rationale}
                      </p>
                    )}

                    {/* Steps */}
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
        </div>
      )}

      {/* ═══════════════════════════════════════════════
          2. New Content to Create
         ═══════════════════════════════════════════════ */}
      {recommendations.new_content_to_create?.length > 0 && (
        <div className="space-y-4">
          <div>
            <p className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-1">Content Strategy</p>
            <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
              ✏️ New Content to Create
              <Badge variant="secondary" className="text-xs">
                {recommendations.new_content_to_create.length} items
              </Badge>
            </h3>
          </div>
          <div className="space-y-4">
            {recommendations.new_content_to_create.map((item, i) => {
              const itemId = `new-content-${i}`;
              if (dismissed.has(itemId)) return null;

              return (
                <Card key={i} className="bg-[#111827] border border-[#1F2937] rounded-xl">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base text-white">{item.topic}</CardTitle>
                    <div className="flex flex-wrap items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-xs">
                        {item.type}
                      </Badge>
                      {priorityBadge(item.priority)}
                      {impactBadge(item.estimated_impact)}
                      {effortBadge(item.effort)}
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    {/* Draft Outline */}
                    {item.draft_outline && item.draft_outline.length > 0 && (
                      <div>
                        <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">
                          Draft Outline
                        </span>
                        <div className="mt-1.5 rounded-md bg-[#1F2937]/50 border border-[#1F2937] px-3 py-2">
                          {item.draft_outline.map((line, j) => (
                            <p key={j} className="text-sm text-gray-300 pl-4">
                              {line}
                            </p>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Rationale */}
                    <p className="text-sm text-gray-400">
                      {item.rationale}
                    </p>

                    {/* Scope */}
                    {item.suggested_scope && (
                      <div>
                        <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">
                          Scope
                        </span>
                        <p className="text-sm text-gray-300 mt-1">
                          {item.suggested_scope}
                        </p>
                      </div>
                    )}

                    {/* Target providers */}
                    {item.target_providers?.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-xs text-gray-400 mr-1">
                          Target providers:
                        </span>
                        {item.target_providers.map((provider) => (
                          <Badge
                            key={provider}
                            variant="secondary"
                            className="text-xs inline-flex items-center"
                          >
                            <span
                              className="inline-block w-2 h-2 rounded-full mr-1"
                              style={{ backgroundColor: PROVIDER_COLORS[provider.toLowerCase()] || '#6366F1' }}
                            />
                            {provider}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════
          3. Quick Wins
         ═══════════════════════════════════════════════ */}
      {recommendations.quick_wins?.length > 0 && (
        <div className="space-y-4">
          <div>
            <p className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-1">Low Effort</p>
            <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
              ⚡ Quick Wins
              <Badge variant="success" className="text-xs">
                {recommendations.quick_wins.length} items
              </Badge>
            </h3>
          </div>
          <div className="space-y-3">
            {recommendations.quick_wins.map((item, i) => {
              const itemId = `quick-win-${i}`;
              return (
                <ActionItem
                  key={i}
                  item={item}
                  dismissed={dismissed.has(itemId)}
                  id={itemId}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════
          4. Long-Term Plays
         ═══════════════════════════════════════════════ */}
      {recommendations.long_term_plays?.length > 0 && (
        <div className="space-y-4">
          <div>
            <p className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-1">Strategic</p>
            <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
              🎯 Long-Term Plays
              <Badge variant="warning" className="text-xs">
                {recommendations.long_term_plays.length} items
              </Badge>
            </h3>
          </div>
          <div className="space-y-3">
            {recommendations.long_term_plays.map((item, i) => {
              const itemId = `long-term-${i}`;
              return (
                <ActionItem
                  key={i}
                  item={item}
                  dismissed={dismissed.has(itemId)}
                  id={itemId}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════
          5. Technical (Structured Data + Third-Party Actions)
         ═══════════════════════════════════════════════ */}
      {technicalItems.length > 0 && (
        <div className="space-y-4">
          <div>
            <p className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-1">Implementation</p>
            <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
              🛠 Technical Recommendations
              <Badge variant="outline" className="text-xs">
                {technicalItems.length} items
              </Badge>
            </h3>
          </div>
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
                        {isChecked && (
                          <Check className="h-3 w-3 text-emerald-400" />
                        )}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <Badge variant="outline" className="text-xs shrink-0">
                            {item.category}
                          </Badge>
                        </div>
                        <p
                          className={`text-sm transition-all duration-200 ${
                            isChecked
                              ? "line-through text-gray-600"
                              : "text-gray-300"
                          }`}
                        >
                          {item.label}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
