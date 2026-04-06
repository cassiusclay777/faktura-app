"use client";

import type { InvoiceHeader } from "@/lib/invoice";
import { formatDateCz } from "@/lib/invoice";

interface HeaderFormsProps {
  header: InvoiceHeader;
  onHeaderChange: (header: InvoiceHeader) => void;
  aresLoading: "supplier" | "customer" | null;
  onFillFromAres: (side: "supplier" | "customer") => Promise<void>;
}

export default function HeaderForms({
  header,
  onHeaderChange,
  aresLoading,
  onFillFromAres,
}: HeaderFormsProps) {
  const updateHeader = (updates: Partial<InvoiceHeader>) => {
    onHeaderChange({ ...header, ...updates });
  };

  const handleSupplierAres = () => onFillFromAres("supplier");
  const handleCustomerAres = () => onFillFromAres("customer");

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6">
      <h2 className="mb-4 text-sm font-medium uppercase tracking-wider text-zinc-500">
        Dodavatel a odběratel
      </h2>
      <div className="grid gap-8 lg:grid-cols-2">
        {/* Supplier Column */}
        <div className="space-y-4">
          <p className="text-xs font-semibold uppercase text-zinc-500">
            Dodavatel
          </p>
          <label className="block space-y-1">
            <span className="text-xs text-zinc-500">Název</span>
            <input
              value={header.supplierName}
              onChange={(e) => updateHeader({ supplierName: e.target.value })}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm"
            />
          </label>
          <label className="block space-y-1">
            <span className="text-xs text-zinc-500">IČ</span>
            <div className="flex gap-2">
              <input
                value={header.supplierIco}
                onChange={(e) => updateHeader({ supplierIco: e.target.value })}
                className="min-w-0 flex-1 rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm"
                inputMode="numeric"
                placeholder="8 číslic"
                autoComplete="off"
              />
              <button
                type="button"
                onClick={handleSupplierAres}
                disabled={aresLoading !== null}
                title="Načíst název a sídlo z ARES podle IČ"
                className="shrink-0 rounded-lg border border-zinc-600 bg-zinc-800 px-3 py-2 text-xs font-medium text-zinc-200 hover:bg-zinc-700 disabled:opacity-50"
              >
                {aresLoading === "supplier" ? "…" : "ARES"}
              </button>
            </div>
          </label>
          <label className="block space-y-1">
            <span className="text-xs text-zinc-500">Sídlo</span>
            <textarea
              value={header.supplierAddress}
              onChange={(e) => updateHeader({ supplierAddress: e.target.value })}
              rows={3}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm"
            />
          </label>
          <div className="border-t border-zinc-800 pt-4">
            <p className="mb-3 text-xs font-semibold uppercase text-zinc-500">
              Moje platební údaje
            </p>
            <label className="mb-3 block space-y-1">
              <span className="text-xs text-zinc-500">
                Způsob úhrady
              </span>
              <input
                value={header.supplierPaymentMethod}
                onChange={(e) => updateHeader({ supplierPaymentMethod: e.target.value })}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm"
              />
            </label>
            <label className="mb-3 block space-y-1">
              <span className="text-xs text-zinc-500">
                Bankovní účet (popisek)
              </span>
              <input
                value={header.supplierBankLabel}
                onChange={(e) => updateHeader({ supplierBankLabel: e.target.value })}
                placeholder="např. Hlavní bankovní spojení"
                className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm placeholder:text-zinc-600"
              />
            </label>
            <label className="mb-3 block space-y-1">
              <span className="text-xs text-zinc-500">Číslo účtu</span>
              <input
                value={header.supplierAccountNumber}
                onChange={(e) => updateHeader({ supplierAccountNumber: e.target.value })}
                placeholder="např. 233652456/0600"
                className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm placeholder:text-zinc-600"
              />
            </label>
            <label className="mb-3 block space-y-1">
              <span className="text-xs text-zinc-500">IBAN</span>
              <input
                value={header.supplierIban}
                onChange={(e) => updateHeader({ supplierIban: e.target.value })}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 font-mono text-xs"
              />
            </label>
            <label className="block space-y-1">
              <span className="text-xs text-zinc-500">SWIFT / BIC</span>
              <input
                value={header.supplierSwift}
                onChange={(e) => updateHeader({ supplierSwift: e.target.value })}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 font-mono text-xs"
              />
            </label>
          </div>
        </div>

        {/* Customer Column */}
        <div className="space-y-4">
          <p className="text-xs font-semibold uppercase text-zinc-500">
            Odběratel
          </p>
          <label className="block space-y-1">
            <span className="text-xs text-zinc-500">Odběratel (název)</span>
            <input
              value={header.customerName}
              onChange={(e) => updateHeader({ customerName: e.target.value })}
              placeholder="např. A + S, s.r.o."
              className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm placeholder:text-zinc-600"
            />
          </label>
          <label className="block space-y-1">
            <span className="text-xs text-zinc-500">IČ</span>
            <div className="flex gap-2">
              <input
                value={header.customerIco}
                onChange={(e) => updateHeader({ customerIco: e.target.value })}
                className="min-w-0 flex-1 rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm"
                inputMode="numeric"
                placeholder="8 číslic"
                autoComplete="off"
              />
              <button
                type="button"
                onClick={handleCustomerAres}
                disabled={aresLoading !== null}
                title="Načíst název, sídlo a DIČ z ARES podle IČ"
                className="shrink-0 rounded-lg border border-zinc-600 bg-zinc-800 px-3 py-2 text-xs font-medium text-zinc-200 hover:bg-zinc-700 disabled:opacity-50"
              >
                {aresLoading === "customer" ? "…" : "ARES"}
              </button>
            </div>
          </label>
          <label className="block space-y-1">
            <span className="text-xs text-zinc-500">DIČ</span>
            <input
              value={header.customerDic}
              onChange={(e) => updateHeader({ customerDic: e.target.value })}
              placeholder="např. CZ25584553"
              className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm placeholder:text-zinc-600"
            />
          </label>
          <label className="flex cursor-pointer items-center gap-2 text-sm text-zinc-300">
            <input
              type="checkbox"
              checked={header.customerReliableVatPayer}
              onChange={(e) =>
                updateHeader({ customerReliableVatPayer: e.target.checked })
              }
              className="rounded border-zinc-600"
            />
            Spolehlivý plátce DPH
          </label>
          <label className="block space-y-1">
            <span className="text-xs text-zinc-500">Sídlo</span>
            <textarea
              value={header.customerAddress}
              onChange={(e) => updateHeader({ customerAddress: e.target.value })}
              rows={3}
              placeholder="např. Úvoz 977/18, 602 00 Brno"
              className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm placeholder:text-zinc-600"
            />
          </label>
        </div>
      </div>

      <div className="mt-8 grid gap-4 border-t border-zinc-800 pt-6 sm:grid-cols-2">
        <label className="space-y-1">
          <span className="text-xs text-zinc-500">Datum vystavení</span>
          <input
            type="date"
            value={header.issueDate}
            onChange={(e) => updateHeader({ issueDate: e.target.value })}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm"
          />
        </label>
        <label className="space-y-1">
          <span className="text-xs text-zinc-500">Datum splatnosti</span>
          <input
            type="date"
            value={header.dueDate}
            onChange={(e) => updateHeader({ dueDate: e.target.value })}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm"
          />
        </label>
        <label className="space-y-1 sm:col-span-2">
          <span className="text-xs text-zinc-500">Variabilní symbol</span>
          <input
            value={header.variableSymbol}
            onChange={(e) => updateHeader({ variableSymbol: e.target.value })}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm"
          />
        </label>
        <label className="space-y-1 sm:col-span-2">
          <span className="text-xs text-zinc-500">Poznámka</span>
          <input
            value={header.note}
            onChange={(e) => updateHeader({ note: e.target.value })}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm"
          />
        </label>
      </div>
    </div>
  );
}