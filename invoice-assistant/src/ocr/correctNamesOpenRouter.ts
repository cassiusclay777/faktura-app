import type { TripLine } from "../types.js";
import {
  buildCorrectNamesUserPrompt,
  extractJsonArray,
  mergeCorrectedDescriptions,
} from "./correctNamesCommon.js";

export type CorrectNamesOpenRouterOptions = {
  apiKey: string;
  /** např. openai/gpt-4o-mini nebo deepseek/deepseek-chat */
  model?: string;
  /** OpenAI-kompatibilní base URL (OpenRouter: https://openrouter.ai/api) */
  baseUrl?: string;
  rawTranscript?: string;
  userInstructions?: string;
};

/**
 * Korekce názvů přes OpenRouter (OpenAI-kompatibilní chat completions).
 */
export async function correctTripLineDescriptionsOpenRouter(
  lines: TripLine[],
  opts: CorrectNamesOpenRouterOptions,
): Promise<TripLine[]> {
  if (lines.length === 0) return lines;

  const base = (opts.baseUrl ?? "https://openrouter.ai/api").replace(/\/$/, "");
  const model = opts.model ?? "openai/gpt-4o-mini";

  const userPrompt = buildCorrectNamesUserPrompt(lines, {
    useWebSearch: false,
    rawTranscript: opts.rawTranscript,
    userInstructions: opts.userInstructions,
  });

  const referer = process.env.OPENROUTER_HTTP_REFERER?.trim();
  const title = process.env.OPENROUTER_APP_TITLE?.trim();

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${opts.apiKey}`,
  };
  if (referer) headers["HTTP-Referer"] = referer;
  if (title) headers["X-Title"] = title;

  const res = await fetch(`${base}/v1/chat/completions`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content: userPrompt }],
      temperature: 0.2,
    }),
  });

  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(
      `OpenRouter API ${res.status}: ${errBody.slice(0, 600)}`,
    );
  }

  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const text = data.choices?.[0]?.message?.content;
  if (!text?.trim()) {
    throw new Error("OpenRouter (korekce názvů) vrátil prázdnou odpověď.");
  }

  let parsed: unknown;
  try {
    parsed = extractJsonArray(text);
  } catch (e) {
    throw new Error(
      `Nepodařilo se zparsovat JSON z korekce (OpenRouter): ${(e as Error).message}`,
    );
  }

  return mergeCorrectedDescriptions(lines, parsed);
}
