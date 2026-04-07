import { config } from "dotenv";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

let loaded = false;

/** Kořen `faktura-app` (složka s `package.json`), nezávisle na `process.cwd()`. */
function projectRoot(): string {
  return path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
}

/**
 * Doplní `process.env` ze souborů v kořeni `faktura-app` (vedle toho, co už načte Next.js).
 * Pro API používají stejné proměnné i **Gemini** (`GEMINI_API_KEY`, `GEMINI_MODEL`) a **DeepSeek** (`DEEPSEEK_API_KEY`, …). Pro web u korekce DeepSeek volitelně **PERPLEXITY_API_KEY** a/nebo **TAVILY_API_KEY** (viz `DEEPSEEK_WEB_SEARCH_PROVIDER` v `.env.example`).
 *
 * Pořadí: `.env` → `.env.local` (každý další přepíše).
 */
export function loadServerEnv(): void {
  if (loaded) return;
  loaded = true;
  const root = projectRoot();
  const paths = [
    path.join(root, ".env"),
    path.join(root, ".env.local"),
  ];
  for (const p of paths) {
    if (existsSync(p)) {
      config({ path: p, override: true });
    }
  }
}
