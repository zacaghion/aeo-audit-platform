export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  const auditId = req.nextUrl.searchParams.get("auditId");
  if (!auditId) return NextResponse.json({ error: "auditId required" }, { status: 400 });

  const audit = await prisma.audit.findUnique({
    where: { id: auditId },
    include: {
      hotel: true,
      prompts: {
        orderBy: { promptNumber: "asc" },
        include: { responses: true },
      },
    },
  });

  if (!audit) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const rows = [];
  for (const p of audit.prompts) {
    for (const r of p.responses) {
      rows.push({
        "Prompt #": p.promptNumber,
        Prompt: p.promptText,
        Category: p.category,
        Intent: p.intent,
        "Expected Mention": p.expectedMention,
        Provider: r.provider,
        "AI Answer": r.answer,
        "Hotel Mentioned": r.hotelMentioned ? "Yes" : "No",
        Position: r.mentionPosition || "",
        Sentiment: r.mentionSentiment || "",
        "Competitors Mentioned": (r.competitorsMentioned as string[]).join(", "),
        "Competitor Count": r.competitorCount,
        "Answer Length": r.answerLength,
        Status: r.status,
      });
    }
  }

  return NextResponse.json({
    fileName: `aeo-audit-${audit.hotel.name.replace(/\s+/g, "-").toLowerCase()}.xlsx`,
    sheets: {
      "Raw Data": rows,
      "Summary": audit.summary,
      "Analysis": audit.analysis,
    },
  });
}
