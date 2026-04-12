"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ParsedPodklad } from "invoice-assistant";
import {
  DEFAULT_VAT_PERCENT,
  emptyHeader,
  formatDateCz,
  formatMoneyCz,
  lineVatAmount,
  totalsFromLines,
  tripLinesToEditable,
  type EditableInvoiceLine,
  type InvoiceHeader,
} from "@/lib/invoice";
import { formatUnknownError } from "@/lib/formatUnknownError";
import { readJsonResponse } from "@/lib/readJsonResponse";

const HEADER_STORAGE_KEY = "faktura-invoice-header-v1";

function loadHeader(): InvoiceHeader {
  if (typeof window === "undefined") return emptyHeader();
  try {
    const raw = localStorage.getItem(HEADER_STORAGE_KEY);
    if (!raw) return emptyHeader();
    const o = JSON.parse(raw) as Partial<InvoiceHeader>;
    return { ...emptyHeader(), ...o };
  } catch {
    return emptyHeader();
  }
}

export default function FakturaApp() {
  const [header, setHeader] = useState<InvoiceHeader>(() => emptyHeader());
  const [lines, setLines] = useState<EditableInvoiceLine[]>([]);
  const [rawTranscript, setRawTranscript] = useState("");
  const [pasteText, setPasteText] = useState("");
  const [provider, setProvider] = useState<"openrouter" | "ollama">(
    "openrouter",
  );
  const [fixNamesWeb, setFixNamesWeb] = useState(false);
  const [fixNamesProvider, setFixNamesProvider] = useState<
    "gemini" | "openrouter"
  >("gemini");
  const [userInstructions, setUserInstructions] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<"podklad" | "faktura" | "nahled">("podklad");
  const [originalLines, setOriginalLines] = useState<EditableInvoiceLine[]>([]);
  const [correcting, setCorrecting] = useState(false);
  const [showCorrection, setShowCorrection] = useState(false);

  useEffect(() => {
    setHeader(loadHeader());
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem(HEADER_STORAGE_KEY, JSON.stringify(header));
  }, [header]);

  const vatPercent = DEFAULT_VAT_PERCENT;
  const totals = useMemo(
    () => totalsFromLines(lines, vatPercent),
    [lines, vatPercent],
  );

  const processPodklad = useCallback(
    async (file: File | null) => {
      setError(null);
      setLoading(true);
      try {
        const fd = new FormData();
        if (file && file.size > 0) fd.append("file", file);
        else fd.append("rawText", pasteText);
        fd.append("provider", provider);
        fd.append("fixNames", "false");

        const res = await fetch("/api/process", { method: "POST", body: fd });
        const data = await readJsonResponse<{
          error?: string;
          rawTranscript?: string;
          parsed?: ParsedPodklad;
        }>(res);
        if (!res.ok) {
          throw new Error(
            data.error ?? (res.statusText || `HTTP ${res.status}`),
          );
        }
        if (!data.parsed) throw new Error("Neočekávaná odpověď serveru.");
        setRawTranscript(data.rawTranscript ?? "");
        const parsedLines = tripLinesToEditable(data.parsed.lines);
        setLines(parsedLines);
        setOriginalLines(parsedLines);
        setTab("faktura");
      } catch (e) {
        setError(formatUnknownError(e));
      } finally {
        setLoading(false);
      }
    },
    [pasteText, provider],
  );

  const runCorrection = useCallback(async () => {
    if (lines.length === 0) return;
    setError(null);
    setCorrecting(true);
    setOriginalLines(lines);
    try {
      const fd = new FormData();
      fd.append("rawText", rawTranscript);
      fd.append("provider", provider);
      fd.append("fixNames", "true");
      fd.append("fixNamesProvider", fixNamesProvider);
      fd.append("fixNamesWeb", String(fixNamesWeb));
      if (userInstructions.trim()) fd.append("userInstructions", userInstructions.trim());

      const res = await fetch("/api/process", { method: "POST", body: fd });
      const data = await readJsonResponse<{
        error?: string;
        parsed?: ParsedPodklad;
      }>(res);
      if (!res.ok) {
        throw new Error(
          data.error ?? (res.statusText || `HTTP ${res.status}`),
        );
      }
      if (!data.parsed) throw new Error("Neočekávaná odpověď serveru.");
      setLines(tripLinesToEditable(data.parsed.lines));
      setShowCorrection(true);
    } catch (e) {
      setError(formatUnknownError(e));
    } finally {
      setCorrecting(false);
    }
  }, [
    fixNamesWeb,
    fixNamesProvider,
    userInstructions,
    lines,
    rawTranscript,
    provider,
  ]);

  const updateLine = (id: string, patch: Partial<EditableInvoiceLine>) => {
    setLines((prev) =>
      prev.map((l) => (l.id === id ? { ...l, ...patch } : l)),
    );
  };

  const removeLine = (id: string) => {
    setLines((prev) => prev.filter((l) => l.id !== id));
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <header className="print:hidden border-b border-zinc-800 bg-zinc-900/80 backdrop-blur px-4 py-4">
        <div className="mx-auto max-w-5xl flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-lg font-semibold tracking-tight">
              Faktura z podkladu
            </h1>
            <p className="text-sm text-zinc-500">
              Podklad → řádky → náhled / tisk (bez iDoklad API)
            </p>
          </div>
          <nav className="flex gap-2">
            {(["podklad", "faktura", "nahled"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                  tab === t
                    ? "bg-amber-500/20 text-amber-200 ring-1 ring-amber-500/40"
                    : "text-zinc-400 hover:bg-zinc-800"
                }`}
              >
                {t === "podklad"
                  ? "1. Podklad"
                  : t === "faktura"
                    ? "2. Faktura"
                    : "3. Náhled"}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8 print:max-w-none print:px-0 print:py-0">
        {error && (
          <div
            className="print:hidden mb-6 rounded-lg border border-red-500/40 bg-red-950/50 px-4 py-3 text-sm text-red-200"
            role="alert"
          >
            {error}
          </div>
        )}

        {tab === "podklad" && (
          <section className="space-y-6 rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6">
            <h2 className="text-sm font-medium uppercase tracking-wider text-zinc-500">
              Načtení podkladu
            </h2>
            <label className="block space-y-2">
              <span className="text-sm text-zinc-400">Vložit text podkladu</span>
              <textarea
                value={pasteText}
                onChange={(e) => setPasteText(e.target.value)}
                rows={12}
                className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 font-mono text-sm text-zinc-200 placeholder:text-zinc-600 focus:border-amber-500/50 focus:outline-none focus:ring-1 focus:ring-amber-500/30"
                placeholder="Datum na řádek, popis, pak řádek 31999 / 0,13 / 4 159,87 …"
              />
            </label>

            <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
              <label className="flex-1 space-y-2">
                <span className="text-sm text-zinc-400">
                  Nebo soubor (.txt / PDF / obrázek)
                </span>
                <input
                  type="file"
                  accept=".txt,.pdf,text/plain,application/pdf,image/jpeg,image/png,image/webp,image/gif"
                  className="block w-full text-sm text-zinc-400 file:mr-3 file:rounded-lg file:border-0 file:bg-zinc-800 file:px-3 file:py-1.5 file:text-zinc-200"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void processPodklad(f);
                    e.target.value = "";
                  }}
                  disabled={loading}
                />
              </label>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-2">
                <span className="text-sm text-zinc-400">Přepis z fotky</span>
                <select
                  value={provider}
                  onChange={(e) =>
                    setProvider(e.target.value as "openrouter" | "ollama")
                  }
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm"
                >
                  <option value="openrouter">
                    OpenRouter (cloud, OPENROUTER_API_KEY)
                  </option>
                  <option value="ollama">Ollama (lokálně)</option>
                </select>
              </label>
            </div>

            <button
              type="button"
              onClick={() => void processPodklad(null)}
              disabled={loading || !pasteText.trim()}
              className="rounded-xl bg-amber-500 px-5 py-2.5 text-sm font-semibold text-zinc-950 hover:bg-amber-400 disabled:opacity-40"
            >
              {loading ? "Zpracovávám…" : "Zpracovat vložený text"}
            </button>
          </section>
        )}

        {tab === "faktura" && (
          <section className="space-y-6">
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6">
              <h2 className="mb-4 text-sm font-medium uppercase tracking-wider text-zinc-500">
                Dodavatel a odběratel
              </h2>
              <div className="grid gap-4 sm:grid-cols-2">
                {(
                  [
                    ["supplierName", "Název dodavatele"],
                    ["supplierIco", "IČO"],
                    ["supplierAddress", "Adresa dodavatele (řádky oddělte Enterem)"],
                    ["customerName", "Název odběratele"],
                    ["customerAddress", "Adresa odběratele"],
                    ["issueDate", "Datum vystavení"],
                    ["dueDate", "Datum splatnosti"],
                    ["variableSymbol", "Variabilní symbol"],
                  ] as const
                ).map(([key, label]) => (
                  <label key={key} className="space-y-1 sm:col-span-2">
                    <span className="text-xs text-zinc-500">{label}</span>
                    {key === "supplierAddress" || key === "customerAddress" ? (
                      <textarea
                        value={header[key]}
                        onChange={(e) =>
                          setHeader((h) => ({ ...h, [key]: e.target.value }))
                        }
                        rows={3}
                        className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm"
                      />
                    ) : (
                      <input
                        type={
                          key === "issueDate" || key === "dueDate"
                            ? "date"
                            : "text"
                        }
                        value={header[key]}
                        onChange={(e) =>
                          setHeader((h) => ({ ...h, [key]: e.target.value }))
                        }
                        className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm"
                      />
                    )}
                  </label>
                ))}
                <label className="space-y-1 sm:col-span-2">
                  <span className="text-xs text-zinc-500">Poznámka</span>
                  <input
                    value={header.note}
                    onChange={(e) =>
                      setHeader((h) => ({ ...h, note: e.target.value }))
                    }
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm"
                  />
                </label>
              </div>
            </div>

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
                            updateLine(line.id, { description: e.target.value })
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
                            updateLine(line.id, {
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
                            updateLine(line.id, {
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
                            updateLine(line.id, {
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
                          onClick={() => removeLine(line.id)}
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

            <details className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-4">
              <summary className="cursor-pointer text-sm text-zinc-500">
                Surový přepis podkladu
              </summary>
              <pre className="mt-3 max-h-48 overflow-auto whitespace-pre-wrap font-mono text-xs text-zinc-500">
                {rawTranscript || "—"}
              </pre>
            </details>

            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6">
              <h2 className="mb-4 text-sm font-medium uppercase tracking-wider text-zinc-500">
                Korekce názvů (AI)
              </h2>
              <div className="mb-4 flex flex-wrap gap-4 text-sm">
                <span className="text-zinc-500">Model:</span>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="fixNamesProvider"
                    checked={fixNamesProvider === "gemini"}
                    onChange={() => setFixNamesProvider("gemini")}
                  />
                  Gemini
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="fixNamesProvider"
                    checked={fixNamesProvider === "openrouter"}
                    onChange={() => setFixNamesProvider("openrouter")}
                  />
                  OpenRouter
                </label>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 mb-4">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={fixNamesWeb}
                    disabled={fixNamesProvider === "openrouter"}
                    onChange={(e) => setFixNamesWeb(e.target.checked)}
                  />
                  Vyhledávat na webu (jen Gemini)
                </label>
              </div>
              <label className="block space-y-1 mb-4">
                <span className="text-xs text-zinc-500">Vlastní instrukce pro opravu (názvy firem, které znáš, opravy překlepů)</span>
                <textarea
                  value={userInstructions}
                  onChange={(e) => setUserInstructions(e.target.value)}
                  rows={2}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm placeholder:text-zinc-600"
                  placeholder="Např. Dopravní stavby Brno, ne Dopravni Stavby; ZEMAX, ne SEMAX..."
                />
              </label>
              <button
                type="button"
                onClick={() => void runCorrection()}
                disabled={correcting || lines.length === 0}
                className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-40"
              >
                {correcting ? "Opravuji…" : "Opravit názvy"}
              </button>

              {showCorrection && (
                <div className="mt-6 space-y-3">
                  <h3 className="text-sm font-medium text-zinc-300">Porovnání: původní → opravené</h3>
                  <div className="space-y-2">
                    {lines.map((line, i) => {
                      const orig = originalLines[i];
                      const changed = orig && orig.description !== line.description;
                      return (
                        <div key={line.id} className="rounded-lg border border-zinc-700 bg-zinc-950/50 p-3">
                          <div className="text-xs text-zinc-500 mb-1">{formatDateCz(line.dateIso)}</div>
                          {changed ? (
                            <div className="space-y-1">
                              <div className="text-sm text-zinc-400">
                                <span className="text-red-400 line-through">{orig?.description}</span>
                              </div>
                              <div className="text-sm text-emerald-400">
                                → {line.description}
                              </div>
                            </div>
                          ) : (
                            <div className="text-sm text-zinc-300">{line.description}</div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowCorrection(false)}
                    className="text-xs text-zinc-500 hover:text-zinc-300"
                  >
                    Skrýt porovnání
                  </button>
                </div>
              )}
            </div>
          </section>
        )}

        {tab === "nahled" && (
          <section className="space-y-6">
            <div className="flex gap-3 print:hidden">
              <button
                type="button"
                onClick={() => window.print()}
                className="rounded-xl bg-amber-500 px-5 py-2.5 text-sm font-semibold text-zinc-950 hover:bg-amber-400"
              >
                Tisk / Uložit jako PDF
              </button>
              <p className="text-sm text-zinc-500 self-center">
                V dialogu tisku zvol „Uložit jako PDF“.
              </p>
            </div>

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

              <div className="mt-6 grid gap-6 sm:grid-cols-2 text-sm">
                <div>
                  <p className="text-xs font-semibold uppercase text-zinc-500">
                    Dodavatel
                  </p>
                  <p className="mt-1 font-medium whitespace-pre-line">
                    {header.supplierName || "—"}
                  </p>
                  <p className="text-zinc-600">IČO: {header.supplierIco || "—"}</p>
                  <p className="mt-1 whitespace-pre-line text-zinc-700">
                    {header.supplierAddress || ""}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase text-zinc-500">
                    Odběratel
                  </p>
                  <p className="mt-1 font-medium whitespace-pre-line">
                    {header.customerName || "—"}
                  </p>
                  <p className="mt-1 whitespace-pre-line text-zinc-700">
                    {header.customerAddress || ""}
                  </p>
                </div>
              </div>

              <table className="mt-8 w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-300 text-left text-xs uppercase text-zinc-500">
                    <th className="py-2">Datum</th>
                    <th className="py-2">Popis</th>
                    <th className="py-2 text-right">Množství</th>
                    <th className="py-2 text-right">J. cena</th>
                    <th className="py-2 text-right">Základ</th>
                    <th className="py-2 text-right">DPH {vatPercent}%</th>
                  </tr>
                </thead>
                <tbody>
                  {lines.map((line) => {
                    const vat = lineVatAmount(line.baseAmount, vatPercent);
                    return (
                      <tr key={line.id} className="border-b border-zinc-100">
                        <td className="py-2 align-top text-zinc-600 whitespace-nowrap">
                          {formatDateCz(line.dateIso)}
                        </td>
                        <td className="py-2 align-top">{line.description}</td>
                        <td className="py-2 align-top text-right whitespace-nowrap">
                          {formatMoneyCz(line.liters)} l
                        </td>
                        <td className="py-2 align-top text-right">
                          {formatMoneyCz(line.rate)} Kč
                        </td>
                        <td className="py-2 align-top text-right">
                          {formatMoneyCz(line.baseAmount)} Kč
                        </td>
                        <td className="py-2 align-top text-right">
                          {formatMoneyCz(vat)} Kč
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              <div className="mt-6 flex justify-end border-t border-zinc-200 pt-4">
                <div className="w-64 space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>Základ celkem</span>
                    <span>{formatMoneyCz(totals.baseTotal)} Kč</span>
                  </div>
                  <div className="flex justify-between">
                    <span>DPH {vatPercent} %</span>
                    <span>{formatMoneyCz(totals.vatTotal)} Kč</span>
                  </div>
                  <div className="flex justify-between text-base font-bold">
                    <span>Celkem k úhradě</span>
                    <span>{formatMoneyCz(totals.withVatTotal)} Kč</span>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
