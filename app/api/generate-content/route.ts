import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { decrypt } from "@/lib/crypto";

const prisma = new PrismaClient();

async function getClaudeKey(): Promise<string | null> {
  for (const provider of ["claude-recommendations", "claude-analysis", "claude"]) {
    const record = await prisma.apiKey.findUnique({ where: { provider } });
    if (record) {
      try {
        return decrypt(record.encryptedKey, record.iv, record.authTag);
      } catch {
        continue;
      }
    }
  }
  return null;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      contentType, topic, draftOutline, rationale, suggestedScope,
      brandName, brandWebsite, brandCategory, brandFeatures, competitors,
      auditContext,
    } = body;

    if (!topic || !brandName) {
      return NextResponse.json({ error: "topic and brandName are required" }, { status: 400 });
    }

    const apiKey = await getClaudeKey();
    if (!apiKey) {
      return NextResponse.json({ error: "No Claude API key configured. Add one in Settings." }, { status: 400 });
    }

    const type = (contentType || "blog post").toLowerCase();
    const wordTarget = type.includes("faq") ? "400-600"
      : type.includes("landing") ? "500-800"
      : "800-1500";

    const ctx = auditContext || {};
    const weakCats = ctx.weakestCategories?.join(", ") || "unknown";
    const topComps = ctx.topCompetitors?.join(", ") || competitors || "unknown";
    const competitiveGapReason = ctx.competitiveGapReason || "they have more comprehensive, AI-crawlable content on these topics";
    const firstCompetitor = ctx.topCompetitors?.[0]?.split(" (")[0] || competitors?.split(",")[0]?.trim() || "competitors";

    const targetQueries = ctx.targetQueries?.length > 0
      ? ctx.targetQueries.map((q: string) => `- "${q}"`).join("\n")
      : "No specific queries identified — write for general discovery in this topic area.";

    const system = `ROLE: You are writing as ${brandName}'s in-house content lead. Voice: authoritative but accessible. Write like a knowledgeable insider, not a marketing brochure. Never use superlatives ("best-in-class", "world-leading") without backing them with a specific fact.

BRAND CONTEXT:
- Brand: ${brandName} — ${brandCategory || "business"}
- Website: ${brandWebsite || "N/A"}
- Key capabilities: ${brandFeatures || "N/A"}
- Competitors: ${topComps}

AEO AUDIT FINDINGS (internal — do not reference the audit itself in the content):
- Visibility Score: ${ctx.visibilityScore ?? "N/A"}/100
- Mention Rate: ${ctx.mentionRate ?? "N/A"}% across AI engines
- Weakest categories: ${weakCats}
- Gap: ${topComps} are cited more frequently because ${competitiveGapReason}

CONTENT BRIEF:
- Type: ${contentType || "blog post"} (blog post / comparison page / FAQ / landing page)
- Topic: ${topic}
- Rationale: ${rationale || "the audit identified a gap in AI engine coverage for this topic."}
- Word target: ${wordTarget} words

TARGET AI QUERIES — this content must directly answer these questions:
${targetQueries}
(Structure headings as H2s that mirror these queries verbatim or near-verbatim. AI engines match headings to user questions.)

WRITING RULES:
1. Open with a direct answer to the primary query in the first 2 sentences. AI engines pull from the opening paragraph most often.
2. Use H2 headings that match how a real person would phrase the question (e.g., "How does ${brandName} compare to ${firstCompetitor}?" not "Competitive Analysis")
3. Include at least 3 specific, verifiable facts (numbers, dates, named features). AI engines prioritize factual density over vague authority claims.
4. Mention ${brandName} naturally 4-6 times. Never in consecutive sentences. Never in a way that reads as an ad.
5. Reference 1-2 competitors by name with a fair comparison. AI engines distrust content that pretends competitors don't exist.
6. End with a clear, structured summary (bullet points or short paragraph) that an AI engine could extract as a standalone answer.
7. Do NOT reference the audit, AEO, visibility scores, or the fact that this content was strategically generated. It must read as organic editorial content.

OUTPUT: Markdown, ready to paste into a CMS. Include suggested meta description (under 155 characters) and 3 suggested internal links at the end.`;

    const outlineStr = draftOutline?.length > 0
      ? `\n\nDraft Outline:\n${draftOutline.join("\n")}`
      : "";
    const scopeStr = suggestedScope ? `\n\nScope: ${suggestedScope}` : "";

    const userMessage = `Write a ${contentType || "blog post"}: "${topic}"${outlineStr}${scopeStr}`;

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 4096,
        system,
        messages: [{ role: "user", content: userMessage }],
      }),
    });

    if (!res.ok) {
      const err = await res.json();
      return NextResponse.json(
        { error: err.error?.message || `Claude API ${res.status}` },
        { status: 502 },
      );
    }

    const data = await res.json();
    const content = data.content
      ?.filter((b: Record<string, string>) => b.type === "text")
      .map((b: Record<string, string>) => b.text)
      .join("") || "";

    return NextResponse.json({ content });
  } catch (e) {
    console.error("generate-content error:", e);
    return NextResponse.json({ error: "Failed to generate content" }, { status: 500 });
  }
}
