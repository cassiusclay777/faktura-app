"use client";

import type { EditableInvoiceLine, InvoiceHeader } from "@/lib/invoice";
import { formatDateCz, formatMoneyCz, totalsFromLines, lineVatAmount } from "@/lib/invoice";
import { IDOKLAD_ISSUED_INVOICE_CREATE_URL } from "@/lib/idokladExport";

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
  const totals = totalsFromLines(lines, vatPercent);

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-3 print:hidden sm:flex-row sm:flex-wrap sm:items-center">
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
              {lines.map((line, i) => {
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