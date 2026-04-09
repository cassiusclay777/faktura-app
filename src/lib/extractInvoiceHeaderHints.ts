import type { InvoiceHeader } from "@/lib/invoice";

/** Stejné heuristiky jako fallback v `template-header` route. */
export function extractInvoiceHeaderHintsFromText(
  text: string,
): Partial<Pick<InvoiceHeader, "supplierIco" | "customerIco" | "customerDic">> {
  const icoMatches = [
    ...text.matchAll(/\bIČ(?:O)?\s*[:.]?\s*(\d{8})\b/gi),
  ].map((m) => m[1]);
  const dicMatches = [
    ...text.matchAll(/\bDIČ\s*[:.]?\s*([A-Z]{2}\s*\d{8,12})\b/gi),
  ].map((m) => m[1].replace(/\s+/g, ""));
  const out: Partial<
    Pick<InvoiceHeader, "supplierIco" | "customerIco" | "customerDic">
  > = {};
  if (icoMatches[0]) out.supplierIco = icoMatches[0];
  if (icoMatches[1]) out.customerIco = icoMatches[1];
  const dic = dicMatches[1] ?? dicMatches[0];
  if (dic) out.customerDic = dic;
  return out;
}
