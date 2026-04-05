import { readFileSync } from "node:fs";
import { extname } from "node:path";

const MIME: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
};

const ALLOWED_MIMES = new Set(Object.values(MIME));

export function loadImageAsBase64(imagePath: string): { mimeType: string; base64: string } {
  const ext = extname(imagePath).toLowerCase();
  const mimeType = MIME[ext];
  if (!mimeType) {
    throw new Error(
      `Nepodporovaný formát obrázku: ${ext}. Použij .jpg, .png, .webp nebo .gif.`,
    );
  }
  const buf = readFileSync(imagePath);
  return { mimeType, base64: buf.toString("base64") };
}

/** Pro upload z webu (Buffer + MIME z multipart). Podporuje i `application/pdf` (Gemini). */
export function loadImageBufferAsBase64(
  buffer: Buffer,
  mimeType: string,
): { mimeType: string; base64: string } {
  const normalized = mimeType.split(";")[0]?.trim().toLowerCase() ?? mimeType;
  if (normalized === "application/pdf") {
    return { mimeType: "application/pdf", base64: buffer.toString("base64") };
  }
  if (!ALLOWED_MIMES.has(normalized)) {
    throw new Error(
      `Nepodporovaný MIME typ obrázku: ${mimeType}. Použij JPEG, PNG, WebP nebo GIF.`,
    );
  }
  return { mimeType: normalized, base64: buffer.toString("base64") };
}

export function isProbablyImagePath(filePath: string): boolean {
  return /\.(jpe?g|png|webp|gif)$/i.test(filePath);
}
