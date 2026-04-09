import { NextRequest, NextResponse } from "next/server";
import {
  transcribeHandwritingFromBuffer,
  hasDeepSeekVisionOcrCredentials,
} from "invoice-assistant";
import type { VisionProvider } from "invoice-assistant";
import { extractTextFromPdfBuffer } from "@/lib/extractPdfText";
import { loadServerEnv } from "@/lib/loadEnv";
import type { InvoiceHeader } from "@/lib/invoice";
import { extractInvoiceHeaderHintsFromText } from "@/lib/extractInvoiceHeaderHints";

loadServerEnv();

export const runtime = "nodejs";
export const maxDuration = 120;

function isImageMime(mime: string): boolean {
  return /^image\/(jpeg|png|webp|gif)$/i.test(mime.split(";")[0]?.trim() ?? "");
}

function isPdfFile(name: string, mime: string): boolean {
  if (/\.pdf$/i.test(name)) return true;
  const m = mime.split(";")[0]?.trim() ?? "";
  return m === "application/pdf";
}

function extractJsonObject(raw: string): unknown {
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start < 0 || end < start) {
    throw new Error("AI nevrátila validní JSON objekt.");
  }
  return JSON.parse(raw.slice(start, end + 1));
}

function cleanString(v: unknown, max = 300): string | undefined {
  if (typeof v !== "string") return undefined;
  const s = v.trim();
  if (!s) return undefined;
  return s.slice(0, max);
}

function normalizeHeaderInput(input: unknown): Partial<InvoiceHeader> {
  const x = input && typeof input === "object" ? (input as Record<string, unknown>) : {};
  return {
    supplierName: cleanString(x.supplierName),
    supplierIco: cleanString(x.supplierIco, 16)?.replace(/\s+/g, ""),
    supplierAddress: cleanString(x.supplierAddress, 600),
    supplierPaymentMethod: cleanString(x.supplierPaymentMethod, 120),
    supplierBankLabel: cleanString(x.supplierBankLabel, 200),
    supplierAccountNumber: cleanString(x.supplierAccountNumber, 80),
    supplierIban: cleanString(x.supplierIban, 80),
    supplierSwift: cleanString(x.supplierSwift, 40),
    customerName: cleanString(x.customerName),
    customerIco: cleanString(x.customerIco, 16)?.replace(/\s+/g, ""),
    customerDic: cleanString(x.customerDic, 40),
    customerAddress: cleanString(x.customerAddress, 600),
  };
}

function fallbackHeaderFromText(text: string): Partial<InvoiceHeader> {
  return extractInvoiceHeaderHintsFromText(text);
}

async function extractHeaderWithDeepSeek(text: string): Promise<Partial<InvoiceHeader>> {
  const apiKey = process.env.DEEPSEEK_API_KEY?.trim();
  if (!apiKey) throw new Error("Chybí DEEPSEEK_API_KEY.");
  const base = (process.env.DEEPSEEK_API_BASE ?? "https://api.deepseek.com")
    .replace(/\/$/, "");
  const model = process.env.DEEPSEEK_MODEL?.trim() || "deepseek-chat";
  const prompt = [
    "Z textu faktury vytáhni pouze hlavičku do JSON objektu.",
    "Vrať pouze JSON (bez markdownu) s klíči:",
    "supplierName,supplierIco,supplierAddress,supplierPaymentMethod,supplierBankLabel,supplierAccountNumber,supplierIban,supplierSwift,customerName,customerIco,customerDic,customerAddress",
    "Když hodnotu neznáš, vrať prázdný string.",
    "",
    "TEXT FAKTURY:",
    text.slice(0, 16000),
  ].join("\n");

  const res = await fetch(`${base}/chat/completions`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.1,
    }),
  });
  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
    error?: { message?: string };
  };
  if (!res.ok) {
    throw new Error(data.error?.message ?? `DeepSeek HTTP ${res.status}`);
  }
  const out = data.choices?.[0]?.message?.content ?? "";
  return normalizeHeaderInput(extractJsonObject(out));
}

export async function POST(req: NextRequest) {
  loadServerEnv();
  try {
    const formData = await req.formData();
    const raw = (formData.get("provider") as string) || "deepseek";
    if (raw !== "ollama" && raw !== "deepseek") {
      return NextResponse.json(
        { error: 'Parametr provider musí být "ollama" nebo "deepseek".' },
        { status: 400 },
      );
    }
    const provider = raw as VisionProvider;
    const file = formData.get("file");
    if (!(file instanceof File) || file.size <= 0) {
      return NextResponse.json({ error: "Nahraj vzorovou fakturu (PDF nebo obrázek)." }, { status: 400 });
    }

    const buf = Buffer.from(await file.arrayBuffer());
    const name = file.name || "";
    let text = "";
    if (isPdfFile(name, file.type)) {
      text = await extractTextFromPdfBuffer(buf);
      if (!text) {
        if (provider === "deepseek" && !hasDeepSeekVisionOcrCredentials()) {
          return NextResponse.json(
            {
              error:
                "Skenované PDF s DeepSeek: nastav DEEPSEEK_API_KEY pro vision OCR (api.deepseek.com).",
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
        text = await transcribeHandwritingFromBuffer({
          buffer: vBuf,
          mimeType: vMime,
          provider,
        });
      }
    } else if (isImageMime(file.type)) {
      text = await transcribeHandwritingFromBuffer({
        buffer: buf,
        mimeType: file.type,
        provider,
      });
    } else {
      return NextResponse.json(
        { error: "Podporované jsou PDF a obrázky (JPEG, PNG, WebP, GIF)." },
        { status: 400 },
      );
    }

    const header = await extractHeaderWithDeepSeek(text).catch(() =>
      fallbackHeaderFromText(text),
    );
    return NextResponse.json({ header, rawTranscript: text });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

