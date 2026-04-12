import { HANDWRITING_TRANSCRIBE_PROMPT } from "./prompt.js";

export type OpenRouterVisionOptions = {
  apiKey: string;
  /** např. google/gemini-2.5-flash-lite */
  model?: string;
  /** Výchozí OpenAI-kompatibilní endpoint OpenRouter */
  baseUrl?: string;
  mimeType: string;
  base64: string;
};

const DEFAULT_OPENROUTER_VISION_MODEL = "google/gemini-2.5-flash-lite";

type OpenRouterResponseShape = {
  choices?: Array<{
    message?: {
      content?: unknown;
    };
  }>;
};

function extractContentText(content: unknown): string {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";
  return content
    .map((item) => {
      if (!item || typeof item !== "object") return "";
      const block = item as { type?: unknown; text?: unknown };
      return block.type === "text" && typeof block.text === "string"
        ? block.text
        : "";
    })
    .filter(Boolean)
    .join("\n");
}

/**
 * OpenRouter /v1/chat/completions – multimodální model přes OpenAI-compatible API.
 */
export async function transcribeWithOpenRouter(
  opts: OpenRouterVisionOptions,
): Promise<string> {
  const base = (opts.baseUrl ?? "https://openrouter.ai/api").replace(/\/$/, "");
  const requestedModel =
    typeof opts.model === "string" && opts.model.trim()
      ? opts.model.trim()
      : DEFAULT_OPENROUTER_VISION_MODEL;
  const imageUrl = `data:${opts.mimeType};base64,${opts.base64}`;

  const runRequest = async (
    model: string,
  ): Promise<
    | { ok: true; text: string }
    | { ok: false; status: number; errBody: string; model: string }
  > => {
    const res = await fetch(`${base}/v1/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${opts.apiKey}`,
      },
      body: JSON.stringify({
        model,
        temperature: 0,
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: HANDWRITING_TRANSCRIBE_PROMPT },
              { type: "image_url", image_url: { url: imageUrl } },
            ],
          },
        ],
      }),
    });

    if (!res.ok) {
      return {
        ok: false,
        status: res.status,
        errBody: await res.text(),
        model,
      };
    }

    const data = (await res.json()) as OpenRouterResponseShape;
    const text = extractContentText(data.choices?.[0]?.message?.content);
    if (!text?.trim()) {
      return {
        ok: false,
        status: 502,
        errBody: "OpenRouter OCR vrátil prázdný text.",
        model,
      };
    }
    return { ok: true, text: text.trim() };
  };

  const first = await runRequest(requestedModel);
  if (first.ok) return first.text;

  const canFallbackToDefault =
    requestedModel !== DEFAULT_OPENROUTER_VISION_MODEL &&
    first.status === 400 &&
    /invalid_request_error|provider returned error|image|multimodal|vision/i.test(
      first.errBody,
    );

  if (canFallbackToDefault) {
    const second = await runRequest(DEFAULT_OPENROUTER_VISION_MODEL);
    if (second.ok) return second.text;
    throw new Error(
      `OpenRouter OCR selhal na modelu "${requestedModel}" a i fallback "${DEFAULT_OPENROUTER_VISION_MODEL}" selhal (${second.status}). ` +
        `${second.errBody.slice(0, 600)}`,
    );
  }

  throw new Error(
    `OpenRouter OCR ${first.status} (model "${requestedModel}"): ${first.errBody.slice(0, 600)}. ` +
      `Pokud používáš vlastní model, nastav vision model (např. ${DEFAULT_OPENROUTER_VISION_MODEL}).`,
  );
}
