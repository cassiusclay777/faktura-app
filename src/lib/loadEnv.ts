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
 * Doplní `process.env` (stejné pořadí jako v README).
 * **DeepSeek** (`DEEPSEEK_API_KEY`, …). Pro web u korekce volitelně **PERPLEXITY_API_KEY** / **TAVILY_API_KEY** (jinak DuckDuckGo).
 *
 * Pořadí: `invoice-assistant/.env` → `.env` → `.env.local` (pozdější přepíše dřívější).
 */
export function loadServerEnv(): void {
  if (loaded) return;
  loaded = true;
  const root = projectRoot();
  const paths = [
    path.join(root, "invoice-assistant", ".env"),
    path.join(root, ".env"),
    path.join(root, ".env.local"),
  ];
  for (const p of paths) {
    if (existsSync(p)) {
      config({ path: p, override: true });
    }
  }
}
