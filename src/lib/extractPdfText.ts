import pdfParse from "pdf-parse";

/**
 * Extrahuje text z textové vrstvy PDF. U čistého skenu vrátí prázdný řetězec (bez výjimky).
 */
export async function extractTextFromPdfBuffer(buffer: Buffer): Promise<string> {
  const data = await pdfParse(buffer);
  return (data?.text ?? "").trim();
}
