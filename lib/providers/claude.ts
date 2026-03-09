import { getApiKey } from "./base";
import { SYSTEM_PROMPT } from "./types";
import type { AIQueryResult } from "@/types";

const MODEL = "claude-sonnet-4-20250514";

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
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
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
      max_tokens: 1,
      messages: [{ role: "user", content: "hi" }],
    }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error?.message || `Claude API returned ${res.status}`);
  }
  return true;
}
