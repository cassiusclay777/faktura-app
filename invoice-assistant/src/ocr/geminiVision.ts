import { GoogleGenerativeAI } from "@google/generative-ai";
import { HANDWRITING_TRANSCRIBE_PROMPT } from "./prompt.js";

export type GeminiVisionOptions = {
  apiKey: string;
  /** např. gemini-2.5-flash, gemini-1.5-flash */
  model?: string;
  mimeType: string;
  base64: string;
};

export async function transcribeWithGemini(
  opts: GeminiVisionOptions,
): Promise<string> {
  const modelName = opts.model ?? "gemini-2.5-flash";
  const genAI = new GoogleGenerativeAI(opts.apiKey);
  const model = genAI.getGenerativeModel({ model: modelName });

  const result = await model.generateContent([
    { text: HANDWRITING_TRANSCRIBE_PROMPT },
    {
      inlineData: {
        mimeType: opts.mimeType,
        data: opts.base64,
      },
    },
  ]);

  const text = result.response.text();
  if (!text?.trim()) {
    throw new Error("Gemini vrátil prázdný text.");
  }
  return text.trim();
}
