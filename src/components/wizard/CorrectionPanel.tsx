"use client";

import { formatDateCz } from "@/lib/invoice";
import type { EditableInvoiceLine } from "@/lib/invoice";

interface AutoFixSettings {
  enabled: boolean;
  provider: "gemini" | "deepseek";
  useWeb: boolean;
  idokladStyle: boolean;
  styleReference: string;
}

interface CorrectionPanelProps {
  lines: EditableInvoiceLine[];
  originalLines: EditableInvoiceLine[];
  fixNamesProvider: "gemini" | "deepseek";
  onFixNamesProviderChange: (provider: "gemini" | "deepseek") => void;
  fixNamesWeb: boolean;
  onFixNamesWebChange: (web: boolean) => void;
  userInstructions: string;
  onUserInstructionsChange: (instructions: string) => void;
  autoFixSettings: AutoFixSettings;
  onAutoFixSettingsChange: (settings: AutoFixSettings) => void;
  deepSeekWebSearchAvailable: boolean | null;
  correcting: boolean;
  showCorrection: boolean;
  onShowCorrectionChange: (show: boolean) => void;
  onRunCorrection: () => Promise<void>;
}

export default function CorrectionPanel({
  lines,
  originalLines,
  fixNamesProvider,
  onFixNamesProviderChange,
  fixNamesWeb,
  onFixNamesWebChange,
  userInstructions,
  onUserInstructionsChange,
  autoFixSettings,
  onAutoFixSettingsChange,
  deepSeekWebSearchAvailable,
  correcting,
  showCorrection,
  onShowCorrectionChange,
  onRunCorrection,
}: CorrectionPanelProps) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6">
      <h2 className="mb-4 text-sm font-medium uppercase tracking-wider text-zinc-500">
        Korekce názvů (AI)
      </h2>
      <div className="mb-6 space-y-4">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <h3 className="text-sm font-medium text-zinc-400">Základní nastavení</h3>
            <div className="group relative">
              <svg className="h-4 w-4 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="absolute bottom-full left-1/2 mb-2 hidden -translate-x-1/2 rounded-lg bg-zinc-800 p-3 text-xs text-zinc-300 shadow-xl group-hover:block w-64">
                <p>Vyber AI model pro korekci názvů. Gemini používá Google Search, DeepSeek používá Perplexity/Tavily pro webové vyhledávání.</p>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-4 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-zinc-500">Model:</span>
              <div className="flex gap-2">
                <label className="flex items-center gap-1.5 rounded-lg border border-zinc-700 px-3 py-1.5 hover:bg-zinc-800/50 has-[:checked]:border-amber-500 has-[:checked]:bg-amber-500/10">
                  <input
                    type="radio"
                    name="fixNamesProvider"
                    className="sr-only"
                    checked={fixNamesProvider === "gemini"}
                    onChange={() => onFixNamesProviderChange("gemini")}
                  />
                  <span className={`h-2.5 w-2.5 rounded-full border ${fixNamesProvider === "gemini" ? "border-amber-500 bg-amber-500" : "border-zinc-600"}`} />
                  <span className={fixNamesProvider === "gemini" ? "text-amber-400" : "text-zinc-400"}>
                    Gemini
                  </span>
                </label>
                <label className="flex items-center gap-1.5 rounded-lg border border-zinc-700 px-3 py-1.5 hover:bg-zinc-800/50 has-[:checked]:border-blue-500 has-[:checked]:bg-blue-500/10">
                  <input
                    type="radio"
                    name="fixNamesProvider"
                    className="sr-only"
                    checked={fixNamesProvider === "deepseek"}
                    onChange={() => onFixNamesProviderChange("deepseek")}
                  />
                  <span className={`h-2.5 w-2.5 rounded-full border ${fixNamesProvider === "deepseek" ? "border-blue-500 bg-blue-500" : "border-zinc-600"}`} />
                  <span className={fixNamesProvider === "deepseek" ? "text-blue-400" : "text-zinc-400"}>
                    DeepSeek
                  </span>
                </label>
              </div>
            </div>
          </div>
          <p className="mt-2 text-xs text-zinc-600">
            {fixNamesProvider === "gemini" 
              ? "Gemini využívá Google Search pro ověření názvů." 
              : "DeepSeek používá Perplexity nebo Tavily pro webové vyhledávání."}
          </p>
        </div>
        
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-2">
                <div className="relative inline-flex h-5 w-9 items-center rounded-full bg-zinc-700 transition-colors has-[:checked]:bg-emerald-600">
                  <input
                    type="checkbox"
                    checked={fixNamesWeb}
                    disabled={
                      fixNamesProvider === "deepseek" &&
                      (deepSeekWebSearchAvailable === null ||
                        !deepSeekWebSearchAvailable)
                    }
                    onChange={(e) => onFixNamesWebChange(e.target.checked)}
                    className="sr-only"
                  />
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${fixNamesWeb ? 'translate-x-5' : 'translate-x-1'}`} />
                </div>
                <div>
                  <span className={`text-sm ${fixNamesProvider === "deepseek" &&
                      (deepSeekWebSearchAvailable === null ||
                        !deepSeekWebSearchAvailable)
                      ? "text-zinc-600"
                      : "text-zinc-400"}`}>
                    Vyhledávat na webu
                  </span>
                  {fixNamesProvider === "deepseek" &&
                    (deepSeekWebSearchAvailable === null ||
                      !deepSeekWebSearchAvailable) && (
                    <p className="text-xs text-amber-500">
                      Vyžaduje PERPLEXITY_API_KEY nebo TAVILY_API_KEY
                    </p>
                  )}
                </div>
              </label>
              <div className="group relative">
                <svg className="h-4 w-4 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="absolute bottom-full left-1/2 mb-2 hidden -translate-x-1/2 rounded-lg bg-zinc-800 p-3 text-xs text-zinc-300 shadow-xl group-hover:block w-64">
                  <p>Povolit webové vyhledávání pro ověření názvů firem a míst. Gemini používá Google Search, DeepSeek používá Perplexity nebo Tavily.</p>
                </div>
              </div>
            </div>
            <p className="text-xs text-zinc-600">
              {fixNamesWeb
                ? 'AI bude ověřovat názvy na webu pro vyšší přesnost'
                : 'AI použije pouze interní znalosti bez připojení k webu'}
            </p>
          </div>
        </div>
      </div>
      <label className="mb-4 flex items-start gap-2">
        <input
          type="checkbox"
          className="mt-1 shrink-0"
          checked={autoFixSettings.idokladStyle}
          onChange={(e) =>
            onAutoFixSettingsChange({
              ...autoFixSettings,
              idokladStyle: e.target.checked,
            })
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
            onAutoFixSettingsChange({
              ...autoFixSettings,
              styleReference: e.target.value,
            })
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
          onChange={(e) => onUserInstructionsChange(e.target.value)}
          rows={2}
          className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm placeholder:text-zinc-600"
          placeholder="Např. Dopravní stavby Brno, ne Dopravni Stavby; ZEMAX, ne SEMAX..."
        />
      </label>
      <div className="flex flex-wrap items-center gap-4">
        <button
          type="button"
          onClick={() => void onRunCorrection()}
          disabled={correcting || lines.length === 0}
          className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-40 flex items-center gap-2 transition-colors duration-200"
        >
          {correcting ? (
            <>
              <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
              </svg>
              Opravuji…
            </>
          ) : (
            <>
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Opravit názvy
            </>
          )}
        </button>
        {lines.length === 0 && (
          <p className="text-sm text-amber-500 flex items-center gap-1">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.998-.833-2.732 0L4.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            Nejprve načti řádky z podkladu
          </p>
        )}
        {correcting && (
          <p className="text-sm text-zinc-500 flex items-center gap-1">
            <svg className="h-4 w-4 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Může to trvat až 30 sekund…
          </p>
        )}
      </div>

      {lines.length > 0 && (
        <div className="mt-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-zinc-300">Porovnání: původní → opravené</h3>
            <button
              type="button"
              onClick={() => onShowCorrectionChange(!showCorrection)}
              className="text-xs text-zinc-500 hover:text-zinc-300 flex items-center gap-1"
            >
              {showCorrection ? (
                <>
                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                  </svg>
                  Skrýt
                </>
              ) : (
                <>
                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                  Zobrazit
                </>
              )}
            </button>
          </div>
          {showCorrection && (
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
              {lines.every((line, i) => {
                const orig = originalLines[i];
                return !orig || orig.description === line.description;
              }) && (
                <div className="rounded-lg border border-zinc-800 bg-zinc-900/30 p-4 text-center">
                  <p className="text-sm text-zinc-400">Žádné změny – názvy zůstaly stejné.</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
