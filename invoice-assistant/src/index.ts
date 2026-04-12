import "dotenv/config";
import { readFileSync } from "node:fs";
import { parseTripText } from "./parseTripText.js";
import { transcribeHandwriting } from "./ocr/visionTranscribe.js";
import type { VisionProvider } from "./ocr/visionTranscribe.js";
import { isProbablyImagePath } from "./ocr/imageFile.js";
import { correctTripLineDescriptionsDeepSeek } from "./ocr/correctNamesDeepSeek.js";
import { parseWithDeepSeekReasoner } from "./ocr/parseWithDeepSeekReasoner.js";
import { transcribeWithOpenRouter } from "./ocr/openrouterVision.js";
import type { TripLine } from "./types.js";

function parseArgs(argv: string[]): {
  filePath: string;
  provider: VisionProvider | null;
  fixNames: boolean;
  fixNamesWeb: boolean;
  useReasoner: boolean;
  useOpenRouter: boolean;
} {
  let provider: VisionProvider | null = null;
  let fixNames = false;
  let fixNamesWeb = false;
  let useReasoner = false;
  let useOpenRouter = false;
  const rest: string[] = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--ollama") {
      provider = "ollama";
      continue;
    }
    if (a === "--deepseek") {
      provider = "deepseek";
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
    if (a === "--reasoner") {
      useReasoner = true;
      continue;
    }
    if (a === "--openrouter") {
      useOpenRouter = true;
      continue;
    }
    if (a === "--provider" && argv[i + 1]) {
      const p = argv[++i];
      if (p !== "ollama" && p !== "deepseek") {
        throw new Error('--provider musí být "ollama" nebo "deepseek"');
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
  return { filePath, provider, fixNames, fixNamesWeb, useReasoner, useOpenRouter };
}

function defaultProviderFromEnv(): VisionProvider | null {
  const p = process.env.VISION_PROVIDER?.toLowerCase();
  if (p === "ollama" || p === "deepseek") return p;
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
      "\n--- Korekce názvů: žádné změny v popisech ---\n",
    );
  }
}

async function webSearchCli(query: string): Promise<string> {
  const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`;
  const res = await fetch(url, {
    headers: { "User-Agent": "invoice-assistant-cli/1.0" },
  });
  if (!res.ok) return `(HTTP ${res.status})`;
  const data = (await res.json()) as {
    AbstractText?: string;
    RelatedTopics?: Array<{ Text?: string }>;
  };
  const parts: string[] = [];
  if (data.AbstractText?.trim()) parts.push(data.AbstractText.trim());
  if (Array.isArray(data.RelatedTopics)) {
    for (const t of data.RelatedTopics.slice(0, 6)) {
      if (t?.Text) parts.push(t.Text);
    }
  }
  return parts.length > 0 ? parts.join("\n\n") : "(žádné výsledky)";
}

async function main() {
  const argv = process.argv.slice(2);
  if (argv.includes("--help") || argv.includes("-h")) {
    printUsage();
    process.exit(0);
  }

  const { filePath, provider, fixNames, fixNamesWeb, useReasoner, useOpenRouter } =
    parseArgs(argv);

  const useImage =
    isProbablyImagePath(filePath) ||
    provider !== null ||
    defaultProviderFromEnv() !== null ||
    useOpenRouter;

  let raw: string;

  if (useImage && isProbablyImagePath(filePath)) {
    if (useOpenRouter) {
      const apiKey = process.env.OPENROUTER_API_KEY;
      if (!apiKey?.trim()) {
        console.error("Pro --openrouter nastav OPENROUTER_API_KEY v .env.");
        process.exit(1);
      }
      console.error("--- Používám OpenRouter s Qwen VL ---\n");
      raw = await transcribeWithOpenRouter({
        apiKey: apiKey.trim(),
        imagePath: filePath,
        model:
          process.env.OPENROUTER_VISION_MODEL ?? "qwen/qwen2.5-vl-72b-instruct",
        baseUrl: process.env.OPENROUTER_API_BASE,
        httpReferer: process.env.OPENROUTER_HTTP_REFERER,
        appTitle: process.env.OPENROUTER_APP_TITLE,
        verbose: true,
      });
      console.error("--- Přepis (raw) ---\n");
      console.error(raw);
      console.error("\n--- Parsovaná data ---\n");
    } else {
      const p = provider ?? defaultProviderFromEnv() ?? inferProviderFromEnv();
      if (!p) {
        console.error(
          "Pro obrázek nastav --ollama | --deepseek nebo VISION_PROVIDER=ollama|deepseek, nebo použij --openrouter",
        );
        process.exit(1);
      }
      raw = await transcribeHandwriting({ imagePath: filePath, provider: p });
      console.error("--- Přepis (raw) ---\n");
      console.error(raw);
      console.error("\n--- Parsovaná data ---\n");
    }
  } else {
    raw = readFileSync(filePath, "utf8");
  }

  let result;
  
  if (useReasoner) {
    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey?.trim()) {
      console.error("Pro --reasoner nastav DEEPSEEK_API_KEY v .env.");
      process.exit(1);
    }
    console.error("--- Používám DeepSeek Reasoner ---\n");
    result = await parseWithDeepSeekReasoner({
      apiKey: apiKey.trim(),
      model: "deepseek-reasoner",
      baseUrl: process.env.DEEPSEEK_API_BASE,
      rawText: raw,
      verbose: true,
      reasoningEffort: "high",
    });
  } else {
    result = parseTripText(raw);
  }

  if (fixNames) {
    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey?.trim()) {
      console.error("Pro --fix-names nastav DEEPSEEK_API_KEY v .env.");
      process.exit(1);
    }
    const before = result.lines.map((l) => ({ ...l }));
    try {
      const corrected = await correctTripLineDescriptionsDeepSeek(result.lines, {
        apiKey: apiKey.trim(),
        model: process.env.DEEPSEEK_MODEL,
        baseUrl: process.env.DEEPSEEK_API_BASE,
        rawTranscript: raw,
        useWebSearch: fixNamesWeb,
        webSearch: fixNamesWeb ? webSearchCli : undefined,
        idokladStyle: true,
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
        fixNamesWeb ? "\n(Tip: zkus bez --fix-names-web.)" : "",
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
  if (process.env.DEEPSEEK_API_KEY) return "deepseek";
  if (process.env.OLLAMA_VISION_MODEL) return "ollama";
  return null;
}

function printUsage() {
  console.error(`
Použití:
  Textový podklad:
    npx tsx src/index.ts podklad.txt

  Foto (DeepSeek, cloud):
    set DEEPSEEK_API_KEY=...
    npx tsx src/index.ts --deepseek sken.jpg

  Foto (Ollama, lokálně):
    ollama pull llava
    set OLLAMA_VISION_MODEL=llava
    npx tsx src/index.ts --ollama sken.jpg

Volitelně: VISION_PROVIDER=ollama|deepseek v .env

  Korekce názvů (DeepSeek, po parsování):
    npx tsx src/index.ts --fix-names podklad.txt
    npx tsx src/index.ts podklad.txt --fix-names-web
  (--fix-names-web = nástroj web_search přes DuckDuckGo v CLI)

  DeepSeek Reasoner (AI parsování složitých podkladů):
    npx tsx src/index.ts --reasoner podklad.txt
  (použije deepseek-reasoner model, který "přemýšlí" a je přesnější)

  OCR přes OpenRouter (Qwen VL, nastav OPENROUTER_API_KEY):
    npx tsx src/index.ts --openrouter faktura.jpg
    npx tsx src/index.ts --openrouter --reasoner faktura.jpg
`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
