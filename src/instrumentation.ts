/** Načte `.env` / `.env.local` dřív než API routy – Gemini i DeepSeek čtou `process.env` z těchto souborů. */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { loadServerEnv } = await import("@/lib/loadEnv");
    loadServerEnv();
  }
}
