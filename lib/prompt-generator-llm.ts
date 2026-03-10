import { prisma } from "@/lib/db";
import { decrypt } from "@/lib/crypto";

interface BrandInfo {
  name: string;
  location: string;
  type: string;
  features: string;
  competitors: string;
  priceRange: string | null;
}

interface GeneratedPrompt {
  promptNumber: number;
  promptText: string;
  category: string;
  intent: string;
  expectedMention: string;
}

async function getClaudeKey(): Promise<string | null> {
  const record = await prisma.apiKey.findUnique({ where: { provider: "claude" } });
  if (!record || !record.isValid) return null;
  try {
    return decrypt(record.encryptedKey, record.iv, record.authTag);
  } catch {
    return null;
  }
}

function buildSystemPrompt(): string {
  return `You are an expert at Answer Engine Optimization (AEO). Your job is to generate realistic search prompts that a real consumer would type into an AI assistant like ChatGPT, Gemini, or Perplexity.

The prompts should:
- Sound natural and conversational, like real questions people ask AI chatbots
- Cover a mix of discovery, comparison, brand-specific, and practical queries
- Include some prompts that name the brand directly and some that don't
- Be specific to the business type and industry (and location if provided)
- Vary in length and complexity (some short, some detailed with context)
- Include long-tail queries with specific use cases or constraints
- Never feel templated or formulaic

You must respond with valid JSON only. No markdown, no code fences, no explanation.`;
}

function buildUserPrompt(brand: BrandInfo, categories: Record<string, number>): string {
  const totalPrompts = Object.values(categories).reduce((a, b) => a + b, 0);
  const categoryList = Object.entries(categories)
    .map(([cat, count]) => `  - ${cat}: ${count} prompts`)
    .join("\n");

  return `Generate ${totalPrompts} realistic consumer prompts for an AEO audit of this business:

Brand: ${brand.name}
Type: ${brand.type}
Location: ${brand.location || "Global (no specific location)"}
Features: ${brand.features}
Competitors: ${brand.competitors}
Price Range: ${brand.priceRange || "not specified"}

Category distribution:
${categoryList}

For each prompt, determine:
- "expectedMention": "yes" if the prompt explicitly names "${brand.name}", "maybe" if it doesn't but the brand could naturally come up, "no" if it's unlikely

Rules:
- About 30-40% of prompts should mention "${brand.name}" by name
- The rest should be generic queries where the brand might or might not appear
- Comparison prompts should pit "${brand.name}" against its competitors
- Discovery prompts should be broad category/industry queries${brand.location ? ` relevant to ${brand.location}` : ""}
- Make prompts feel like real questions someone would ask ChatGPT or Gemini

Respond with this exact JSON structure:
{"prompts":[{"promptText":"...","category":"...","intent":"...","expectedMention":"yes|maybe|no"}]}`;
}

export async function generatePromptsWithLLM(
  brand: BrandInfo,
  categories: Record<string, number>
): Promise<GeneratedPrompt[] | null> {
  const apiKey = await getClaudeKey();
  if (!apiKey) return null;

  const systemPrompt = buildSystemPrompt();
  const userPrompt = buildUserPrompt(brand, categories);

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
        max_tokens: 8192,
        system: systemPrompt,
        messages: [{ role: "user", content: userPrompt }],
      }),
    });

    if (!res.ok) {
      console.error("Claude prompt generation failed:", res.status, await res.text());
      return null;
    }

    const data = await res.json();
    const text = data.content
      ?.filter((b: Record<string, string>) => b.type === "text")
      .map((b: Record<string, string>) => b.text)
      .join("") || "";

    // Parse JSON from response -- handle potential markdown fences
    const jsonStr = text.replace(/^```json?\n?/, "").replace(/\n?```$/, "").trim();
    const parsed = JSON.parse(jsonStr);

    if (!parsed.prompts || !Array.isArray(parsed.prompts)) {
      console.error("Claude returned invalid structure:", Object.keys(parsed));
      return null;
    }

    return parsed.prompts.map((p: Record<string, string>, i: number) => ({
      promptNumber: i + 1,
      promptText: p.promptText,
      category: p.category,
      intent: p.intent || `${p.category} query about ${brand.type}${brand.location ? ` in ${brand.location}` : ""}`,
      expectedMention: p.expectedMention || "maybe",
    }));
  } catch (e) {
    console.error("Claude prompt generation error:", e);
    return null;
  }
}
