"use client";

import type { EditableInvoiceLine } from "@/lib/invoice";
import { formatDateCz, formatMoneyCz, totalsFromLines } from "@/lib/invoice";

interface LinesTableProps {
  lines: EditableInvoiceLine[];
  onUpdateLine: (id: string, updates: Partial<EditableInvoiceLine>) => void;
  onRemoveLine: (id: string) => void;
  vatPercent: number;
}

export default function LinesTable({
  lines,
  onUpdateLine,
  onRemoveLine,
  vatPercent,
}: LinesTableProps) {
  const totals = totalsFromLines(lines, vatPercent);

  return (
    <>
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6 overflow-x-auto">
        <h2 className="mb-4 text-sm font-medium uppercase tracking-wider text-zinc-500">
          Řádky ({lines.length})
        </h2>
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead>
            <tr className="border-b border-zinc-800 text-zinc-500">
              <th className="pb-2 pr-2">Datum</th>
              <th className="pb-2 pr-2">Popis</th>
              <th className="pb-2 pr-2 text-right">l</th>
              <th className="pb-2 pr-2 text-right">Kč/l</th>
              <th className="pb-2 pr-2 text-right">Základ</th>
              <th className="pb-2" />
            </tr>
          </thead>
          <tbody>
            {lines.map((line) => (
              <tr key={line.id} className="border-b border-zinc-800/80">
                <td className="py-2 align-top text-zinc-500 whitespace-nowrap">
                  {formatDateCz(line.dateIso)}
                </td>
                <td className="py-2 pr-2 align-top">
                  <textarea
                    value={line.description}
                    onChange={(e) =>
                      onUpdateLine(line.id, { description: e.target.value })
                    }
                    rows={2}
                    aria-label="Popis"
                    className="w-full min-w-[200px] rounded border border-zinc-700 bg-zinc-950 px-2 py-1 text-xs"
                  />
                </td>
                <td className="py-2 align-top">
                  <input
                    type="number"
                    value={line.liters}
                    onChange={(e) =>
                      onUpdateLine(line.id, {
                        liters: Number(e.target.value),
                      })
                    }
                    aria-label="Množství (l)"
                    className="w-24 rounded border border-zinc-700 bg-zinc-950 px-2 py-1 text-right"
                  />
                </td>
                <td className="py-2 align-top">
                  <input
                    type="number"
                    step="0.01"
                    value={line.rate}
                    onChange={(e) =>
                      onUpdateLine(line.id, {
                        rate: Number(e.target.value),
                      })
                    }
                    aria-label="Cena (Kč/l)"
                    className="w-24 rounded border border-zinc-700 bg-zinc-950 px-2 py-1 text-right"
                  />
                </td>
                <td className="py-2 align-top">
                  <input
                    type="number"
                    step="0.01"
                    value={line.baseAmount}
                    onChange={(e) =>
                      onUpdateLine(line.id, {
                        baseAmount: Number(e.target.value),
                      })
                    }
                    aria-label="Základ (Kč)"
                    className="w-28 rounded border border-zinc-700 bg-zinc-950 px-2 py-1 text-right"
                  />
                </td>
                <td className="py-2 align-top">
                  <button
                    type="button"
                    onClick={() => onRemoveLine(line.id)}
                    className="text-xs text-red-400 hover:underline"
                  >
                    ×
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {lines.length === 0 && (
          <p className="text-sm text-zinc-500">
            Zatím žádné řádky – vrať se na podklad a načti data.
          </p>
        )}
      </div>

      <div className="flex flex-wrap gap-4 text-sm text-zinc-400">
        <span>
          Základ celkem:{" "}
          <strong className="text-zinc-200">
            {formatMoneyCz(totals.baseTotal)} Kč
          </strong>
        </span>
        <span>
          DPH {vatPercent} %:{" "}
          <strong className="text-zinc-200">
            {formatMoneyCz(totals.vatTotal)} Kč
          </strong>
        </span>
        <span>
          Celkem s DPH:{" "}
          <strong className="text-amber-200">
            {formatMoneyCz(totals.withVatTotal)} Kč
          </strong>
        </span>
      </div>
    </>
  );
}