import type { TripLine } from "../types.js";
import {
  buildCorrectNamesUserPrompt,
  extractJsonArray,
  mergeCorrectedDescriptions,
} from "./correctNamesCommon.js";

export type CorrectNamesOpenRouterOptions = {
  apiKey: string;
  /** např. deepseek/deepseek-chat-v3-0324 */
  model?: string;
  /** Výchozí OpenAI-kompatibilní endpoint OpenRouter */
  baseUrl?: string;
  rawTranscript?: string;
  userInstructions?: string;
};

/**
 * Korekce názvů přes OpenRouter API (OpenAI-kompatibilní chat).
 */
export async function correctTripLineDescriptionsOpenRouter(
  lines: TripLine[],
  opts: CorrectNamesOpenRouterOptions,
): Promise<TripLine[]> {
  if (lines.length === 0) return lines;

  const base = (opts.baseUrl ?? "https://openrouter.ai/api").replace(/\/$/, "");
  const model = opts.model ?? "deepseek/deepseek-chat-v3-0324";

  const userPrompt = buildCorrectNamesUserPrompt(lines, {
    useWebSearch: false,
    rawTranscript: opts.rawTranscript,
    userInstructions: opts.userInstructions,
  });

  const res = await fetch(`${base}/v1/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${opts.apiKey}`,
    },
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
