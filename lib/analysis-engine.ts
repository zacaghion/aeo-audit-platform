import type { AnalysisOutput } from "@/types";

interface PromptData {
  promptNumber: number;
  promptText: string;
  category: string;
  responses: Array<{
    provider: string;
    answer: string;
    brandMentioned: boolean;
    mentionPosition: string | null;
    mentionSentiment: string | null;
    competitorsMentioned: string[];
    competitorCount: number;
    answerLength: number;
    status: string;
  }>;
}

interface BrandData {
  name: string;
  location: string;
  category: string;
  features: string;
  competitors: string;
}

export function generateAnalysis(
  prompts: PromptData[],
  brand: BrandData
): AnalysisOutput {
  const successResponses = prompts.flatMap((p) =>
    p.responses.filter((r) => r.status === "success").map((r) => ({ ...r, category: p.category, promptNumber: p.promptNumber, promptText: p.promptText }))
  );

  const totalResponses = successResponses.length;
  const mentionedResponses = successResponses.filter((r) => r.brandMentioned);
  const overallMentionRate = totalResponses > 0 ? mentionedResponses.length / totalResponses : 0;

  // Provider-level stats
  const providers = Array.from(new Set(successResponses.map((r) => r.provider)));
  const providerStats: Record<string, { total: number; mentioned: number; sentiments: string[] }> = {};
  for (const r of successResponses) {
    if (!providerStats[r.provider]) providerStats[r.provider] = { total: 0, mentioned: 0, sentiments: [] };
    providerStats[r.provider].total++;
    if (r.brandMentioned) {
      providerStats[r.provider].mentioned++;
      if (r.mentionSentiment) providerStats[r.provider].sentiments.push(r.mentionSentiment);
    }
  }

  // Category-level stats
  const categories = Array.from(new Set(successResponses.map((r) => r.category)));
  const categoryStats: Record<string, { total: number; mentioned: number }> = {};
  for (const r of successResponses) {
    if (!categoryStats[r.category]) categoryStats[r.category] = { total: 0, mentioned: 0 };
    categoryStats[r.category].total++;
    if (r.brandMentioned) categoryStats[r.category].mentioned++;
  }

  // Sentiment analysis
  const allSentiments = mentionedResponses.map((r) => r.mentionSentiment).filter(Boolean) as string[];
  const sentimentCounts = { positive: 0, mixed: 0, negative: 0, neutral: 0 };
  for (const s of allSentiments) {
    if (s in sentimentCounts) sentimentCounts[s as keyof typeof sentimentCounts]++;
  }
  const sentimentTotal = allSentiments.length || 1;
  const sentimentScore = Math.round(
    ((sentimentCounts.positive * 100 + sentimentCounts.mixed * 50 + sentimentCounts.neutral * 50 + sentimentCounts.negative * 0) / sentimentTotal)
  );

  const overallSentiment = sentimentCounts.positive >= sentimentCounts.negative * 2
    ? "positive"
    : sentimentCounts.negative >= sentimentCounts.positive * 2
    ? "negative"
    : "mixed";

  // Competitive positioning
  const competitorMentions: Record<string, { total: number; byProvider: Record<string, number>; categories: Set<string> }> = {};
  for (const r of successResponses) {
    for (const comp of r.competitorsMentioned) {
      if (!competitorMentions[comp]) competitorMentions[comp] = { total: 0, byProvider: {}, categories: new Set() };
      competitorMentions[comp].total++;
      competitorMentions[comp].byProvider[r.provider] = (competitorMentions[comp].byProvider[r.provider] || 0) + 1;
      competitorMentions[comp].categories.add(r.category);
    }
  }

  const sortedCompetitors = Object.entries(competitorMentions)
    .sort(([, a], [, b]) => b.total - a.total)
    .slice(0, 10);

  const primaryCompetitors = sortedCompetitors.map(([name, data]) => {
    const compMentionRate = data.total / totalResponses;
    const threatLevel = compMentionRate > overallMentionRate ? "high" : compMentionRate > overallMentionRate * 0.5 ? "medium" : "low";
    return {
      name,
      total_mentions: data.total,
      mentions_by_provider: data.byProvider,
      categories_dominated: Array.from(data.categories),
      positioning_vs_target: compMentionRate > overallMentionRate
        ? `${name} appears more frequently than ${brand.name} in AI responses`
        : `${brand.name} appears more frequently than ${name}`,
      threat_level: threatLevel,
      what_they_do_right: `Mentioned in ${Math.round(compMentionRate * 100)}% of responses across ${data.categories.size} categories`,
    };
  });

  // Brand visibility scoring
  const providerScores: Record<string, number> = {};
  for (const [prov, stats] of Object.entries(providerStats)) {
    providerScores[prov] = stats.total > 0 ? Math.round((stats.mentioned / stats.total) * 100) : 0;
  }

  const categoryScores: Record<string, number> = {};
  for (const [cat, stats] of Object.entries(categoryStats)) {
    categoryScores[cat] = stats.total > 0 ? Math.round((stats.mentioned / stats.total) * 100) : 0;
  }

  // Position-weighted visibility: 1st position is better
  const positionWeights: Record<string, number> = { "1st": 1.0, "2nd": 0.8, "3rd": 0.6, "4th": 0.4, "5th+": 0.2, "passing": 0.1 };
  let weightedScore = 0;
  let weightedCount = 0;
  for (const r of mentionedResponses) {
    const weight = positionWeights[r.mentionPosition || "passing"] || 0.1;
    weightedScore += weight * 100;
    weightedCount++;
  }
  const notMentioned = totalResponses - mentionedResponses.length;
  weightedCount += notMentioned;

  const visibilityScore = weightedCount > 0 ? Math.round(weightedScore / weightedCount) : 0;

  // Strongest and weakest queries
  const promptMentionData = prompts.map((p) => {
    const successes = p.responses.filter((r) => r.status === "success");
    const mentioned = successes.filter((r) => r.brandMentioned);
    return {
      promptNumber: p.promptNumber,
      prompt: p.promptText,
      category: p.category,
      mentionRate: successes.length > 0 ? mentioned.length / successes.length : 0,
      providers_mentioned: mentioned.map((r) => r.provider),
      expected: "maybe",
    };
  });

  const strongestQueries = promptMentionData
    .filter((p) => p.mentionRate > 0)
    .sort((a, b) => b.mentionRate - a.mentionRate)
    .slice(0, 5)
    .map((p) => ({ promptNumber: p.promptNumber, prompt: p.prompt, providers_mentioned: p.providers_mentioned }));

  const weakestQueries = promptMentionData
    .filter((p) => p.mentionRate === 0)
    .slice(0, 5)
    .map((p) => ({ promptNumber: p.promptNumber, prompt: p.prompt, expected: p.expected, providers_mentioned: p.providers_mentioned }));

  const providerRanking = Object.entries(providerScores)
    .sort(([, a], [, b]) => b - a)
    .map(([prov]) => prov);

  // Provider-level sentiment
  const providerComparison: Record<string, { sentiment: string; score: number }> = {};
  for (const [prov, stats] of Object.entries(providerStats)) {
    const sentCounts = { positive: 0, mixed: 0, negative: 0, neutral: 0 };
    for (const s of stats.sentiments) {
      if (s in sentCounts) sentCounts[s as keyof typeof sentCounts]++;
    }
    const total = stats.sentiments.length || 1;
    const score = Math.round((sentCounts.positive * 100 + sentCounts.mixed * 50 + sentCounts.neutral * 50) / total);
    const sentiment = sentCounts.positive >= sentCounts.negative * 2 ? "positive" : sentCounts.negative >= sentCounts.positive ? "negative" : "mixed";
    providerComparison[prov] = { sentiment, score };
  }

  // Content gaps
  const brandFeatures = brand.features.split(/[,;]/).map((f) => f.trim()).filter(Boolean);
  const lowCategories = Object.entries(categoryScores).filter(([, score]) => score < 30).map(([cat]) => cat);
  const lowProviders = Object.entries(providerScores).filter(([, score]) => score < 20);

  const providerSpecificGaps: Record<string, string[]> = {};
  for (const [prov, score] of lowProviders) {
    providerSpecificGaps[prov] = [`Low visibility (${score}%) — ${brand.name} is rarely mentioned by ${prov}`];
  }

  // Extract positive/negative themes from mentioned responses
  const positiveThemes: string[] = [];
  const negativeThemes: string[] = [];
  const positiveWords = ["excellent", "wonderful", "amazing", "great", "beautiful", "recommend", "love", "best", "fantastic", "unique", "award", "outstanding", "quality", "expert", "premium"];
  const negativeWords = ["expensive", "disappointing", "poor", "limited", "small", "dated", "issue", "problem", "lack"];

  const posFound = new Set<string>();
  const negFound = new Set<string>();
  for (const r of mentionedResponses) {
    const lower = r.answer.toLowerCase();
    for (const w of positiveWords) if (lower.includes(w) && !posFound.has(w)) { posFound.add(w); positiveThemes.push(w); }
    for (const w of negativeWords) if (lower.includes(w) && !negFound.has(w)) { negFound.add(w); negativeThemes.push(w); }
  }

  // Recommendations
  const quickWins: string[] = [];
  const longTermPlays: string[] = [];
  const thirdPartyActions: string[] = [];
  const structuredDataRecs: string[] = [];

  if (overallMentionRate < 0.5) {
    quickWins.push(`Improve online presence — ${brand.name} is only mentioned in ${Math.round(overallMentionRate * 100)}% of AI responses`);
  }
  if (lowCategories.length > 0) {
    quickWins.push(`Create content targeting ${lowCategories.join(", ")} queries where visibility is below 30%`);
  }
  for (const [prov, score] of lowProviders) {
    quickWins.push(`Optimize for ${prov} — current mention rate is only ${score}%`);
  }

  if (primaryCompetitors.length > 0 && primaryCompetitors[0].total_mentions > mentionedResponses.length) {
    longTermPlays.push(`${primaryCompetitors[0].name} dominates AI responses — develop a differentiation strategy`);
  }
  longTermPlays.push("Build authoritative content across multiple channels to increase AI training data coverage");
  longTermPlays.push("Encourage customer reviews on Google, TripAdvisor, and industry-specific platforms");

  thirdPartyActions.push("Claim and optimize Google Business Profile");
  thirdPartyActions.push("Ensure consistent NAP (Name, Address, Phone) across all directories");
  if (brand.category.toLowerCase().includes("hotel") || brand.category.toLowerCase().includes("restaurant")) {
    thirdPartyActions.push("Respond to reviews on TripAdvisor, Google, and booking platforms");
  }

  structuredDataRecs.push("Add Schema.org structured data (LocalBusiness or Organization) to your website");
  structuredDataRecs.push("Implement FAQ schema for commonly asked questions about your brand");

  // Build content recommendations from weak categories
  const newContent = lowCategories.slice(0, 5).map((cat, i) => ({
    priority: i < 2 ? "high" : "medium",
    type: "blog post",
    topic: `Content addressing ${cat} queries about ${brand.name}`,
    target_queries: promptMentionData.filter((p) => p.category === cat && p.mentionRate === 0).map((p) => p.promptNumber).slice(0, 3),
    target_providers: lowProviders.map(([p]) => p),
    rationale: `${cat} category has only ${categoryScores[cat] || 0}% visibility`,
    suggested_scope: `Comprehensive ${cat.toLowerCase()} guide featuring ${brand.name} in ${brand.location}`,
  }));

  // Executive summary
  const topProvider = providerRanking[0] || "unknown";
  const bottomProvider = providerRanking[providerRanking.length - 1] || "unknown";
  const topCategory = Object.entries(categoryScores).sort(([, a], [, b]) => b - a)[0]?.[0] || "unknown";

  const executiveSummary = `${brand.name} has an overall AI visibility score of ${visibilityScore}/100 with a ${Math.round(overallMentionRate * 100)}% mention rate across ${providers.length} AI providers and ${prompts.length} prompts. Sentiment is ${overallSentiment} (${sentimentScore}/100). ${topProvider} shows the highest visibility at ${providerScores[topProvider]}%, while ${bottomProvider} is lowest at ${providerScores[bottomProvider]}%. The strongest category is ${topCategory} (${categoryScores[topCategory]}%).${primaryCompetitors.length > 0 ? ` Top competitor ${primaryCompetitors[0].name} was mentioned ${primaryCompetitors[0].total_mentions} times.` : ""}`;

  return {
    executive_summary: executiveSummary,
    sentiment_analysis: {
      overall_sentiment: overallSentiment,
      sentiment_score: sentimentScore,
      positive_themes: positiveThemes.slice(0, 8),
      negative_themes: negativeThemes.slice(0, 5),
      neutral_gaps: lowCategories.map((c) => `Low engagement in ${c} queries`),
      inaccuracies: [],
      provider_comparison: providerComparison,
    },
    brand_visibility: {
      overall_score: visibilityScore,
      provider_scores: providerScores,
      category_scores: categoryScores,
      strongest_queries: strongestQueries,
      weakest_queries: weakestQueries,
      provider_ranking: providerRanking,
    },
    competitive_positioning: {
      primary_competitors: primaryCompetitors,
      competitive_advantages_recognized: positiveThemes.slice(0, 5).map((t) => `Recognized as "${t}" in AI responses`),
      competitive_advantages_missing: brandFeatures.filter((f) => {
        const lower = f.toLowerCase();
        return !mentionedResponses.some((r) => r.answer.toLowerCase().includes(lower));
      }).map((f) => `Feature "${f}" not reflected in AI responses`),
      competitive_disadvantages: negativeThemes.slice(0, 3).map((t) => `Sometimes described as "${t}"`),
    },
    content_gaps: {
      missing_topics: lowCategories.map((c) => `${c} queries need more coverage`),
      underrepresented_features: brandFeatures.filter((f) => {
        const lower = f.toLowerCase();
        const mentionCount = successResponses.filter((r) => r.answer.toLowerCase().includes(lower)).length;
        return mentionCount < totalResponses * 0.1;
      }),
      missing_use_cases: [],
      provider_specific_gaps: providerSpecificGaps,
    },
    recommendations: {
      new_content_to_create: newContent,
      existing_content_to_update: [],
      structured_data_recommendations: structuredDataRecs,
      third_party_actions: thirdPartyActions,
      quick_wins: quickWins,
      long_term_plays: longTermPlays,
    },
  };
}
