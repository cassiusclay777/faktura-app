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
  const model = opts.model ?? "google/gemini-2.5-flash-lite";
  const imageUrl = `data:${opts.mimeType};base64,${opts.base64}`;

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
    const errBody = await res.text();
    throw new Error(`OpenRouter OCR ${res.status}: ${errBody.slice(0, 600)}`);
  }

  const data = (await res.json()) as {
    choices?: Array<{
      message?: {
        content?: unknown;
      };
    }>;
  };
  const text = extractContentText(data.choices?.[0]?.message?.content);
  if (!text?.trim()) {
    throw new Error("OpenRouter OCR vrátil prázdný text.");
  }
  return text.trim();
}
