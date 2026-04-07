"use client";

import { useCallback } from "react";
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
  provider: "gemini" | "ollama" | "deepseek";
  onProviderChange: (provider: "gemini" | "ollama" | "deepseek") => void;
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
              onProviderChange(
                e.target.value as "gemini" | "ollama" | "deepseek",
              )
            }
            className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm focus:border-amber-500/50 focus:outline-none focus:ring-1 focus:ring-amber-500/30"
          >
            <option value="gemini">Gemini (cloud, GEMINI_API_KEY)</option>
            <option value="deepseek">
              DeepSeek (cloud, DEEPSEEK_API_KEY)
            </option>
            <option value="ollama">Ollama (lokálně)</option>
          </select>
          <div className="space-y-1 text-xs text-zinc-500">
            <p className="flex items-start gap-1">
              <span className="mt-0.5 inline-block h-1.5 w-1.5 rounded-full bg-amber-500/50"></span>
              <span><strong>Gemini:</strong> cloudový model od Google, vyžaduje GEMINI_API_KEY</span>
            </p>
            <p className="flex items-start gap-1">
              <span className="mt-0.5 inline-block h-1.5 w-1.5 rounded-full bg-blue-500/50"></span>
              <span><strong>DeepSeek:</strong> cloudový model, vyžaduje DEEPSEEK_API_KEY pro korekci názvů</span>
            </p>
            <p className="flex items-start gap-1">
              <span className="mt-0.5 inline-block h-1.5 w-1.5 rounded-full bg-emerald-500/50"></span>
              <span><strong>Ollama:</strong> lokální model, vyžaduje nainstalovaný Ollama a stažený vision model</span>
            </p>
            <div className="mt-2 rounded border border-zinc-800 bg-zinc-900/50 p-2">
              <p className="text-xs text-zinc-400">
                <strong>Poznámka k DeepSeek:</strong> Pro OCR z obrázků je potřeba nastavit DEEPSEEK_VISION_API_BASE a OPENROUTER_API_KEY (nebo OPENAI_API_KEY). Korekce názvů používá standardní DEEPSEEK_API_KEY.
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
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="block text-xs font-medium text-zinc-500">
                  Model pro korekci
                </label>
                <select
                  value={autoFixSettings.provider}
                  onChange={(e) =>
                    onAutoFixSettingsChange({
                      ...autoFixSettings,
                      provider: e.target.value as "gemini" | "deepseek",
                    })
                  }
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm focus:border-amber-500/50 focus:outline-none focus:ring-1 focus:ring-amber-500/30"
                >
                  <option value="gemini">Gemini + Google Search</option>
                  <option value="deepseek">DeepSeek + web (Perplexity / Tavily)</option>
                </select>
                <p className="text-xs text-zinc-600">
                  {autoFixSettings.provider === 'gemini' 
                    ? 'Používá Google Search pro ověření názvů' 
                    : 'Používá Perplexity nebo Tavily pro webové vyhledávání'}
                </p>
              </div>
              
              <div className="space-y-2">
                <label className="flex items-center gap-2">
                  <div className="relative inline-flex h-5 w-9 items-center rounded-full bg-zinc-700 transition-colors has-[:checked]:bg-blue-600">
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
                      className="sr-only"
                    />
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${autoFixSettings.useWeb ? 'translate-x-5' : 'translate-x-1'}`} />
                  </div>
                  <div>
                    <span className={`text-sm ${autoFixSettings.provider === "deepseek" &&
                        (deepSeekWebSearchAvailable === null ||
                          !deepSeekWebSearchAvailable)
                        ? "text-zinc-600"
                        : "text-zinc-400"}`}>
                      Web vyhledávání
                    </span>
                    {autoFixSettings.provider === "deepseek" &&
                      (deepSeekWebSearchAvailable === null ||
                        !deepSeekWebSearchAvailable) && (
                      <p className="text-xs text-amber-500">
                        Vyžaduje PERPLEXITY_API_KEY nebo TAVILY_API_KEY
                      </p>
                    )}
                  </div>
                </label>
                <p className="text-xs text-zinc-600">
                  {autoFixSettings.useWeb
                    ? 'AI bude ověřovat názvy na webu'
                    : 'AI použije pouze interní znalosti'}
                </p>
              </div>
            </div>
            
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
            
            <div className="rounded border border-zinc-800 bg-zinc-900/50 p-3">
              <p className="text-xs text-zinc-400">
                <strong>Tip:</strong> {autoFixSettings.provider === 'gemini' 
                  ? 'Gemini využívá Google Search pro nejpřesnější výsledky.' 
                  : 'DeepSeek vyžaduje nastavení PERPLEXITY_API_KEY nebo TAVILY_API_KEY pro webové vyhledávání.'}
              </p>
            </div>
          </div>
        )}
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
