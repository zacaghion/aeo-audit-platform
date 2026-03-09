import { prisma } from "@/lib/db";
import { decrypt } from "@/lib/crypto";
import { providerQueryMap } from "@/lib/providers";
import { generatePrompts } from "@/lib/prompt-generator";
import { analyzeResponse, computeAuditSummary } from "@/lib/analysis";
import type { ProviderName } from "@/lib/providers";
import type { Prisma } from "@prisma/client";

const RATE_LIMIT_DELAY_MS = 200;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

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

    const generatedPrompts = generatePrompts(
      {
        name: brand.name,
        location: brand.location,
        type: brand.category,
        features: brand.features,
        competitors: brand.competitors,
        priceRange: brand.priceRange,
      },
      config.categories
    );

    if (promptRecords.length === 0) {
      await prisma.audit.update({
        where: { id: auditId },
        data: { status: "GENERATING_PROMPTS", startedAt: new Date() },
      });

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

    // Phase 2: Query providers
    await prisma.audit.update({
      where: { id: auditId },
      data: { status: "QUERYING" },
    });

    for (const promptRecord of promptRecords) {
      const promptData = generatedPrompts.find((p) => p.promptNumber === promptRecord.promptNumber);
      if (!promptData) continue;

      // Skip prompts that already have responses (resume support)
      const existingResponses = await prisma.response.count({
        where: { promptId: promptRecord.id },
      });
      if (existingResponses >= validProviders.length) continue;

      const existingProviders = existingResponses > 0
        ? (await prisma.response.findMany({ where: { promptId: promptRecord.id }, select: { provider: true } })).map(r => r.provider)
        : [];

      // Query remaining providers in parallel for each prompt
      const remainingProviders = validProviders.filter(p => !existingProviders.includes(p.name));

      const providerCalls = remainingProviders.map(async ({ name, key }) => {
        try {
          const start = Date.now();
          const result = await queryWithKey(name, key, promptData.promptText, brand);
          const latencyMs = Date.now() - start;

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
              latencyMs,
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
      });

      try {
        await Promise.all(providerCalls);
      } catch (e) {
        console.error(`Prompt ${promptRecord.promptNumber} batch failed:`, e);
      }
      await sleep(RATE_LIMIT_DELAY_MS);
    }

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

      await prisma.audit.update({
        where: { id: auditId },
        data: {
          status: "COMPLETE",
          summary: fullSummary,
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
