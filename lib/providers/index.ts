import { queryClaude, testClaudeKey } from "./claude";
import { queryChatGPT, testChatGPTKey } from "./chatgpt";
import { queryPerplexity, testPerplexityKey } from "./perplexity";
import { queryGemini, testGeminiKey } from "./gemini";
import { queryGrok, testGrokKey } from "./grok";
import { queryDeepSeek, testDeepSeekKey } from "./deepseek";
import type { AIQueryResult } from "@/types";
import type { ProviderName } from "./types";

type QueryFn = (prompt: string) => Promise<AIQueryResult>;
type TestFn = (key: string) => Promise<boolean>;

export const providerQueryMap: Record<ProviderName, QueryFn> = {
  claude: queryClaude,
  chatgpt: queryChatGPT,
  perplexity: queryPerplexity,
  gemini: queryGemini,
  grok: queryGrok,
  deepseek: queryDeepSeek,
};

export const providerTestMap: Record<string, TestFn> = {
  claude: testClaudeKey,
  chatgpt: testChatGPTKey,
  perplexity: testPerplexityKey,
  gemini: testGeminiKey,
  grok: testGrokKey,
  deepseek: testDeepSeekKey,
  "claude-analysis": testClaudeKey,
  "claude-recommendations": testClaudeKey,
};

export { PROVIDERS, PROVIDER_INFO, SYSTEM_PROMPT } from "./types";
export type { ProviderName } from "./types";
