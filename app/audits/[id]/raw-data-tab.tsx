"use client";

import { useState, useMemo } from "react";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronDown, ChevronRight } from "lucide-react";

interface RawDataProps {
  prompts: Array<{
    promptNumber: number;
    promptText: string;
    category: string;
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
      answerLength: number;
      status: string;
    }>;
  }>;
}

const PAGE_SIZE = 50;

export function RawDataTab({ prompts }: RawDataProps) {
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [providerFilter, setProviderFilter] = useState("all");
  const [mentionFilter, setMentionFilter] = useState("all");
  const [page, setPage] = useState(0);
  const [expanded, setExpanded] = useState<string | null>(null);

  const categories = Array.from(new Set(prompts.map((p) => p.category)));
  const providers = Array.from(new Set(prompts.flatMap((p) => p.responses.map((r) => r.provider))));

  const rows = useMemo(() => {
    const all: Array<{
      key: string;
      promptNumber: number;
      promptText: string;
      category: string;
      provider: string;
      model: string;
      answer: string;
      hotelMentioned: boolean;
      mentionPosition: string | null;
      mentionSentiment: string | null;
      competitorsMentioned: string[];
      answerLength: number;
      status: string;
      expectedMention: string;
    }> = [];

    for (const p of prompts) {
      for (const r of p.responses) {
        if (categoryFilter !== "all" && p.category !== categoryFilter) continue;
        if (providerFilter !== "all" && r.provider !== providerFilter) continue;
        if (mentionFilter === "yes" && !r.hotelMentioned) continue;
        if (mentionFilter === "no" && r.hotelMentioned) continue;

        all.push({
          key: r.id,
          promptNumber: p.promptNumber,
          promptText: p.promptText,
          category: p.category,
          expectedMention: p.expectedMention,
          ...r,
          competitorsMentioned: r.competitorsMentioned as string[],
        });
      }
    }
    return all;
  }, [prompts, categoryFilter, providerFilter, mentionFilter]);

  const totalPages = Math.ceil(rows.length / PAGE_SIZE);
  const pageRows = rows.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  return (
    <div className="space-y-4 mt-4">
      <div className="flex gap-3 flex-wrap">
        <Select value={categoryFilter} onValueChange={(v) => { setCategoryFilter(v); setPage(0); }}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Category" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={providerFilter} onValueChange={(v) => { setProviderFilter(v); setPage(0); }}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Provider" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Providers</SelectItem>
            {providers.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={mentionFilter} onValueChange={(v) => { setMentionFilter(v); setPage(0); }}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Mentioned" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="yes">Mentioned</SelectItem>
            <SelectItem value="no">Not Mentioned</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-sm text-muted-foreground self-center ml-auto">{rows.length} results</span>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-8"></TableHead>
            <TableHead className="w-12">#</TableHead>
            <TableHead className="max-w-[200px]">Prompt</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Provider</TableHead>
            <TableHead>Mentioned</TableHead>
            <TableHead>Position</TableHead>
            <TableHead>Sentiment</TableHead>
            <TableHead>Competitors</TableHead>
            <TableHead className="text-right">Length</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {pageRows.map((row) => (
            <>
              <TableRow
                key={row.key}
                className="cursor-pointer"
                onClick={() => setExpanded(expanded === row.key ? null : row.key)}
              >
                <TableCell>
                  {expanded === row.key ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </TableCell>
                <TableCell className="font-mono">{row.promptNumber}</TableCell>
                <TableCell className="max-w-[200px] truncate" title={row.promptText}>{row.promptText}</TableCell>
                <TableCell><Badge variant="outline" className="text-xs">{row.category}</Badge></TableCell>
                <TableCell className="capitalize">{row.provider}</TableCell>
                <TableCell>
                  <Badge variant={row.hotelMentioned ? "success" : "destructive"}>
                    {row.hotelMentioned ? "Yes" : "No"}
                  </Badge>
                </TableCell>
                <TableCell className="font-mono text-xs">{row.mentionPosition || "—"}</TableCell>
                <TableCell className="text-xs">{row.mentionSentiment || "—"}</TableCell>
                <TableCell className="font-mono text-xs">{(row.competitorsMentioned as string[]).length}</TableCell>
                <TableCell className="text-right font-mono text-xs">{row.answerLength.toLocaleString()}</TableCell>
              </TableRow>
              {expanded === row.key && (
                <TableRow key={`${row.key}-exp`}>
                  <TableCell colSpan={10} className="bg-muted/30">
                    <div className="p-4 space-y-2">
                      <p className="text-xs text-muted-foreground">Full AI Response:</p>
                      <pre className="whitespace-pre-wrap text-sm font-mono max-h-96 overflow-y-auto">{row.answer}</pre>
                      {(row.competitorsMentioned as string[]).length > 0 && (
                        <div className="flex gap-1 flex-wrap mt-2">
                          <span className="text-xs text-muted-foreground">Competitors:</span>
                          {(row.competitorsMentioned as string[]).map((c) => (
                            <Badge key={c} variant="secondary" className="text-xs">{c}</Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </>
          ))}
        </TableBody>
      </Table>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <Button variant="outline" size="sm" onClick={() => setPage(Math.max(0, page - 1))} disabled={page === 0}>Previous</Button>
          <span className="text-sm text-muted-foreground">Page {page + 1} of {totalPages}</span>
          <Button variant="outline" size="sm" onClick={() => setPage(Math.min(totalPages - 1, page + 1))} disabled={page >= totalPages - 1}>Next</Button>
        </div>
      )}
    </div>
  );
}
