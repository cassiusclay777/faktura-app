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
import {
  buildIdokladExportText,
  IDOKLAD_ISSUED_INVOICE_CREATE_URL,
} from "@/lib/idokladExport";
import {
  clearInvoiceHistory,
  deleteInvoiceFromHistory,
  loadInvoiceHistory,
  saveInvoiceToHistory,
  type SavedInvoice,
} from "@/lib/invoiceHistory";
import { readJsonResponse } from "@/lib/readJsonResponse";
import AppHeader from "@/components/ui/AppHeader";
import UploadStep from "@/components/wizard/UploadStep";
import type { AutoFixSettings } from "@/components/wizard/UploadStep";

const HEADER_STORAGE_KEY = "faktura-invoice-header-v1";
const AUTOFIX_STORAGE_KEY = "faktura-autofix-settings-v1";

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



function loadAutoFixSettings(): AutoFixSettings {
  const defaults: AutoFixSettings = {
    enabled: true,
    provider: "gemini",
    useWeb: true,
    idokladStyle: true,
    styleReference: "",
  };
  if (typeof window === "undefined") return defaults;
  try {
    const raw = localStorage.getItem(AUTOFIX_STORAGE_KEY);
    if (!raw) return defaults;
    const o = JSON.parse(raw) as Partial<AutoFixSettings>;
    return { ...defaults, ...o };
  } catch {
    return defaults;
  }
}

export default function FakturaApp() {
  const [header, setHeader] = useState<InvoiceHeader>(() => emptyHeader());
  const [autoFixSettings, setAutoFixSettings] = useState<AutoFixSettings>(() => ({
    enabled: true,
    provider: "gemini",
    useWeb: true,
    idokladStyle: true,
    styleReference: "",
  }));
  const [lines, setLines] = useState<EditableInvoiceLine[]>([]);
  const [rawTranscript, setRawTranscript] = useState("");
  const [pasteText, setPasteText] = useState("");
  const [provider, setProvider] = useState<"gemini" | "ollama">("gemini");
  const [fixNamesWeb, setFixNamesWeb] = useState(false);
  const [fixNamesProvider, setFixNamesProvider] = useState<
    "gemini" | "deepseek"
  >("gemini");
  const [userInstructions, setUserInstructions] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<"podklad" | "faktura" | "nahled">("podklad");
  const [originalLines, setOriginalLines] = useState<EditableInvoiceLine[]>([]);
  const [correcting, setCorrecting] = useState(false);
  const [showCorrection, setShowCorrection] = useState(false);
  /** Server má TAVILY_API_KEY — nutné pro DeepSeek + „Vyhledávat na webu“. */
  const [deepSeekWebSearchAvailable, setDeepSeekWebSearchAvailable] =
    useState<boolean | null>(null);
  const [idokladExportHint, setIdokladExportHint] = useState<string | null>(
    null,
  );
  const [historyItems, setHistoryItems] = useState<SavedInvoice[]>([]);
  const [saveInvoiceLabel, setSaveInvoiceLabel] = useState("");
  const [aresLoading, setAresLoading] = useState<"supplier" | "customer" | null>(
    null,
  );

  const refreshHistory = useCallback(() => {
    setHistoryItems(loadInvoiceHistory());
  }, []);

  useEffect(() => {
    setHeader(loadHeader());
    setAutoFixSettings(loadAutoFixSettings());
    refreshHistory();
  }, [refreshHistory]);

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/config")
      .then((r) => r.json())
      .then(
        (data: {
          deepSeekWebSearchConfigured?: boolean;
          tavilyConfigured?: boolean;
          perplexityConfigured?: boolean;
        }) => {
          const ok =
            data.deepSeekWebSearchConfigured ??
            !!(data.tavilyConfigured || data.perplexityConfigured);
          if (!cancelled) setDeepSeekWebSearchAvailable(!!ok);
        },
      )
      .catch(() => {
        if (!cancelled) setDeepSeekWebSearchAvailable(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (fixNamesProvider === "deepseek" && deepSeekWebSearchAvailable === false) {
      setFixNamesWeb(false);
    }
  }, [fixNamesProvider, deepSeekWebSearchAvailable]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem(HEADER_STORAGE_KEY, JSON.stringify(header));
  }, [header]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem(AUTOFIX_STORAGE_KEY, JSON.stringify(autoFixSettings));
  }, [autoFixSettings]);

  const vatPercent = DEFAULT_VAT_PERCENT;
  const totals = useMemo(
    () => totalsFromLines(lines, vatPercent),
    [lines, vatPercent],
  );

  const openIdokladCreate = useCallback(() => {
    window.open(
      IDOKLAD_ISSUED_INVOICE_CREATE_URL,
      "_blank",
      "noopener,noreferrer",
    );
  }, []);

  const handleSaveToHistory = useCallback(() => {
    if (lines.length === 0) {
      setError("Nejdřív načti podklad (řádky faktury).");
      return;
    }
    saveInvoiceToHistory(
      header,
      lines,
      rawTranscript,
      saveInvoiceLabel.trim() || undefined,
    );
    setSaveInvoiceLabel("");
    refreshHistory();
  }, [header, lines, rawTranscript, saveInvoiceLabel, refreshHistory]);

  const loadFromHistory = useCallback((item: SavedInvoice) => {
    setHeader(item.header);
    setLines(item.lines);
    setRawTranscript(item.rawTranscript);
    setOriginalLines(item.lines);
    setTab("faktura");
  }, []);

  const removeHistoryItem = useCallback(
    (id: string) => {
      deleteInvoiceFromHistory(id);
      refreshHistory();
    },
    [refreshHistory],
  );

  const handleClearHistory = useCallback(() => {
    if (typeof window !== "undefined" && window.confirm("Opravdu smazat celou historii faktur?")) {
      clearInvoiceHistory();
      refreshHistory();
    }
  }, [refreshHistory]);

  const fillFromAres = useCallback(
    async (side: "supplier" | "customer") => {
      const rawIco = side === "supplier" ? header.supplierIco : header.customerIco;
      const clean = rawIco.replace(/\s/g, "");
      if (!/^\d{8}$/.test(clean)) {
        setError("Zadej platné 8místné IČO.");
        return;
      }
      setAresLoading(side);
      setError(null);
      try {
        const res = await fetch(`/api/ares?ico=${encodeURIComponent(clean)}`);
        const data = await readJsonResponse<{
          error?: string;
          ico?: string;
          name?: string;
          address?: string;
          dic?: string;
        }>(res);
        if (!res.ok) {
          throw new Error(data.error ?? `HTTP ${res.status}`);
        }
        if (!data.name) {
          throw new Error("Neočekávaná odpověď serveru.");
        }
        setHeader((h) =>
          side === "supplier"
            ? {
                ...h,
                supplierIco: data.ico ?? clean,
                supplierName: data.name || h.supplierName,
                supplierAddress: data.address || h.supplierAddress,
              }
            : {
                ...h,
                customerIco: data.ico ?? clean,
                customerName: data.name || h.customerName,
                customerAddress: data.address || h.customerAddress,
                customerDic: data.dic || h.customerDic,
              },
        );
      } catch (e) {
        setError(formatUnknownError(e));
      } finally {
        setAresLoading(null);
      }
    },
    [header.supplierIco, header.customerIco],
  );

  const copyIdokladExport = useCallback(async () => {
    const text = buildIdokladExportText(header, lines, vatPercent);
    try {
      await navigator.clipboard.writeText(text);
      setIdokladExportHint("Údaje zkopírovány do schránky.");
      window.setTimeout(() => setIdokladExportHint(null), 3500);
    } catch {
      setIdokladExportHint(
        "Schránka nedostupná (oprávnění prohlížeče). Zkopíruj údaje ručně z náhledu.",
      );
      window.setTimeout(() => setIdokladExportHint(null), 5000);
    }
  }, [header, lines, vatPercent]);

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
        const rawText = data.rawTranscript ?? "";
        const parsedLines = tripLinesToEditable(data.parsed.lines);
        setRawTranscript(rawText);
        setLines(parsedLines);
        setOriginalLines(parsedLines);

        // Automatická korekce po uploadu obrázku/PDF
        if (autoFixSettings.enabled && file && file.size > 0) {
          setCorrecting(true);
          try {
            const fd2 = new FormData();
            fd2.append("rawText", rawText);
            fd2.append("provider", provider);
            fd2.append("fixNames", "true");
            fd2.append("fixNamesProvider", autoFixSettings.provider);
            fd2.append("fixNamesWeb", String(autoFixSettings.useWeb));
            fd2.append("fixNamesIdokladStyle", String(autoFixSettings.idokladStyle));
            if (autoFixSettings.styleReference.trim()) {
              fd2.append("styleReference", autoFixSettings.styleReference.trim());
            }

            const res2 = await fetch("/api/process", { method: "POST", body: fd2 });
            const data2 = await readJsonResponse<{
              error?: string;
              parsed?: ParsedPodklad;
            }>(res2);
            if (!res2.ok) {
              throw new Error(
                data2.error ?? (res2.statusText || `HTTP ${res2.status}`),
              );
            }
            if (data2.parsed) {
              const correctedLines = tripLinesToEditable(data2.parsed.lines);
              setLines(correctedLines);
              setShowCorrection(true);
            }
          } catch (e) {
            // Korekce selhala – necháme původní parsing
            console.error("Auto-fix selhal:", e);
          } finally {
            setCorrecting(false);
          }
        }

        setTab("faktura");
      } catch (e) {
        setError(formatUnknownError(e));
      } finally {
        setLoading(false);
      }
    },
    [pasteText, provider, autoFixSettings],
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
      fd.append("fixNamesIdokladStyle", String(autoFixSettings.idokladStyle));
      if (autoFixSettings.styleReference.trim()) {
        fd.append("styleReference", autoFixSettings.styleReference.trim());
      }
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
    autoFixSettings.idokladStyle,
    autoFixSettings.styleReference,
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
      <AppHeader currentTab={tab} onTabChange={setTab} />

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
          <UploadStep
            pasteText={pasteText}
            onPasteTextChange={setPasteText}
            provider={provider}
            onProviderChange={setProvider}
            autoFixSettings={autoFixSettings}
            onAutoFixSettingsChange={setAutoFixSettings}
            loading={loading}
            deepSeekWebSearchAvailable={deepSeekWebSearchAvailable}
            onProcess={processPodklad}
          />
        )}

        {tab === "faktura" && (
          <section className="space-y-6">
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
                    onChange={(e) => setSaveInvoiceLabel(e.target.value)}
                    placeholder="např. podle odběratele nebo VS"
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm placeholder:text-zinc-600"
                  />
                </label>
                <button
                  type="button"
                  onClick={handleSaveToHistory}
                  className="rounded-xl border border-amber-600/60 bg-amber-950/40 px-4 py-2 text-sm font-medium text-amber-100 hover:bg-amber-900/50"
                >
                  Uložit aktuální fakturu
                </button>
                {historyItems.length > 0 && (
                  <button
                    type="button"
                    onClick={handleClearHistory}
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
                          onClick={() => loadFromHistory(item)}
                          className="rounded-lg bg-zinc-800 px-3 py-1.5 text-xs text-zinc-200 hover:bg-zinc-700"
                        >
                          Načíst
                        </button>
                        <button
                          type="button"
                          onClick={() => removeHistoryItem(item.id)}
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

            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6">
              <h2 className="mb-4 text-sm font-medium uppercase tracking-wider text-zinc-500">
                Dodavatel a odběratel
              </h2>
              <div className="grid gap-8 lg:grid-cols-2">
                <div className="space-y-4">
                  <p className="text-xs font-semibold uppercase text-zinc-500">
                    Dodavatel
                  </p>
                  <label className="block space-y-1">
                    <span className="text-xs text-zinc-500">Název</span>
                    <input
                      value={header.supplierName}
                      onChange={(e) =>
                        setHeader((h) => ({ ...h, supplierName: e.target.value }))
                      }
                      className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm"
                    />
                  </label>
                  <label className="block space-y-1">
                    <span className="text-xs text-zinc-500">IČ</span>
                    <div className="flex gap-2">
                      <input
                        value={header.supplierIco}
                        onChange={(e) =>
                          setHeader((h) => ({ ...h, supplierIco: e.target.value }))
                        }
                        className="min-w-0 flex-1 rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm"
                        inputMode="numeric"
                        placeholder="8 číslic"
                        autoComplete="off"
                      />
                      <button
                        type="button"
                        onClick={() => void fillFromAres("supplier")}
                        disabled={aresLoading !== null}
                        title="Vyhledat název a sídlo v ARES podle IČ"
                        aria-label="Vyhledat dodavatele v ARES podle IČ"
                        className="shrink-0 rounded-lg border border-zinc-600 bg-zinc-800 px-3 py-2 text-xs font-medium text-zinc-200 hover:bg-zinc-700 disabled:opacity-50"
                      >
                        {aresLoading === "supplier" ? "…" : "Vyhledat"}
                      </button>
                    </div>
                  </label>
                  <label className="block space-y-1">
                    <span className="text-xs text-zinc-500">Sídlo</span>
                    <textarea
                      value={header.supplierAddress}
                      onChange={(e) =>
                        setHeader((h) => ({
                          ...h,
                          supplierAddress: e.target.value,
                        }))
                      }
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
                        onChange={(e) =>
                          setHeader((h) => ({
                            ...h,
                            supplierPaymentMethod: e.target.value,
                          }))
                        }
                        className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm"
                      />
                    </label>
                    <label className="mb-3 block space-y-1">
                      <span className="text-xs text-zinc-500">
                        Bankovní účet (popisek)
                      </span>
                      <input
                        value={header.supplierBankLabel}
                        onChange={(e) =>
                          setHeader((h) => ({
                            ...h,
                            supplierBankLabel: e.target.value,
                          }))
                        }
                        placeholder="např. Hlavní bankovní spojení"
                        className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm placeholder:text-zinc-600"
                      />
                    </label>
                    <label className="mb-3 block space-y-1">
                      <span className="text-xs text-zinc-500">Číslo účtu</span>
                      <input
                        value={header.supplierAccountNumber}
                        onChange={(e) =>
                          setHeader((h) => ({
                            ...h,
                            supplierAccountNumber: e.target.value,
                          }))
                        }
                        placeholder="např. 233652456/0600"
                        className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm placeholder:text-zinc-600"
                      />
                    </label>
                    <label className="mb-3 block space-y-1">
                      <span className="text-xs text-zinc-500">IBAN</span>
                      <input
                        value={header.supplierIban}
                        onChange={(e) =>
                          setHeader((h) => ({
                            ...h,
                            supplierIban: e.target.value,
                          }))
                        }
                        className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 font-mono text-xs"
                      />
                    </label>
                    <label className="block space-y-1">
                      <span className="text-xs text-zinc-500">SWIFT / BIC</span>
                      <input
                        value={header.supplierSwift}
                        onChange={(e) =>
                          setHeader((h) => ({
                            ...h,
                            supplierSwift: e.target.value,
                          }))
                        }
                        className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 font-mono text-xs"
                      />
                    </label>
                  </div>
                </div>

                <div className="space-y-4">
                  <p className="text-xs font-semibold uppercase text-zinc-500">
                    Odběratel
                  </p>
                  <label className="block space-y-1">
                    <span className="text-xs text-zinc-500">Odběratel (název)</span>
                    <input
                      value={header.customerName}
                      onChange={(e) =>
                        setHeader((h) => ({
                          ...h,
                          customerName: e.target.value,
                        }))
                      }
                      placeholder="např. A + S, s.r.o."
                      className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm placeholder:text-zinc-600"
                    />
                  </label>
                  <label className="block space-y-1">
                    <span className="text-xs text-zinc-500">IČ</span>
                    <div className="flex gap-2">
                      <input
                        value={header.customerIco}
                        onChange={(e) =>
                          setHeader((h) => ({
                            ...h,
                            customerIco: e.target.value,
                          }))
                        }
                        className="min-w-0 flex-1 rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm"
                        inputMode="numeric"
                        placeholder="8 číslic"
                        autoComplete="off"
                      />
                      <button
                        type="button"
                        onClick={() => void fillFromAres("customer")}
                        disabled={aresLoading !== null}
                        title="Vyhledat název, sídlo a DIČ v ARES podle IČ"
                        aria-label="Vyhledat odběratele v ARES podle IČ"
                        className="shrink-0 rounded-lg border border-zinc-600 bg-zinc-800 px-3 py-2 text-xs font-medium text-zinc-200 hover:bg-zinc-700 disabled:opacity-50"
                      >
                        {aresLoading === "customer" ? "…" : "Vyhledat"}
                      </button>
                    </div>
                  </label>
                  <label className="block space-y-1">
                    <span className="text-xs text-zinc-500">DIČ</span>
                    <input
                      value={header.customerDic}
                      onChange={(e) =>
                        setHeader((h) => ({
                          ...h,
                          customerDic: e.target.value,
                        }))
                      }
                      placeholder="např. CZ25584553"
                      className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm placeholder:text-zinc-600"
                    />
                  </label>
                  <label className="flex cursor-pointer items-center gap-2 text-sm text-zinc-300">
                    <input
                      type="checkbox"
                      checked={header.customerReliableVatPayer}
                      onChange={(e) =>
                        setHeader((h) => ({
                          ...h,
                          customerReliableVatPayer: e.target.checked,
                        }))
                      }
                      className="rounded border-zinc-600"
                    />
                    Spolehlivý plátce DPH
                  </label>
                  <label className="block space-y-1">
                    <span className="text-xs text-zinc-500">Sídlo</span>
                    <textarea
                      value={header.customerAddress}
                      onChange={(e) =>
                        setHeader((h) => ({
                          ...h,
                          customerAddress: e.target.value,
                        }))
                      }
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
                    onChange={(e) =>
                      setHeader((h) => ({ ...h, issueDate: e.target.value }))
                    }
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm"
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-xs text-zinc-500">Datum splatnosti</span>
                  <input
                    type="date"
                    value={header.dueDate}
                    onChange={(e) =>
                      setHeader((h) => ({ ...h, dueDate: e.target.value }))
                    }
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm"
                  />
                </label>
                <label className="space-y-1 sm:col-span-2">
                  <span className="text-xs text-zinc-500">Variabilní symbol</span>
                  <input
                    value={header.variableSymbol}
                    onChange={(e) =>
                      setHeader((h) => ({
                        ...h,
                        variableSymbol: e.target.value,
                      }))
                    }
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm"
                  />
                </label>
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
                    checked={fixNamesProvider === "deepseek"}
                    onChange={() => setFixNamesProvider("deepseek")}
                  />
                  DeepSeek
                </label>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 mb-4">
                <label
                  className={`flex flex-col gap-1 text-sm sm:flex-row sm:items-center sm:gap-2 ${
                    fixNamesProvider === "deepseek" &&
                    (deepSeekWebSearchAvailable === null ||
                      !deepSeekWebSearchAvailable)
                      ? "opacity-70"
                      : ""
                  }`}
                  title="Gemini: Google Search. DeepSeek: web_search na serveru — PERPLEXITY_API_KEY nebo TAVILY_API_KEY v .env."
                >
                  <span className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={fixNamesWeb}
                      disabled={
                        fixNamesProvider === "deepseek" &&
                        (deepSeekWebSearchAvailable === null ||
                          !deepSeekWebSearchAvailable)
                      }
                      onChange={(e) => setFixNamesWeb(e.target.checked)}
                    />
                    Vyhledávat na webu
                  </span>
                  <span className="text-xs text-zinc-600">
                    Gemini: Google Search · DeepSeek: Perplexity nebo Tavily
                  </span>
                </label>
              </div>
              <label className="mb-4 flex items-start gap-2">
                <input
                  type="checkbox"
                  className="mt-1 shrink-0"
                  checked={autoFixSettings.idokladStyle}
                  onChange={(e) =>
                    setAutoFixSettings((s) => ({
                      ...s,
                      idokladStyle: e.target.checked,
                    }))
                  }
                />
                <span className="text-sm text-zinc-400">
                  Styl řádků jako na vydané faktuře z iDokladu (vestavěný vzor z
                  ukázkové faktury; lze nahradit vlastním textem níže).
                </span>
              </label>
              <label className="mb-4 block space-y-1">
                <span className="text-xs text-zinc-500">
                  Vlastní ukázky řádků místo vestavěného vzoru (volitelné)
                </span>
                <textarea
                  value={autoFixSettings.styleReference}
                  disabled={!autoFixSettings.idokladStyle}
                  onChange={(e) =>
                    setAutoFixSettings((s) => ({
                      ...s,
                      styleReference: e.target.value,
                    }))
                  }
                  rows={3}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm placeholder:text-zinc-600 disabled:opacity-50"
                  placeholder="Nech prázdné pro vestavěný vzor, nebo vlož 2–5 řádků popisu z vlastní faktury z iDokladu…"
                />
              </label>
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
            <div className="flex flex-col gap-3 print:hidden sm:flex-row sm:flex-wrap sm:items-center">
              <button
                type="button"
                onClick={() => window.print()}
                className="rounded-xl bg-amber-500 px-5 py-2.5 text-sm font-semibold text-zinc-950 hover:bg-amber-400"
              >
                Tisk / Uložit jako PDF
              </button>
              <button
                type="button"
                onClick={() => void copyIdokladExport()}
                className="rounded-xl border border-zinc-600 bg-zinc-800 px-5 py-2.5 text-sm font-semibold text-zinc-100 hover:bg-zinc-700"
              >
                Zkopírovat údaje pro iDoklad
              </button>
              <button
                type="button"
                onClick={openIdokladCreate}
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
                        <p className="mt-1 font-mono text-zinc-700">
                          <span className="font-sans text-zinc-500">IBAN: </span>
                          {header.supplierIban}
                        </p>
                      )}
                      {header.supplierSwift && (
                        <p className="mt-1 font-mono text-zinc-700">
                          <span className="font-sans text-zinc-500">SWIFT: </span>
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
                    <p className="mt-2 text-zinc-700">
                      <span className="text-zinc-500">IČ: </span>
                      {header.customerIco}
                    </p>
                  )}
                  {header.customerDic && (
                    <p className="mt-1 text-zinc-700">
                      <span className="text-zinc-500">DIČ: </span>
                      {header.customerDic}
                    </p>
                  )}
                  {header.customerReliableVatPayer && (
                    <p className="mt-1 text-zinc-700">Spolehlivý plátce DPH</p>
                  )}
                  {header.customerAddress && (
                    <p className="mt-2 whitespace-pre-line text-zinc-700">
                      <span className="text-zinc-500">Sídlo: </span>
                      {header.customerAddress}
                    </p>
                  )}
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

              <div className="mt-6 flex flex-col gap-4 border-t border-zinc-200 pt-4 sm:flex-row sm:items-start sm:justify-between">
                {header.variableSymbol &&
                  (header.supplierAccountNumber || header.supplierIban) && (
                    <p className="max-w-md text-sm text-zinc-600">
                      Úhrada převodem{header.supplierPaymentMethod ? ` (${header.supplierPaymentMethod})` : ""}
                      {header.supplierAccountNumber && (
                        <>
                          {" "}
                          na účet <span className="font-mono text-zinc-800">{header.supplierAccountNumber}</span>
                        </>
                      )}
                      {header.supplierIban && !header.supplierAccountNumber && (
                        <>
                          {" "}
                          <span className="font-mono text-zinc-800">{header.supplierIban}</span>
                        </>
                      )}
                      . Variabilní symbol:{" "}
                      <span className="font-mono font-medium text-zinc-800">
                        {header.variableSymbol}
                      </span>
                      .
                    </p>
                  )}
                <div className="w-full space-y-1 text-sm sm:ml-auto sm:w-64">
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
