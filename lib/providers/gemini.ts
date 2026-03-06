import { getApiKey } from "./base";
import { SYSTEM_PROMPT } from "./types";
import type { AIQueryResult } from "@/types";

const MODEL = "gemini-2.5-pro";

export async function queryGemini(prompt: string): Promise<AIQueryResult> {
  const apiKey = await getApiKey("gemini");
  if (!apiKey) throw new Error("Gemini API key not configured");

  const start = Date.now();
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: 4096 },
      }),
    }
  );

  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || "Gemini API error");

  const answer =
    data.candidates?.[0]?.content?.parts
      ?.map((p: Record<string, string>) => p.text)
      .join("\n") || "";

  return { answer, latencyMs: Date.now() - start, rawResponse: data };
}

export async function testGeminiKey(apiKey: string): Promise<boolean> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: "hi" }] }],
        generationConfig: { maxOutputTokens: 5 },
      }),
    }
  );
  return res.ok;
}
