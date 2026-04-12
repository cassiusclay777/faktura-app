import "dotenv/config";
import { readFileSync } from "node:fs";
import { parseTripText } from "./parseTripText.js";
import { transcribeHandwriting } from "./ocr/visionTranscribe.js";
import type { VisionProvider } from "./ocr/visionTranscribe.js";
import { isProbablyImagePath } from "./ocr/imageFile.js";
import { correctTripLineDescriptions } from "./ocr/correctNamesGemini.js";
import type { TripLine } from "./types.js";

function parseArgs(argv: string[]): {
  filePath: string;
  provider: VisionProvider | null;
  fixNames: boolean;
  fixNamesWeb: boolean;
} {
  let provider: VisionProvider | null = null;
  let fixNames = false;
  let fixNamesWeb = false;
  const rest: string[] = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--openrouter") {
      provider = "openrouter";
      continue;
    }
    if (a === "--gemini") {
      provider = "gemini";
      continue;
    }
    if (a === "--ollama") {
      provider = "ollama";
      continue;
    }
    if (a === "--fix-names") {
      fixNames = true;
      continue;
    }
    if (a === "--fix-names-web") {
      fixNames = true;
      fixNamesWeb = true;
      continue;
    }
    if (a === "--provider" && argv[i + 1]) {
      const p = argv[++i];
      if (p !== "openrouter" && p !== "gemini" && p !== "ollama") {
        throw new Error('--provider musí být "openrouter", "gemini" nebo "ollama"');
      }
      provider = p;
      continue;
    }
    rest.push(a);
  }
  const filePath = rest[0];
  if (!filePath) {
    throw new Error("Chybí cesta k souboru.");
  }
  return { filePath, provider, fixNames, fixNamesWeb };
}

function defaultProviderFromEnv(): VisionProvider | null {
  const p = process.env.VISION_PROVIDER?.toLowerCase();
  if (p === "openrouter" || p === "gemini" || p === "ollama") return p;
  return null;
}

function logDescriptionDiff(before: TripLine[], after: TripLine[]) {
  let any = false;
  for (let i = 0; i < before.length; i++) {
    if (before[i].description !== after[i].description) {
      if (!any) {
        console.error("\n--- Korekce názvů (rozdíly) ---\n");
        any = true;
      }
      console.error(`[${i + 1}]`);
      console.error(`  před: ${before[i].description}`);
      console.error(`  po:   ${after[i].description}\n`);
    }
  }
  if (!any) {
    console.error(
      "\n--- Korekce názvů: žádná změna (model ponechal popisy) ---\n",
    );
  }
}

async function main() {
  const argv = process.argv.slice(2);
  let filePath: string;
  let provider: VisionProvider | null;
  let fixNames: boolean;
  let fixNamesWeb: boolean;

  try {
    ({ filePath, provider, fixNames, fixNamesWeb } = parseArgs(argv));
  } catch (e) {
    console.error((e as Error).message);
    printUsage();
    process.exit(1);
  }

  const useImage =
    isProbablyImagePath(filePath) ||
    provider !== null ||
    defaultProviderFromEnv() !== null;

  let raw: string;

  if (useImage && isProbablyImagePath(filePath)) {
    const p =
      provider ?? defaultProviderFromEnv() ?? inferProviderFromEnv();
    if (!p) {
      console.error(
        "Pro obrázek nastav provider: --openrouter | --gemini | --ollama nebo VISION_PROVIDER=openrouter|gemini|ollama",
      );
      process.exit(1);
    }
    raw = await transcribeHandwriting({ imagePath: filePath, provider: p });
    console.error("--- Přepis (raw) ---\n");
    console.error(raw);
    console.error("\n--- Parsovaná data ---\n");
  } else {
    raw = readFileSync(filePath, "utf8");
  }

  let result = parseTripText(raw);

  if (fixNames) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey?.trim()) {
      console.error(
        "Pro --fix-names / --fix-names-web nastav GEMINI_API_KEY v .env.",
      );
      process.exit(1);
    }
    const before = result.lines.map((l) => ({ ...l }));
    try {
      const corrected = await correctTripLineDescriptions(result.lines, {
        apiKey,
        model: process.env.GEMINI_MODEL,
        useWebSearch: fixNamesWeb,
        rawTranscript: raw,
      });
      result = {
        lines: corrected,
        sumBase:
          Math.round(
            corrected.reduce((s, t) => s + t.baseAmount, 0) * 100,
          ) / 100,
      };
      logDescriptionDiff(before, corrected);
    } catch (e) {
      console.error(
        (e as Error).message,
        fixNamesWeb
          ? "\n(Tip: zkus bez webu: --fix-names, nebo jiný GEMINI_MODEL.)"
          : "",
      );
      process.exit(1);
    }
  }

  console.log(JSON.stringify(result, null, 2));
  console.error(
    `\nŘádků: ${result.lines.length}, součet základů: ${result.sumBase} Kč`,
  );
}

function inferProviderFromEnv(): VisionProvider | null {
  if (process.env.OPENROUTER_API_KEY) return "openrouter";
  if (process.env.GEMINI_API_KEY) return "gemini";
  if (process.env.OLLAMA_VISION_MODEL) return "ollama";
  return null;
}

function printUsage() {
  console.error(`
Použití:
  Textový podklad:
    npx tsx src/index.ts podklad.txt

  Foto ručního zápisu (Gemini):
    set GEMINI_API_KEY=...   (PowerShell: $env:GEMINI_API_KEY="...")
    npx tsx src/index.ts --gemini sken.jpg

  Foto (OpenRouter):
    set OPENROUTER_API_KEY=...   (PowerShell: $env:OPENROUTER_API_KEY="...")
    npx tsx src/index.ts --openrouter sken.jpg

  Foto (Ollama, lokálně):
    ollama pull llava
    set OLLAMA_VISION_MODEL=llava
    npx tsx src/index.ts --ollama sken.jpg

Volitelně: VISION_PROVIDER=openrouter|gemini|ollama v .env

  Korekce názvů firem (Gemini, po parsování):
    npx tsx src/index.ts --fix-names podklad.txt
    npx tsx src/index.ts --gemini sken.jpg --fix-names-web
  (--fix-names-web zapne Google Search u modelu; vyžaduje GEMINI_API_KEY)
`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
