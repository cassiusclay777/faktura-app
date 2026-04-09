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
 * **DeepSeek** (`DEEPSEEK_API_KEY`, `DEEPSEEK_MODEL`, `DEEPSEEK_API_BASE`). Pro lepší web u korekce volitelně **PERPLEXITY_API_KEY** / **TAVILY_API_KEY** (jinak DuckDuckGo).
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
