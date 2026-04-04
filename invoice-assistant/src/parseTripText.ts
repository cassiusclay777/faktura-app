import type { ParsedPodklad, TripLine } from "./types.js";

const DATE_LINE =
  /^(\d{1,2})\.\s*(\d{1,2})\.\s*(\d{4})\s*$/u;
/** Řádek s litry / sazba / částka — např. 31999 / 0,13 / 4 159,87 nebo 34687/0,21/7284,27 */
const NUMBER_ROW =
  /^(\d[\d\s]*)\s*\/\s*([\d,\.]+)\s*\/\s*([\d\s,\.]+)\s*$/u;

function parseCzNumber(raw: string): number {
  const s = raw.replace(/\s/g, "").replace(/\./g, "").replace(",", ".");
  const n = Number(s);
  if (Number.isNaN(n)) throw new Error(`Neplatné číslo: "${raw}"`);
  return n;
}

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

function toIso(d: number, m: number, y: number): string {
  return `${y}-${pad2(m)}-${pad2(d)}`;
}

/**
 * Parsuje ručně psaný / přepsaný podklad: blok podle data, pak řádky popisu, pak řádek čísel.
 */
export function parseTripText(raw: string): ParsedPodklad {
  const normalized = raw.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const lines = normalized.split("\n").map((l) => l.trim());

  const trips: TripLine[] = [];
  let i = 0;
  let currentDateIso: string | null = null;
  const descBuf: string[] = [];

  const flushDescription = () => {
    descBuf.length = 0;
  };

  while (i < lines.length) {
    const line = lines[i];
    if (!line) {
      i++;
      continue;
    }

    const dm = line.match(DATE_LINE);
    if (dm) {
      currentDateIso = toIso(
        parseInt(dm[1], 10),
        parseInt(dm[2], 10),
        parseInt(dm[3], 10),
      );
      flushDescription();
      i++;
      continue;
    }

    const nm = line.match(NUMBER_ROW);
    if (nm && currentDateIso) {
      const liters = parseCzNumber(nm[1]);
      const rate = parseCzNumber(nm[2]);
      const baseAmount = parseCzNumber(nm[3]);
      const description = descBuf.join(" ").replace(/\s+/g, " ").trim();
      if (!description) {
        throw new Error(
          `Řádek ${i + 1}: jsou čísla, ale chybí popis trasy nad nimi.`,
        );
      }
      trips.push({
        dateIso: currentDateIso,
        description,
        liters,
        rate,
        baseAmount,
      });
      flushDescription();
      i++;
      continue;
    }

    if (currentDateIso) {
      descBuf.push(line);
    }
    i++;
  }

  const sumBase = Math.round(
    trips.reduce((s, t) => s + t.baseAmount, 0) * 100,
  ) / 100;

  return { lines: trips, sumBase };
}
