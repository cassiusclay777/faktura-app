import { NextRequest, NextResponse } from "next/server";
import {
  parseTripText,
  transcribeHandwritingFromBuffer,
  correctTripLineDescriptions,
  correctTripLineDescriptionsDeepSeek,
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
    const provider = (formData.get("provider") as string) || "gemini";
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
          text = await transcribeHandwritingFromBuffer({
            buffer: buf,
            mimeType: "application/pdf",
            provider: provider as VisionProvider,
          });
        }
      } else if (isImageMime(file.type)) {
        text = await transcribeHandwritingFromBuffer({
          buffer: buf,
          mimeType: file.type,
          provider: provider as VisionProvider,
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
        corrected = await correctTripLineDescriptions(parsed.lines, {
          apiKey: key,
          model: process.env.GEMINI_MODEL,
          useWebSearch: fixNamesWeb,
          rawTranscript: text,
          userInstructions,
          idokladStyle: fixNamesIdokladStyle,
          styleReference,
        });
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
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
