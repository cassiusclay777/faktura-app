import { transcribeWithOpenAICompatVision } from "./openaiCompatVision.js";

function env(name: string): string | undefined {
  const v = process.env[name];
  return v && v.trim() ? v.trim() : undefined;
}

function resolveVisionBaseUrl(): string | undefined {
  return (
    env("DEEPSEEK_VISION_API_BASE") ??
    env("DEEPSEEK_API_BASE") ??
    "https://api.deepseek.com/v1"
  );
}

/** Klíč pro OpenAI-kompatibilní vision endpoint (OpenRouter / OpenAI …). */
export function resolveDeepSeekVisionOcrApiKey(): string | undefined {
  return (
    env("DEEPSEEK_VISION_API_KEY") ??
    env("DEEPSEEK_API_KEY") ??
    env("OPENAI_API_KEY") ??
    env("OPENROUTER_API_KEY")
  );
}

/**
 * Je k dispozici klíč pro OCR při volbě „DeepSeek“ v UI?
 */
export function hasDeepSeekVisionOcrCredentials(): boolean {
  return !!resolveDeepSeekVisionOcrApiKey();
}

/**
 * Přepis z fotky při provideru „deepseek“: vždy přes OpenAI-kompatibilní vision API.
 */
export async function transcribeDeepSeekPathFromImage(
  mimeType: string,
  base64: string,
): Promise<string> {
  const base = resolveVisionBaseUrl();
  const apiKey = resolveDeepSeekVisionOcrApiKey();
  const model =
    env("DEEPSEEK_VISION_MODEL") ?? env("DEEPSEEK_MODEL") ?? "deepseek-chat";

  if (!base) {
    throw new Error(
      "Pro přepis z fotky s volbou „DeepSeek“ nastav v .env DEEPSEEK_VISION_API_BASE nebo DEEPSEEK_API_BASE.",
    );
  }
  if (!apiKey) {
    throw new Error(
      "Chybí API klíč pro vision OCR. Nastav DEEPSEEK_VISION_API_KEY nebo DEEPSEEK_API_KEY (alternativně OPENAI_API_KEY / OPENROUTER_API_KEY).",
    );
  }

  return transcribeWithOpenAICompatVision({
    apiKey,
    baseUrl: base,
    model,
    mimeType,
    base64,
  });
}
