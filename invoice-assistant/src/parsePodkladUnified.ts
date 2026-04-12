import type { ParsedPodklad } from "./types.js";
import { parseTripText } from "./parseTripText.js";
import { parseIdokladLikeInvoiceText } from "./parseIdokladLoose.js";

export type PodkladParseFormat = "trip" | "invoice_loose" | "empty";

export type ParsePodkladUnifiedResult = {
  parsed: ParsedPodklad;
  format: PodkladParseFormat;
};

/**
 * Nejdřív klasický ruční podklad (datum / litry / sazba / základ),
 * při 0 řádcích zkusíme tabulkovou fakturu (iDoklad PDF).
 */
export function parsePodkladUnified(raw: string): ParsePodkladUnifiedResult {
  const trip = parseTripText(raw);
  if (trip.lines.length > 0) {
    return { parsed: trip, format: "trip" };
  }

  const loose = parseIdokladLikeInvoiceText(raw);
  if (loose.lines.length > 0) {
    return { parsed: loose, format: "invoice_loose" };
  }

  return { parsed: trip, format: "empty" };
}
