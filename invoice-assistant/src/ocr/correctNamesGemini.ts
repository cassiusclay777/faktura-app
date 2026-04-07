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
  /** Styl řádků jako na vydané faktuře z iDokladu (vestavěný nebo vlastní vzor) */
  idokladStyle?: boolean;
  styleReference?: string;
  /** Zapnout validaci čísel (litry × sazba = základ) */
  validateNumbers?: boolean;
};

/**
 * Korekce názvů přes Gemini API s Google Search grounding.
 * 
 * Nová verze používá robustní prompt s:
 * - Systematickým ověřováním na webu
 * - Zachováním původních nejistých názvů
 * - Validací čísel (litry × sazba = základ)
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
    idokladStyle: opts.idokladStyle,
    styleReference: opts.styleReference,
    validateNumbers: opts.validateNumbers,
  });

  const model = genAI.getGenerativeModel({
    model: modelName,
    ...(opts.useWebSearch ? { tools: [GOOGLE_SEARCH_TOOL] } : {}),
  });

  try {
    const result = await model.generateContent(userPrompt);
    const text = result.response.text();
    
    if (!text?.trim()) {
      throw new Error("Gemini (korekce názvů) vrátil prázdnou odpověď.");
    }

    let parsed: unknown;
    try {
      parsed = extractJsonArray(text);
    } catch (e) {
      // Zkusit najít JSON v odpovědi i když není správně formátovaný
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        try {
          parsed = JSON.parse(jsonMatch[0]);
        } catch (parseError) {
          throw new Error(
            `Nepodařilo se zparsovat JSON z korekce názvů: ${(e as Error).message}. Text: ${text.slice(0, 200)}`,
          );
        }
      } else {
        throw new Error(
          `Nepodařilo se zparsovat JSON z korekce názvů: ${(e as Error).message}. Text: ${text.slice(0, 200)}`,
        );
      }
    }

    return mergeCorrectedDescriptions(lines, parsed);
  } catch (error) {
    if (error instanceof Error) {
      // Přidat více informací pro lepší diagnostiku
      throw new Error(`Gemini korekce názvů selhala: ${error.message}`);
    }
    throw error;
  }
}
