import { describe, expect, it } from "vitest";
import { parseTripText } from "./parseTripText.js";

describe("parseTripText", () => {
  it("parsuje sample podklad se dvěma trasami a součtem", () => {
    const raw = `24.3.2026
STŘELICE – TTS Měnín + ZEMAX Šitbořice + SIGNUM Hustopeče
31999 / 0,13 / 4 159,87

24.3.2026
STŘELICE – CROSS SPEED Branišovice + Benale Miroslav
34578 / 0,17 / 5 878,26
`;
    const { lines, sumBase } = parseTripText(raw);
    expect(lines).toHaveLength(2);
    expect(lines[0]).toMatchObject({
      dateIso: "2026-03-24",
      description:
        "STŘELICE – TTS Měnín + ZEMAX Šitbořice + SIGNUM Hustopeče",
      liters: 31999,
      rate: 0.13,
      baseAmount: 4159.87,
    });
    expect(lines[1]).toMatchObject({
      dateIso: "2026-03-24",
      liters: 34578,
      rate: 0.17,
      baseAmount: 5878.26,
    });
    expect(sumBase).toBeCloseTo(4159.87 + 5878.26, 2);
  });

  it("normalizuje CRLF a prázdné řádky", () => {
    const raw =
      "1. 1. 2025\r\nPopis\r\n100 / 1 / 100\r\n\r\n";
    const { lines, sumBase } = parseTripText(raw);
    expect(lines).toHaveLength(1);
    expect(lines[0].dateIso).toBe("2025-01-01");
    expect(lines[0].description).toBe("Popis");
    expect(sumBase).toBe(100);
  });

  it("vyhodí při číslech bez popisu", () => {
    expect(() =>
      parseTripText(`1. 1. 2025
10 / 1 / 10`),
    ).toThrow(/popis/);
  });
});
