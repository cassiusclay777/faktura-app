"use client";

import DropZone from "@/components/DropZone";

export interface AutoFixSettings {
  enabled: boolean;
  provider: "gemini" | "deepseek";
  useWeb: boolean;
  idokladStyle: boolean;
  styleReference: string;
}

interface UploadStepProps {
  pasteText: string;
  onPasteTextChange: (text: string) => void;
  provider: "gemini" | "ollama";
  onProviderChange: (provider: "gemini" | "ollama") => void;
  autoFixSettings: AutoFixSettings;
  onAutoFixSettingsChange: (settings: AutoFixSettings) => void;
  loading: boolean;
  deepSeekWebSearchAvailable: boolean | null;
  onProcess: (file: File | null) => Promise<void>;
}

export default function UploadStep({
  pasteText,
  onPasteTextChange,
  provider,
  onProviderChange,
  autoFixSettings,
  onAutoFixSettingsChange,
  loading,
  deepSeekWebSearchAvailable,
  onProcess,
}: UploadStepProps) {
  const handleFileSelected = (file: File) => {
    void onProcess(file);
  };

  const handleProcessText = () => {
    onProcess(null);
  };

  return (
    <section className="space-y-6 rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6">
      <h2 className="text-sm font-medium uppercase tracking-wider text-zinc-500">
        Načtení podkladu
      </h2>
      <label className="block space-y-2">
        <span className="text-sm text-zinc-400">Vložit text podkladu</span>
        <textarea
          value={pasteText}
          onChange={(e) => onPasteTextChange(e.target.value)}
          rows={12}
          className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 font-mono text-sm text-zinc-200 placeholder:text-zinc-600 focus:border-amber-500/50 focus:outline-none focus:ring-1 focus:ring-amber-500/30"
          placeholder="Datum na řádek, popis, pak řádek 31999 / 0,13 / 4 159,87 …"
        />
      </label>

      <div className="space-y-2">
        <span className="text-sm text-zinc-400">
          Nebo přetáhni / klikni pro soubor (.txt, PDF, obrázek)
        </span>
        <DropZone
          onFile={handleFileSelected}
          accept=".txt,.pdf,text/plain,application/pdf,image/jpeg,image/png,image/webp,image/gif"
          disabled={loading}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="space-y-2">
          <span className="text-sm text-zinc-400">Přepis z fotky</span>
          <select
            value={provider}
            onChange={(e) =>
              onProviderChange(e.target.value as "gemini" | "ollama")
            }
            className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm"
          >
            <option value="gemini">Gemini (cloud, GEMINI_API_KEY)</option>
            <option value="ollama">Ollama (lokálně)</option>
          </select>
        </label>
      </div>

      <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-4">
        <h3 className="mb-3 text-sm font-medium text-zinc-300">
          Automatická oprava názvů (po uploadu)
        </h3>
        <div className="grid gap-4 sm:grid-cols-3">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={autoFixSettings.enabled}
              onChange={(e) =>
                onAutoFixSettingsChange({
                  ...autoFixSettings,
                  enabled: e.target.checked,
                })
              }
            />
            <span className="text-sm text-zinc-400">Zapnuto</span>
          </label>
          <label className="space-y-1">
            <span className="text-xs text-zinc-500">Model</span>
            <select
              value={autoFixSettings.provider}
              onChange={(e) =>
                onAutoFixSettingsChange({
                  ...autoFixSettings,
                  provider: e.target.value as "gemini" | "deepseek",
                })
              }
              className="w-full rounded border border-zinc-700 bg-zinc-950 px-2 py-1 text-sm"
            >
              <option value="gemini">Gemini + Google Search</option>
              <option value="deepseek">DeepSeek + web (Perplexity / Tavily)</option>
            </select>
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={autoFixSettings.useWeb}
              disabled={
                autoFixSettings.provider === "deepseek" &&
                (deepSeekWebSearchAvailable === null ||
                  !deepSeekWebSearchAvailable)
              }
              onChange={(e) =>
                onAutoFixSettingsChange({
                  ...autoFixSettings,
                  useWeb: e.target.checked,
                })
              }
            />
            <span
              className={
                autoFixSettings.provider === "deepseek" &&
                (deepSeekWebSearchAvailable === null ||
                  !deepSeekWebSearchAvailable)
                  ? "text-sm text-zinc-600"
                  : "text-sm text-zinc-400"
              }
            >
              Web vyhledávání
            </span>
          </label>
          <label className="flex items-start gap-2 sm:col-span-3">
            <input
              type="checkbox"
              className="mt-0.5 shrink-0"
              checked={autoFixSettings.idokladStyle}
              onChange={(e) =>
                onAutoFixSettingsChange({
                  ...autoFixSettings,
                  idokladStyle: e.target.checked,
                })
              }
            />
            <span className="text-sm text-zinc-400">
              Styl řádků jako na faktuře z iDokladu (právní formy, „ + “ mezi
              zastávkami). Podrobnosti a vlastní vzor v záložce Faktura →
              Korekce názvů.
            </span>
          </label>
        </div>
        <p className="mt-2 text-xs text-zinc-600">
          Gemini: Google Search. DeepSeek + web:{" "}
          <code className="text-zinc-500">PERPLEXITY_API_KEY</code> nebo{" "}
          <code className="text-zinc-500">TAVILY_API_KEY</code> v .env.
        </p>
      </div>

      <button
        type="button"
        onClick={handleProcessText}
        disabled={loading || !pasteText.trim()}
        className="rounded-xl bg-amber-500 px-5 py-2.5 text-sm font-semibold text-zinc-950 hover:bg-amber-400 disabled:opacity-40"
      >
        {loading ? "Zpracovávám…" : "Zpracovat vložený text"}
      </button>
    </section>
  );
}