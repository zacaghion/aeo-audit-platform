const POSITION_PATTERNS = [
  { pattern: /(?:^|\n)\s*(?:1[\.\):]|first|#1)\s/i, position: "1st" },
  { pattern: /(?:^|\n)\s*(?:2[\.\):]|second|#2)\s/i, position: "2nd" },
  { pattern: /(?:^|\n)\s*(?:3[\.\):]|third|#3)\s/i, position: "3rd" },
  { pattern: /(?:^|\n)\s*(?:4[\.\):]|fourth|#4)\s/i, position: "4th" },
];

function buildHotelPatterns(hotelName: string): string[] {
  const name = hotelName.toLowerCase().trim();
  const patterns = [name];
  const noDash = name.replace(/-/g, " ");
  const dashed = name.replace(/\s+/g, "-");
  const collapsed = name.replace(/[\s-]+/g, "");
  if (noDash !== name) patterns.push(noDash);
  if (dashed !== name) patterns.push(dashed);
  if (collapsed !== name) patterns.push(collapsed);
  const words = name.split(/\s+/);
  if (words.length > 2) {
    patterns.push(words.slice(0, -1).join(" "));
  }
  return Array.from(new Set(patterns)).filter(p => p.length >= 3);
}

export function analyzeResponse(
  answer: string,
  competitors: string[],
  hotelName?: string
): {
  hotelMentioned: boolean;
  mentionPosition: string | null;
  mentionSentiment: string | null;
  competitorsMentioned: string[];
  competitorCount: number;
  answerLength: number;
} {
  const lowerAnswer = answer.toLowerCase();
  const hotelPatterns = hotelName
    ? buildHotelPatterns(hotelName)
    : buildHotelPatterns("Ad Lib Hotel Bangkok");
  const hotelMentioned = hotelPatterns.some((p) => lowerAnswer.includes(p));

  let mentionPosition: string | null = null;
  if (hotelMentioned) {
    const mentionIdx = hotelPatterns.reduce((min, p) => {
      const idx = lowerAnswer.indexOf(p);
      return idx >= 0 && idx < min ? idx : min;
    }, Infinity);

    const beforeMention = answer.substring(0, mentionIdx);
    const hotelNamesBefore = countHotelNamesBefore(beforeMention, competitors);

    if (hotelNamesBefore === 0) mentionPosition = "1st";
    else if (hotelNamesBefore === 1) mentionPosition = "2nd";
    else if (hotelNamesBefore === 2) mentionPosition = "3rd";
    else if (hotelNamesBefore === 3) mentionPosition = "4th";
    else mentionPosition = "5th+";

    for (const { pattern, position } of POSITION_PATTERNS) {
      if (pattern.test(beforeMention + answer.substring(mentionIdx, mentionIdx + 100))) {
        const section = answer.substring(
          Math.max(0, mentionIdx - 200),
          mentionIdx + 200
        );
        if (hotelPatterns.some((p) => section.toLowerCase().includes(p))) {
          mentionPosition = position;
          break;
        }
      }
    }

    if (hotelNamesBefore > 4 && mentionPosition === "5th+") {
      mentionPosition = "passing";
    }
  }

  let mentionSentiment: string | null = null;
  if (hotelMentioned) {
    mentionSentiment = analyzeSentimentHeuristic(answer);
  }

  const foundCompetitors: string[] = [];
  for (const comp of competitors) {
    const compLower = comp.toLowerCase();
    const compParts = compLower.split(/\s+/);
    const shortName = compParts.length > 2
      ? compParts.slice(0, -1).join(" ")
      : compLower;

    if (lowerAnswer.includes(compLower) || lowerAnswer.includes(shortName)) {
      foundCompetitors.push(comp);
    }
  }

  return {
    hotelMentioned,
    mentionPosition,
    mentionSentiment,
    competitorsMentioned: foundCompetitors,
    competitorCount: foundCompetitors.length,
    answerLength: answer.length,
  };
}

function countHotelNamesBefore(text: string, competitors: string[]): number {
  const lower = text.toLowerCase();
  let count = 0;
  for (const comp of competitors) {
    if (lower.includes(comp.toLowerCase())) count++;
  }
  return count;
}

function analyzeSentimentHeuristic(answer: string): string {
  const lower = answer.toLowerCase();
  const positiveWords = [
    "excellent", "wonderful", "amazing", "great", "beautiful", "stunning",
    "recommend", "love", "best", "fantastic", "unique", "charming", "award",
    "impressive", "outstanding", "perfect", "exceptional",
  ];
  const negativeWords = [
    "small", "cramped", "noisy", "expensive", "disappointing", "poor",
    "lack", "dated", "issue", "problem", "complaint", "downside", "drawback",
    "con", "negative", "limited",
  ];

  let posCount = 0;
  let negCount = 0;
  for (const w of positiveWords) if (lower.includes(w)) posCount++;
  for (const w of negativeWords) if (lower.includes(w)) negCount++;

  if (posCount > 0 && negCount > 0) return "mixed";
  if (posCount > negCount + 2) return "positive";
  if (negCount > posCount + 1) return "negative";
  if (posCount > 0) return "positive";
  return "neutral";
}

export function computeAuditSummary(
  prompts: Array<{ category: string; responses: Array<{ provider: string; hotelMentioned: boolean; answerLength: number }> }>
): {
  totalPrompts: number;
  totalResponses: number;
  mentionRate: number;
  mentionRateByProvider: Record<string, number>;
  mentionRateByCategory: Record<string, number>;
  crossTab: Record<string, Record<string, number>>;
  avgAnswerLength: number;
  providersQueried: string[];
} {
  const providers = new Set<string>();
  const categories = new Set<string>();
  let totalMentions = 0;
  let totalResponses = 0;
  let totalLength = 0;
  const providerMentions: Record<string, { total: number; mentioned: number }> = {};
  const categoryMentions: Record<string, { total: number; mentioned: number }> = {};
  const crossTab: Record<string, Record<string, number>> = {};

  for (const prompt of prompts) {
    categories.add(prompt.category);
    if (!categoryMentions[prompt.category]) {
      categoryMentions[prompt.category] = { total: 0, mentioned: 0 };
    }
    if (!crossTab[prompt.category]) crossTab[prompt.category] = {};

    for (const resp of prompt.responses) {
      providers.add(resp.provider);
      totalResponses++;
      totalLength += resp.answerLength;

      if (!providerMentions[resp.provider]) {
        providerMentions[resp.provider] = { total: 0, mentioned: 0 };
      }
      providerMentions[resp.provider].total++;
      categoryMentions[prompt.category].total++;

      if (!crossTab[prompt.category][resp.provider]) {
        crossTab[prompt.category][resp.provider] = 0;
      }

      if (resp.hotelMentioned) {
        totalMentions++;
        providerMentions[resp.provider].mentioned++;
        categoryMentions[prompt.category].mentioned++;
        crossTab[prompt.category][resp.provider]++;
      }
    }
  }

  const mentionRateByProvider: Record<string, number> = {};
  for (const [p, v] of Object.entries(providerMentions)) {
    mentionRateByProvider[p] = v.total > 0 ? Math.round((v.mentioned / v.total) * 100) : 0;
  }

  const mentionRateByCategory: Record<string, number> = {};
  for (const [c, v] of Object.entries(categoryMentions)) {
    mentionRateByCategory[c] = v.total > 0 ? Math.round((v.mentioned / v.total) * 100) : 0;
  }

  const crossTabRates: Record<string, Record<string, number>> = {};
  for (const cat of Object.keys(crossTab)) {
    crossTabRates[cat] = {};
    for (const prov of Object.keys(crossTab[cat])) {
      const catProvTotal = prompts.filter(
        (p) => p.category === cat && p.responses.some((r) => r.provider === prov)
      ).length;
      crossTabRates[cat][prov] = catProvTotal > 0
        ? Math.round((crossTab[cat][prov] / catProvTotal) * 100)
        : 0;
    }
  }

  return {
    totalPrompts: prompts.length,
    totalResponses,
    mentionRate: totalResponses > 0 ? Math.round((totalMentions / totalResponses) * 100) : 0,
    mentionRateByProvider,
    mentionRateByCategory,
    crossTab: crossTabRates,
    avgAnswerLength: totalResponses > 0 ? Math.round(totalLength / totalResponses) : 0,
    providersQueried: Array.from(providers),
  };
}
