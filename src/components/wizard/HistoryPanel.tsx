"use client";

import type { SavedInvoice } from "@/lib/invoiceHistory";

interface HistoryPanelProps {
  historyItems: SavedInvoice[];
  saveInvoiceLabel: string;
  onSaveInvoiceLabelChange: (label: string) => void;
  onSaveInvoice: () => void;
  onLoadFromHistory: (item: SavedInvoice) => void;
  onRemoveHistoryItem: (id: string) => void;
  onClearHistory: () => void;
}

export default function HistoryPanel({
  historyItems,
  saveInvoiceLabel,
  onSaveInvoiceLabelChange,
  onSaveInvoice,
  onLoadFromHistory,
  onRemoveHistoryItem,
  onClearHistory,
}: HistoryPanelProps) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6">
      <h2 className="mb-4 text-sm font-medium uppercase tracking-wider text-zinc-500">
        Historie faktur (prohlížeč)
      </h2>
      <p className="mb-4 text-xs text-zinc-600">
        Uložené kopie hlavičky, řádků a přepisu podkladu v{" "}
        <code className="text-zinc-500">localStorage</code> (max. 50).
      </p>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
        <label className="min-w-[200px] flex-1 space-y-1">
          <span className="text-xs text-zinc-500">Název zálohy (volitelné)</span>
          <input
            value={saveInvoiceLabel}
            onChange={(e) => onSaveInvoiceLabelChange(e.target.value)}
            placeholder="např. podle odběratele nebo VS"
            className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm placeholder:text-zinc-600"
          />
        </label>
        <button
          type="button"
          onClick={onSaveInvoice}
          className="rounded-xl border border-amber-600/60 bg-amber-950/40 px-4 py-2 text-sm font-medium text-amber-100 hover:bg-amber-900/50"
        >
          Uložit aktuální fakturu
        </button>
        {historyItems.length > 0 && (
          <button
            type="button"
            onClick={onClearHistory}
            className="rounded-lg border border-zinc-700 px-3 py-2 text-xs text-zinc-500 hover:bg-zinc-800"
          >
            Vymazat vše
          </button>
        )}
      </div>
      {historyItems.length === 0 ? (
        <p className="text-sm text-zinc-600">Zatím nic uloženo.</p>
      ) : (
        <ul className="space-y-2">
          {historyItems.map((item) => (
            <li
              key={item.id}
              className="flex flex-col gap-2 rounded-lg border border-zinc-800 bg-zinc-950/50 p-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <div className="font-medium text-zinc-200">{item.name}</div>
                <div className="text-xs text-zinc-500">
                  {new Date(item.savedAt).toLocaleString("cs-CZ")} ·{" "}
                  {item.lines.length} řádků
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => onLoadFromHistory(item)}
                  className="rounded-lg bg-zinc-800 px-3 py-1.5 text-xs text-zinc-200 hover:bg-zinc-700"
                >
                  Načíst
                </button>
                <button
                  type="button"
                  onClick={() => onRemoveHistoryItem(item.id)}
                  className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-500 hover:bg-zinc-900"
                >
                  Smazat
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}