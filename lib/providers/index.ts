import { queryClaude, testClaudeKey } from "./claude";
import { queryChatGPT, testChatGPTKey } from "./chatgpt";
import { queryPerplexity, testPerplexityKey } from "./perplexity";
import { queryGemini, testGeminiKey } from "./gemini";
import { queryGrok, testGrokKey } from "./grok";
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
};

export const providerTestMap: Record<ProviderName, TestFn> = {
  claude: testClaudeKey,
  chatgpt: testChatGPTKey,
  perplexity: testPerplexityKey,
  gemini: testGeminiKey,
  grok: testGrokKey,
};

export { PROVIDERS, PROVIDER_INFO, SYSTEM_PROMPT } from "./types";
export type { ProviderName } from "./types";
