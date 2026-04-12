import { HANDWRITING_TRANSCRIBE_PROMPT } from "./prompt.js";

export type OpenAICompatVisionOptions = {
  apiKey: string;
  /** Např. https://api.openai.com/v1 nebo https://openrouter.ai/api/v1 */
  baseUrl: string;
  model: string;
  mimeType: string;
  base64: string;
};

type ChatContentPart =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string } };

function buildHeaders(apiKey: string, baseUrl: string): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${apiKey}`,
  };
  const lower = baseUrl.toLowerCase();
  if (lower.includes("openrouter.ai")) {
    const ref = process.env.OPENROUTER_HTTP_REFERER?.trim();
    const title = process.env.OPENROUTER_APP_TITLE?.trim();
    if (ref) headers["HTTP-Referer"] = ref;
    if (title) headers["X-Title"] = title;
  }
  return headers;
}

function resolveMaxTokens(): number {
  const raw = process.env.DEEPSEEK_VISION_MAX_TOKENS?.trim();
  const parsed = raw ? Number(raw) : NaN;
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return 4096;
  }
  return Math.floor(parsed);
}

/**
 * Oficiální DeepSeek chat API je text-only — neumí OpenAI formát s `image_url`
 * (server vrací 400: unknown variant `image_url`, expected `text`).
 */
function assertOpenAiCompatVisionSupported(baseUrl: string): void {
  let host: string;
  try {
    const u = baseUrl.trim();
    host = new URL(u.includes("://") ? u : `https://${u}`).hostname.toLowerCase();
  } catch {
    return;
  }
  if (host === "api.deepseek.com") {
    throw new Error(
      "Vision OCR: oficiální DeepSeek API (api.deepseek.com) nepodporuje obrázky v chatu — jen text. " +
        "Nastav DEEPSEEK_VISION_API_BASE na endpoint s vision v OpenAI formátu (např. https://openrouter.ai/api/v1) " +
        "a DEEPSEEK_VISION_MODEL na multimodální model, použij OPENAI_API_KEY u OpenAI, nebo v aplikaci zvol Ollama s vision modelem.",
    );
  }
}

/**
 * Přepis z obrázku přes OpenAI-kompatibilní chat (image_url + text).
 * Použití: OpenRouter, OpenAI, Azure OpenAI (správný baseUrl), apod.
 */
export async function transcribeWithOpenAICompatVision(
  opts: OpenAICompatVisionOptions,
): Promise<string> {
  assertOpenAiCompatVisionSupported(opts.baseUrl);
  const base = opts.baseUrl.replace(/\/$/, "");
  const url = `${base}/chat/completions`;
  const mime = opts.mimeType.split(";")[0]?.trim() ?? "image/jpeg";
  const dataUrl = `data:${mime};base64,${opts.base64}`;

  const content: ChatContentPart[] = [
    { type: "text", text: HANDWRITING_TRANSCRIBE_PROMPT },
    { type: "image_url", image_url: { url: dataUrl } },
  ];

  const res = await fetch(url, {
    method: "POST",
    headers: buildHeaders(opts.apiKey, opts.baseUrl),
    body: JSON.stringify({
      model: opts.model,
      messages: [{ role: "user", content }],
      temperature: 0.2,
      max_tokens: resolveMaxTokens(),
    }),
  });

  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(
      `Vision OCR (${res.status}): ${errBody.slice(0, 800)}`,
    );
  }

  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string | null } }>;
  };
  const text = data.choices?.[0]?.message?.content;
  if (!text?.trim()) {
    throw new Error("Vision OCR vrátil prázdný text.");
  }
  return text.trim();
}
