import { transcribeWithOpenAICompatVision } from "./openaiCompatVision.js";

function env(name: string): string | undefined {
  const v = process.env[name];
  return v && v.trim() ? v.trim() : undefined;
}

/** Klíč pro OpenAI-kompatibilní vision endpoint (OpenRouter / OpenAI …). */
export function resolveDeepSeekVisionOcrApiKey(): string | undefined {
  return (
    env("DEEPSEEK_VISION_API_KEY") ??
    env("OPENROUTER_API_KEY") ??
    env("OPENAI_API_KEY") ??
    env("DEEPSEEK_API_KEY")
  );
}

/**
 * Je nastavený samostatný OpenAI-kompatibilní endpoint pro OCR při volbě „DeepSeek“ v UI?
 * Oficiální api.deepseek.com nepodporuje obrázky v chat API.
 */
export function hasDeepSeekVisionOcrCredentials(): boolean {
  return !!(env("DEEPSEEK_VISION_API_BASE") && resolveDeepSeekVisionOcrApiKey());
}

/**
 * Přepis z fotky při provideru „deepseek“: vždy přes OpenAI-kompatibilní vision API.
 */
export async function transcribeDeepSeekPathFromImage(
  mimeType: string,
  base64: string,
): Promise<string> {
  const base = env("DEEPSEEK_VISION_API_BASE");
  const apiKey = resolveDeepSeekVisionOcrApiKey();
  const model = env("DEEPSEEK_VISION_MODEL") ?? "gpt-4o-mini";

  if (!base) {
    throw new Error(
      "Pro přepis z fotky s volbou „DeepSeek“ nastav v .env DEEPSEEK_VISION_API_BASE na OpenAI-kompatibilní adresu (např. https://openrouter.ai/api/v1 nebo https://api.openai.com/v1). Samotné api.deepseek.com obrázky nepodporuje; korekce názvů pořád může používat DEEPSEEK_API_KEY.",
    );
  }
  if (!apiKey) {
    throw new Error(
      "Chybí API klíč pro vision OCR. Nastav DEEPSEEK_VISION_API_KEY, OPENROUTER_API_KEY nebo OPENAI_API_KEY.",
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
