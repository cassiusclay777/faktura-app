import { loadServerEnv } from "@/lib/loadEnv";

/** Načte `.env` / `.env.local` dřív než API routy – OpenRouter/Gemini/Ollama čtou `process.env` z těchto souborů. */
export function register() {
  loadServerEnv();
}
