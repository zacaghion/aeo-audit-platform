import { getApiKey } from "./base";
import { SYSTEM_PROMPT } from "./types";
import type { AIQueryResult } from "@/types";

const MODEL = "gpt-4o-mini";

export async function queryChatGPT(prompt: string): Promise<AIQueryResult> {
  const apiKey = await getApiKey("chatgpt");
  if (!apiKey) throw new Error("ChatGPT API key not configured");

  const start = Date.now();
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 4096,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: prompt },
      ],
    }),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || "OpenAI API error");

  const answer = data.choices?.[0]?.message?.content || "";
  return { answer, latencyMs: Date.now() - start, rawResponse: data };
}

export async function testChatGPTKey(apiKey: string): Promise<boolean> {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
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
    throw new Error(data.error?.message || `OpenAI API returned ${res.status}`);
  }
  return true;
}
