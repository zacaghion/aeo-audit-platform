"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Copy, Check, ExternalLink, ChevronRight } from "lucide-react";
import type { AnalysisOutput } from "@/types";

/* ── Helpers ── */

function impactBadge(impact?: string) {
  if (!impact) return null;
  const lower = impact.toLowerCase();
  let variant: "success" | "warning" | "destructive" | "secondary" = "secondary";
  if (lower.includes("high")) variant = "success";
  else if (lower.includes("medium")) variant = "warning";
  else if (lower.includes("low")) variant = "destructive";
  return (
    <Badge variant={variant} className="text-xs">
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

function priorityBadgeVariant(
  priority: string,
): "success" | "warning" | "destructive" | "secondary" {
  switch (priority.toLowerCase()) {
    case "high":
      return "success";
    case "medium":
      return "warning";
    case "low":
      return "destructive";
    default:
      return "secondary";
  }
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
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start gap-2">
            <ChevronRight className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
            <p className="text-sm text-foreground">{item}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="pt-6 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          {impactBadge(item.estimated_impact)}
          {effortBadge(item.effort)}
        </div>
        <div className="flex items-start gap-2">
          <ChevronRight className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
          <p className="text-sm font-medium text-foreground">{item.action}</p>
        </div>
        {item.steps && item.steps.length > 0 && (
          <ol className="list-decimal list-inside space-y-1 pl-6 text-sm text-muted-foreground">
            {item.steps.map((step, j) => (
              <li key={j}>{step}</li>
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
          <h3 className="text-lg font-semibold flex items-center gap-2">
            🔧 Existing Content to Update
            <Badge variant="secondary" className="text-xs">
              {recommendations.existing_content_to_update.length} items
            </Badge>
          </h3>
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
                <Card key={i}>
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
                      <Badge
                        variant={priorityBadgeVariant(item.priority)}
                        className="text-xs capitalize"
                      >
                        {item.priority} priority
                      </Badge>
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
                        <div className="mt-1.5 rounded-md bg-red-500/10 border border-red-500/20 px-3 py-2">
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
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                            onClick={() => handleCopy(suggestedRevision, itemId)}
                          >
                            {copiedId === itemId ? (
                              <>
                                <Check className="h-3.5 w-3.5 mr-1 text-emerald-400" />
                                Copied
                              </>
                            ) : (
                              <>
                                <Copy className="h-3.5 w-3.5 mr-1" />
                                Copy
                              </>
                            )}
                          </Button>
                        </div>
                        <div className="mt-1.5 rounded-md bg-emerald-500/10 border border-emerald-500/20 px-3 py-2">
                          <p className="text-sm text-emerald-300">{suggestedRevision}</p>
                        </div>
                      </div>
                    )}

                    {/* Rationale */}
                    {item.rationale && (
                      <p className="text-sm text-muted-foreground">
                        {item.rationale}
                      </p>
                    )}

                    {/* Steps */}
                    {item.steps && item.steps.length > 0 && (
                      <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
                        {item.steps.map((step, j) => (
                          <li key={j}>{step}</li>
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
          <h3 className="text-lg font-semibold flex items-center gap-2">
            ✏️ New Content to Create
            <Badge variant="secondary" className="text-xs">
              {recommendations.new_content_to_create.length} items
            </Badge>
          </h3>
          <div className="space-y-4">
            {recommendations.new_content_to_create.map((item, i) => {
              const itemId = `new-content-${i}`;
              if (dismissed.has(itemId)) return null;

              return (
                <Card key={i}>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">{item.topic}</CardTitle>
                    <div className="flex flex-wrap items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-xs">
                        {item.type}
                      </Badge>
                      <Badge
                        variant={priorityBadgeVariant(item.priority)}
                        className="text-xs capitalize"
                      >
                        {item.priority} priority
                      </Badge>
                      {impactBadge(item.estimated_impact)}
                      {effortBadge(item.effort)}
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    {/* Draft Outline */}
                    {item.draft_outline && item.draft_outline.length > 0 && (
                      <div>
                        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                          Draft Outline
                        </span>
                        <div className="mt-1.5 rounded-md bg-muted/50 border border-border px-3 py-2">
                          {item.draft_outline.map((line, j) => (
                            <p key={j} className="text-sm text-muted-foreground pl-4">
                              {line}
                            </p>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Rationale */}
                    <p className="text-sm text-muted-foreground">
                      {item.rationale}
                    </p>

                    {/* Scope */}
                    {item.suggested_scope && (
                      <div>
                        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                          Scope
                        </span>
                        <p className="text-sm text-muted-foreground mt-1">
                          {item.suggested_scope}
                        </p>
                      </div>
                    )}

                    {/* Target providers */}
                    {item.target_providers?.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-xs text-muted-foreground mr-1">
                          Target providers:
                        </span>
                        {item.target_providers.map((provider) => (
                          <Badge
                            key={provider}
                            variant="secondary"
                            className="text-xs"
                          >
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
          <h3 className="text-lg font-semibold flex items-center gap-2">
            ⚡ Quick Wins
            <Badge variant="success" className="text-xs">
              {recommendations.quick_wins.length} items
            </Badge>
          </h3>
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
          <h3 className="text-lg font-semibold flex items-center gap-2">
            🎯 Long-Term Plays
            <Badge variant="warning" className="text-xs">
              {recommendations.long_term_plays.length} items
            </Badge>
          </h3>
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
          <h3 className="text-lg font-semibold flex items-center gap-2">
            🛠 Technical Recommendations
            <Badge variant="outline" className="text-xs">
              {technicalItems.length} items
            </Badge>
          </h3>
          <Card>
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
                            : "border-muted-foreground/40 group-hover:border-muted-foreground"
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
                              ? "line-through text-muted-foreground/60"
                              : "text-muted-foreground"
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
