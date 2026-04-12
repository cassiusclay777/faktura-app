import { transcribeWithOpenAICompatVision } from "./openaiCompatVision.js";

function env(name: string): string | undefined {
  const v = process.env[name];
  return v && v.trim() ? v.trim() : undefined;
}

/**
 * Vision endpoint: explicitní proměnné mají přednost.
 * Když je v .env jen OPENROUTER_API_KEY (bez DEEPSEEK_API_BASE), nesmíme padnout
 * na api.deepseek.com — ten je text-only a openaiCompatVision pak hlásí falešnou chybu.
 */
function resolveVisionBaseUrl(): string {
  const explicit = env("DEEPSEEK_VISION_API_BASE");
  if (explicit) return explicit;
  const deepseekBase = env("DEEPSEEK_API_BASE");
  if (deepseekBase) return deepseekBase;
  const openrouterKey = env("OPENROUTER_API_KEY");
  const deepseekKey = env("DEEPSEEK_API_KEY");
  if (openrouterKey && !deepseekKey) {
    return env("OPENROUTER_API_BASE") ?? "https://openrouter.ai/api/v1";
  }
  return "https://api.deepseek.com/v1";
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
    env("DEEPSEEK_VISION_MODEL") ??
    env("OPENROUTER_VISION_MODEL") ??
    env("DEEPSEEK_MODEL") ??
    (base.toLowerCase().includes("openrouter") ? "qwen/qwen2.5-vl-72b-instruct" : "deepseek-chat");

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
