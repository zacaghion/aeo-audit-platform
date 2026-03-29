import { prisma } from "@/lib/db";
import { decrypt } from "@/lib/crypto";

interface BrandInfo {
  name: string;
  location: string;
  type: string;
  features: string;
  competitors: string;
  priceRange: string | null;
  website?: string;
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

function buildSystemPrompt(brand: BrandInfo, promptCount: number): string {
  const firstCompetitor = brand.competitors.split(/[,;]/)[0]?.trim() || "competitors";

  return `You are an expert at Answer Engine Optimization (AEO). Your job is to generate realistic search prompts that a real consumer would type into an AI assistant like ChatGPT, Gemini, or Perplexity.

BRAND CONTEXT:
- Brand: ${brand.name}
- Business type: ${brand.type}
- Location: ${brand.location || "Global (no specific location)"}
- Key features: ${brand.features}
- Competitors: ${brand.competitors}
- Website: ${brand.website || "N/A"}

PROMPT REQUIREMENTS:

1. PERSONAS — Vary the person behind each query. Each prompt should sound like it comes from a specific type of user:
   - A first-time buyer researching options
   - An experienced user comparing alternatives
   - A decision-maker evaluating for their team or organization
   - A price-sensitive shopper looking for value
   - Someone with a specific urgent need or constraint
   - A returning customer considering switching away
   Do not label the persona in the prompt text itself — it should be apparent from how the query is phrased.

2. QUERY INTENT — Every prompt must be tagged with one of these intents:
   - DISCOVERY: Browsing, exploring options, early research ("what are some good X in Y")
   - COMPARISON: Actively evaluating alternatives ("X vs Y", "best X for Z", "how does X compare to")
   - TRANSACTIONAL: Ready to buy, book, sign up, or act ("book X", "pricing for X", "how to get started with X")
   - NAVIGATIONAL: Looking for a specific brand or resource ("X website", "X reviews", "what is X")

3. SKEPTICAL QUERIES — 10-15% of prompts should be skeptical or objection-based:
   - "is ${brand.name} worth the price"
   - "problems with ${brand.type} in ${brand.location || "the market"}"
   - "${brand.name} vs cheaper alternatives"
   - "why not use ${firstCompetitor} instead"
   - "negative reviews of ${brand.name}"
   These reveal vulnerability gaps where the brand loses visibility.

4. CATEGORIES — Assign each prompt to exactly one category:
   - BRAND: Queries that directly name ${brand.name} or ask about it specifically
   - DISCOVERY: General exploration of the category or market
   - COMPARISON: Head-to-head or multi-option evaluation queries
   - FEATURES: Queries about specific capabilities, amenities, or attributes
   - VALUE: Queries about pricing, ROI, cost-effectiveness, or deals
   - REPUTATION: Queries about reviews, ratings, trustworthiness, or track record

5. LOCATION VARIATION — ${brand.location ? `Vary how "${brand.location}" appears:
   - Sometimes explicit: "best ${brand.type} in ${brand.location}"
   - Sometimes implied: "best ${brand.type} near [neighborhood/area]"
   - Sometimes absent: generic category query with no location
   - Sometimes with context: "visiting ${brand.location} next month, looking for..."
   Real users don't always specify location.` : "No specific location provided. Generate globally relevant queries."}

6. NATURALNESS — Prompts must:
   - Sound like real questions people type into AI chatbots
   - Vary in length: some are 4-5 words, some are 2 sentences with context
   - Include long-tail queries with specific use cases or constraints
   - Never feel templated, formulaic, or repetitive
   - Mix question formats: "what is", "how does", "can you recommend", "I'm looking for", "compare", declarative statements like "I need a..."

7. DISTRIBUTION — For ${promptCount} prompts, aim for this approximate distribution:
   - BRAND: 15%
   - DISCOVERY: 25%
   - COMPARISON: 25%
   - FEATURES: 15%
   - VALUE: 10%
   - REPUTATION: 10%

   Intent distribution should be approximately:
   - DISCOVERY: 30%
   - COMPARISON: 35%
   - TRANSACTIONAL: 20%
   - NAVIGATIONAL: 15%

Generate exactly ${promptCount} prompts.

You must respond with valid JSON only. No markdown, no code fences, no explanation.

Return this exact JSON structure:
{"prompts":[{"promptText":"the natural language query","category":"Brand|Discovery|Comparison|Features|Value|Reputation","intent":"discovery|comparison|transactional|navigational"}]}`;
}

const VALID_CATEGORIES = new Set(["brand", "discovery", "comparison", "features", "value", "reputation"]);
const VALID_INTENTS = new Set(["discovery", "comparison", "transactional", "navigational"]);

function titleCase(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}

export async function generatePromptsWithLLM(
  brand: BrandInfo,
  categories: Record<string, number>
): Promise<GeneratedPrompt[] | null> {
  const apiKey = await getClaudeKey();
  if (!apiKey) return null;

  const promptCount = Object.values(categories).reduce((a, b) => a + b, 0);
  const systemPrompt = buildSystemPrompt(brand, promptCount);

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
        messages: [{ role: "user", content: `Generate ${promptCount} prompts now.` }],
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

    const jsonStr = text.replace(/^```json?\n?/, "").replace(/\n?```$/, "").trim();
    const parsed = JSON.parse(jsonStr);

    if (!parsed.prompts || !Array.isArray(parsed.prompts)) {
      console.error("Claude returned invalid structure:", Object.keys(parsed));
      return null;
    }

    return parsed.prompts.map((p: Record<string, string>, i: number) => {
      const rawCat = (p.category || "discovery").toLowerCase();
      const category = VALID_CATEGORIES.has(rawCat) ? titleCase(rawCat) : "Discovery";
      const rawIntent = (p.intent || "discovery").toLowerCase();
      const intent = VALID_INTENTS.has(rawIntent) ? rawIntent : "discovery";
      const mentionsBrand = (p.promptText || "").toLowerCase().includes(brand.name.toLowerCase());

      return {
        promptNumber: i + 1,
        promptText: p.promptText || p.prompt || "",
        category,
        intent,
        expectedMention: mentionsBrand ? "yes" : "maybe",
      };
    });
  } catch (e) {
    console.error("Claude prompt generation error:", e);
    return null;
  }
}
