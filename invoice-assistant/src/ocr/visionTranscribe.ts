import { loadImageAsBase64, loadImageBufferAsBase64 } from "./imageFile.js";
import { transcribeWithGemini } from "./geminiVision.js";
import { transcribeWithOpenRouter } from "./openRouterVision.js";
import { transcribeWithOllama } from "./ollamaVision.js";

export type VisionProvider = "openrouter" | "gemini" | "ollama";

export type TranscribeOptions = {
  imagePath: string;
  provider: VisionProvider;
};

export type TranscribeBufferOptions = {
  buffer: Buffer;
  mimeType: string;
  provider: VisionProvider;
};

function env(name: string): string | undefined {
  const v = process.env[name];
  return v && v.trim() ? v.trim() : undefined;
}

/**
 * Přepis ručně psaného listu z fotky – OpenRouter/Gemini (cloud) nebo Ollama (lokálně).
 *
 * Env:
 * - OpenRouter: OPENROUTER_API_KEY, volitelně OPENROUTER_VISION_MODEL (default google/gemini-2.5-flash-lite)
 * - Gemini: GEMINI_API_KEY, volitelně GEMINI_MODEL (default gemini-2.5-flash)
 * - Ollama: OLLAMA_BASE_URL (default http://127.0.0.1:11434), OLLAMA_VISION_MODEL (povinné, např. llava)
 */
async function transcribeWithProvider(
  mimeType: string,
  base64: string,
  provider: VisionProvider,
): Promise<string> {
  const m = mimeType.split(";")[0]?.trim().toLowerCase() ?? mimeType;
  if (m === "application/pdf" && provider === "ollama") {
    throw new Error(
      "Skenované PDF (bez textové vrstvy) přes Ollama nepodporujeme – v UI zvol OpenRouter, nebo nahraj stránku jako obrázek.",
    );
  }
  if (provider === "openrouter") {
    const apiKey = env("OPENROUTER_API_KEY");
    if (!apiKey) {
      throw new Error(
        "Chybí OPENROUTER_API_KEY. Získej klíč na https://openrouter.ai/keys",
      );
    }
    return transcribeWithOpenRouter({
      apiKey,
      model: env("OPENROUTER_VISION_MODEL"),
      baseUrl: env("OPENROUTER_API_BASE"),
      mimeType,
      base64,
    });
  }
  if (provider === "gemini") {
    const apiKey = env("GEMINI_API_KEY");
    if (!apiKey) {
      throw new Error(
        "Chybí GEMINI_API_KEY. Získej klíč na https://aistudio.google.com/apikey",
      );
    }
    return transcribeWithGemini({
      apiKey,
      model: env("GEMINI_MODEL"),
      mimeType,
      base64,
    });
  }

  const model = env("OLLAMA_VISION_MODEL");
  if (!model) {
    throw new Error(
      'Nastav OLLAMA_VISION_MODEL (např. "llava"). Stáhni model: ollama pull llava',
    );
  }

  return transcribeWithOllama({
    baseUrl: env("OLLAMA_BASE_URL"),
    model,
    mimeType,
    base64,
  });
}

export async function transcribeHandwriting(
  options: TranscribeOptions,
): Promise<string> {
  const { mimeType, base64 } = loadImageAsBase64(options.imagePath);
  return transcribeWithProvider(mimeType, base64, options.provider);
}

/** Přepis z nahraného souboru (např. Next.js FormData → Buffer). */
export async function transcribeHandwritingFromBuffer(
  options: TranscribeBufferOptions,
): Promise<string> {
  const { mimeType, base64 } = loadImageBufferAsBase64(
    options.buffer,
    options.mimeType,
  );
  return transcribeWithProvider(mimeType, base64, options.provider);
}
