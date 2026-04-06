import { NextResponse } from "next/server";
import { loadServerEnv } from "@/lib/loadEnv";

loadServerEnv();

export const runtime = "nodejs";

/**
 * Veřejné příznaky pro UI (bez citlivých hodnot).
 * DeepSeek + web vyžaduje TAVILY_API_KEY — klient podle toho povolí checkbox.
 */
export function GET() {
  loadServerEnv();
  return NextResponse.json({
    tavilyConfigured: !!process.env.TAVILY_API_KEY?.trim(),
  });
}
