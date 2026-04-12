import { NextResponse } from "next/server";
import { loadServerEnv } from "@/lib/loadEnv";

loadServerEnv();

export const runtime = "nodejs";

/**
 * Veřejné příznaky pro UI (bez citlivých hodnot).
 * DeepSeek + web: alespoň PERPLEXITY_API_KEY nebo TAVILY_API_KEY.
 */
export function GET() {
  loadServerEnv();
  const tavily = !!process.env.TAVILY_API_KEY?.trim();
  const perplexity = !!process.env.PERPLEXITY_API_KEY?.trim();
  return NextResponse.json({
    tavilyConfigured: tavily,
    perplexityConfigured: perplexity,
    deepSeekWebSearchConfigured: perplexity || tavily,
  });
}
