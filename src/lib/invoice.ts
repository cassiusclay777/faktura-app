import type { TripLine } from "invoice-assistant";

export const DEFAULT_VAT_PERCENT = 21;

export type EditableInvoiceLine = {
  id: string;
  /** Zobrazení na faktuře */
  description: string;
  liters: number;
  rate: number;
  baseAmount: number;
  dateIso: string;
};

export type InvoiceHeader = {
  supplierName: string;
  supplierIco: string;
  /** Sídlo dodavatele */
  supplierAddress: string;
  /** např. Převodem */
  supplierPaymentMethod: string;
  /** Popisek typu „Hlavní bankovní spojení“ */
  supplierBankLabel: string;
  /** Číslo účtu (např. 123456/0600) */
  supplierAccountNumber: string;
  supplierIban: string;
  supplierSwift: string;
  /** Název odběratele */
  customerName: string;
  customerIco: string;
  customerDic: string;
  customerReliableVatPayer: boolean;
  /** Sídlo odběratele */
  customerAddress: string;
  issueDate: string;
  dueDate: string;
  variableSymbol: string;
  note: string;
};

export const emptyHeader = (): InvoiceHeader => ({
  supplierName: "",
  supplierIco: "",
  supplierAddress: "",
  supplierPaymentMethod: "Převodem",
  supplierBankLabel: "",
  supplierAccountNumber: "",
  supplierIban: "",
  supplierSwift: "",
  customerName: "",
  customerIco: "",
  customerDic: "",
  customerReliableVatPayer: false,
  customerAddress: "",
  issueDate: new Date().toISOString().slice(0, 10),
  dueDate: "",
  variableSymbol: "",
  note: "",
});

export function tripLinesToEditable(lines: TripLine[]): EditableInvoiceLine[] {
  return lines.map((t, i) => ({
    id: `line-${i}-${t.dateIso}`,
    dateIso: t.dateIso,
    description: t.description,
    liters: t.liters,
    rate: t.rate,
    baseAmount: t.baseAmount,
  }));
}

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Při úpravě řádku držíme základ (Kč) jako zdroj pravdy pro součty a DPH:
 * změna l → dopočet Kč/l; změna Kč/l → dopočet l; změna základu → dopočet sazby nebo l.
 */
export function patchLineKeepingBaseFromLiters(
  line: EditableInvoiceLine,
  liters: number,
): Partial<EditableInvoiceLine> {
  if (!Number.isFinite(liters)) return {};
  const L = liters;
  if (L > 0 && Number.isFinite(line.baseAmount) && line.baseAmount !== 0) {
    return { liters: L, rate: round2(line.baseAmount / L) };
  }
  return { liters: L };
}

export function patchLineKeepingBaseFromRate(
  line: EditableInvoiceLine,
  rate: number,
): Partial<EditableInvoiceLine> {
  if (!Number.isFinite(rate)) return {};
  const R = rate;
  if (R > 0 && Number.isFinite(line.baseAmount) && line.baseAmount !== 0) {
    return { rate: R, liters: round2(line.baseAmount / R) };
  }
  return { rate: R };
}

export function patchLineMoneyPrimary(
  line: EditableInvoiceLine,
  baseAmount: number,
): Partial<EditableInvoiceLine> {
  if (!Number.isFinite(baseAmount)) return {};
  const B = baseAmount;
  if (line.liters > 0) {
    return { baseAmount: B, rate: round2(B / line.liters) };
  }
  if (line.rate > 0) {
    return { baseAmount: B, liters: round2(B / line.rate) };
  }
  return { baseAmount: B };
}

export function lineVatAmount(base: number, vatPercent: number): number {
  return round2((base * vatPercent) / 100);
}

export function formatMoneyCz(n: number): string {
  return new Intl.NumberFormat("cs-CZ", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

export function formatDateCz(isoDate: string): string {
  if (typeof isoDate !== "string" || !isoDate.trim()) {
    return "—";
  }
  const [y, m, d] = isoDate.split("-").map(Number);
  if (!y || !m || !d) return isoDate;
  return `${d}. ${m}. ${y}`;
}

export function totalsFromLines(
  lines: EditableInvoiceLine[],
  vatPercent: number,
): {
  baseTotal: number;
  vatTotal: number;
  withVatTotal: number;
} {
  const baseTotal = round2(
    lines.reduce((s, l) => s + l.baseAmount, 0),
  );
  const vatTotal = lineVatAmount(baseTotal, vatPercent);
  const withVatTotal = round2(baseTotal + vatTotal);
  return { baseTotal, vatTotal, withVatTotal };
}
