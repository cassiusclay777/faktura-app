import type { InvoiceHeader, EditableInvoiceLine } from "./invoice";
import { formatDateCz, formatMoneyCz, totalsFromLines, DEFAULT_VAT_PERCENT } from "./invoice";

// Typy pro pdfmake (runtime typy z @pdfmake/pdfmake)
type Content = Record<string, unknown>;
type TDocumentDefinitions = Record<string, unknown>;
type TFont = { normal?: string; bold?: string; italics?: string; bolditalics?: string };

// Definice fontů (předány z browseru/serveru)
let pdfFonts: Record<string, TFont> | null = null;

export function setPdfFonts(fonts: Record<string, TFont>) {
  pdfFonts = fonts;
}

export function getPdfFonts(): Record<string, TFont> | undefined {
  return pdfFonts ?? undefined;
}

/**
 * Vytvoří PDF definici faktury pro pdfmake.
 */
export function buildInvoicePdfDefinition(
  header: InvoiceHeader,
  lines: EditableInvoiceLine[],
  vatPercent: number = DEFAULT_VAT_PERCENT,
): TDocumentDefinitions {
  const totals = totalsFromLines(lines, vatPercent);

  // Logo nebo název firmy dodavatele
  const headerContent: Content[] = [
    // Nadpis faktury
    {
      columns: [
        {
          stack: [
            { text: header.note || "FAKTURA – daňový doklad", style: "title" },
          ],
          width: "*",
        },
        {
          stack: [
            { text: `VS: ${header.variableSymbol || "—"}`, style: "info" },
            { text: `vystaveno: ${formatDateCz(header.issueDate)}`, style: "info" },
            { text: `splatnost: ${header.dueDate ? formatDateCz(header.dueDate) : "—"}`, style: "info" },
          ],
          width: "auto",
          alignment: "right",
        },
      ],
      margin: [0, 0, 0, 20],
    },
  ];

  // Dodavatel a odběratel
  const partiesContent: Content[] = [
    {
      columns: [
        {
          stack: [
            { text: "DODAVATEL", style: "sectionLabel" },
            { text: header.supplierName || "—", style: "partyName" },
            header.supplierIco ? { text: `IČ: ${header.supplierIco}`, style: "partyDetail" } : {},
            header.supplierAddress ? { text: header.supplierAddress, style: "partyDetail" } : {},
          ],
          width: "*",
        },
        {
          stack: [
            { text: "ODBĚRATEL", style: "sectionLabel" },
            { text: header.customerName || "—", style: "partyName" },
            header.customerIco ? { text: `IČ: ${header.customerIco}`, style: "partyDetail" } : {},
            header.customerDic ? { text: `DIČ: ${header.customerDic}`, style: "partyDetail" } : {},
            header.customerReliableVatPayer ? { text: "Spolehlivý plátce DPH", style: "partyDetail" } : {},
            header.customerAddress ? { text: header.customerAddress, style: "partyDetail" } : {},
          ],
          width: "*",
        },
      ],
      margin: [0, 0, 0, 20],
    },
  ];

  // Platební údaje dodavatele
  const paymentContent: Content[] = [];
  if (header.supplierPaymentMethod || header.supplierBankLabel || header.supplierAccountNumber || header.supplierIban || header.supplierSwift) {
    paymentContent.push({ text: "PLATEBNÍ ÚDAJE", style: "sectionLabel", margin: [0, 10, 0, 5] });
    
    const payments: Content[] = [];
    if (header.supplierPaymentMethod) {
      payments.push({ text: `Způsob úhrady: ${header.supplierPaymentMethod}`, style: "partyDetail" });
    }
    if (header.supplierBankLabel) {
      payments.push({ text: `Bankovní účet: ${header.supplierBankLabel}`, style: "partyDetail" });
    }
    if (header.supplierAccountNumber) {
      payments.push({ text: `Číslo účtu: ${header.supplierAccountNumber}`, style: "partyDetail" });
    }
    if (header.supplierIban) {
      payments.push({ text: `IBAN: ${header.supplierIban}`, style: "partyDetailMono" });
    }
    if (header.supplierSwift) {
      payments.push({ text: `SWIFT: ${header.supplierSwift}`, style: "partyDetailMono" });
    }
    paymentContent.push({ stack: payments, margin: [0, 0, 0, 15] });
  }

  // Tabulka řádků
  const tableBody: Content[][] = [
    // Hlavička tabulky
    [
      { text: "Datum", style: "tableHeader" },
      { text: "Popis", style: "tableHeader" },
      { text: "Množství", style: "tableHeader", alignment: "right" },
      { text: "J. cena", style: "tableHeader", alignment: "right" },
      { text: "Základ", style: "tableHeader", alignment: "right" },
    ],
  ];

  // Řádky faktury
  for (const line of lines) {
    tableBody.push([
      { text: formatDateCz(line.dateIso), style: "tableCell" },
      { text: line.description, style: "tableCell" },
      { text: `${line.liters} l`, style: "tableCell", alignment: "right" },
      { text: formatMoneyCz(line.rate), style: "tableCell", alignment: "right" },
      { text: formatMoneyCz(line.baseAmount), style: "tableCell", alignment: "right" },
    ]);
  }

  const tableContent: Content[] = [
    {
      table: {
        headerRows: 1,
        widths: ["auto", "*", "auto", "auto", "auto"],
        body: tableBody,
      },
      layout: {
        hLineWidth: () => 0.5,
        vLineWidth: () => 0.5,
        hLineColor: () => "#cccccc",
        vLineColor: () => "#cccccc",
        paddingLeft: () => 4,
        paddingRight: () => 4,
        paddingTop: () => 2,
        paddingBottom: () => 2,
      },
      margin: [0, 0, 0, 15],
    },
  ];

  // Součty
  const summaryContent: Content[] = [
    {
      columns: [
        { text: "", width: "*" },
        {
          stack: [
            {
              columns: [
                { text: "Základ celkem:", style: "summaryLabel", width: "auto" },
                { text: `${formatMoneyCz(totals.baseTotal)} Kč`, style: "summaryValue", width: "auto", alignment: "right", margin: [10, 0, 0, 0] },
              ],
            },
            {
              columns: [
                { text: `DPH ${vatPercent} %:`, style: "summaryLabel", width: "auto" },
                { text: `${formatMoneyCz(totals.vatTotal)} Kč`, style: "summaryValue", width: "auto", alignment: "right", margin: [10, 0, 0, 0] },
              ],
            },
            {
              columns: [
                { text: "CELKEM S DPH:", style: "summaryTotalLabel", width: "auto" },
                { text: `${formatMoneyCz(totals.withVatTotal)} Kč`, style: "summaryTotalValue", width: "auto", alignment: "right", margin: [10, 0, 0, 0] },
              ],
            },
          ],
          width: "auto",
        },
      ],
      margin: [0, 10, 0, 30],
    },
  ];

  // Sestavení dokumentu
  return {
    pageSize: "A4",
    pageMargins: [40, 40, 40, 40],
    content: [
      ...headerContent,
      ...partiesContent,
      ...paymentContent,
      ...tableContent,
      ...summaryContent,
    ],
    styles: {
      title: {
        fontSize: 18,
        bold: true,
        margin: [0, 0, 0, 5],
      },
      info: {
        fontSize: 10,
        color: "#666666",
      },
      sectionLabel: {
        fontSize: 9,
        bold: true,
        color: "#888888",
        margin: [0, 0, 0, 4],
      },
      partyName: {
        fontSize: 12,
        bold: true,
        margin: [0, 0, 0, 2],
      },
      partyDetail: {
        fontSize: 10,
        color: "#333333",
      },
      partyDetailMono: {
        fontSize: 9,
        font: "RobotoMono",
        color: "#333333",
      },
      tableHeader: {
        fontSize: 9,
        bold: true,
        color: "#666666",
      },
      tableCell: {
        fontSize: 9,
        color: "#333333",
      },
      summaryLabel: {
        fontSize: 10,
        color: "#333333",
      },
      summaryValue: {
        fontSize: 10,
        color: "#333333",
      },
      summaryTotalLabel: {
        fontSize: 11,
        bold: true,
        color: "#333333",
      },
      summaryTotalValue: {
        fontSize: 11,
        bold: true,
        color: "#000000",
      },
    },
    defaultStyle: {
      font: "Roboto",
    },
  };
}

/**
 * Vytvoří název PDF souboru.
 */
export function buildInvoiceFileName(header: InvoiceHeader): string {
  const customer = header.customerName?.replace(/[^a-zA-Z0-9]/g, "")?.slice(0, 20) || "faktura";
  const vs = header.variableSymbol?.replace(/[^a-zA-Z0-9]/g, "")?.slice(0, 10) || "";
  const date = header.issueDate?.replace(/-/g, "") || new Date().toISOString().slice(0, 10).replace(/-/g, "");
  
  const parts = [customer];
  if (vs) parts.push(vs);
  parts.push(date);
  
  return `faktura_${parts.join("_")}.pdf`;
}