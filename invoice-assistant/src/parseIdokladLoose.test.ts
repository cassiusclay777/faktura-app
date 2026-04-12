import { describe, expect, it } from "vitest";
import {
  collectIdokladTableRows,
  extractMoneyTokens,
  parseIdokladLikeInvoiceText,
} from "./parseIdokladLoose.js";

const SAMPLE = `
24.3.2026 STŘELICE – TTS MĚNÍN (Top Trailer        1,00 0,17      4 159,87  21           5 878,26              1 234,43   7 112,69
Servis s.r.o.) + ZEMAX ŠITBOŘICE, a.s. + SIGNUM,   1,00 0,17                             5 876,22              1 234,01   7 110,23
25.3.2026 OKNA 34566 lt.  1,00 0,13      100,00  21           50,00              10,50   60,50
`;

describe("parseIdokladLikeInvoiceText", () => {
  it("parsuje řádky s datem a částkami (iDoklad)", () => {
    const split = collectIdokladTableRows(SAMPLE);
    expect(split.length).toBeGreaterThanOrEqual(2);
    expect(extractMoneyTokens(split[0].text).length).toBeGreaterThanOrEqual(6);

    const r = parseIdokladLikeInvoiceText(SAMPLE);
    const bases = r.lines.map((l) => l.baseAmount);
    expect(bases.some((b) => Math.abs(b - 5878.26) < 0.05)).toBe(true);
    expect(bases.some((b) => Math.abs(b - 5876.22) < 0.05)).toBe(true);
  });
});
