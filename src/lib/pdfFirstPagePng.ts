import { createCanvas } from "@napi-rs/canvas";

/**
 * První stránka PDF jako PNG (pro OCR u providerů bez nativní podpory skenovaného PDF).
 */
export async function renderPdfFirstPageToPngBuffer(
  pdfBuffer: Buffer,
): Promise<Buffer> {
  const data = new Uint8Array(pdfBuffer);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- pdfjs-dist typy vs. ESM legacy build
  const pdfjs: any = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const loadingTask = pdfjs.getDocument({
    data,
    disableWorker: true,
    isEvalSupported: false,
  });
  const pdf = await loadingTask.promise;
  const page = await pdf.getPage(1);
  /** Nižší rozlišení = rychlejší OCR; max ~1600 px delší strany při scale 2. */
  const baseScale = 2;
  const vp1 = page.getViewport({ scale: 1 });
  const maxPx = 1600;
  const scale = Math.min(
    baseScale,
    maxPx / Math.max(vp1.width, vp1.height),
  );
  const viewport = page.getViewport({ scale });
  const w = Math.max(1, Math.floor(viewport.width));
  const h = Math.max(1, Math.floor(viewport.height));
  const canvas = createCanvas(w, h);
  const ctx = canvas.getContext("2d");

  const renderTask = page.render({
    canvasContext: ctx as unknown as CanvasRenderingContext2D,
    viewport,
  });
  await renderTask.promise;

  return canvas.toBuffer("image/png");
}
