import { NextRequest } from "next/server";
import {
  parsePodkladUnified,
  transcribeHandwritingFromBuffer,
  correctTripLineDescriptionsDeepSeek,
  hasDeepSeekVisionOcrCredentials,
  type ParsedPodklad,
  type PodkladParseFormat,
} from "invoice-assistant";
import { extractTextFromPdfBuffer } from "@/lib/extractPdfText";
import { loadServerEnv } from "@/lib/loadEnv";
import { searchWebForCorrection } from "@/lib/webSearch";
import {
  validateRequest,
  createValidationErrorResponse,
  rateLimit,
  createRateLimitResponse,
  validateFile,
  sanitizeObject,
  apiResponse,
  apiError,
  ValidationError,
} from "@/lib/apiValidation";
import { processRequestSchema } from "@/lib/validation";

loadServerEnv();

export const runtime = "nodejs";
export const maxDuration = 120;

const RETRY_DELAYS_MS = [700, 1500];

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Message + nested Error.cause (fetch/network errors often hide in cause). */
function aggregateErrorText(e: unknown): string {
  const parts: string[] = [];
  let cur: unknown = e;
  let depth = 0;
  while (cur != null && depth < 8) {
    if (cur instanceof Error) {
      parts.push(cur.message);
      cur = cur.cause;
    } else {
      parts.push(String(cur));
      break;
    }
    depth += 1;
  }
  return parts.join(" | ");
}

function isRetryableAiError(e: unknown): boolean {
  const normalized = aggregateErrorText(e).toLowerCase();
  const visionHttp =
    normalized.includes("vision ocr") &&
    (/\(\s*429\s*\)/.test(normalized) ||
      /\(\s*502\s*\)/.test(normalized) ||
      /\(\s*503\s*\)/.test(normalized) ||
      /\(\s*504\s*\)/.test(normalized) ||
      /\(\s*524\s*\)/.test(normalized));
  /** Ollama vrací např. "Ollama 502: ..." při dočasném výpadku / proxy. */
  const ollamaHttp =
    normalized.includes("ollama") &&
    /\bollama\s+50[234]\b/.test(normalized);
  return (
    visionHttp ||
    ollamaHttp ||
    normalized.includes("429") ||
    normalized.includes("retry in") ||
    normalized.includes("rate limit") ||
    normalized.includes("too many requests") ||
    normalized.includes("503") ||
    normalized.includes("service unavailable") ||
    normalized.includes("high demand") ||
    normalized.includes("bad gateway") ||
    normalized.includes("gateway time-out") ||
    normalized.includes("gateway timeout") ||
    // Transient network (Node fetch, undici, Ollama local)
    normalized.includes("fetch failed") ||
    normalized.includes("econnreset") ||
    normalized.includes("econnrefused") ||
    normalized.includes("etimedout") ||
    normalized.includes("enetunreach") ||
    normalized.includes("eai_again") ||
    normalized.includes("socket hang up") ||
    normalized.includes("premature close") ||
    normalized.includes("aborted") ||
    normalized.includes("und_err") ||
    normalized.includes("other side closed")
  );
}

async function retryTransient<T>(fn: () => Promise<T>): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt += 1) {
    try {
      return await fn();
    } catch (e) {
      lastError = e;
      if (!isRetryableAiError(e) || attempt === RETRY_DELAYS_MS.length) {
        throw e;
      }
      await sleep(RETRY_DELAYS_MS[attempt]);
    }
  }
  throw lastError;
}

function isTxtName(name: string): boolean {
  return /\.txt$/i.test(name);
}

function isImageMime(mime: string): boolean {
  return /^image\/(jpeg|png|webp|gif)$/i.test(mime.split(";")[0]?.trim() ?? "");
}

function isPdfFile(name: string, mime: string): boolean {
  if (/\.pdf$/i.test(name)) return true;
  const m = mime.split(";")[0]?.trim() ?? "";
  return m === "application/pdf";
}

export async function POST(req: NextRequest) {
  loadServerEnv();
  
  // Apply rate limiting
  const rateLimitResult = rateLimit(req, "process");
  if (rateLimitResult.limited) {
    return createRateLimitResponse(100, rateLimitResult.resetTime!);
  }
  
  try {
    // Validate request
    const validatedData = await validateRequest(req, processRequestSchema);
    const sanitizedData = sanitizeObject(validatedData);
    
    const { rawText, provider, fixNames, userInstructions, fixNamesIdokladStyle, styleReference, file } = sanitizedData;
    
    // If file is provided, validate it
    if (file) {
      const fileValidation = validateFile(file);
      if (!fileValidation.valid) {
        return apiError(fileValidation.error!, 400);
      }
    }

    let text: string;

    if (file && file instanceof File && file.size > 0) {
      const buf = Buffer.from(await file.arrayBuffer());
      const name = file.name || "";
      if (isTxtName(name) || file.type === "text/plain") {
        text = buf.toString("utf8");
      } else if (isPdfFile(name, file.type)) {
        let extracted = "";
        try {
          extracted = await extractTextFromPdfBuffer(buf);
        } catch {
          extracted = "";
        }
        if (extracted) {
          text = extracted;
        } else {
          if (provider === "deepseek" && !hasDeepSeekVisionOcrCredentials()) {
            return apiError(
              "Skenované PDF bez textu: pro OCR při volbě DeepSeek chybí vision — nastav OPENROUTER_API_KEY nebo DEEPSEEK_VISION_API_KEY / DEEPSEEK_API_KEY / OPENAI_API_KEY a DEEPSEEK_VISION_API_BASE na OpenAI-kompatibilní multimodální endpoint (např. https://openrouter.ai/api/v1). Oficiální api.deepseek.com je jen text. Nebo použij Ollama s vision modelem.",
              400
            );
          }

          let vBuf: Buffer = buf;
          let vMime = "application/pdf";
          if (provider === "ollama" || provider === "deepseek") {
            const { renderPdfFirstPageToPngBuffer } =
              await import("@/lib/pdfFirstPagePng");
            vBuf = Buffer.from(await renderPdfFirstPageToPngBuffer(buf));
            vMime = "image/png";
          }

          text = await retryTransient(() =>
            transcribeHandwritingFromBuffer({
              buffer: vBuf,
              mimeType: vMime,
              provider,
            }),
          );
        }
      } else if (isImageMime(file.type)) {
        if (provider === "deepseek" && !hasDeepSeekVisionOcrCredentials()) {
          return apiError(
            "Foto podkladu: pro OCR při volbě DeepSeek chybí vision — nastav OPENROUTER_API_KEY nebo DEEPSEEK_VISION_API_KEY / DEEPSEEK_API_KEY / OPENAI_API_KEY a DEEPSEEK_VISION_API_BASE na multimodální endpoint (např. OpenRouter). api.deepseek.com neumí obrázky. Nebo použij Ollama s vision modelem.",
            400
          );
        }
        text = await retryTransient(() =>
          transcribeHandwritingFromBuffer({
            buffer: buf,
            mimeType: file.type,
            provider,
          }),
        );
      } else {
        return apiError("Nepodporovaný typ souboru.", 400);
      }
    } else if (rawText && rawText.trim()) {
      text = rawText;
    } else {
      return apiError("Vlož text podkladu nebo nahraj soubor.", 400);
    }

    let parsed: ParsedPodklad;
    let parseFormat: PodkladParseFormat = "empty";
    try {
      const unified = parsePodkladUnified(text);
      parsed = unified.parsed;
      parseFormat = unified.format;
    } catch (parseErr) {
      return apiError(aggregateErrorText(parseErr), 422);
    }

    if (fixNames) {
      const key = process.env.DEEPSEEK_API_KEY;
      if (!key?.trim()) {
        return apiError(
          "Pro korekci názvů nastav DEEPSEEK_API_KEY. Webové ověření: volitelně PERPLEXITY_API_KEY nebo TAVILY_API_KEY, jinak se použije DuckDuckGo.",
          400,
        );
      }
      const corrected = await retryTransient(() =>
        correctTripLineDescriptionsDeepSeek(parsed.lines, {
          apiKey: key.trim(),
          model: process.env.DEEPSEEK_MODEL,
          baseUrl: process.env.DEEPSEEK_API_BASE,
          rawTranscript: text,
          userInstructions,
          useWebSearch: true,
          webSearch: searchWebForCorrection,
          idokladStyle: fixNamesIdokladStyle,
          styleReference,
        }),
      );
      parsed = {
        lines: corrected,
        sumBase:
          Math.round(
            corrected.reduce((s, t) => s + t.baseAmount, 0) * 100,
          ) / 100,
      };
    }

    return apiResponse({ rawTranscript: text, parsed, parseFormat });
  } catch (e) {
    if (e instanceof ValidationError) {
      return createValidationErrorResponse(e);
    }
    const message = aggregateErrorText(e);
    if (process.env.NODE_ENV === "development") {
      console.error("[api/process]", message);
    }
    if (isRetryableAiError(e)) {
      return apiError(
        "AI služba je dočasně přetížená nebo limitovaná (429/503). Zkus to za pár sekund.",
        429,
      );
    }
    return apiError(message, 500);
  }
}
