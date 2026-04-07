import type { TripLine } from "../types.js";
import {
  buildCorrectNamesUserPrompt,
  extractJsonArray,
  mergeCorrectedDescriptions,
} from "./correctNamesCommon.js";

const WEB_SEARCH_TOOLS: unknown[] = [
  {
    type: "function",
    function: {
      name: "web_search",
      description:
        "Vyhledá na webu informace pro ověření správného zápisu českého názvu firmy, obce nebo místa. POUŽIJ: když si nejsi jistý přesným názvem nebo právní formou. Volej s přesným českým dotazem jako 'Dopravní stavby Brno s.r.o.' nebo 'obec Branišovice okres Vyškov'.",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description:
              "Krátký vyhledávací dotaz v češtině, např. „Dopravní stavby Brno s.r.o.“ nebo „obec Branišovice okres Vyškov“. Používej oficiální názvy bez překlepů.",
          },
        },
        required: ["query"],
      },
    },
  },
];

export type CorrectNamesDeepSeekOptions = {
  apiKey: string;
  /** např. deepseek-chat */
  model?: string;
  /** Výchozí OpenAI-kompatibilní endpoint DeepSeek */
  baseUrl?: string;
  rawTranscript?: string;
  userInstructions?: string;
  /** Nástroj web_search + smyčka; vyžaduje `webSearch` */
  useWebSearch?: boolean;
  /** Implementace vyhledávání (např. Tavily na serveru) */
  webSearch?: (query: string) => Promise<string>;
  idokladStyle?: boolean;
  styleReference?: string;
  /** Zapnout validaci čísel (litry × sazba = základ) */
  validateNumbers?: boolean;
};

type ChatMessage =
  | { role: "system" | "user"; content: string }
  | {
      role: "assistant";
      content: string | null;
      tool_calls?: Array<{
        id: string;
        type?: string;
        function: { name: string; arguments: string };
      }>;
    }
  | { role: "tool"; tool_call_id: string; content: string };

const MAX_TOOL_ROUNDS = 20; // Zvýšeno pro důkladné ověřování

/**
 * Korekce názvů přes DeepSeek API (OpenAI-kompatibilní chat).
 * 
 * Nová verze s robustním promptem pro:
 * - Systematické ověřování názvů na webu
 * - Zachování původních nejistých názvů
 * - Validaci čísel
 */
export async function correctTripLineDescriptionsDeepSeek(
  lines: TripLine[],
  opts: CorrectNamesDeepSeekOptions,
): Promise<TripLine[]> {
  if (lines.length === 0) return lines;

  const base = (opts.baseUrl ?? "https://api.deepseek.com").replace(/\/$/, "");
  const model = opts.model ?? "deepseek-chat";

  if (opts.useWebSearch && !opts.webSearch) {
    throw new Error(
      "DeepSeek vyhledávání na webu vyžaduje nastavený handler webSearch (server).",
    );
  }

  if (opts.useWebSearch && opts.webSearch) {
    return correctWithWebTools(lines, opts, base, model);
  }

  const userPrompt = buildCorrectNamesUserPrompt(lines, {
    useWebSearch: false,
    useWebSearchTools: false,
    rawTranscript: opts.rawTranscript,
    userInstructions: opts.userInstructions,
    idokladStyle: opts.idokladStyle,
    styleReference: opts.styleReference,
    validateNumbers: opts.validateNumbers,
  });

  const text = await deepSeekChatOnce(base, model, opts.apiKey, [
    { role: "user", content: userPrompt },
  ]);

  return parseCorrectionJson(lines, text);
}

async function correctWithWebTools(
  lines: TripLine[],
  opts: CorrectNamesDeepSeekOptions,
  base: string,
  model: string,
): Promise<TripLine[]> {
  const userPrompt = buildCorrectNamesUserPrompt(lines, {
    useWebSearchTools: true,
    rawTranscript: opts.rawTranscript,
    userInstructions: opts.userInstructions,
    idokladStyle: opts.idokladStyle,
    styleReference: opts.styleReference,
    validateNumbers: opts.validateNumbers,
  });

  const messages: ChatMessage[] = [{ role: "user", content: userPrompt }];
  const webSearch = opts.webSearch!;

  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    const msg = await deepSeekChatMessage(base, model, opts.apiKey, messages, {
      tools: WEB_SEARCH_TOOLS,
      tool_choice: "auto",
    });

    // AI volá web_search pro ověření názvů
    if (msg.tool_calls?.length) {
      messages.push({
        role: "assistant",
        content: msg.content ?? null,
        tool_calls: msg.tool_calls,
      });
      
      for (const tc of msg.tool_calls) {
        let snippet = "(Neznámý nástroj.)";
        
        if (tc.function?.name === "web_search") {
          let args: { query?: string };
          try {
            args = JSON.parse(tc.function.arguments || "{}") as {
              query?: string;
            };
          } catch {
            args = {};
          }
          
          const q = typeof args.query === "string" ? args.query.trim() : "";
          
          if (q) {
            try {
              // Načíst více kontextu pro lepší verifikaci
              snippet = (await webSearch(q)).slice(0, 16_000);
            } catch (e) {
              snippet = `Chyba při vyhledávání: ${(e as Error).message}`;
            }
          } else {
            snippet = "(Prázdný dotaz pro web_search.)";
          }
        }
        
        messages.push({
          role: "tool",
          tool_call_id: tc.id,
          content: snippet,
        });
      }
      continue;
    }

    // AI vrací finální JSON
    const text = msg.content;
    if (!text?.trim()) {
      throw new Error("DeepSeek (korekce názvů) vrátil prázdnou odpověď.");
    }
    
    return parseCorrectionJson(lines, text);
  }

  throw new Error(
    "DeepSeek: překročen limit kol s web_search — zkus znovu nebo vypni vyhledávání.",
  );
}

async function deepSeekChatOnce(
  base: string,
  model: string,
  apiKey: string,
  messages: ChatMessage[],
): Promise<string> {
  const msg = await deepSeekChatMessage(base, model, apiKey, messages, {});
  const text = msg.content;
  if (!text?.trim()) {
    throw new Error("DeepSeek (korekce názvů) vrátil prázdnou odpověď.");
  }
  return text;
}

type DeepSeekMsg = {
  content: string | null;
  tool_calls?: Array<{
    id: string;
    type?: string;
    function: { name: string; arguments: string };
  }>;
};

async function deepSeekChatMessage(
  base: string,
  model: string,
  apiKey: string,
  messages: ChatMessage[],
  extras: Record<string, unknown>,
): Promise<DeepSeekMsg> {
  const res = await fetch(`${base}/v1/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.1, // Nižší teplota pro přesnost
      ...extras,
    }),
  });

  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(
      `DeepSeek API ${res.status}: ${errBody.slice(0, 600)}`,
    );
  }

  const data = (await res.json()) as {
    choices?: Array<{ message?: DeepSeekMsg }>;
  };
  const msg = data.choices?.[0]?.message;
  if (!msg) {
    throw new Error("DeepSeek API vrátilo odpověď bez message.");
  }
  return msg;
}

function parseCorrectionJson(lines: TripLine[], text: string): TripLine[] {
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
          `Nepodařilo se zparsovat JSON z korekce (DeepSeek): ${(e as Error).message}. Text: ${text.slice(0, 200)}`,
        );
      }
    } else {
      throw new Error(
        `Nepodařilo se zparsovat JSON z korekce (DeepSeek): ${(e as Error).message}. Text: ${text.slice(0, 200)}`,
      );
    }
  }
  return mergeCorrectedDescriptions(lines, parsed);
}
