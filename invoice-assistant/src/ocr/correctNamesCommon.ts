import type { TripLine } from "../types.js";

/**
 * Robustní systémový prompt pro dvoufázovou korekci názvů s verifikací.
 * Klíčové zásady:
 * 1. Nikdy neuhodnout název – vždy ověřit na webu
 * 2. Pokud nejde ověřit, zachovat původní text
 * 3. U každé opravy uvést zdroj (URL nebo důvod)
 * 4. Kontrolovat i čísla (litry × sazba ≈ základ)
 */
export const CORRECT_NAMES_SYSTEM_PROMPT = `Jsi korektor českých názvů firem, obcí a míst v přepisech tras nákladní dopravy.

## TVŮJ ÚKOL

Opravit popisy tras tak, aby:
1. Názvy firem a obcí byly přesné a ověřené
2. Právní formy byly správně (s.r.o., a.s., spol. s r.o.)
3. Formátování odpovídalo stylovým požadavkům
4. Čísla byla konzistentní (litry × sazba = základ ± tolerance)

## KRITICKÁ PRAVIDLA (PORUŠENÍ = SELHÁNÍ)

❌ **NIKDY** nevymýšlet název, který neexistuje
❌ **NIKDY** neopravovat bez ověření zdroje
❌ **NIKDY** nechat překlep, pokud jsi 100% jistý správnou formou
❌ **NIKDY** měnit čísla, data ani význam

✅ **VŽDY** ověřit nejisté názvy na webu
✅ **VŽDY** zachovat původní, pokud ověření selže
✅ **VŽDY** uvést zdroj u každé opravy
✅ **VŽDY** dodržet stejný počet řádků ve výstupu

`;

/**
 * Styl výstupu formátovaný jako na faktuře z iDokladu.
 */
export const CORRECT_NAMES_IDOKLAD_STYLE_BLOCK = `
## STYL VÝSTUPU (iDoklad formát)

Dodržuj přesně tento formát popisů řádků:

**Pravidla:**
- Právní formy: „s.r.o.", „a.s.", „spol. s r.o." (s tečkami a mezerami)
- Více zastávek odděluj „ + " (mezera-plus-mezera)
- První místo velkými písmeny: „STŘELICE – Název firmy..."
- Čárky zachovat v logickém pořadí: „NÁZEV, město"

**Vzorové řádky (přizpůsob stylu, nepřepisuj data):**
- STŘELICE – TTS MĚNÍN (Top Trailer Servis s.r.o.) + ZEMAX ŠITBOŘICE, a.s. + SIGNUM, s.r.o., Hustopeče … lt.
- STŘELICE – CROSS SPEED, s.r.o., Branišovice + Benale, Miroslav, Dukovany … lt.
- VLKOŠ – ADOSA a.s., čerpací stanice Moutnice + A+S čerpací stanice Sokolnice + … lt.

`;

/**
 * Instrukce pro práci s web search nástrojem.
 */
export const CORRECT_NAMES_WEB_TOOLS_INSTRUCTIONS = `
## OVĚŘOVÁNÍ NA WEBU

Máš k dispozici nástroj \`web_search(query)\`. Použij ho systematicky:

**Kdy hledat:**
- Název firmy obsahuje překlepy (BRNISOVICE vs Branišovice)
- Nejisté právní formy („s.r.o." vs „spol. s r.o.")
- Neznámá místa nebo firmy
- Když si nejsi jistý správným zápisem

**Jak hledat:**
1. Použij přesný český dotaz: „Dopravní stavby Brno s.r.o."
2. Pokud nic nenajdeš, zkus varianty bez právní formy
3. Preferuj oficiální zdroje (www.firmy.cz, www.obce.cz, www.czso.cz)

**Jak interpretovat výsledky:**
- Pokud najdeš přesnou shodu → použij ověřený název
- Pokud najdeš více variant → vyber nejčastější oficiální
- Pokud nic nenajdeš → ZACHOVEJ PŮVODNÍ (nepřidělávej)

## VÝSTUPNÍ FORMÁT

Po dokončení korekce vrať POUZE JSON pole:
\`\`\`json
[
  { "i": 0, "popis": "OPRAVENÝ NÁZEV", "zdroj": "URL nebo 'původní ověřeno' nebo 'zachováno neověřeno'" },
  { "i": 1, "popis": "DALŠÍ ŘÁDEK", "zdroj": "..." }
]
\`\`\`

Každý řádek musí mít:
- \`i\`: index (stejný jako ve vstupu)
- \`popis\`: opravený nebo zachovaný popis
- \`zdroj\`: odkud jsi vzal název (URL, 'původní ověřeno', nebo 'zachováno neověřeno')

`;

/**
 * Instrukce pro validaci čísel.
 */
export const CORRECT_NAMES_NUMBER_VALIDATION = `
## VALIDACE ČÍSEL

Kromě názvů zkontroluj konzistenci čísel:
- \`litry × sazba\` by mělo odpovídat \`základ\` ± 1 Kč (zaokrouhlení)
- Pokud je rozdíl > 1 Kč, označ to v komentáři

Výstup JSON zahrň i čísla pro kontrolu:
\`\`\`json
[
  { 
    "i": 0, 
    "popis": "...", 
    "zdroj": "...",
    "kontrola_cisel": { 
      "litry": 100, 
      "sazba": 32.50, 
      "zaklad": 3250, 
      "rozdiel": 0,
      "validni": true 
    }
  }
]
\`\`\`

`;

export type CorrectNamesPromptOptions = {
  /** DeepSeek (+ tool web_search): jiný suffix než u Gemini */
  useWebSearchTools?: boolean;
  /** Gemini: Google Search grounding */
  useWebSearch?: boolean;
  rawTranscript?: string;
  userInstructions?: string;
  /** Vestavěný blok stylu iDoklad + ukázky; výchozí zapnuto (`undefined` = zapnuto). */
  idokladStyle?: boolean;
  /** Nahradí vestavěný blok; max. délku řeže volající */
  styleReference?: string;
  /** Zapnout validaci čísel (litry × sazba = základ) */
  validateNumbers?: boolean;
};

function buildIdokladStyleFragment(opts: CorrectNamesPromptOptions): string {
  if (opts.idokladStyle === false) return "";
  const custom = opts.styleReference?.trim();
  if (custom) {
    return `\n## STYL VÝSTUPU (vlastní vzor)\nDodrž přesně tento zápis:\n${custom}\n`;
  }
  return `\n${CORRECT_NAMES_IDOKLAD_STYLE_BLOCK}\n`;
}

/**
 * Sestaví kompletní prompt pro AI korekci.
 */
export function buildCorrectNamesUserPrompt(
  lines: TripLine[],
  opts: CorrectNamesPromptOptions,
): string {
  const payload = lines.map((line, i) => ({
    i,
    popis: line.description,
    litry: line.liters,
    sazba: line.rate,
    zaklad: line.baseAmount,
  }));

  const parts: string[] = [
    CORRECT_NAMES_SYSTEM_PROMPT,
    buildIdokladStyleFragment(opts),
  ];

  // Web search instrukce
  if (opts.useWebSearchTools) {
    parts.push(CORRECT_NAMES_WEB_TOOLS_INSTRUCTIONS);
  } else if (opts.useWebSearch) {
    parts.push(CORRECT_NAMES_WEB_TOOLS_INSTRUCTIONS.replace(/web_search/g, "Google Search"));
  }

  // Validace čísel
  if (opts.validateNumbers) {
    parts.push(CORRECT_NAMES_NUMBER_VALIDATION);
  }

  // Vlastní instrukce od uživatele
  if (opts.userInstructions?.trim()) {
    parts.push(`\n## Doplňkové instrukce od uživatele\n${opts.userInstructions.trim()}\n`);
  }

  // Kontext a vstup
  parts.push("");
  parts.push("## VSTUPNÍ ŘÁDKY (JSON):");
  parts.push(JSON.stringify(payload, null, 2));

  if (opts.rawTranscript) {
    parts.push("");
    parts.push("## KONTEXT – CELÝ PŘEPIS PODKLADU:");
    parts.push(opts.rawTranscript.slice(0, 12000));
  }

  parts.push("");
  parts.push("## VÝSTUP");
  parts.push("Vrať POUZE JSON pole objektů se stejným počtem řádků.");
  parts.push("Každý řádek musí obsahovat: { \"i\": number, \"popis\": string, \"zdroj\": string }");
  parts.push("Žádný jiný text ani komentáře.");

  return parts.filter(Boolean).join("\n");
}

/**
 * Extrakce JSON pole z odpovědi (podpora markdown code fences).
 */
export function extractJsonArray(text: string): unknown {
  const t = text.trim();
  
  // Zkusit najít JSON v code fence
  const fence = /^```(?:json)?\s*([\s\S]*?)```$/m.exec(t);
  const body = fence ? fence[1].trim() : t;
  
  // Najít začátek a konec pole
  const start = body.indexOf("[");
  const end = body.lastIndexOf("]");
  
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("Odpověď neobsahuje JSON pole.");
  }
  
  try {
    return JSON.parse(body.slice(start, end + 1)) as unknown;
  } catch (e) {
    // Zkusit opravit běžné chyby
    const fixed = body
      .slice(start, end + 1)
      .replace(/,\s*]/g, "]")  // trailing commas
      .replace(/'\s*:/g, '":')  // single quotes
      .replace(/:\s*'/g, ':"');
    
    try {
      return JSON.parse(fixed) as unknown;
    } catch {
      throw new Error(`Nepodařilo se parsovat JSON: ${(e as Error).message}`);
    }
  }
}

/**
 * Zparsuje opravené řádky z výstupu AI.
 */
export function mergeCorrectedDescriptions(
  lines: TripLine[],
  parsed: unknown,
): TripLine[] {
  if (!Array.isArray(parsed)) {
    throw new Error("Korekce názvů: očekáváno JSON pole.");
  }

  const byIndex = new Map<number, { popis: string; zdroj?: string }>();
  
  for (const item of parsed) {
    if (
      item &&
      typeof item === "object" &&
      "i" in item &&
      "popis" in item &&
      typeof (item as { i: unknown }).i === "number" &&
      typeof (item as { popis: unknown }).popis === "string"
    ) {
      const obj = item as { i: number; popis: string; zdroj?: unknown };
      byIndex.set(obj.i, {
        popis: obj.popis.trim(),
        zdroj: typeof obj.zdroj === "string" ? obj.zdroj : undefined,
      });
    }
  }

  return lines.map((line, i) => {
    const fixed = byIndex.get(i);
    if (!fixed || !fixed.popis) {
      return line;
    }
    return { ...line, description: fixed.popis };
  });
}

/**
 * Validuje konzistenci čísel (litry × sazba = základ).
 * Vrací řádky s příznakem validity.
 */
export function validateLineNumbers(line: TripLine): {
  valid: boolean;
  difference: number;
  expected: number;
  actual: number;
} {
  const expected = Math.round(line.liters * line.rate * 100) / 100;
  const actual = line.baseAmount;
  const difference = Math.abs(expected - actual);
  
  return {
    valid: difference <= 1, // tolerance 1 Kč za zaokrouhlení
    difference: Math.round(difference * 100) / 100,
    expected,
    actual,
  };
}

/**
 * Formátuje zdroj pro zobrazení uživateli.
 */
export function formatSource(source: string | undefined): string {
  if (!source) return "neuvedeno";
  if (source === "původní ověřeno") return "✓ ověřeno na webu";
  if (source === "zachováno neověřeno") return "⚠ neověřeno (původní)";
  if (source.startsWith("http")) {
    // Zkrátit URL
    try {
      const url = new URL(source);
      return `${url.hostname}`;
    } catch {
      return source.slice(0, 30);
    }
  }
  return source;
}