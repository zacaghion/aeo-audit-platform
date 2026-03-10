import { callWithRetry, createLimiter, getModelForProvider } from "@/lib/audit-runner";
import { generatePromptsWithLLM } from "@/lib/prompt-generator-llm";
import { generatePrompts } from "@/lib/prompt-generator";
import { analyzeResponse } from "@/lib/analysis";
import type { ProviderName } from "@/lib/providers";

interface BenchmarkResult {
  brandName: string;
  visibility: number;
  mentionRate: number;
  sentiment: number;
  totalResponses: number;
  providerScores: Record<string, number>;
}

const PROMPT_COUNT = 25;

const BENCHMARK_CATEGORIES: Record<string, number> = {
  Discovery: 5,
  Comparison: 5,
  "Brand-Specific": 5,
  Features: 5,
  "Use Cases": 5,
};

export async function runCompetitorBenchmark(
  competitorName: string,
  category: string,
  features: string,
  providers: Array<{ name: ProviderName; key: string }>,
  knownCompetitors: string[]
): Promise<BenchmarkResult> {
  console.log(`Benchmark: starting for ${competitorName} with ${providers.length} providers`);

  const brandInfo = {
    name: competitorName,
    location: "",
    type: category,
    features: features,
    competitors: knownCompetitors.filter((c) => c.toLowerCase() !== competitorName.toLowerCase()).join(", "),
    priceRange: null as string | null,
    brief: `${competitorName} is a ${category} company.`,
  };

  // Generate 25 prompts about this competitor
  let prompts = await generatePromptsWithLLM(brandInfo, BENCHMARK_CATEGORIES);
  if (!prompts || prompts.length === 0) {
    prompts = generatePrompts(brandInfo, BENCHMARK_CATEGORIES);
  }
  prompts = prompts.slice(0, PROMPT_COUNT);
  console.log(`Benchmark: generated ${prompts.length} prompts for ${competitorName}`);

  // Query providers with concurrency
  interface ResponseData {
    provider: string;
    answer: string;
    brandMentioned: boolean;
    mentionSentiment: string | null;
    mentionPosition: string | null;
  }

  const responses: ResponseData[] = [];

  const providerStreams = providers.map(({ name, key }) => {
    const limit = createLimiter(5);
    return Promise.all(
      prompts.map((prompt) =>
        limit(async () => {
          try {
            const result = await callWithRetry(
              name, key, prompt.promptText,
              { name: competitorName, category, location: "" }
            );
            const analysis = analyzeResponse(result.answer, knownCompetitors, competitorName);
            responses.push({
              provider: name,
              answer: result.answer,
              brandMentioned: analysis.brandMentioned,
              mentionSentiment: analysis.mentionSentiment,
              mentionPosition: analysis.mentionPosition,
            });
          } catch (e) {
            console.error(`Benchmark ${competitorName}/${name}: ${e instanceof Error ? e.message : "error"}`);
          }
        })
      )
    );
  });

  await Promise.all(providerStreams);

  // Compute scores
  const total = responses.length;
  const mentioned = responses.filter((r) => r.brandMentioned);
  const mentionRate = total > 0 ? Math.round((mentioned.length / total) * 100) : 0;

  // Sentiment score
  const sentiments = mentioned.map((r) => r.mentionSentiment).filter(Boolean) as string[];
  const sentCounts = { positive: 0, mixed: 0, negative: 0, neutral: 0 };
  for (const s of sentiments) {
    if (s in sentCounts) sentCounts[s as keyof typeof sentCounts]++;
  }
  const sentTotal = sentiments.length || 1;
  const sentiment = Math.round(
    (sentCounts.positive * 100 + sentCounts.mixed * 50 + sentCounts.neutral * 50) / sentTotal
  );

  // Visibility: weighted by position
  const positionWeights: Record<string, number> = { "1st": 1.0, "2nd": 0.8, "3rd": 0.6, "4th": 0.4, "5th+": 0.2, "passing": 0.1 };
  let weightedScore = 0;
  for (const r of mentioned) {
    weightedScore += (positionWeights[r.mentionPosition || "passing"] || 0.1) * 100;
  }
  const visibility = total > 0 ? Math.round(weightedScore / total) : 0;

  // Per-provider scores
  const providerScores: Record<string, number> = {};
  for (const p of providers) {
    const provResponses = responses.filter((r) => r.provider === p.name);
    const provMentioned = provResponses.filter((r) => r.brandMentioned);
    providerScores[p.name] = provResponses.length > 0
      ? Math.round((provMentioned.length / provResponses.length) * 100)
      : 0;
  }

  console.log(`Benchmark: ${competitorName} done — visibility=${visibility}, mention=${mentionRate}%, sentiment=${sentiment}`);

  return {
    brandName: competitorName,
    visibility,
    mentionRate,
    sentiment,
    totalResponses: total,
    providerScores,
  };
}
