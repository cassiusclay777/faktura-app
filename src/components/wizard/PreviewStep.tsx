"use client";

import { useMemo, useCallback, useState } from "react";
import type { EditableInvoiceLine, InvoiceHeader } from "@/lib/invoice";
import { formatDateCz, formatMoneyCz, totalsFromLines, lineVatAmount } from "@/lib/invoice";
import { formatUnknownError } from "@/lib/formatUnknownError";
import { IDOKLAD_ISSUED_INVOICE_CREATE_URL } from "@/lib/idokladExport";

// PDF export pomocí pdfmake (client-side)
async function generatePdfBlob(
  header: InvoiceHeader,
  lines: EditableInvoiceLine[],
  vatPercent: number
): Promise<Blob> {
  // Dynamický import pdfmake (jen když je potřeba)
  const pdfMakeModule = await import("pdfmake/build/pdfmake");
  const pdfFontsModule = await import("pdfmake/build/vfs_fonts");
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pdfMake = pdfMakeModule as any;
  pdfMake.vfs = pdfFontsModule.default;
  
  const totals = totalsFromLines(lines, vatPercent);

  const docDefinition = {
    pageSize: "A4" as const,
    pageMargins: [40, 40, 40, 40] as [number, number, number, number],
    content: [
      // Hlavička
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
        margin: [0, 0, 0, 20] as [number, number, number, number],
      },
      
      // Dodavatel a odběratel
      {
        columns: [
          {
            stack: [
              { text: "DODAVATEL", style: "sectionLabel" },
              { text: header.supplierName || "—", style: "partyName" },
              ...(header.supplierIco ? [{ text: `IČ: ${header.supplierIco}`, style: "partyDetail" }] : []),
              ...(header.supplierAddress ? [{ text: header.supplierAddress, style: "partyDetail" }] : []),
            ],
            width: "*",
          },
          {
            stack: [
              { text: "ODBĚRATEL", style: "sectionLabel" },
              { text: header.customerName || "—", style: "partyName" },
              ...(header.customerIco ? [{ text: `IČ: ${header.customerIco}`, style: "partyDetail" }] : []),
              ...(header.customerDic ? [{ text: `DIČ: ${header.customerDic}`, style: "partyDetail" }] : []),
              ...(header.customerReliableVatPayer ? [{ text: "Spolehlivý plátce DPH", style: "partyDetail" }] : []),
              ...(header.customerAddress ? [{ text: header.customerAddress, style: "partyDetail" }] : []),
            ],
            width: "*",
          },
        ],
        margin: [0, 0, 0, 20] as [number, number, number, number],
      },
      
      // Platební údaje
      ...(
        header.supplierPaymentMethod || header.supplierBankLabel || 
        header.supplierAccountNumber || header.supplierIban || header.supplierSwift
          ? [
            { text: "PLATEBNÍ ÚDAJE", style: "sectionLabel", margin: [0, 10, 0, 5] as [number, number, number, number] },
            {
              stack: [
                ...(header.supplierPaymentMethod ? [{ text: `Způsob úhrady: ${header.supplierPaymentMethod}`, style: "partyDetail" }] : []),
                ...(header.supplierBankLabel ? [{ text: `Bankovní účet: ${header.supplierBankLabel}`, style: "partyDetail" }] : []),
                ...(header.supplierAccountNumber ? [{ text: `Číslo účtu: ${header.supplierAccountNumber}`, style: "partyDetail" }] : []),
                ...(header.supplierIban ? [{ text: `IBAN: ${header.supplierIban}`, style: "partyDetailMono" }] : []),
                ...(header.supplierSwift ? [{ text: `SWIFT: ${header.supplierSwift}`, style: "partyDetailMono" }] : []),
              ],
              margin: [0, 0, 0, 15] as [number, number, number, number],
            },
          ]
          : []
      ),
      
      // Tabulka
      {
        table: {
          headerRows: 1,
          widths: ["auto", "*", "auto", "auto", "auto", "auto", "auto"] as const,
          body: [
            // Hlavička
            [
              { text: "Datum", style: "tableHeader" },
              { text: "Popis", style: "tableHeader" },
              { text: "Množství", style: "tableHeader", alignment: "right" },
              { text: "J. cena", style: "tableHeader", alignment: "right" },
              { text: "Základ", style: "tableHeader", alignment: "right" },
              { text: "DPH", style: "tableHeader", alignment: "right" },
              { text: "Celkem", style: "tableHeader", alignment: "right" },
            ],
            // Řádky
            ...lines.map((line) => {
              const vat = lineVatAmount(line.baseAmount, vatPercent);
              const total = line.baseAmount + vat;
              return [
                { text: formatDateCz(line.dateIso), style: "tableCell" },
                { text: line.description, style: "tableCell" },
                { text: `${formatMoneyCz(line.liters)} l`, style: "tableCell", alignment: "right" },
                { text: `${formatMoneyCz(line.rate)} Kč/l`, style: "tableCell", alignment: "right" },
                { text: `${formatMoneyCz(line.baseAmount)} Kč`, style: "tableCell", alignment: "right" },
                { text: `${formatMoneyCz(vat)} Kč`, style: "tableCell", alignment: "right" },
                { text: `${formatMoneyCz(total)} Kč`, style: "tableCellBold", alignment: "right" },
              ];
            }),
          ],
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
        margin: [0, 0, 0, 15] as [number, number, number, number],
      },
      
      // Součty
      {
        columns: [
          { text: "", width: "*" },
          {
            stack: [
              {
                columns: [
                  { text: "Základ celkem:", style: "summaryLabel", width: "auto" },
                  { text: `${formatMoneyCz(totals.baseTotal)} Kč`, style: "summaryValue", width: "auto", alignment: "right", margin: [10, 0, 0, 0] as [number, number, number, number] },
                ],
              },
              {
                columns: [
                  { text: `DPH ${vatPercent} %:`, style: "summaryLabel", width: "auto" },
                  { text: `${formatMoneyCz(totals.vatTotal)} Kč`, style: "summaryValue", width: "auto", alignment: "right", margin: [10, 0, 0, 0] as [number, number, number, number] },
                ],
              },
              {
                columns: [
                  { text: "CELKEM S DPH:", style: "summaryTotalLabel", width: "auto" },
                  { text: `${formatMoneyCz(totals.withVatTotal)} Kč`, style: "summaryTotalValue", width: "auto", alignment: "right", margin: [10, 0, 0, 0] as [number, number, number, number] },
                ],
              },
            ],
            width: "auto",
          },
        ],
        margin: [0, 10, 0, 30] as [number, number, number, number],
      },
    ],
    styles: {
      title: {
        fontSize: 18,
        bold: true,
        margin: [0, 0, 0, 5] as [number, number, number, number],
      },
      info: {
        fontSize: 10,
        color: "#666666",
      },
      sectionLabel: {
        fontSize: 9,
        bold: true,
        color: "#888888",
        margin: [0, 0, 0, 4] as [number, number, number, number],
      },
      partyName: {
        fontSize: 12,
        bold: true,
        margin: [0, 0, 0, 2] as [number, number, number, number],
      },
      partyDetail: {
        fontSize: 10,
        color: "#333333",
      },
      partyDetailMono: {
        fontSize: 9,
        font: "Courier",
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
      tableCellBold: {
        fontSize: 9,
        bold: true,
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

  return new Promise((resolve) => {
    const pdfDocGenerator = (pdfMake as unknown as { createPdf: (def: unknown) => { getBlob: (cb: (blob: Blob) => void) => void } }).createPdf(docDefinition);
    pdfDocGenerator.getBlob((blob: Blob) => {
      resolve(blob);
    });
  });
}

function downloadPdfBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function buildInvoiceFileName(header: InvoiceHeader): string {
  const customer = (header.customerName || "faktura").replace(/[^a-zA-Z0-9]/g, "").slice(0, 20) || "faktura";
  const vs = (header.variableSymbol || "").replace(/[^a-zA-Z0-9]/g, "").slice(0, 10);
  const date = (header.issueDate || new Date().toISOString().slice(0, 10)).replace(/-/g, "");
  
  const parts = [customer];
  if (vs) parts.push(vs);
  parts.push(date);
  
  return `faktura_${parts.join("_")}.pdf`;
}

interface PreviewStepProps {
  header: InvoiceHeader;
  lines: EditableInvoiceLine[];
  vatPercent: number;
  onPrint: () => void;
  onCopyIdokladExport: () => Promise<void>;
  onOpenIdokladCreate: () => void;
  idokladExportHint: string | null;
}

export default function PreviewStep({
  header,
  lines,
  vatPercent,
  onPrint,
  onCopyIdokladExport,
  onOpenIdokladCreate,
  idokladExportHint,
}: PreviewStepProps) {
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);
  
  const totals = useMemo(() => totalsFromLines(lines, vatPercent), [lines, vatPercent]);

  const handleDownloadPdf = useCallback(async () => {
    if (lines.length === 0) {
      setPdfError("Nejdřív načti podklad (řádky faktury).");
      return;
    }
    
    setPdfLoading(true);
    setPdfError(null);
    
    try {
      const blob = await generatePdfBlob(header, lines, vatPercent);
      const filename = buildInvoiceFileName(header);
      downloadPdfBlob(blob, filename);
    } catch (e) {
      setPdfError(`Chyba při generování PDF: ${formatUnknownError(e)}`);
    } finally {
      setPdfLoading(false);
    }
  }, [header, lines, vatPercent]);

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-3 print:hidden sm:flex-row sm:flex-wrap sm:items-center">
        {/* PDF download button */}
        <button
          type="button"
          onClick={() => void handleDownloadPdf()}
          disabled={pdfLoading || lines.length === 0}
          className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-40"
        >
          {pdfLoading ? "Generuji PDF…" : "Stáhnout PDF"}
        </button>
        
        <button
          type="button"
          onClick={onPrint}
          className="rounded-xl bg-amber-500 px-5 py-2.5 text-sm font-semibold text-zinc-950 hover:bg-amber-400"
        >
          Tisk / Uložit jako PDF
        </button>
        <button
          type="button"
          onClick={() => void onCopyIdokladExport()}
          className="rounded-xl border border-zinc-600 bg-zinc-800 px-5 py-2.5 text-sm font-semibold text-zinc-100 hover:bg-zinc-700"
        >
          Zkopírovat údaje pro iDoklad
        </button>
        <button
          type="button"
          onClick={onOpenIdokladCreate}
          className="rounded-xl border border-sky-700/80 bg-sky-950/50 px-5 py-2.5 text-sm font-semibold text-sky-100 hover:bg-sky-900/60"
        >
          Otevřít novou fakturu v iDokladu
        </button>
        <p className="text-sm text-zinc-500 sm:ml-2">
          iDoklad formulář nepřijímá data z jiné stránky – zkopíruj text a
          vlož ho do poznámky nebo přepiš pole ručně.{" "}
          <a
            href={IDOKLAD_ISSUED_INVOICE_CREATE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sky-400 underline hover:text-sky-300"
          >
            app.idoklad.cz/…/Create
          </a>
        </p>
      </div>
      
      {pdfError && (
        <div
          className="print:hidden rounded-lg border border-red-500/40 bg-red-950/50 px-4 py-3 text-sm text-red-200"
          role="alert"
        >
          {pdfError}
        </div>
      )}
      
      {idokladExportHint && (
        <p
          className="print:hidden rounded-lg border border-emerald-800/60 bg-emerald-950/40 px-4 py-2 text-sm text-emerald-200"
          role="status"
        >
          {idokladExportHint}
        </p>
      )}
      <p className="print:hidden text-xs text-zinc-600">
        Plná automatizace (bez kopírování) jde přes REST API iDokladu a OAuth
        – viz README v `invoice-assistant`.
      </p>

      <div
        id="invoice-print"
        className="mx-auto max-w-[210mm] rounded-lg bg-white p-[12mm] text-zinc-900 shadow-xl print:shadow-none print:rounded-none"
      >
        <div className="flex justify-between border-b border-zinc-200 pb-4">
          <div>
            <h2 className="text-xl font-bold">FAKTURA – daňový doklad</h2>
            {header.note && (
              <p className="mt-1 text-sm text-zinc-600">{header.note}</p>
            )}
          </div>
          <div className="text-right text-sm">
            <div>VS: {header.variableSymbol || "—"}</div>
            <div>vystaveno: {formatDateCz(header.issueDate)}</div>
            <div>splatnost: {header.dueDate ? formatDateCz(header.dueDate) : "—"}</div>
          </div>
        </div>

        <div className="mt-6 grid gap-8 sm:grid-cols-2 text-sm">
          <div>
            <p className="text-xs font-semibold uppercase text-zinc-500">
              Dodavatel
            </p>
            <p className="mt-1 font-medium whitespace-pre-line">
              {header.supplierName || "—"}
            </p>
            {header.supplierIco && (
              <p className="text-zinc-700">
                <span className="text-zinc-500">IČ: </span>
                {header.supplierIco}
              </p>
            )}
            {header.supplierAddress && (
              <p className="mt-2 whitespace-pre-line text-zinc-700">
                <span className="text-zinc-500">Sídlo: </span>
                {header.supplierAddress}
              </p>
            )}
            {(header.supplierPaymentMethod ||
              header.supplierBankLabel ||
              header.supplierAccountNumber ||
              header.supplierIban ||
              header.supplierSwift) && (
              <div className="mt-4 border-t border-zinc-200 pt-3">
                <p className="text-xs font-semibold uppercase text-zinc-500">
                  Moje platební údaje
                </p>
                {header.supplierPaymentMethod && (
                  <p className="mt-2 text-zinc-700">
                    <span className="text-zinc-500">Způsob úhrady: </span>
                    {header.supplierPaymentMethod}
                  </p>
                )}
                {header.supplierBankLabel && (
                  <p className="mt-1 text-zinc-700">
                    <span className="text-zinc-500">Bankovní účet: </span>
                    {header.supplierBankLabel}
                  </p>
                )}
                {header.supplierAccountNumber && (
                  <p className="mt-1 text-zinc-700">
                    <span className="text-zinc-500">Číslo účtu: </span>
                    {header.supplierAccountNumber}
                  </p>
                )}
                {header.supplierIban && (
                  <p className="mt-1 font-mono text-xs">
                    <span className="text-zinc-500">IBAN: </span>
                    {header.supplierIban}
                  </p>
                )}
                {header.supplierSwift && (
                  <p className="mt-1 font-mono text-xs">
                    <span className="text-zinc-500">SWIFT: </span>
                    {header.supplierSwift}
                  </p>
                )}
              </div>
            )}
          </div>

          <div>
            <p className="text-xs font-semibold uppercase text-zinc-500">
              Odběratel
            </p>
            <p className="mt-1 font-medium whitespace-pre-line">
              {header.customerName || "—"}
            </p>
            {header.customerIco && (
              <p className="text-zinc-700">
                <span className="text-zinc-500">IČ: </span>
                {header.customerIco}
              </p>
            )}
            {header.customerDic && (
              <p className="text-zinc-700">
                <span className="text-zinc-500">DIČ: </span>
                {header.customerDic}
              </p>
            )}
            {header.customerReliableVatPayer && (
              <p className="text-emerald-700 text-xs font-medium">
                ✓ Spolehlivý plátce DPH
              </p>
            )}
            {header.customerAddress && (
              <p className="mt-2 whitespace-pre-line text-zinc-700">
                <span className="text-zinc-500">Sídlo: </span>
                {header.customerAddress}
              </p>
            )}
          </div>
        </div>

        <div className="mt-8 overflow-x-auto">
          <table className="w-full min-w-[500px] text-sm">
            <thead>
              <tr className="border-b border-zinc-300 text-zinc-700">
                <th className="pb-2 pr-2 text-left">Datum</th>
                <th className="pb-2 pr-2 text-left">Popis</th>
                <th className="pb-2 pr-2 text-right">Množství</th>
                <th className="pb-2 pr-2 text-right">Jedn. cena</th>
                <th className="pb-2 pr-2 text-right">Základ</th>
                <th className="pb-2 pr-2 text-right">DPH</th>
                <th className="pb-2 text-right">Celkem</th>
              </tr>
            </thead>
            <tbody>
              {lines.map((line) => {
                const vat = lineVatAmount(line.baseAmount, vatPercent);
                const total = line.baseAmount + vat;
                return (
                  <tr key={line.id} className="border-b border-zinc-200">
                    <td className="py-3 pr-2 text-zinc-600 whitespace-nowrap">
                      {formatDateCz(line.dateIso)}
                    </td>
                    <td className="py-3 pr-2">{line.description}</td>
                    <td className="py-3 pr-2 text-right">
                      {formatMoneyCz(line.liters)} l
                    </td>
                    <td className="py-3 pr-2 text-right">
                      {formatMoneyCz(line.rate)} Kč/l
                    </td>
                    <td className="py-3 pr-2 text-right">
                      {formatMoneyCz(line.baseAmount)} Kč
                    </td>
                    <td className="py-3 pr-2 text-right">
                      {formatMoneyCz(vat)} Kč
                    </td>
                    <td className="py-3 text-right font-medium">
                      {formatMoneyCz(total)} Kč
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="mt-8 flex justify-end">
          <div className="w-full max-w-xs text-sm">
            <div className="flex justify-between border-t border-zinc-300 pt-3">
              <span>Základ celkem:</span>
              <span className="font-medium">{formatMoneyCz(totals.baseTotal)} Kč</span>
            </div>
            <div className="flex justify-between border-t border-zinc-300 pt-3">
              <span>DPH {vatPercent} %:</span>
              <span className="font-medium">{formatMoneyCz(totals.vatTotal)} Kč</span>
            </div>
            <div className="flex justify-between border-t border-zinc-300 pt-3 text-lg font-bold">
              <span>Celkem s DPH:</span>
              <span>{formatMoneyCz(totals.withVatTotal)} Kč</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}