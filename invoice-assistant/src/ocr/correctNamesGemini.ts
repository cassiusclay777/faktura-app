import { GoogleGenerativeAI } from "@google/generative-ai";
import type { Tool } from "@google/generative-ai";
import type { TripLine } from "../types.js";
import {
  buildCorrectNamesUserPrompt,
  extractJsonArray,
  mergeCorrectedDescriptions,
} from "./correctNamesCommon.js";

/** API vyžaduje `google_search` (viz docs); staré SDK typy mají jen `googleSearchRetrieval`. */
const GOOGLE_SEARCH_TOOL = { googleSearch: {} } as unknown as Tool;

export type CorrectNamesOptions = {
  apiKey: string;
  model?: string;
  /** Google Search grounding – ověření názvů proti webu (závisí na modelu / API) */
  useWebSearch: boolean;
  /** Celý raw přepis pro kontext (volitelně) */
  rawTranscript?: string;
  /** Vlastní instrukce od uživatele pro korekci (volitelně) */
  userInstructions?: string;
};

/**
 * Opraví pouze pole `description` u řádků; čísla nechá beze změny.
 */
export async function correctTripLineDescriptions(
  lines: TripLine[],
  opts: CorrectNamesOptions,
): Promise<TripLine[]> {
  if (lines.length === 0) return lines;

  const modelName = opts.model ?? "gemini-2.5-flash";
  const genAI = new GoogleGenerativeAI(opts.apiKey);

  const userPrompt = buildCorrectNamesUserPrompt(lines, {
    useWebSearch: opts.useWebSearch,
    rawTranscript: opts.rawTranscript,
    userInstructions: opts.userInstructions,
  });

  const model = genAI.getGenerativeModel({
    model: modelName,
    ...(opts.useWebSearch ? { tools: [GOOGLE_SEARCH_TOOL] } : {}),
  });

  const result = await model.generateContent(userPrompt);
  const text = result.response.text();
  if (!text?.trim()) {
    throw new Error("Gemini (korekce názvů) vrátil prázdnou odpověď.");
  }

  let parsed: unknown;
  try {
    parsed = extractJsonArray(text);
  } catch (e) {
    throw new Error(
      `Nepodařilo se zparsovat JSON z korekce názvů: ${(e as Error).message}`,
    );
  }

  return mergeCorrectedDescriptions(lines, parsed);
}
