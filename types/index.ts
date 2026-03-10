export interface PromptItem {
  id: number;
  prompt: string;
  category: string;
  intent: string;
  expected_mention: "yes" | "maybe" | "no";
}

export interface AIQueryResult {
  answer: string;
  latencyMs: number;
  rawResponse: Record<string, unknown>;
}

export interface AIProviderClient {
  name: string;
  modelId: string;
  query(prompt: string, systemPrompt: string): Promise<AIQueryResult>;
}

export interface ResponseAnalysis {
  brandMentioned: boolean;
  mentionPosition: string | null;
  mentionSentiment: string | null;
  competitorsMentioned: string[];
  competitorCount: number;
  answerLength: number;
}

export interface AnalysisOutput {
  executive_summary: string;
  sentiment_analysis: {
    narrative: string;
    overall_sentiment: string;
    sentiment_score: number;
    positive_themes: string[];
    negative_themes: string[];
    neutral_gaps: string[];
    inaccuracies: string[];
    provider_comparison: Record<string, { sentiment: string; score: number }>;
  };
  brand_visibility: {
    narrative: string;
    overall_score: number;
    provider_scores: Record<string, number>;
    category_scores: Record<string, number>;
    strongest_queries: Array<{
      promptNumber: number;
      prompt: string;
      providers_mentioned: string[];
    }>;
    weakest_queries: Array<{
      promptNumber: number;
      prompt: string;
      expected: string;
      providers_mentioned: string[];
    }>;
    provider_ranking: string[];
  };
  competitive_positioning: {
    narrative: string;
    primary_competitors: Array<{
      name: string;
      total_mentions: number;
      mentions_by_provider: Record<string, number>;
      categories_dominated: string[];
      positioning_vs_target: string;
      threat_level: string;
      what_they_do_right: string;
    }>;
    competitive_advantages_recognized: string[];
    competitive_advantages_missing: string[];
    competitive_disadvantages: string[];
  };
  content_gaps: {
    narrative: string;
    missing_topics: string[];
    underrepresented_features: string[];
    missing_use_cases: string[];
    provider_specific_gaps: Record<string, string[]>;
  };
  benchmark?: {
    rank: number;
    totalCompetitors: number;
    scores: Array<{
      name: string;
      isTarget: boolean;
      visibility: number;
      mentionRate: number;
      sentiment: number;
    }>;
  };
  recommendations: {
    new_content_to_create: Array<{
      priority: string;
      type: string;
      topic: string;
      draft_outline?: string[];
      target_queries: number[];
      target_providers: string[];
      rationale: string;
      suggested_scope: string;
      estimated_impact?: string;
      effort?: string;
    }>;
    existing_content_to_update: Array<{
      priority: string;
      page_url: string;
      page_type?: string;
      current_state: string;
      suggested_revision: string;
      rationale: string;
      estimated_impact?: string;
      effort?: string;
      steps?: string[];
      // Legacy fields for backward compat
      url?: string;
      issue?: string;
      fix?: string;
      expected_impact?: string;
    }>;
    structured_data_recommendations: string[];
    third_party_actions: string[];
    quick_wins: Array<string | {
      action: string;
      steps?: string[];
      estimated_impact?: string;
      effort?: string;
    }>;
    long_term_plays: Array<string | {
      action: string;
      steps?: string[];
      estimated_impact?: string;
      effort?: string;
    }>;
  };
}

export interface AuditConfig {
  promptCount: number;
  providers: string[];
  categories: Record<string, number>;
}

export interface AuditSummary {
  totalPrompts: number;
  totalResponses: number;
  mentionRate: number;
  mentionRateByProvider: Record<string, number>;
  mentionRateByCategory: Record<string, number>;
  crossTab: Record<string, Record<string, number>>;
  topCompetitors: Array<{ name: string; count: number }>;
  avgAnswerLength: number;
  providersQueried: string[];
}
