import type { TripLine } from "../types.js";

export const CORRECT_NAMES_PROMPT = `Jsi korektor českých názvů firem, obcí a míst v přepisech tras nákladní dopravy (OCR / rukopis).

Úkol: u každého řádku oprav jen text popisu trasy tak, aby názvy odpovídaly reálným českým firmám a místům (opravy překlepů typu BRNISOVICE → Branišovice, SEMAX → ZEMAX, pokud jde o známý název).

Pravidla:
- Zachovej strukturu jako na podkladu: např. "STŘELICE – Firma A + Firma B + …", pomlčky, pluska, čárky mezi místy.
- Neměň čísla, měny, data ani význam tras – jen oprav názvy.
- Pokud si nejsi jistý, nech text blíž originálu než vymýšlet nové firmy.

`;

/** Referenční styl řádků popisu jako na vydané faktuře z iDokladu (vzorová faktura uživatele). */
export const CORRECT_NAMES_IDOKLAD_STYLE_BLOCK = `
Styl výstupu – přizpůsob se zápisu popisů řádků jako na vydané faktuře z iDokladu (stejná typografie právních forem, mezer a oddělovačů).

Povinná pravidla stylu:
- Právní formy piš konzistentně jako na faktuře: „s.r.o.“, „a.s.“, „spol. s r.o.“ – s tečkami a mezerami jako v ukázkách níže.
- Mezi více zastávkami nebo firmami používej „ + “ (mezera, plus, mezera).
- Čárky u firemních názvů a sídel zachovej v logickém pořadí (např. „NÁZEV, město“).
- Začátek řádku velkými písmeny (např. STŘELICE – … / VLKOŠ – …) nech ve stejném stylu jako ve vstupu, pokud tam je.
- Koncový objem „… lt.“ ponech beze změny (stejné číslo jako ve vstupu).

Ukázky formátu (inspirace – nepřepisuj jejich konkrétní data do jiného dne):
- STŘELICE – TTS MĚNÍN (Top Trailer Servis s.r.o.) + ZEMAX ŠITBOŘICE, a.s. + SIGNUM, s.r.o., Hustopeče … lt.
- STŘELICE – CROSS SPEED, s.r.o., Branišovice + Benale, Miroslav, Dukovany … lt.
- VLKOŠ – ADOSA a.s., čerpací stanice Moutnice + A+S čerpací stanice Sokolnice + … lt.

Výstupní popisy musí vypadat, jako by šly přímo do sloupce položky faktury v iDokladu.
`.trim();

export const CORRECT_NAMES_WEB_SUFFIX = `
K dispozici máš vyhledávání na webu – použij ho k ověření názvů firem a obcí v ČR, kde je přepis nejasný.
`;

/** Gemini: Google Search grounding; DeepSeek: samostatná větev s tool calling – viz CORRECT_NAMES_WEB_TOOLS_SUFFIX */
export const CORRECT_NAMES_WEB_TOOLS_SUFFIX = `
K ověření přepisů máš nástroj web_search(query). Volej ho s konkrétními českými dotazy (název firmy, obec, …), pokud potřebuješ ověřit zápis. Výsledky použij jen k opravě názvů v popisech. Až skončíš, vrať POUZE požadované JSON pole — žádný jiný text ani komentáře.
`;

export type CorrectNamesPromptOptions = {
  /** Gemini: text pro Google Search grounding */
  useWebSearch: boolean;
  /** DeepSeek (+ tool web_search): jiný suffix než u Gemini */
  useWebSearchTools?: boolean;
  rawTranscript?: string;
  userInstructions?: string;
  /**
   * Vestavěný blok stylu iDoklad + ukázky; výchozí zapnuto (`undefined` = zapnuto).
   * Vypni jen explicitně `false`.
   */
  idokladStyle?: boolean;
  /** Nahradí vestavěný blok; max. délku řeže volající */
  styleReference?: string;
};

function buildIdokladStyleFragment(opts: CorrectNamesPromptOptions): string {
  if (opts.idokladStyle === false) return "";
  const custom = opts.styleReference?.trim();
  if (custom) {
    return `\nStyl výstupu – vlastní vzor od uživatele (dodrž tento zápis):\n${custom}\n`;
  }
  return `\n${CORRECT_NAMES_IDOKLAD_STYLE_BLOCK}\n`;
}

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
    buildIdokladStyleFragment(opts),
    opts.useWebSearchTools
      ? CORRECT_NAMES_WEB_TOOLS_SUFFIX
      : opts.useWebSearch
        ? CORRECT_NAMES_WEB_SUFFIX
        : "",
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
