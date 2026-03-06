import { getApiKey } from "./base";
import { SYSTEM_PROMPT } from "./types";
import type { AIQueryResult } from "@/types";

const MODEL = "claude-sonnet-4-5-20250929";

export async function queryClaude(prompt: string): Promise<AIQueryResult> {
  const apiKey = await getApiKey("claude");
  if (!apiKey) throw new Error("Claude API key not configured");

  const start = Date.now();
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      tools: [{ type: "web_search_20250305", name: "web_search" }],
      messages: [{ role: "user", content: prompt }],
    }),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || "Claude API error");

  const answer = data.content
    ?.filter((b: Record<string, string>) => b.type === "text")
    .map((b: Record<string, string>) => b.text)
    .join("\n") || "";

  return { answer, latencyMs: Date.now() - start, rawResponse: data };
}

export async function testClaudeKey(apiKey: string): Promise<boolean> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 5,
      messages: [{ role: "user", content: "hi" }],
    }),
  });
  return res.ok;
}
