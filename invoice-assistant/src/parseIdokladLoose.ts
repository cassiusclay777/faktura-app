import type { ParsedPodklad, TripLine } from "./types.js";

const DATE_HEAD =
  /^(\d{1,2})\.(\d{1,2})\.(\d{4})\s*(.*)$/u;
/**
 * Částky v české notaci (tisíce mezerou + ,xx; malé 1,00 / 0,17).
 */
const CZ_MONEY =
  /-?(?:\d{1,3}(?:\s\d{3})+,\d{2}|\d{1,2},\d{2})/g;

/** Sloupec DPH % (21) bez čárky se jinak sleje s „5 878,26“ při tokenizaci. */
function preprocessVatPercentBeforeAmount(line: string): string {
  return line.replace(
    /\b(21|15|10|12)\s+(\d{1}\s\d{3},\d{2})/g,
    "$1‖$2",
  );
}

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

function toIso(d: number, m: number, y: number): string {
  return `${y}-${pad2(m)}-${pad2(d)}`;
}

function parseCzNumber(raw: string): number {
  const s = raw.replace(/\s/g, "").replace(/\./g, "").replace(",", ".");
  const n = Number(s);
  if (Number.isNaN(n)) throw new Error(`Neplatné číslo: "${raw}"`);
  return n;
}

export function extractMoneyTokens(line: string): string[] {
  const pre = preprocessVatPercentBeforeAmount(line);
  const out: string[] = [];
  let m: RegExpExecArray | null;
  const re = new RegExp(CZ_MONEY.source, "g");
  while ((m = re.exec(pre)) !== null) {
    out.push(m[0].replace(/\s/g, ""));
  }
  return out;
}

type TextRow = { dateIso: string; text: string };

/** Pro testy / ladění: jen rozdělení řádků tabulky (bez výpočtu částek). */
export function collectIdokladTableRows(raw: string): TextRow[] {
  const normalized = raw.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const lines = normalized.split("\n").map((l) => l.trim());

  const rows: TextRow[] = [];
  let lastDateIso: string | null = null;

  for (const line of lines) {
    if (!line) continue;

    const dm = line.match(DATE_HEAD);
    if (dm) {
      const d = parseInt(dm[1], 10);
      const m = parseInt(dm[2], 10);
      const y = parseInt(dm[3], 10);
      lastDateIso = toIso(d, m, y);
      const rest = dm[4].trim();
      if (rest.length > 0) {
        rows.push({ dateIso: lastDateIso, text: rest });
      }
      continue;
    }

    if (!lastDateIso) continue;

    const moneyCount = extractMoneyTokens(line).length;

    if (moneyCount >= 3) {
      const last = rows[rows.length - 1];
      const lastMoney = last ? extractMoneyTokens(last.text).length : 0;
      if (last && lastMoney < 3) {
        last.text += ` ${line.trim()}`;
      } else {
        rows.push({ dateIso: lastDateIso, text: line.trim() });
      }
      continue;
    }

    if (line.trim()) {
      if (rows.length === 0) {
        rows.push({ dateIso: lastDateIso, text: line.trim() });
      } else {
        rows[rows.length - 1]!.text += ` ${line.trim()}`;
      }
    }
  }

  return rows;
}

/**
 * Best-effort parsování textové vrstvy z faktury (iDoklad a podobné tabulky).
 * Řádek začínající datem začíná položku; pokračování bez data přilepíme k textu,
 * dokud nepřijde další řádek s dostatečným počtem částek (nová položka se stejným datem).
 */
export function parseIdokladLikeInvoiceText(raw: string): ParsedPodklad {
  const rows = collectIdokladTableRows(raw);

  const trips: TripLine[] = [];

  for (const row of rows) {
    const tokens = extractMoneyTokens(row.text);
    if (tokens.length < 3) continue;

    const nums = tokens.map((t) => parseCzNumber(t));
    const base = nums[nums.length - 3]!;
    const vat = nums[nums.length - 2]!;
    const total = nums[nums.length - 1]!;

    if (Math.abs(base) < 0.005 && Math.abs(total) < 0.005) continue;

    const sumCheck = Math.abs(total - base - vat);
    if (sumCheck > Math.max(3, Math.abs(total) * 0.05)) {
      continue;
    }

    const preForDesc = preprocessVatPercentBeforeAmount(row.text);
    let desc = row.text;
    const firstNum = preForDesc.search(new RegExp(CZ_MONEY.source));
    if (firstNum > 0) {
      desc = preForDesc
        .slice(0, firstNum)
        .replace(/‖/g, "")
        .trim();
    } else {
      desc = preForDesc
        .replace(new RegExp(CZ_MONEY.source, "g"), " ")
        .replace(/‖/g, "")
        .replace(/\s+/g, " ")
        .trim();
    }

    if (desc.length < 3) continue;

    const liters = 1;
    const rate = Math.abs(base) > 0.005 ? base : total;
    trips.push({
      dateIso: row.dateIso,
      description: desc,
      liters,
      rate,
      baseAmount: Math.abs(base) > 0.005 ? base : total,
    });
  }

  const sumBase =
    Math.round(trips.reduce((s, t) => s + t.baseAmount, 0) * 100) / 100;

  return { lines: trips, sumBase };
}
