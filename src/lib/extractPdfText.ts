import pdfParse from "pdf-parse";

/**
 * Extrahuje souvislý text z PDF (vyžaduje textovou vrstvu; u čistého skenu vrátí prázdný výsledek).
 */
export async function extractTextFromPdfBuffer(buffer: Buffer): Promise<string> {
  const data = await pdfParse(buffer);
  const text = (data?.text ?? "").trim();
  if (!text) {
    throw new Error(
      "Z PDF se nepodařilo přečíst text. U skenů bez textové vrstvy zkus nahrát obrázek nebo .txt.",
    );
  }
  return text;
}
