import { config } from "dotenv";
import { existsSync } from "node:fs";
import path from "node:path";

let loaded = false;

/**
 * Next.js načítá jen `.env*` v kořeni aplikace.
 * Volitelně i `invoice-assistant/.env` (sdílené klíče s CLI balíčkem).
 * Pořadí: invoice-assistant → `.env` → `.env.local` (přepíše).
 */
export function loadServerEnv(): void {
  if (loaded) return;
  loaded = true;
  const cwd = process.cwd();
  const paths = [
    path.join(cwd, "invoice-assistant", ".env"),
    path.join(cwd, ".env"),
    path.join(cwd, ".env.local"),
  ];
  for (const p of paths) {
    if (existsSync(p)) {
      config({ path: p, override: true });
    }
  }
}
