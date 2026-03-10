import { prisma } from "@/lib/db";
import { decrypt } from "@/lib/crypto";
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
  website: string;
  location: string;
  category: string;
  features: string;
  competitors: string;
}

async function getKey(provider: string): Promise<string | null> {
  const record = await prisma.apiKey.findUnique({ where: { provider } });
  if (!record) return null;
  try {
    return decrypt(record.encryptedKey, record.iv, record.authTag);
  } catch {
    return null;
  }
}

async function callClaude(apiKey: string, system: string, userMessage: string): Promise<string> {
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
    throw new Error(err.error?.message || `Claude API ${res.status}`);
  }
  const data = await res.json();
  return data.content?.filter((b: Record<string, string>) => b.type === "text").map((b: Record<string, string>) => b.text).join("") || "";
}

function selectSampleResponses(prompts: PromptData[], maxSamples: number = 15): string {
  const samples: string[] = [];
  const successResponses = prompts.flatMap((p) =>
    p.responses.filter((r) => r.status === "success").map((r) => ({
      ...r,
      category: p.category,
      promptNumber: p.promptNumber,
      promptText: p.promptText,
    }))
  );

  // Pick strongest (brand mentioned in good position)
  const strong = successResponses.filter((r) => r.brandMentioned && r.mentionPosition === "1st").slice(0, 3);
  // Pick weakest (brand not mentioned where expected)
  const weak = successResponses.filter((r) => !r.brandMentioned).slice(0, 3);
  // Pick mixed sentiment
  const mixed = successResponses.filter((r) => r.mentionSentiment === "mixed" || r.mentionSentiment === "negative").slice(0, 3);
  // Pick high competitor mentions
  const compHeavy = successResponses.filter((r) => r.competitorCount >= 2).slice(0, 3);
  // Fill remaining with random
  const used = new Set([...strong, ...weak, ...mixed, ...compHeavy].map((r) => `${r.promptNumber}:${r.provider}`));
  const remaining = successResponses.filter((r) => !used.has(`${r.promptNumber}:${r.provider}`));
  const filler = remaining.sort(() => Math.random() - 0.5).slice(0, maxSamples - used.size);

  for (const r of [...strong, ...weak, ...mixed, ...compHeavy, ...filler].slice(0, maxSamples)) {
    const truncatedAnswer = r.answer.length > 500 ? r.answer.substring(0, 500) + "..." : r.answer;
    samples.push(`[#${r.promptNumber}, ${r.category}, ${r.provider}, mentioned=${r.brandMentioned ? "yes" : "no"}, position=${r.mentionPosition || "n/a"}, sentiment=${r.mentionSentiment || "n/a"}, competitors=${r.competitorsMentioned.join(",")||"none"}]\nPrompt: ${r.promptText}\nResponse: ${truncatedAnswer}`);
  }
  return samples.join("\n\n---\n\n");
}

function buildStatsContext(heuristic: AnalysisOutput, brand: BrandData, totalResponses: number): string {
  const lines: string[] = [];
  lines.push(`Brand: ${brand.name} (${brand.category})`);
  if (brand.location) lines.push(`Location: ${brand.location}`);
  lines.push(`Features: ${brand.features}`);
  lines.push(`Known Competitors: ${brand.competitors}`);
  lines.push(`Total Responses: ${totalResponses}`);
  lines.push("");
  lines.push("VISIBILITY:");
  lines.push(`  Overall Score: ${heuristic.brand_visibility.overall_score}/100`);
  for (const [prov, score] of Object.entries(heuristic.brand_visibility.provider_scores)) {
    lines.push(`  ${prov}: ${score}%`);
  }
  lines.push("  By Category:");
  for (const [cat, score] of Object.entries(heuristic.brand_visibility.category_scores)) {
    lines.push(`    ${cat}: ${score}%`);
  }
  lines.push("");
  lines.push("SENTIMENT:");
  lines.push(`  Overall: ${heuristic.sentiment_analysis.overall_sentiment} (${heuristic.sentiment_analysis.sentiment_score}/100)`);
  for (const [prov, data] of Object.entries(heuristic.sentiment_analysis.provider_comparison)) {
    lines.push(`  ${prov}: ${data.sentiment} (${data.score})`);
  }
  if (heuristic.sentiment_analysis.positive_themes.length > 0) {
    lines.push(`  Positive themes: ${heuristic.sentiment_analysis.positive_themes.join(", ")}`);
  }
  if (heuristic.sentiment_analysis.negative_themes.length > 0) {
    lines.push(`  Negative themes: ${heuristic.sentiment_analysis.negative_themes.join(", ")}`);
  }
  lines.push("");
  lines.push("COMPETITORS:");
  for (const comp of heuristic.competitive_positioning.primary_competitors) {
    lines.push(`  ${comp.name}: ${comp.total_mentions} mentions, threat=${comp.threat_level}`);
  }
  return lines.join("\n");
}

export async function generateAnalysis(
  prompts: PromptData[],
  brand: BrandData
): Promise<AnalysisOutput> {
  // Always compute heuristic first as the base layer
  const heuristic = generateAnalysisHeuristic(prompts, brand);

  const analysisKey = await getKey("claude-analysis");
  const recsKey = await getKey("claude-recommendations");

  if (!analysisKey) {
    console.log("No claude-analysis key, using heuristic analysis only");
    return heuristic;
  }

  const totalResponses = prompts.flatMap((p) => p.responses.filter((r) => r.status === "success")).length;

  try {
    // Call 1: Analysis
    console.log("Running LLM analysis...");
    const statsContext = buildStatsContext(heuristic, brand, totalResponses);
    const sampleResponses = selectSampleResponses(prompts);

    const analysisText = await callClaude(
      analysisKey,
      `You are an expert AEO (Answer Engine Optimization) analyst. Analyze audit data showing how AI engines mention and describe a brand. Produce insightful, specific analysis grounded in the data. Respond with valid JSON only, no markdown fences.`,
      `Analyze this AEO audit data for ${brand.name}:

${statsContext}

SAMPLE AI RESPONSES:
${sampleResponses}

Return this JSON structure:
{
  "executive_summary": "3-4 paragraph executive summary of findings, key insights, and strategic implications",
  "sentiment_analysis": {
    "narrative": "2-3 paragraphs analyzing how AI engines describe ${brand.name} — tone, accuracy, recurring themes, notable differences between providers",
    "overall_sentiment": "${heuristic.sentiment_analysis.overall_sentiment}",
    "sentiment_score": ${heuristic.sentiment_analysis.sentiment_score},
    "positive_themes": ["specific themes found in responses, not just single words"],
    "negative_themes": ["specific concerns or criticisms found"],
    "neutral_gaps": ["topics where AI engines have no opinion or knowledge"],
    "inaccuracies": ["any factual errors found in AI responses about ${brand.name}"]
  },
  "brand_visibility": {
    "narrative": "2-3 paragraphs analyzing visibility patterns — which providers and categories show strong/weak presence, why some queries succeed and others fail",
    "overall_score": ${heuristic.brand_visibility.overall_score},
    "provider_scores": ${JSON.stringify(heuristic.brand_visibility.provider_scores)},
    "category_scores": ${JSON.stringify(heuristic.brand_visibility.category_scores)},
    "provider_ranking": ${JSON.stringify(heuristic.brand_visibility.provider_ranking)}
  },
  "competitive_positioning": {
    "narrative": "2-3 paragraphs on competitive landscape — who dominates AI responses, how ${brand.name} is positioned relative to competitors, what competitors do well that ${brand.name} doesn't",
    "primary_competitors": [{"name":"...", "total_mentions":0, "threat_level":"high|medium|low", "categories_dominated":["..."], "positioning_vs_target":"...", "what_they_do_right":"...", "mentions_by_provider":{}}],
    "competitive_advantages_recognized": ["advantages AI engines attribute to ${brand.name}"],
    "competitive_advantages_missing": ["real advantages not reflected in AI responses"],
    "competitive_disadvantages": ["weaknesses AI engines associate with ${brand.name}"]
  },
  "content_gaps": {
    "narrative": "2-3 paragraphs identifying what's missing from AI engines' knowledge about ${brand.name} and why it matters",
    "missing_topics": ["specific topics AI engines don't cover"],
    "underrepresented_features": ["${brand.name} features/capabilities that AI engines don't mention enough"],
    "missing_use_cases": ["use cases or buyer scenarios not addressed"],
    "provider_specific_gaps": {"provider_name": ["specific gaps for that provider"]}
  }
}`
    );

    let analysisJson: Partial<AnalysisOutput>;
    try {
      const cleaned = analysisText.replace(/^```json?\n?/, "").replace(/\n?```$/, "").trim();
      analysisJson = JSON.parse(cleaned);
    } catch {
      console.error("Failed to parse analysis JSON, using heuristic");
      return heuristic;
    }

    // Merge LLM analysis with heuristic data (keep heuristic scores, use LLM narratives)
    const merged: AnalysisOutput = {
      ...heuristic,
      executive_summary: analysisJson.executive_summary || heuristic.executive_summary,
      sentiment_analysis: {
        ...heuristic.sentiment_analysis,
        narrative: analysisJson.sentiment_analysis?.narrative || "",
        positive_themes: analysisJson.sentiment_analysis?.positive_themes || heuristic.sentiment_analysis.positive_themes,
        negative_themes: analysisJson.sentiment_analysis?.negative_themes || heuristic.sentiment_analysis.negative_themes,
        neutral_gaps: analysisJson.sentiment_analysis?.neutral_gaps || heuristic.sentiment_analysis.neutral_gaps,
        inaccuracies: analysisJson.sentiment_analysis?.inaccuracies || heuristic.sentiment_analysis.inaccuracies,
      },
      brand_visibility: {
        ...heuristic.brand_visibility,
        narrative: analysisJson.brand_visibility?.narrative || "",
      },
      competitive_positioning: {
        ...heuristic.competitive_positioning,
        narrative: analysisJson.competitive_positioning?.narrative || "",
        competitive_advantages_recognized: analysisJson.competitive_positioning?.competitive_advantages_recognized || heuristic.competitive_positioning.competitive_advantages_recognized,
        competitive_advantages_missing: analysisJson.competitive_positioning?.competitive_advantages_missing || heuristic.competitive_positioning.competitive_advantages_missing,
        competitive_disadvantages: analysisJson.competitive_positioning?.competitive_disadvantages || heuristic.competitive_positioning.competitive_disadvantages,
      },
      content_gaps: {
        ...heuristic.content_gaps,
        narrative: analysisJson.content_gaps?.narrative || "",
        missing_topics: analysisJson.content_gaps?.missing_topics || heuristic.content_gaps.missing_topics,
        underrepresented_features: analysisJson.content_gaps?.underrepresented_features || heuristic.content_gaps.underrepresented_features,
        missing_use_cases: analysisJson.content_gaps?.missing_use_cases || heuristic.content_gaps.missing_use_cases,
        provider_specific_gaps: analysisJson.content_gaps?.provider_specific_gaps || heuristic.content_gaps.provider_specific_gaps,
      },
    };

    // Call 2: Recommendations
    if (recsKey) {
      console.log("Running LLM recommendations...");

      // Build list of prompts where brand was NOT mentioned (targets for improvement)
      const missedPrompts = prompts
        .filter((p) => p.responses.filter((r) => r.status === "success").every((r) => !r.brandMentioned))
        .slice(0, 10)
        .map((p) => `- "${p.promptText}" (${p.category})`)
        .join("\n");

      try {
        const recsText = await callClaude(
          recsKey,
          `You are producing a deliverable that a marketing manager will hand directly to their web team today. Every recommendation MUST include exact page URLs on the brand's website, exact text to add or change, and step-by-step instructions. Generic advice like "improve your content" is worthless. Be specific enough that someone can implement each recommendation without asking a single follow-up question. Respond with valid JSON only, no markdown fences.`,
          `AEO Audit Results for ${brand.name} (${brand.category})
Website: ${brand.website || "unknown"}
Features: ${brand.features}
Competitors: ${brand.competitors}

Visibility: ${merged.brand_visibility.overall_score}/100
Sentiment: ${merged.sentiment_analysis.overall_sentiment} (${merged.sentiment_analysis.sentiment_score}/100)
Top Competitors: ${merged.competitive_positioning.primary_competitors.map(c => `${c.name} (${c.total_mentions} mentions, threat=${c.threat_level})`).join(", ")}

Content Gaps: ${merged.content_gaps.narrative}

Weakest Categories: ${Object.entries(merged.brand_visibility.category_scores).filter(([,s]) => s < 50).map(([c,s]) => `${c} (${s}%)`).join(", ") || "none"}
Weakest Providers: ${Object.entries(merged.brand_visibility.provider_scores).filter(([,s]) => s < 50).map(([p,s]) => `${p} (${s}%)`).join(", ") || "none"}

PROMPTS WHERE ${brand.name.toUpperCase()} WAS NOT MENTIONED BY ANY AI ENGINE:
${missedPrompts || "None — brand was mentioned in all queries"}

Based on your knowledge of ${brand.website || brand.name + "'s website"}, produce hyper-specific recommendations. For each existing page to update, use real URLs from the brand's website (e.g., ${brand.website}/products/..., ${brand.website}/solutions/...). Write actual draft copy, not descriptions of what to write.

{
  "recommendations": {
    "existing_content_to_update": [
      {
        "priority": "high|medium|low",
        "page_url": "https://exact-url-on-their-website.com/specific-page",
        "page_type": "Product page|Landing page|Blog post|About page",
        "current_state": "Describe what's currently missing or wrong on this specific page",
        "suggested_revision": "Write the EXACT new meta description, heading, or paragraph text to add. Not a description — the actual copy.",
        "rationale": "Why this specific change matters, referencing audit data (e.g., 'This page is not cited by any AI engine. Competitors X and Y are cited for this topic N times.')",
        "estimated_impact": "high|medium|low",
        "effort": "low|medium|high",
        "steps": ["Step 1: exact instruction", "Step 2: exact instruction"]
      }
    ],
    "new_content_to_create": [
      {
        "priority": "high|medium|low",
        "type": "FAQ page|Comparison page|Blog post|Case study|Landing page",
        "topic": "Specific page title",
        "draft_outline": ["H1: Exact heading", "H2: Section heading (what to cover)", "H2: Another section"],
        "target_queries": [1,2,3],
        "target_providers": ["chatgpt","gemini"],
        "rationale": "Why this content is needed, with data from the audit",
        "suggested_scope": "Detailed description of what to cover",
        "estimated_impact": "high|medium|low",
        "effort": "low|medium|high"
      }
    ],
    "quick_wins": [
      {
        "action": "Specific action with exact details",
        "steps": ["Step 1", "Step 2"],
        "estimated_impact": "high|medium|low",
        "effort": "low"
      }
    ],
    "long_term_plays": [
      {
        "action": "Strategic action with specifics",
        "steps": ["Step 1", "Step 2"],
        "estimated_impact": "high|medium|low",
        "effort": "medium|high"
      }
    ],
    "structured_data_recommendations": ["Specific schema.org markup to add, with exact page URLs"],
    "third_party_actions": ["Specific actions on named third-party platforms"]
  }
}

Generate 3-5 items for existing_content_to_update (most important), 3-5 for new_content_to_create, 3-5 quick_wins, 2-3 long_term_plays. Every item must reference specific audit findings.`
        );

        try {
          const cleaned = recsText.replace(/^```json?\n?/, "").replace(/\n?```$/, "").trim();
          const recsJson = JSON.parse(cleaned);
          if (recsJson.recommendations) {
            merged.recommendations = {
              ...heuristic.recommendations,
              ...recsJson.recommendations,
            };
          }
        } catch {
          console.error("Failed to parse recommendations JSON, using heuristic");
        }
      } catch (e) {
        console.error("Recommendations LLM call failed:", e);
      }
    }

    return merged;
  } catch (e) {
    console.error("Analysis LLM call failed, falling back to heuristic:", e);
    return heuristic;
  }
}

// The original heuristic-based analysis (kept as fallback and base layer)
function generateAnalysisHeuristic(prompts: PromptData[], brand: BrandData): AnalysisOutput {
  const successResponses = prompts.flatMap((p) =>
    p.responses.filter((r) => r.status === "success").map((r) => ({ ...r, category: p.category, promptNumber: p.promptNumber, promptText: p.promptText }))
  );
  const totalResponses = successResponses.length;
  const mentionedResponses = successResponses.filter((r) => r.brandMentioned);
  const overallMentionRate = totalResponses > 0 ? mentionedResponses.length / totalResponses : 0;

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

  const categories = Array.from(new Set(successResponses.map((r) => r.category)));
  const categoryStats: Record<string, { total: number; mentioned: number }> = {};
  for (const r of successResponses) {
    if (!categoryStats[r.category]) categoryStats[r.category] = { total: 0, mentioned: 0 };
    categoryStats[r.category].total++;
    if (r.brandMentioned) categoryStats[r.category].mentioned++;
  }

  const allSentiments = mentionedResponses.map((r) => r.mentionSentiment).filter(Boolean) as string[];
  const sentimentCounts = { positive: 0, mixed: 0, negative: 0, neutral: 0 };
  for (const s of allSentiments) {
    if (s in sentimentCounts) sentimentCounts[s as keyof typeof sentimentCounts]++;
  }
  const sentimentTotal = allSentiments.length || 1;
  const sentimentScore = Math.round(
    ((sentimentCounts.positive * 100 + sentimentCounts.mixed * 50 + sentimentCounts.neutral * 50 + sentimentCounts.negative * 0) / sentimentTotal)
  );
  const overallSentiment = sentimentCounts.positive >= sentimentCounts.negative * 2 ? "positive" : sentimentCounts.negative >= sentimentCounts.positive * 2 ? "negative" : "mixed";

  const competitorMentions: Record<string, { total: number; byProvider: Record<string, number>; categories: Set<string> }> = {};
  for (const r of successResponses) {
    for (const comp of r.competitorsMentioned) {
      if (!competitorMentions[comp]) competitorMentions[comp] = { total: 0, byProvider: {}, categories: new Set() };
      competitorMentions[comp].total++;
      competitorMentions[comp].byProvider[r.provider] = (competitorMentions[comp].byProvider[r.provider] || 0) + 1;
      competitorMentions[comp].categories.add(r.category);
    }
  }

  const sortedCompetitors = Object.entries(competitorMentions).sort(([, a], [, b]) => b.total - a.total).slice(0, 10);
  const primaryCompetitors = sortedCompetitors.map(([name, data]) => {
    const compMentionRate = data.total / totalResponses;
    const threatLevel = compMentionRate > overallMentionRate ? "high" : compMentionRate > overallMentionRate * 0.5 ? "medium" : "low";
    return {
      name, total_mentions: data.total, mentions_by_provider: data.byProvider,
      categories_dominated: Array.from(data.categories),
      positioning_vs_target: compMentionRate > overallMentionRate ? `${name} appears more frequently than ${brand.name}` : `${brand.name} appears more frequently than ${name}`,
      threat_level: threatLevel,
      what_they_do_right: `Mentioned in ${Math.round(compMentionRate * 100)}% of responses across ${data.categories.size} categories`,
    };
  });

  const providerScores: Record<string, number> = {};
  for (const [prov, stats] of Object.entries(providerStats)) {
    providerScores[prov] = stats.total > 0 ? Math.round((stats.mentioned / stats.total) * 100) : 0;
  }
  const categoryScores: Record<string, number> = {};
  for (const [cat, stats] of Object.entries(categoryStats)) {
    categoryScores[cat] = stats.total > 0 ? Math.round((stats.mentioned / stats.total) * 100) : 0;
  }

  const positionWeights: Record<string, number> = { "1st": 1.0, "2nd": 0.8, "3rd": 0.6, "4th": 0.4, "5th+": 0.2, "passing": 0.1 };
  let weightedScore = 0;
  let weightedCount = 0;
  for (const r of mentionedResponses) {
    weightedScore += (positionWeights[r.mentionPosition || "passing"] || 0.1) * 100;
    weightedCount++;
  }
  weightedCount += totalResponses - mentionedResponses.length;
  const visibilityScore = weightedCount > 0 ? Math.round(weightedScore / weightedCount) : 0;

  const promptMentionData = prompts.map((p) => {
    const successes = p.responses.filter((r) => r.status === "success");
    const mentioned = successes.filter((r) => r.brandMentioned);
    return { promptNumber: p.promptNumber, prompt: p.promptText, category: p.category, mentionRate: successes.length > 0 ? mentioned.length / successes.length : 0, providers_mentioned: mentioned.map((r) => r.provider) };
  });

  const strongestQueries = promptMentionData.filter((p) => p.mentionRate > 0).sort((a, b) => b.mentionRate - a.mentionRate).slice(0, 5).map((p) => ({ promptNumber: p.promptNumber, prompt: p.prompt, providers_mentioned: p.providers_mentioned }));
  const weakestQueries = promptMentionData.filter((p) => p.mentionRate === 0).slice(0, 5).map((p) => ({ promptNumber: p.promptNumber, prompt: p.prompt, expected: "maybe", providers_mentioned: p.providers_mentioned }));

  const providerRanking = Object.entries(providerScores).sort(([, a], [, b]) => b - a).map(([prov]) => prov);

  const providerComparison: Record<string, { sentiment: string; score: number }> = {};
  for (const [prov, stats] of Object.entries(providerStats)) {
    const sentCounts = { positive: 0, mixed: 0, negative: 0, neutral: 0 };
    for (const s of stats.sentiments) { if (s in sentCounts) sentCounts[s as keyof typeof sentCounts]++; }
    const total = stats.sentiments.length || 1;
    const score = Math.round((sentCounts.positive * 100 + sentCounts.mixed * 50 + sentCounts.neutral * 50) / total);
    const sentiment = sentCounts.positive >= sentCounts.negative * 2 ? "positive" : sentCounts.negative >= sentCounts.positive ? "negative" : "mixed";
    providerComparison[prov] = { sentiment, score };
  }

  const brandFeatures = brand.features.split(/[,;]/).map((f) => f.trim()).filter(Boolean);
  const lowCategories = Object.entries(categoryScores).filter(([, score]) => score < 30).map(([cat]) => cat);
  const lowProviders = Object.entries(providerScores).filter(([, score]) => score < 20);

  const topProvider = providerRanking[0] || "unknown";
  const bottomProvider = providerRanking[providerRanking.length - 1] || "unknown";
  const topCategory = Object.entries(categoryScores).sort(([, a], [, b]) => b - a)[0]?.[0] || "unknown";

  return {
    executive_summary: `${brand.name} has an overall AI visibility score of ${visibilityScore}/100 with a ${Math.round(overallMentionRate * 100)}% mention rate across ${providers.length} AI providers and ${prompts.length} prompts. Sentiment is ${overallSentiment} (${sentimentScore}/100). ${topProvider} shows the highest visibility at ${providerScores[topProvider]}%, while ${bottomProvider} is lowest at ${providerScores[bottomProvider]}%. The strongest category is ${topCategory} (${categoryScores[topCategory]}%).${primaryCompetitors.length > 0 ? ` Top competitor ${primaryCompetitors[0].name} was mentioned ${primaryCompetitors[0].total_mentions} times.` : ""}`,
    sentiment_analysis: {
      narrative: "",
      overall_sentiment: overallSentiment,
      sentiment_score: sentimentScore,
      positive_themes: [],
      negative_themes: [],
      neutral_gaps: lowCategories.map((c) => `Low engagement in ${c} queries`),
      inaccuracies: [],
      provider_comparison: providerComparison,
    },
    brand_visibility: {
      narrative: "",
      overall_score: visibilityScore,
      provider_scores: providerScores,
      category_scores: categoryScores,
      strongest_queries: strongestQueries,
      weakest_queries: weakestQueries,
      provider_ranking: providerRanking,
    },
    competitive_positioning: {
      narrative: "",
      primary_competitors: primaryCompetitors,
      competitive_advantages_recognized: [],
      competitive_advantages_missing: brandFeatures.filter((f) => {
        return !mentionedResponses.some((r) => r.answer.toLowerCase().includes(f.toLowerCase()));
      }).map((f) => `Feature "${f}" not reflected in AI responses`),
      competitive_disadvantages: [],
    },
    content_gaps: {
      narrative: "",
      missing_topics: lowCategories.map((c) => `${c} queries need more coverage`),
      underrepresented_features: brandFeatures.filter((f) => {
        const count = successResponses.filter((r) => r.answer.toLowerCase().includes(f.toLowerCase())).length;
        return count < totalResponses * 0.1;
      }),
      missing_use_cases: [],
      provider_specific_gaps: Object.fromEntries(lowProviders.map(([prov, score]) => [prov, [`Low visibility (${score}%) — ${brand.name} rarely mentioned`]])),
    },
    recommendations: {
      new_content_to_create: lowCategories.slice(0, 5).map((cat, i) => ({
        priority: i < 2 ? "high" : "medium", type: "blog post",
        topic: `Content addressing ${cat} queries about ${brand.name}`,
        target_queries: promptMentionData.filter((p) => p.category === cat && p.mentionRate === 0).map((p) => p.promptNumber).slice(0, 3),
        target_providers: lowProviders.map(([p]) => p),
        rationale: `${cat} category has only ${categoryScores[cat] || 0}% visibility`,
        suggested_scope: `Comprehensive ${cat.toLowerCase()} guide featuring ${brand.name}`,
      })),
      existing_content_to_update: [],
      structured_data_recommendations: ["Add Schema.org structured data to your website", "Implement FAQ schema for commonly asked questions"],
      third_party_actions: ["Claim and optimize Google Business Profile", "Ensure consistent NAP across all directories"],
      quick_wins: overallMentionRate < 0.5 ? [`Improve online presence — only ${Math.round(overallMentionRate * 100)}% mention rate`] : [],
      long_term_plays: ["Build authoritative content across multiple channels", "Encourage customer reviews on industry platforms"],
    },
  };
}
