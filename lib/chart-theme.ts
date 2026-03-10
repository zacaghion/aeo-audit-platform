export const PROVIDER_COLORS: Record<string, string> = {
  chatgpt: "#10B981",
  claude: "#F59E0B",
  gemini: "#6366F1",
  perplexity: "#8B5CF6",
  grok: "#EC4899",
  deepseek: "#06B6D4",
};

export const SENTIMENT_COLORS: Record<string, string> = {
  positive: "#10B981",
  mixed: "#F59E0B",
  negative: "#EF4444",
  neutral: "#6B7280",
};

export function getProviderColor(name: string): string {
  return PROVIDER_COLORS[name.toLowerCase()] || "#6366F1";
}

export const CHART_TOOLTIP_STYLE = {
  backgroundColor: "#111827",
  border: "1px solid #374151",
  borderRadius: 8,
  boxShadow: "0 10px 25px rgba(0,0,0,0.4)",
};

export const CHART_ANIM = {
  isAnimationActive: true,
  animationDuration: 800,
  animationEasing: "ease-out" as const,
};

export const AXIS_STYLE = {
  tick: { fontSize: 11, fill: "#6B7280" },
  axisLine: false as const,
  tickLine: false as const,
};

export const GRID_STYLE = {
  strokeDasharray: "3 3",
  stroke: "#1F2937",
};
