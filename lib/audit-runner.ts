import { prisma } from "@/lib/db";
import { decrypt } from "@/lib/crypto";

import { generatePrompts } from "@/lib/prompt-generator";
import { generatePromptsWithLLM } from "@/lib/prompt-generator-llm";
import { analyzeResponse, computeAuditSummary } from "@/lib/analysis";
import { generateAnalysis } from "@/lib/analysis-engine";
import type { ProviderName } from "@/lib/providers";
import type { Prisma } from "@prisma/client";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function createLimiter(concurrency: number) {
  let active = 0;
  const queue: (() => void)[] = [];
  return async function limit<T>(fn: () => Promise<T>): Promise<T> {
    while (active >= concurrency) {
      await new Promise<void>((resolve) => queue.push(resolve));
    }
    active++;
    try {
      return await fn();
    } finally {
      active--;
      queue.shift()?.();
    }
  };
}

const PROVIDER_CONCURRENCY: Record<string, number> = {
  chatgpt: 10,
  deepseek: 10,
  grok: 10,
  gemini: 5,
  claude: 5,
  perplexity: 3,
};

const PROVIDER_DELAY: Record<string, number> = {
  chatgpt: 0,
  deepseek: 0,
  grok: 0,
  gemini: 50,
  claude: 50,
  perplexity: 100,
};

async function getDecryptedKey(provider: string): Promise<string | null> {
  const record = await prisma.apiKey.findUnique({ where: { provider } });
  if (!record || !record.isValid) return null;
  try {
    return decrypt(record.encryptedKey, record.iv, record.authTag);
  } catch {
    return null;
  }
}

export async function runAudit(auditId: string) {
  try {
    const audit = await prisma.audit.findUnique({
      where: { id: auditId },
      include: { brand: true },
    });
    if (!audit) throw new Error("Audit not found");

    const config = audit.config as {
      promptCount: number;
      providers: string[];
      categories: Record<string, number>;
    };

    const brand = audit.brand;
    const competitors = brand.competitors.split(/[,;]/).map((c: string) => c.trim()).filter(Boolean);

    // Validate provider keys
    const validProviders: { name: ProviderName; key: string }[] = [];
    for (const p of config.providers) {
      const key = await getDecryptedKey(p);
      if (key) validProviders.push({ name: p as ProviderName, key });
    }

    if (validProviders.length === 0) {
      await prisma.audit.update({
        where: { id: auditId },
        data: { status: "ERROR", analysis: { error: "No valid API keys found for selected providers" } },
      });
      return;
    }

    // Phase 1: Generate prompts (skip if already exist from a previous run)
    let promptRecords = await prisma.prompt.findMany({
      where: { auditId },
      orderBy: { promptNumber: "asc" },
    });

    if (promptRecords.length === 0) {
      await prisma.audit.update({
        where: { id: auditId },
        data: { status: "GENERATING_PROMPTS", startedAt: new Date() },
      });

      const brandInfo = {
        name: brand.name,
        location: brand.location,
        type: brand.category,
        features: brand.features,
        competitors: brand.competitors,
        priceRange: brand.priceRange,
      };

      // Try Claude first, fall back to templates
      console.log("Attempting Claude-based prompt generation...");
      let generatedPrompts = await generatePromptsWithLLM(brandInfo, config.categories);

      if (!generatedPrompts || generatedPrompts.length === 0) {
        console.log("Claude unavailable, falling back to template-based generation");
        generatedPrompts = generatePrompts(brandInfo, config.categories);
      } else {
        console.log(`Claude generated ${generatedPrompts.length} prompts`);
      }

      promptRecords = await Promise.all(
        generatedPrompts.map((p) =>
          prisma.prompt.create({
            data: {
              auditId,
              promptNumber: p.promptNumber,
              promptText: p.promptText,
              category: p.category,
              intent: p.intent,
              expectedMention: p.expectedMention,
            },
          })
        )
      );
    }

    // Phase 2: Query providers (all providers run in parallel, each with concurrency limiter)
    await prisma.audit.update({
      where: { id: auditId },
      data: { status: "QUERYING" },
    });

    // Pre-fetch existing responses for resume support
    const existingResponseSet = new Set<string>();
    const allExisting = await prisma.response.findMany({
      where: { promptId: { in: promptRecords.map((p) => p.id) } },
      select: { promptId: true, provider: true },
    });
    for (const r of allExisting) {
      existingResponseSet.add(`${r.promptId}:${r.provider}`);
    }

    const providerStreams = validProviders.map(({ name, key }) => {
      const concurrency = PROVIDER_CONCURRENCY[name] || 5;
      const delay = PROVIDER_DELAY[name] || 0;
      const limit = createLimiter(concurrency);

      return Promise.all(
        promptRecords.map((promptRecord) =>
          limit(async () => {
            // Skip if response already exists (resume support)
            if (existingResponseSet.has(`${promptRecord.id}:${name}`)) return;

            if (delay > 0) await sleep(delay);

            try {
              const result = await callWithRetry(name, key, promptRecord.promptText, brand);
              const analysis = analyzeResponse(result.answer, competitors, brand.name);

              await prisma.response.create({
                data: {
                  promptId: promptRecord.id,
                  provider: name,
                  model: getModelForProvider(name),
                  answer: result.answer,
                  brandMentioned: analysis.brandMentioned,
                  mentionPosition: analysis.mentionPosition,
                  mentionSentiment: analysis.mentionSentiment,
                  competitorsMentioned: analysis.competitorsMentioned,
                  competitorCount: analysis.competitorCount,
                  answerLength: analysis.answerLength,
                  latencyMs: result.latencyMs,
                  status: "success",
                  rawResponse: result.rawResponse as Prisma.InputJsonValue,
                },
              });
            } catch (e) {
              await prisma.response.create({
                data: {
                  promptId: promptRecord.id,
                  provider: name,
                  model: getModelForProvider(name),
                  answer: "",
                  status: "error",
                  errorMessage: e instanceof Error ? e.message : "Unknown error",
                  latencyMs: 0,
                },
              });
            }
          })
        )
      );
    });

    await Promise.all(providerStreams);

    // Phase 3: Analyze
    await prisma.audit.update({
      where: { id: auditId },
      data: { status: "ANALYZING" },
    });

    const fullAudit = await prisma.audit.findUnique({
      where: { id: auditId },
      include: {
        prompts: {
          orderBy: { promptNumber: "asc" },
          include: { responses: true },
        },
      },
    });

    if (fullAudit) {
      const summaryData = fullAudit.prompts.map((p) => ({
        category: p.category,
        responses: p.responses.filter((r) => r.status === "success").map((r) => ({
          provider: r.provider,
          brandMentioned: r.brandMentioned,
          answerLength: r.answerLength,
        })),
      }));

      const summary = computeAuditSummary(summaryData);

      // Compute top competitors from response data
      const competitorCounts: Record<string, number> = {};
      for (const p of fullAudit.prompts) {
        for (const r of p.responses) {
          const mentioned = r.competitorsMentioned as string[];
          if (Array.isArray(mentioned)) {
            for (const c of mentioned) {
              competitorCounts[c] = (competitorCounts[c] || 0) + 1;
            }
          }
        }
      }
      const topCompetitors = Object.entries(competitorCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10)
        .map(([name, count]) => ({ name, count }));

      const fullSummary = { ...summary, topCompetitors };

      // Generate full analysis with visibility, sentiment, recommendations
      const analysisInput = fullAudit.prompts.map((p) => ({
        promptNumber: p.promptNumber,
        promptText: p.promptText,
        category: p.category,
        responses: p.responses.filter((r) => r.status === "success").map((r) => ({
          provider: r.provider,
          answer: r.answer,
          brandMentioned: r.brandMentioned,
          mentionPosition: r.mentionPosition,
          mentionSentiment: r.mentionSentiment,
          competitorsMentioned: r.competitorsMentioned as string[],
          competitorCount: r.competitorCount,
          answerLength: r.answerLength,
          status: r.status,
        })),
      }));

      const analysis = generateAnalysis(analysisInput, {
        name: brand.name,
        location: brand.location,
        category: brand.category,
        features: brand.features,
        competitors: brand.competitors,
      });

      await prisma.audit.update({
        where: { id: auditId },
        data: {
          status: "COMPLETE",
          summary: fullSummary,
          analysis: analysis as unknown as Prisma.InputJsonValue,
          completedAt: new Date(),
        },
      });
    }
  } catch (e) {
    console.error("Audit runner fatal error:", e);
    await prisma.audit.update({
      where: { id: auditId },
      data: {
        status: "ERROR",
        analysis: { error: e instanceof Error ? e.message : "Unknown fatal error" },
      },
    }).catch(() => {});
  }
}

function getModelForProvider(provider: ProviderName): string {
  const models: Record<ProviderName, string> = {
    claude: "claude-sonnet-4-20250514",
    chatgpt: "gpt-4o-mini",
    gemini: "gemini-2.5-flash",
    perplexity: "sonar",
    grok: "grok-3-mini-fast",
    deepseek: "deepseek-chat",
  };
  return models[provider];
}

async function callWithRetry(
  provider: ProviderName,
  apiKey: string,
  prompt: string,
  brand: { name: string; category: string; location: string },
  maxRetries = 3
): Promise<{ answer: string; rawResponse: Record<string, unknown>; latencyMs: number }> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const start = Date.now();
    try {
      const result = await queryWithKey(provider, apiKey, prompt, brand);
      return { ...result, latencyMs: Date.now() - start };
    } catch (e) {
      const isRateLimit = e instanceof Error && (e.message.includes("429") || e.message.toLowerCase().includes("rate"));
      if (isRateLimit && attempt < maxRetries - 1) {
        const backoff = Math.pow(2, attempt + 1) * 1000; // 2s, 4s
        console.log(`${provider} rate limited, retrying in ${backoff}ms (attempt ${attempt + 1})`);
        await sleep(backoff);
        continue;
      }
      throw e;
    }
  }
  throw new Error(`${provider} failed after ${maxRetries} retries`);
}

function getRunnerSystemPrompt(brand: { name: string; category: string; location: string }): string {
  return `You are a helpful AI assistant answering a consumer's query about ${brand.category.toLowerCase()} businesses${brand.location ? ` in ${brand.location}` : ""}. Answer naturally and thoroughly based on your knowledge. Be specific with names, prices, locations, and details. If you recommend specific businesses, explain why. If asked about a specific business, give honest pros and cons.`;
}

async function queryWithKey(
  provider: ProviderName,
  apiKey: string,
  prompt: string,
  brand: { name: string; category: string; location: string }
): Promise<{ answer: string; rawResponse: Record<string, unknown> }> {
  const model = getModelForProvider(provider);
  const systemPrompt = getRunnerSystemPrompt(brand);

  if (provider === "claude") {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model,
        max_tokens: 1024,
        system: systemPrompt,
        messages: [{ role: "user", content: prompt }],
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error?.message || `Claude API ${res.status}`);
    const answer = data.content?.filter((b: Record<string, string>) => b.type === "text").map((b: Record<string, string>) => b.text).join("\n") || "";
    return { answer, rawResponse: data };
  }

  if (provider === "gemini") {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemPrompt }] },
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { maxOutputTokens: 1024 },
        }),
      }
    );
    const data = await res.json();
    if (!res.ok) throw new Error(data.error?.message || `Gemini API ${res.status}`);
    const answer = data.candidates?.[0]?.content?.parts?.map((p: Record<string, string>) => p.text).join("\n") || "";
    return { answer, rawResponse: data };
  }

  // OpenAI-compatible: chatgpt, perplexity, grok, deepseek
  const endpoints: Record<string, string> = {
    chatgpt: "https://api.openai.com/v1/chat/completions",
    perplexity: "https://api.perplexity.ai/chat/completions",
    grok: "https://api.x.ai/v1/chat/completions",
    deepseek: "https://api.deepseek.com/chat/completions",
  };

  const res = await fetch(endpoints[provider], {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      max_tokens: 1024,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: prompt },
      ],
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || `${provider} API ${res.status}`);
  const answer = data.choices?.[0]?.message?.content || "";
  return { answer, rawResponse: data };
}
