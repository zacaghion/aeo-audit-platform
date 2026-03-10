"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { AnalysisOutput } from "@/types";

/* ── Helpers ── */

function priorityDashedClass(priority: string): string {
  switch (priority.toLowerCase()) {
    case "high":
      return "border-dashed border-emerald-500 text-emerald-400";
    case "medium":
      return "border-dashed border-amber-500 text-amber-400";
    case "low":
      return "border-dashed border-red-500 text-red-400";
    default:
      return "border-dashed border-muted-foreground text-muted-foreground";
  }
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

function impactLabel(priority: string): string {
  switch (priority.toLowerCase()) {
    case "high":
      return "High impact, Low effort";
    case "medium":
      return "Medium impact";
    case "low":
      return "Low impact, Higher effort";
    default:
      return priority;
  }
}

/* ── Reusable action-card wrapper ── */

function ActionCard({
  index,
  dismissed,
  done,
  onDismiss,
  onDone,
  children,
}: {
  index: number;
  dismissed: Set<number>;
  done: Set<number>;
  onDismiss: (i: number) => void;
  onDone: (i: number) => void;
  children: React.ReactNode;
}) {
  if (dismissed.has(index)) return null;

  const isDone = done.has(index);

  return (
    <Card
      className={`transition-all duration-300 ${isDone ? "opacity-70" : ""}`}
    >
      <CardContent className="pt-6 relative">
        {isDone && (
          <div className="absolute top-3 right-3 text-emerald-400">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          </div>
        )}
        <div className={`transition-all duration-300 ${isDone ? "line-through decoration-emerald-500/50" : ""}`}>
          {children}
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDismiss(index)}
            className="text-muted-foreground hover:text-foreground"
          >
            Dismiss
          </Button>
          <Button
            variant={isDone ? "secondary" : "outline"}
            size="sm"
            onClick={() => onDone(index)}
            className={isDone ? "text-emerald-400" : ""}
          >
            {isDone ? "✓ Done" : "Mark as done"}
          </Button>
        </div>
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
  const [dismissedQuickWins, setDismissedQuickWins] = useState<Set<number>>(
    () => new Set(),
  );
  const [doneQuickWins, setDoneQuickWins] = useState<Set<number>>(
    () => new Set(),
  );

  const [dismissedNewContent, setDismissedNewContent] = useState<Set<number>>(
    () => new Set(),
  );
  const [doneNewContent, setDoneNewContent] = useState<Set<number>>(
    () => new Set(),
  );

  const [dismissedLongTerm, setDismissedLongTerm] = useState<Set<number>>(
    () => new Set(),
  );
  const [doneLongTerm, setDoneLongTerm] = useState<Set<number>>(
    () => new Set(),
  );

  const [dismissedExisting, setDismissedExisting] = useState<Set<number>>(
    () => new Set(),
  );
  const [doneExisting, setDoneExisting] = useState<Set<number>>(
    () => new Set(),
  );

  const [checkedTechnical, setCheckedTechnical] = useState<Set<number>>(
    () => new Set(),
  );

  /* ── State helpers ── */

  function toggleSet(
    setter: React.Dispatch<React.SetStateAction<Set<number>>>,
    index: number,
  ) {
    setter((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }

  function addToSet(
    setter: React.Dispatch<React.SetStateAction<Set<number>>>,
    index: number,
  ) {
    setter((prev) => new Set(prev).add(index));
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
    <div className="space-y-8">
      {/* ── Quick Wins ── */}
      {recommendations.quick_wins?.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            ⚡ Quick Wins
            <Badge variant="success" className="text-xs">
              {recommendations.quick_wins.length} items
            </Badge>
          </h3>
          <div className="space-y-3">
            {recommendations.quick_wins.map((item, i) => (
              <ActionCard
                key={i}
                index={i}
                dismissed={dismissedQuickWins}
                done={doneQuickWins}
                onDismiss={(idx) => addToSet(setDismissedQuickWins, idx)}
                onDone={(idx) => toggleSet(setDoneQuickWins, idx)}
              >
                <Badge
                  variant="outline"
                  className={`mb-3 ${priorityDashedClass("high")}`}
                >
                  {impactLabel("high")}
                </Badge>
                <p className="text-sm text-foreground">{item}</p>
              </ActionCard>
            ))}
          </div>
        </div>
      )}

      {/* ── New Content to Create ── */}
      {recommendations.new_content_to_create?.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            ✏️ New Content to Create
            <Badge variant="secondary" className="text-xs">
              {recommendations.new_content_to_create.length} items
            </Badge>
          </h3>
          <div className="space-y-3">
            {recommendations.new_content_to_create.map((item, i) => (
              <ActionCard
                key={i}
                index={i}
                dismissed={dismissedNewContent}
                done={doneNewContent}
                onDismiss={(idx) => addToSet(setDismissedNewContent, idx)}
                onDone={(idx) => toggleSet(setDoneNewContent, idx)}
              >
                <div className="space-y-3">
                  <h4 className="text-base font-medium">{item.topic}</h4>

                  {/* Badge row */}
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge
                      variant={priorityBadgeVariant(item.priority)}
                      className="text-xs capitalize"
                    >
                      {item.priority} priority
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {item.type}
                    </Badge>
                  </div>

                  {/* Rationale */}
                  <p className="text-sm text-muted-foreground">
                    {item.rationale}
                  </p>

                  {/* Scope */}
                  {item.suggested_scope && (
                    <div>
                      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        Scope:
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
                        Target:
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
                </div>
              </ActionCard>
            ))}
          </div>
        </div>
      )}

      {/* ── Long-Term Plays ── */}
      {recommendations.long_term_plays?.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            🎯 Long-Term Plays
            <Badge variant="warning" className="text-xs">
              {recommendations.long_term_plays.length} items
            </Badge>
          </h3>
          <div className="space-y-3">
            {recommendations.long_term_plays.map((item, i) => (
              <ActionCard
                key={i}
                index={i}
                dismissed={dismissedLongTerm}
                done={doneLongTerm}
                onDismiss={(idx) => addToSet(setDismissedLongTerm, idx)}
                onDone={(idx) => toggleSet(setDoneLongTerm, idx)}
              >
                <Badge
                  variant="outline"
                  className={`mb-3 ${priorityDashedClass("medium")}`}
                >
                  Strategic
                </Badge>
                <p className="text-sm text-foreground">{item}</p>
              </ActionCard>
            ))}
          </div>
        </div>
      )}

      {/* ── Existing Content to Update ── */}
      {recommendations.existing_content_to_update?.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            🔧 Existing Content to Update
            <Badge variant="secondary" className="text-xs">
              {recommendations.existing_content_to_update.length} items
            </Badge>
          </h3>
          <div className="space-y-3">
            {recommendations.existing_content_to_update.map((item, i) => (
              <ActionCard
                key={i}
                index={i}
                dismissed={dismissedExisting}
                done={doneExisting}
                onDismiss={(idx) => addToSet(setDismissedExisting, idx)}
                onDone={(idx) => toggleSet(setDoneExisting, idx)}
              >
                <div className="space-y-3">
                  {/* Priority badge */}
                  <Badge
                    variant={priorityBadgeVariant(item.priority)}
                    className="text-xs capitalize"
                  >
                    {item.priority} priority
                  </Badge>

                  {/* URL */}
                  {item.url && (
                    <p className="text-xs font-mono text-muted-foreground truncate">
                      {item.url}
                    </p>
                  )}

                  {/* Issue */}
                  <div>
                    <span className="text-xs font-medium text-red-400 uppercase tracking-wide">
                      Issue:
                    </span>
                    <p className="text-sm text-muted-foreground mt-1">
                      {item.issue}
                    </p>
                  </div>

                  {/* Fix */}
                  <div>
                    <span className="text-xs font-medium text-emerald-400 uppercase tracking-wide">
                      Fix:
                    </span>
                    <p className="text-sm text-muted-foreground mt-1">
                      {item.fix}
                    </p>
                  </div>

                  {/* Expected Impact */}
                  {item.expected_impact && (
                    <div>
                      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        Expected Impact:
                      </span>
                      <p className="text-sm text-muted-foreground mt-1">
                        {item.expected_impact}
                      </p>
                    </div>
                  )}
                </div>
              </ActionCard>
            ))}
          </div>
        </div>
      )}

      {/* ── Technical (Structured Data + Third-Party Actions) ── */}
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
                      onClick={() => toggleSet(setCheckedTechnical, i)}
                    >
                      {/* Checkbox circle */}
                      <span
                        className={`mt-0.5 shrink-0 flex items-center justify-center h-5 w-5 rounded-full border-2 transition-all duration-200 ${
                          isChecked
                            ? "border-emerald-500 bg-emerald-500/20"
                            : "border-muted-foreground/40 group-hover:border-muted-foreground"
                        }`}
                      >
                        {isChecked && (
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="12"
                            height="12"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="3"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="text-emerald-400"
                          >
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
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
