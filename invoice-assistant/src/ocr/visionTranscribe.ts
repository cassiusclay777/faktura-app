import { loadImageAsBase64, loadImageBufferAsBase64 } from "./imageFile.js";
import { transcribeWithOllama } from "./ollamaVision.js";
import { transcribeDeepSeekPathFromImage } from "./deepseekVisionOcr.js";

export {
  hasDeepSeekVisionOcrCredentials,
  resolveDeepSeekVisionOcrApiKey,
} from "./deepseekVisionOcr.js";

export type VisionProvider = "ollama" | "deepseek";

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
 * Přepis ručně psaného listu z fotky – DeepSeek (cloud) nebo Ollama (lokálně).
 *
 * Env:
 * - DeepSeek: DEEPSEEK_API_KEY (+ volitelně DEEPSEEK_VISION_API_BASE / DEEPSEEK_API_BASE pro vision endpoint)
 * - Ollama: OLLAMA_BASE_URL, OLLAMA_VISION_MODEL
 */
async function transcribeWithProvider(
  mimeType: string,
  base64: string,
  provider: VisionProvider,
): Promise<string> {
  const m = mimeType.split(";")[0]?.trim().toLowerCase() ?? mimeType;
  if (m === "application/pdf" && (provider === "ollama" || provider === "deepseek")) {
    throw new Error(
      "Interní chyba: skenované PDF musí být před OCR převedeno na obrázek (první stránka). Zkus znovu nahrát soubor.",
    );
  }

  if (provider === "deepseek") {
    return transcribeDeepSeekPathFromImage(mimeType, base64);
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
