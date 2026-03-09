export const SYSTEM_PROMPT = `You are a helpful AI assistant answering a traveler's query about hotels in Bangkok, Thailand. Answer naturally and thoroughly based on your knowledge. Be specific with hotel names, prices, locations, and details. If you recommend specific hotels, explain why. If asked about a specific hotel, give honest pros and cons.`;

export const PROVIDERS = ["claude", "chatgpt", "perplexity", "gemini", "grok", "deepseek"] as const;
export type ProviderName = (typeof PROVIDERS)[number];

export const PROVIDER_INFO: Record<
  ProviderName,
  { label: string; model: string; keyUrl: string; costPer100: string }
> = {
  claude: {
    label: "Claude (Anthropic)",
    model: "claude-sonnet-4-20250514",
    keyUrl: "https://console.anthropic.com/settings/keys",
    costPer100: "~$1.50",
  },
  chatgpt: {
    label: "ChatGPT (OpenAI)",
    model: "gpt-4o-mini",
    keyUrl: "https://platform.openai.com/api-keys",
    costPer100: "~$1.25",
  },
  perplexity: {
    label: "Perplexity",
    model: "sonar",
    keyUrl: "https://www.perplexity.ai/settings/api",
    costPer100: "~$3.00",
  },
  gemini: {
    label: "Gemini (Google)",
    model: "gemini-2.5-flash",
    keyUrl: "https://aistudio.google.com/apikey",
    costPer100: "~$1.75",
  },
  grok: {
    label: "Grok (xAI)",
    model: "grok-3-mini-fast",
    keyUrl: "https://console.x.ai",
    costPer100: "~$1.50",
  },
  deepseek: {
    label: "DeepSeek",
    model: "deepseek-chat",
    keyUrl: "https://platform.deepseek.com/api_keys",
    costPer100: "~$0.07",
  },
};
