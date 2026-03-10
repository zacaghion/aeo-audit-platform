export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { decrypt } from "@/lib/crypto";

async function getClaudeKey(): Promise<string | null> {
  const record = await prisma.apiKey.findUnique({ where: { provider: "claude" } });
  if (!record || !record.isValid) return null;
  try {
    return decrypt(record.encryptedKey, record.iv, record.authTag);
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  const { website } = await req.json();
  if (!website || typeof website !== "string") {
    return NextResponse.json({ error: "Website URL required" }, { status: 400 });
  }

  const apiKey = await getClaudeKey();
  if (!apiKey) {
    return NextResponse.json({ error: "Claude API key not configured" }, { status: 503 });
  }

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 2048,
        system: `You are a business research assistant. Given a company website URL, provide structured information about the business. Use your knowledge of the company — do not attempt to fetch the URL. Respond with valid JSON only, no markdown fences.`,
        messages: [{
          role: "user",
          content: `Research this company and return structured data about them: ${website}

Return this exact JSON structure:
{
  "name": "Official company/brand name",
  "businessType": "Industry category (e.g. SaaS, Insurance, Retail, Restaurant, Hotel, etc.)",
  "features": "Key products, services, differentiators, and notable capabilities (comma-separated)",
  "competitors": "Top 3-5 direct competitors (comma-separated)",
  "brief": "2-3 sentence description of what the company does, who they serve, and what they're known for"
}`,
        }],
      }),
    });

    if (!res.ok) {
      const err = await res.json();
      return NextResponse.json({ error: err.error?.message || "Claude API error" }, { status: 502 });
    }

    const data = await res.json();
    const text = data.content
      ?.filter((b: Record<string, string>) => b.type === "text")
      .map((b: Record<string, string>) => b.text)
      .join("") || "";

    const jsonStr = text.replace(/^```json?\n?/, "").replace(/\n?```$/, "").trim();
    const parsed = JSON.parse(jsonStr);

    return NextResponse.json({
      name: parsed.name || "",
      businessType: parsed.businessType || "",
      features: parsed.features || "",
      competitors: parsed.competitors || "",
      brief: parsed.brief || "",
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to lookup brand" },
      { status: 500 }
    );
  }
}
