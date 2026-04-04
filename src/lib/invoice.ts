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
  supplierAddress: string;
  customerName: string;
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
  customerName: "",
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
