export const dynamic = "force-dynamic";

import Link from "next/link";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export default async function AuditsListPage() {
  const audits = await prisma.audit.findMany({
    include: { brand: true, prompts: { include: { responses: true } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Audits</h1>
        <Link href="/audits/new">
          <Button><Plus className="mr-2 h-4 w-4" />New Audit</Button>
        </Link>
      </div>

      <div className="space-y-3">
        {audits.map((audit) => {
          const totalResp = audit.prompts.reduce((s, p) => s + p.responses.length, 0);
          const summary = audit.summary as Record<string, unknown> | null;
          return (
            <Link key={audit.id} href={`/audits/${audit.id}`}>
              <Card className="transition-colors hover:bg-muted/50 cursor-pointer">
                <CardContent className="flex items-center justify-between p-4">
                  <div>
                    <div className="flex items-center gap-3">
                      <span className="font-semibold text-lg">{audit.brand.name}</span>
                      <Badge variant={audit.status === "COMPLETE" ? "success" : audit.status === "ERROR" ? "destructive" : "secondary"}>
                        {audit.status.replace("_", " ")}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {audit.brand.location} &middot; {audit.prompts.length} prompts &middot; {totalResp} responses
                    </p>
                  </div>
                  <div className="text-right font-mono">
                    {summary && (
                      <div className="text-primary font-semibold">{summary.mentionRate as number}%</div>
                    )}
                    <div className="text-xs text-muted-foreground">
                      {audit.completedAt ? new Date(audit.completedAt).toLocaleDateString() : "In progress"}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
