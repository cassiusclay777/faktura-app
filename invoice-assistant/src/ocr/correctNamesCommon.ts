import type { TripLine } from "../types.js";

export const CORRECT_NAMES_PROMPT = `Jsi korektor českých názvů firem, obcí a míst v přepisech tras nákladní dopravy (OCR / rukopis).

Úkol: u každého řádku oprav jen text popisu trasy tak, aby názvy odpovídaly reálným českým firmám a místům (opravy překlepů typu BRNISOVICE → Branišovice, SEMAX → ZEMAX, pokud jde o známý název).

Pravidla:
- Zachovej strukturu jako na podkladu: např. "STŘELICE – Firma A + Firma B + …", pomlčky, pluska, čárky mezi místy.
- Neměň čísla, měny, data ani význam tras – jen oprav názvy.
- Pokud si nejsi jistý, nech text blíž originálu než vymýšlet nové firmy.

`;

export const CORRECT_NAMES_WEB_SUFFIX = `
K dispozici máš vyhledávání na webu – použij ho k ověření názvů firem a obcí v ČR, kde je přepis nejasný.
`;

export type CorrectNamesPromptOptions = {
  useWebSearch: boolean;
  rawTranscript?: string;
  userInstructions?: string;
};

export function buildCorrectNamesUserPrompt(
  lines: TripLine[],
  opts: CorrectNamesPromptOptions,
): string {
  const payload = lines.map((line, i) => ({
    i,
    popis: line.description,
  }));

  return [
    CORRECT_NAMES_PROMPT,
    opts.useWebSearch ? CORRECT_NAMES_WEB_SUFFIX : "",
    opts.userInstructions
      ? `\nDoplňkové instrukce od uživatele:\n${opts.userInstructions}\n`
      : "",
    "",
    "Vstupní řádky (JSON):",
    JSON.stringify(payload, null, 2),
    "",
    opts.rawTranscript
      ? `Kontext – celý přepis podkladu:\n${opts.rawTranscript.slice(0, 12000)}`
      : "",
    "",
    'Výstup: POUZE JSON pole objektů { "i": number, "popis": string } – stejný počet řádků, stejná pole "i" jako ve vstupu. Žádný další text.',
  ]
    .filter(Boolean)
    .join("\n");
}

export function extractJsonArray(text: string): unknown {
  const t = text.trim();
  const fence = /^```(?:json)?\s*([\s\S]*?)```$/m.exec(t);
  const body = fence ? fence[1].trim() : t;
  const start = body.indexOf("[");
  const end = body.lastIndexOf("]");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("Odpověď neobsahuje JSON pole.");
  }
  return JSON.parse(body.slice(start, end + 1)) as unknown;
}

export function mergeCorrectedDescriptions(
  lines: TripLine[],
  parsed: unknown,
): TripLine[] {
  if (!Array.isArray(parsed)) {
    throw new Error("Korekce názvů: očekáváno JSON pole.");
  }

  const byIndex = new Map<number, string>();
  for (const item of parsed) {
    if (
      item &&
      typeof item === "object" &&
      "i" in item &&
      "popis" in item &&
      typeof (item as { i: unknown }).i === "number" &&
      typeof (item as { popis: unknown }).popis === "string"
    ) {
      byIndex.set(
        (item as { i: number }).i,
        (item as { popis: string }).popis.trim(),
      );
    }
  }

  return lines.map((line, i) => {
    const fixed = byIndex.get(i);
    if (fixed === undefined || !fixed) {
      return line;
    }
    return { ...line, description: fixed };
  });
}
