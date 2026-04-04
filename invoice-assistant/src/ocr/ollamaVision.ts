import { HANDWRITING_TRANSCRIBE_PROMPT } from "./prompt.js";

export type OllamaVisionOptions = {
  /** Výchozí http://127.0.0.1:11434 */
  baseUrl?: string;
  /** např. llava, moondream, llava-phi3 */
  model: string;
  mimeType: string;
  base64: string;
};

/**
 * Ollama /api/chat – vision modely přijímají base64 obrázek v poli images[].
 * @see https://github.com/ollama/ollama/blob/main/docs/api.md
 */
export async function transcribeWithOllama(
  opts: OllamaVisionOptions,
): Promise<string> {
  const base = (opts.baseUrl ?? "http://127.0.0.1:11434").replace(/\/$/, "");
  const url = `${base}/api/chat`;

  const body = {
    model: opts.model,
    stream: false,
    messages: [
      {
        role: "user" as const,
        content: HANDWRITING_TRANSCRIBE_PROMPT,
        images: [opts.base64],
      },
    ],
  };

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Ollama ${res.status}: ${errText.slice(0, 500)}`);
  }

  const data = (await res.json()) as {
    message?: { content?: string };
  };
  const text = data.message?.content;
  if (!text?.trim()) {
    throw new Error("Ollama vrátil prázdný text (zkontroluj model s vision).");
  }
  return text.trim();
}
