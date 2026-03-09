import { getApiKey } from "./base";
import { SYSTEM_PROMPT } from "./types";
import type { AIQueryResult } from "@/types";

const MODEL = "deepseek-chat";
const ENDPOINT = "https://api.deepseek.com/chat/completions";

export async function queryDeepSeek(prompt: string): Promise<AIQueryResult> {
  const apiKey = await getApiKey("deepseek");
  if (!apiKey) throw new Error("DeepSeek API key not configured");

  const start = Date.now();
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 1024,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: prompt },
      ],
    }),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || "DeepSeek API error");

  const answer = data.choices?.[0]?.message?.content || "";
  return { answer, latencyMs: Date.now() - start, rawResponse: data };
}

export async function testDeepSeekKey(apiKey: string): Promise<boolean> {
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 1,
      messages: [{ role: "user", content: "hi" }],
    }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error?.message || `DeepSeek API returned ${res.status}`);
  }
  return true;
}
