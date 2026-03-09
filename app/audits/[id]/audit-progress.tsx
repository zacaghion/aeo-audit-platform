"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Loader2 } from "lucide-react";

interface AuditData {
  id: string;
  status: string;
  brand: { name: string; location: string };
}

interface ProgressData {
  status: string;
  totalPrompts: number;
  totalResponses: number;
  maxResponses: number;
  providerProgress?: Record<string, { total: number; errors: number }>;
  error?: string;
}

const STATUS_LABELS: Record<string, string> = {
  PENDING: "Starting up...",
  GENERATING_PROMPTS: "Generating prompts...",
  QUERYING: "Querying AI providers...",
  ANALYZING: "Analyzing responses...",
  COMPLETE: "Complete",
  ERROR: "Error",
};

export function AuditProgress({ audit }: { audit: AuditData }) {
  const router = useRouter();
  const [progress, setProgress] = useState<ProgressData | null>(null);

  const connectSSE = useCallback(() => {
    const es = new EventSource(`/api/audits/${audit.id}/progress`);

    es.onmessage = (event) => {
      const data: ProgressData = JSON.parse(event.data);
      setProgress(data);

      if (data.status === "COMPLETE" || data.status === "ERROR") {
        es.close();
        setTimeout(() => router.refresh(), 500);
      }
    };

    es.onerror = () => {
      es.close();
      setTimeout(() => router.refresh(), 2000);
    };

    return es;
  }, [audit.id, router]);

  useEffect(() => {
    const es = connectSSE();
    return () => es.close();
  }, [connectSSE]);

  const pct = progress?.maxResponses
    ? Math.round((progress.totalResponses / progress.maxResponses) * 100)
    : 0;

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-bold">{audit.brand.name}</h1>
          <Badge variant="secondary">
            <Loader2 className="mr-1 h-3 w-3 animate-spin" />
            {STATUS_LABELS[progress?.status || audit.status] || audit.status}
          </Badge>
        </div>
        <p className="text-muted-foreground mt-1">{audit.brand.location}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Audit Progress</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Progress value={pct} className="h-3" />
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>
              {progress?.totalResponses ?? 0} / {progress?.maxResponses ?? "?"} API calls complete
            </span>
            <span>{pct}%</span>
          </div>

          {progress?.totalPrompts ? (
            <p className="text-sm text-muted-foreground">
              {progress.totalPrompts} prompts generated
            </p>
          ) : null}

          {progress?.providerProgress && Object.keys(progress.providerProgress).length > 0 && (
            <div className="space-y-2 pt-2 border-t">
              <p className="text-sm font-medium">Provider Breakdown</p>
              {Object.entries(progress.providerProgress).map(([provider, stats]) => (
                <div key={provider} className="flex items-center justify-between text-sm">
                  <span className="capitalize">{provider}</span>
                  <span className="text-muted-foreground">
                    {stats.total} responses
                    {stats.errors > 0 && (
                      <span className="text-red-400 ml-2">({stats.errors} errors)</span>
                    )}
                  </span>
                </div>
              ))}
            </div>
          )}

          {progress?.error && (
            <div className="rounded border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-400">
              {progress.error}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
