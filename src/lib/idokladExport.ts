import type { EditableInvoiceLine, InvoiceHeader } from "./invoice";
import {
  formatDateCz,
  formatMoneyCz,
  lineVatAmount,
  totalsFromLines,
} from "./invoice";

/** Oficiální stránka pro novou vydanou fakturu (přihlášený uživatel). */
export const IDOKLAD_ISSUED_INVOICE_CREATE_URL =
  "https://app.idoklad.cz/IssuedInvoice/Create";

/**
 * Čitelný text pro schránku – iDoklad webové UI neumožňuje předvyplnění z externí aplikace;
 * uživatel údaje přenese ručně nebo později přes REST API (OAuth).
 */
export function buildIdokladExportText(
  header: InvoiceHeader,
  lines: EditableInvoiceLine[],
  vatPercent: number,
): string {
  const linesOut: string[] = [];
  linesOut.push(
    "=== Faktura z podkladu → iDoklad (zkopírováno ze schránky) ===",
    "",
  );

  linesOut.push("— Dodavatel —");
  if (header.supplierName) linesOut.push(header.supplierName);
  if (header.supplierIco) linesOut.push(`IČ: ${header.supplierIco}`);
  if (header.supplierAddress) {
    linesOut.push(`Sídlo: ${header.supplierAddress.replace(/\n/g, ", ")}`);
  }
  const pay: string[] = [];
  if (header.supplierPaymentMethod) pay.push(`Způsob úhrady: ${header.supplierPaymentMethod}`);
  if (header.supplierBankLabel) pay.push(`Bankovní účet: ${header.supplierBankLabel}`);
  if (header.supplierAccountNumber) pay.push(`Číslo účtu: ${header.supplierAccountNumber}`);
  if (header.supplierIban) pay.push(`IBAN: ${header.supplierIban}`);
  if (header.supplierSwift) pay.push(`SWIFT: ${header.supplierSwift}`);
  if (pay.length) {
    linesOut.push("", "Platební údaje:", ...pay.map((p) => `  ${p}`));
  }
  linesOut.push("");

  linesOut.push("— Odběratel —");
  if (header.customerName) linesOut.push(header.customerName);
  if (header.customerIco) linesOut.push(`IČ: ${header.customerIco}`);
  if (header.customerDic) linesOut.push(`DIČ: ${header.customerDic}`);
  if (header.customerReliableVatPayer) linesOut.push("Spolehlivý plátce DPH");
  if (header.customerAddress) {
    linesOut.push(`Sídlo: ${header.customerAddress.replace(/\n/g, ", ")}`);
  }
  linesOut.push("");

  linesOut.push("— Údaje dokladu —");
  linesOut.push(`Datum vystavení: ${formatDateCz(header.issueDate)}`);
  if (header.dueDate) {
    linesOut.push(`Datum splatnosti: ${formatDateCz(header.dueDate)}`);
  }
  if (header.variableSymbol) {
    linesOut.push(`Variabilní symbol: ${header.variableSymbol}`);
  }
  if (header.note) linesOut.push(`Poznámka: ${header.note}`);
  linesOut.push("");

  linesOut.push(`— Položky (DPH ${vatPercent} %) —`);
  const { baseTotal, vatTotal, withVatTotal } = totalsFromLines(
    lines,
    vatPercent,
  );
  lines.forEach((line, i) => {
    const vat = lineVatAmount(line.baseAmount, vatPercent);
    linesOut.push(
      `${i + 1}. ${formatDateCz(line.dateIso)} | ${line.description.replace(/\n/g, " ")}`,
    );
    linesOut.push(
      `   ${formatMoneyCz(line.liters)} l × ${formatMoneyCz(line.rate)} Kč/l → základ ${formatMoneyCz(line.baseAmount)} Kč, DPH ${formatMoneyCz(vat)} Kč`,
    );
  });
  linesOut.push("");

  linesOut.push("— Součty —");
  linesOut.push(`Základ celkem: ${formatMoneyCz(baseTotal)} Kč`);
  linesOut.push(`DPH ${vatPercent} %: ${formatMoneyCz(vatTotal)} Kč`);
  linesOut.push(`Celkem s DPH: ${formatMoneyCz(withVatTotal)} Kč`);

  return linesOut.join("\n");
}
