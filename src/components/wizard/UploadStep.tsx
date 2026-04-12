"use client";

import { useCallback } from "react";
import DropZone from "@/components/DropZone";

export interface AutoFixSettings {
  enabled: boolean;
  idokladStyle: boolean;
  styleReference: string;
}

interface UploadStepProps {
  pasteText: string;
  onPasteTextChange: (text: string) => void;
  provider: "ollama" | "deepseek";
  onProviderChange: (provider: "ollama" | "deepseek") => void;
  autoFixSettings: AutoFixSettings;
  onAutoFixSettingsChange: (settings: AutoFixSettings) => void;
  loading: boolean;
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
  onProcess,
}: UploadStepProps) {
  const handleFileSelected = useCallback(
    (file: File) => {
      void onProcess(file);
    },
    [onProcess],
  );

  const handleProcessText = useCallback(() => {
    void onProcess(null);
  }, [onProcess]);

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
          placeholder="Ruční podklad: datum na řádek, popis, pak 31999 / 0,13 / 4 159,87 … — PDF z iDokladu lze taky nahrát (načte se textová tabulka)."
        />
      </label>

      <div className="space-y-2">
        <span className="text-sm text-zinc-400">
          Nebo přetáhni / klikni (.txt, PDF s textem nebo sken, obrázek)
        </span>
        <DropZone
          onFile={handleFileSelected}
          accept=".txt,.pdf,text/plain,application/pdf,image/jpeg,image/png,image/webp,image/gif"
          disabled={loading}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-zinc-400">Přepis z fotky</span>
            <span className="text-xs text-zinc-600 sm:hidden">Vyber model</span>
          </div>
          <select
            aria-label="Model pro přepis z fotky (OCR)"
            title="Model pro přepis z fotky (OCR)"
            value={provider}
            onChange={(e) =>
              onProviderChange(
                e.target.value as "ollama" | "deepseek",
              )
            }
            className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm focus:border-amber-500/50 focus:outline-none focus:ring-1 focus:ring-amber-500/30"
          >
            <option value="deepseek">
              DeepSeek (cloud, DEEPSEEK_API_KEY)
            </option>
            <option value="ollama">Ollama (lokálně)</option>
          </select>
          <div className="space-y-1 text-xs text-zinc-500">
            <p className="flex items-start gap-1">
              <span className="mt-0.5 inline-block h-1.5 w-1.5 rounded-full bg-blue-500/50"></span>
              <span className="flex-1"><strong>DeepSeek:</strong> OCR z fotky/PDF přes stejný účet jako korekce názvů (DEEPSEEK_API_KEY)</span>
            </p>
            <p className="flex items-start gap-1">
              <span className="mt-0.5 inline-block h-1.5 w-1.5 rounded-full bg-emerald-500/50"></span>
              <span className="flex-1"><strong>Ollama:</strong> lokální model, vyžaduje nainstalovaný Ollama a stažený vision model</span>
            </p>
            <div className="mt-2 rounded border border-zinc-800 bg-zinc-900/50 p-2">
              <p className="text-xs text-zinc-400">
                <strong>Poznámka k DeepSeek:</strong> Pro OCR z obrázků stačí DEEPSEEK_API_KEY; volitelně můžeš nastavit DEEPSEEK_VISION_API_KEY. Endpoint bere DEEPSEEK_VISION_API_BASE, jinak DEEPSEEK_API_BASE (default https://api.deepseek.com/v1).
              </p>
            </div>
          </div>
        </label>
      </div>

      <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-medium text-zinc-300">
            Automatická oprava názvů (po uploadu)
          </h3>
          <label className="flex items-center gap-2">
            <div className="relative inline-flex h-5 w-9 items-center rounded-full bg-zinc-700 transition-colors has-[:checked]:bg-emerald-600">
              <input
                type="checkbox"
                checked={autoFixSettings.enabled}
                onChange={(e) =>
                  onAutoFixSettingsChange({
                    ...autoFixSettings,
                    enabled: e.target.checked,
                  })
                }
                className="sr-only"
              />
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${autoFixSettings.enabled ? 'translate-x-5' : 'translate-x-1'}`} />
            </div>
            <span className="text-sm text-zinc-400">
              {autoFixSettings.enabled ? 'Zapnuto' : 'Vypnuto'}
            </span>
          </label>
        </div>
        
        {autoFixSettings.enabled && (
          <div className="space-y-4 border-t border-zinc-800 pt-4">
            <p className="rounded-lg border border-amber-500/20 bg-amber-950/20 px-3 py-2 text-xs text-amber-100/90">
              <strong>Korekce názvů:</strong> DeepSeek (
              <code className="text-amber-200/80">DEEPSEEK_API_KEY</code>
              , model <code className="text-amber-200/80">DEEPSEEK_MODEL</code> / deepseek-chat) + nástroj{" "}
              <strong>web_search</strong> (Perplexity / Tavily pokud máš klíče v .env, jinak DuckDuckGo).
            </p>

            <div className="space-y-2">
              <label className="flex items-start gap-3">
                <div className="relative mt-0.5 inline-flex h-5 w-9 items-center rounded-full bg-zinc-700 transition-colors has-[:checked]:bg-purple-600">
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={autoFixSettings.idokladStyle}
                    onChange={(e) =>
                      onAutoFixSettingsChange({
                        ...autoFixSettings,
                        idokladStyle: e.target.checked,
                      })
                    }
                  />
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${autoFixSettings.idokladStyle ? 'translate-x-5' : 'translate-x-1'}`} />
                </div>
                <div className="flex-1">
                  <span className="text-sm font-medium text-zinc-400">
                    Formátování podle iDokladu
                  </span>
                  <p className="mt-1 text-xs text-zinc-500">
                    Použije styl řádků jako na faktuře z iDokladu (správné právní formy, „ + “ mezi zastávkami). 
                    Podrobnosti a vlastní vzor najdete v záložce Faktura → Korekce názvů.
                  </p>
                </div>
              </label>
            </div>
            
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <button
          type="button"
          onClick={handleProcessText}
          disabled={loading || !pasteText.trim()}
          className="rounded-xl bg-amber-500 px-5 py-2.5 text-sm font-semibold text-zinc-950 hover:bg-amber-400 disabled:opacity-40 flex items-center gap-2 transition-colors duration-200"
        >
          {loading ? (
            <>
              <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
              </svg>
              Zpracovávám…
            </>
          ) : (
            <>
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Zpracovat vložený text
            </>
          )}
        </button>
        {!pasteText.trim() && (
          <p className="text-sm text-zinc-500">
            Pro zpracování vlož text do pole výše
          </p>
        )}
      </div>
    </section>
  );
}
