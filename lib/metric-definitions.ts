export const METRIC_DEFINITIONS = {
  mentionRate:
    "Percentage of successful AI responses that mention your brand by name. Calculated as: (responses mentioning brand / total successful responses) × 100.",
  visibility:
    "Weighted score (0–100) based on how prominently AI engines position your brand. Each mention is weighted by position: 1st = 100%, 2nd = 80%, 3rd = 60%, 4th = 40%, 5th+ = 20%, passing = 10%. Non-mentions score 0. Averaged across all responses.",
  sentiment:
    "Score (0–100) based on tone of responses that mention your brand. Positive = 100 pts, Mixed/Neutral = 50 pts, Negative = 0 pts. Averaged across all mentioned responses.",
  rank:
    "Your brand's position among competitors, ranked by visibility score.",
};
