import type { TripLine, ParsedPodklad } from "../types.js";

export type ReasonerOptions = {
  apiKey: string;
  model?: string; // výchozí "deepseek-reasoner"
  baseUrl?: string;
  rawText: string;
  /** Zapne podrobné logování reasoning procesu */
  verbose?: boolean;
  /** Maximální délka textu (DeepSeek limit je 128k tokenů) */
  maxInputLength?: number;
  /** Reasoning effort - "low", "medium", "high" */
  reasoningEffort?: "low" | "medium" | "high";
};

type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
  /** Reasoning content - speciální pole pro DeepSeek Reasoner */
  reasoning_content?: string;
};

const SYSTEM_PROMPT = `Jsi expert na extrakci dat z českých přepravních faktur a výkazů jízd.

Tvým úkolem je z dodaného textu (přepis z OCR, PDF nebo ruční přepis) extrahovat seznam jízd ve formátu JSON.

Každá jízda musí obsahovat:
- dateIso: datum ve formátu YYYY-MM-DD (např. 2026-03-24)
- description: popis trasy (např. "Praha - Brno" nebo "rozvoz po Praze")
- liters: počet litrů jako číslo (např. 45.5)
- rate: sazba za litr bez DPH jako číslo (např. 28.50)
- baseAmount: základ bez DPH (liters × rate, zaokrouhleno na 2 desetinná místa)

DŮLEŽITÁ PRAVIDLA:
1. Pokud v textu chybí některý údaj, odhadni ho z kontextu nebo použij rozumnou výchozí hodnotu.
2. U sazby (rate) hledej hodnoty jako "sazba", "cena za litr", "Kč/l".
3. Popis (description) by měl být stručný a výstižný - pokud je text delší, vyber jen trasu.
4. Datum hledej ve formátech jako "24.3.2026", "24.03.2026", "2026-03-24" a převeď na ISO.
5. Čísla s desetinnou čárkou převeď na tečku (např. "45,5" -> 45.5).
6. Pokud text obsahuje více jízd, vrať pole se všemi.
7. Pokud nenajdeš žádnou jízdu, vrať prázdné pole [].

ODPOVĚZ POUZE JEDNÍM VALIDNÍM JSON POLEM, ŽÁDNÝ DALŠÍ TEXT:
[{"dateIso": "2026-03-24", "description": "Praha - Brno", "liters": 45.5, "rate": 28.50, "baseAmount": 1296.75}]`;

/**
 * Hlavní funkce pro extrakci dat pomocí DeepSeek Reasoner.
 * Používá model, který interně "přemýšlí" a je přesnější pro složité/nestrukturované texty.
 */
export async function parseWithDeepSeekReasoner(
  opts: ReasonerOptions
): Promise<ParsedPodklad> {
  const apiKey = opts.apiKey.trim();
  if (!apiKey) {
    throw new Error("DEEPSEEK_API_KEY není nastaven");
  }

  const base = (opts.baseUrl ?? "https://api.deepseek.com").replace(/\/$/, "");
  const model = opts.model ?? "deepseek-reasoner";
  const maxLen = opts.maxInputLength ?? 64000; // ~48k slov, bezpečně pod limit
  const truncatedText = opts.rawText.slice(0, maxLen);
  
  if (opts.verbose) {
    console.error(`[Reasoner] Používám model: ${model}`);
    console.error(`[Reasoner] Délka textu: ${truncatedText.length} znaků`);
  }

  const messages: ChatMessage[] = [
    { role: "system", content: SYSTEM_PROMPT },
    { 
      role: "user", 
      content: `Extrahuj data jízd z následujícího textu:\n\n---ZAČÁTEK TEXTU---\n${truncatedText}\n---KONEC TEXTU---\n\nVrať pouze JSON pole.` 
    }
  ];

  const requestBody: any = {
    model,
    messages,
    temperature: 0.1, // Nízká teplota pro konzistentní výsledky
  };

  // DeepSeek Reasoner podporuje parametr reasoning_effort
  if (model === "deepseek-reasoner" && opts.reasoningEffort) {
    requestBody.reasoning_effort = opts.reasoningEffort;
  }

  if (opts.verbose) {
    console.error(`[Reasoner] Odesílám požadavek na API...`);
  }

  const res = await fetch(`${base}/v1/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(requestBody),
  });

  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`DeepSeek API ${res.status}: ${errBody.slice(0, 600)}`);
  }

  const data = (await res.json()) as {
    choices?: Array<{
      message?: {
        content?: string;
        reasoning_content?: string;
      };
    }>;
  };

  const msg = data.choices?.[0]?.message;
  if (!msg) {
    throw new Error("DeepSeek API vrátilo odpověď bez message.");
  }

  // Výpis reasoning procesu pro debug
  if (opts.verbose && msg.reasoning_content) {
    console.error("\n--- REASONING PROCES ---");
    console.error(msg.reasoning_content);
    console.error("--- KONEC REASONINGU ---\n");
  }

  const content = msg.content?.trim();
  if (!content) {
    throw new Error("DeepSeek Reasoner vrátil prázdnou odpověď.");
  }

  if (opts.verbose) {
    console.error(`[Reasoner] Odpověď: ${content.slice(0, 200)}...`);
  }

  // Parsování JSON odpovědi
  let parsed: unknown;
  try {
    // Zkusit najít JSON pole v odpovědi
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      parsed = JSON.parse(jsonMatch[0]);
    } else {
      parsed = JSON.parse(content);
    }
  } catch (e) {
    throw new Error(
      `Nepodařilo se zparsovat JSON z Reasoner odpovědi: ${(e as Error).message}\nOdpověď: ${content.slice(0, 500)}`
    );
  }

  // Validace struktury
  if (!Array.isArray(parsed)) {
    throw new Error(`Reasoner nevrátil pole: ${typeof parsed}`);
  }

  const lines: TripLine[] = [];
  for (const item of parsed) {
    if (typeof item !== "object" || item === null) {
      console.error(`[Reasoner] Přeskakuji neplatnou položku: ${item}`);
      continue;
    }
    
    const line: TripLine = {
      dateIso: String(item.dateIso || new Date().toISOString().split("T")[0]),
      description: String(item.description || ""),
      liters: Number(item.liters) || 0,
      rate: Number(item.rate) || 0,
      baseAmount: Number(item.baseAmount) || 0,
    };

    // Validace a dopočítání
    if (line.baseAmount === 0 && line.liters > 0 && line.rate > 0) {
      line.baseAmount = Math.round(line.liters * line.rate * 100) / 100;
    }

    if (line.liters > 0 || line.baseAmount > 0) {
      lines.push(line);
    }
  }

  const sumBase = Math.round(
    lines.reduce((sum, line) => sum + line.baseAmount, 0) * 100
  ) / 100;

  return { lines, sumBase };
}
