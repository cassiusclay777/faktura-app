import { loadServerEnv } from "@/lib/loadEnv";

/** Načte `.env` / `.env.local` dřív než API routy – Gemini i OpenRouter čtou `process.env` z těchto souborů. */
export function register() {
  loadServerEnv();
}
