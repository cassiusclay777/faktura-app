import { NextRequest, NextResponse } from "next/server";
import {
  parseTripText,
  transcribeHandwritingFromBuffer,
  correctTripLineDescriptions,
  correctTripLineDescriptionsDeepSeek,
  hasDeepSeekVisionOcrCredentials,
} from "invoice-assistant";
import type { VisionProvider } from "invoice-assistant";
import { extractTextFromPdfBuffer } from "@/lib/extractPdfText";
import { loadServerEnv } from "@/lib/loadEnv";
import {
  hasDeepSeekWebSearchCredentials,
  searchWebForCorrection,
} from "@/lib/webSearch";

loadServerEnv();

export const runtime = "nodejs";
export const maxDuration = 120;

const RETRY_DELAYS_MS = [700, 1500];

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryableGeminiError(e: unknown): boolean {
  const message = e instanceof Error ? e.message : String(e);
  const normalized = message.toLowerCase();
  return (
    normalized.includes("429") ||
    normalized.includes("retry in") ||
    normalized.includes("rate limit") ||
    normalized.includes("too many requests") ||
    normalized.includes("503") ||
    normalized.includes("service unavailable") ||
    normalized.includes("high demand") ||
    (normalized.includes("vision ocr") &&
      (normalized.includes("429") ||
        normalized.includes("502") ||
        normalized.includes("503")))
  );
}

function isGeminiQuotaExceededError(e: unknown): boolean {
  const message = e instanceof Error ? e.message : String(e);
  const normalized = message.toLowerCase();
  return (
    normalized.includes("quota exceeded") ||
    normalized.includes("free_tier_requests") ||
    normalized.includes("perday") ||
    (normalized.includes("429") && normalized.includes("billing"))
  );
}

async function retryGemini<T>(fn: () => Promise<T>): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt += 1) {
    try {
      return await fn();
    } catch (e) {
      lastError = e;
      if (!isRetryableGeminiError(e) || attempt === RETRY_DELAYS_MS.length) {
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
  try {
    const formData = await req.formData();
    const rawTextField = formData.get("rawText");
    const file = formData.get("file");
    const rawVisionProvider = (formData.get("provider") as string) || "gemini";
    if (
      rawVisionProvider !== "gemini" &&
      rawVisionProvider !== "ollama" &&
      rawVisionProvider !== "deepseek"
    ) {
      return NextResponse.json(
        { error: 'Parametr provider musí být "gemini", "ollama" nebo "deepseek".' },
        { status: 400 },
      );
    }
    const provider = rawVisionProvider;
    const fixNames = formData.get("fixNames") === "true";
    const fixNamesWeb = formData.get("fixNamesWeb") === "true";
    const fixNamesProvider =
      (formData.get("fixNamesProvider") as string) || "gemini";
    const userInstructions = formData.get("userInstructions")?.toString() || undefined;
    const fixNamesIdokladStyle = formData.get("fixNamesIdokladStyle") !== "false";
    const styleReferenceRaw = formData.get("styleReference")?.toString() ?? "";
    const styleReference = styleReferenceRaw.trim()
      ? styleReferenceRaw.trim().slice(0, 8000)
      : undefined;

    let text: string;

    if (file instanceof File && file.size > 0) {
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
          const vision = provider as VisionProvider;
          if (provider === "deepseek" && !hasDeepSeekVisionOcrCredentials()) {
            return NextResponse.json(
              {
                error:
                  "Skenované PDF s volbou DeepSeek vyžaduje OpenAI-kompatibilní vision API: nastav DEEPSEEK_VISION_API_BASE a OPENROUTER_API_KEY (nebo OPENAI_API_KEY / DEEPSEEK_VISION_API_KEY). Nebo u „Přepis z fotky“ zvol Gemini.",
              },
              { status: 400 },
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

          text =
            provider === "gemini" || provider === "deepseek"
              ? await retryGemini(() =>
                  transcribeHandwritingFromBuffer({
                    buffer: vBuf,
                    mimeType: vMime,
                    provider: vision,
                  }),
                )
              : await transcribeHandwritingFromBuffer({
                  buffer: vBuf,
                  mimeType: vMime,
                  provider: vision,
                });
        }
      } else if (isImageMime(file.type)) {
        const vision = provider as VisionProvider;
        text =
          provider === "gemini" || provider === "deepseek"
            ? await retryGemini(() =>
                transcribeHandwritingFromBuffer({
                  buffer: buf,
                  mimeType: file.type,
                  provider: vision,
                }),
              )
            : await transcribeHandwritingFromBuffer({
                buffer: buf,
                mimeType: file.type,
                provider: vision,
              });
      } else {
        return NextResponse.json(
          {
            error:
              "Podporované jsou .txt, PDF, nebo obrázek (JPEG, PNG, WebP, GIF).",
          },
          { status: 400 },
        );
      }
    } else if (typeof rawTextField === "string" && rawTextField.trim()) {
      text = rawTextField;
    } else {
      return NextResponse.json(
        { error: "Vlož text podkladu nebo nahraj soubor." },
        { status: 400 },
      );
    }

    let parsed = parseTripText(text);

    if (fixNames) {
      /** DeepSeek nemá Google Search; web_search přes Perplexity nebo Tavily na serveru. */
      const deepSeekWebEnabled =
        fixNamesWeb &&
        fixNamesProvider === "deepseek" &&
        hasDeepSeekWebSearchCredentials();

      if (fixNamesWeb && fixNamesProvider === "deepseek" && !hasDeepSeekWebSearchCredentials()) {
        return NextResponse.json(
          {
            error:
              "Pro vyhledávání na webu při korekci DeepSeek nastav PERPLEXITY_API_KEY nebo TAVILY_API_KEY v .env (viz .env.example). Volitelně DEEPSEEK_WEB_SEARCH_PROVIDER=perplexity|tavily. Korekce přes Gemini používá Google Search.",
          },
          { status: 400 },
        );
      }

      let corrected;
      if (fixNamesProvider === "deepseek") {
        const key = process.env.DEEPSEEK_API_KEY;
        if (!key?.trim()) {
          return NextResponse.json(
            {
              error:
                "Pro korekci přes DeepSeek nastav DEEPSEEK_API_KEY v .env (viz .env.example).",
            },
            { status: 400 },
          );
        }
        corrected = await correctTripLineDescriptionsDeepSeek(parsed.lines, {
          apiKey: key,
          model: process.env.DEEPSEEK_MODEL,
          baseUrl: process.env.DEEPSEEK_API_BASE,
          rawTranscript: text,
          userInstructions,
          useWebSearch: deepSeekWebEnabled,
          webSearch: deepSeekWebEnabled ? searchWebForCorrection : undefined,
          idokladStyle: fixNamesIdokladStyle,
          styleReference,
        });
      } else {
        const key = process.env.GEMINI_API_KEY;
        if (!key?.trim()) {
          return NextResponse.json(
            {
              error:
                "Pro korekci názvů nastav GEMINI_API_KEY v .env (viz .env.example).",
            },
            { status: 400 },
          );
        }
        corrected = await retryGemini(() =>
          correctTripLineDescriptions(parsed.lines, {
            apiKey: key,
            model: process.env.GEMINI_MODEL,
            useWebSearch: fixNamesWeb,
            rawTranscript: text,
            userInstructions,
            idokladStyle: fixNamesIdokladStyle,
            styleReference,
          }),
        );
      }
      parsed = {
        lines: corrected,
        sumBase:
          Math.round(
            corrected.reduce((s, t) => s + t.baseAmount, 0) * 100,
          ) / 100,
      };
    }

    return NextResponse.json({ rawTranscript: text, parsed });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    if (isGeminiQuotaExceededError(e)) {
      return NextResponse.json(
        {
          error:
            "Gemini narazilo na denní kvótu (429). Přepni provider korekce na DeepSeek, nebo počkej na obnovu limitu.",
        },
        { status: 429 },
      );
    }
    if (isRetryableGeminiError(e)) {
      return NextResponse.json(
        {
          error:
            "Gemini je dočasně přetížené nebo limitované (429/503). Zkus to za pár sekund, případně přepni korekci na DeepSeek.",
        },
        { status: 429 },
      );
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
