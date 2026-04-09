"use client";

import { formatDateCz } from "@/lib/invoice";
import type { EditableInvoiceLine } from "@/lib/invoice";
import type { AutoFixSettings } from "@/components/wizard/UploadStep";

interface CorrectionPanelProps {
  lines: EditableInvoiceLine[];
  originalLines: EditableInvoiceLine[];
  userInstructions: string;
  onUserInstructionsChange: (instructions: string) => void;
  autoFixSettings: AutoFixSettings;
  onAutoFixSettingsChange: (settings: AutoFixSettings) => void;
  correcting: boolean;
  showCorrection: boolean;
  onShowCorrectionChange: (show: boolean) => void;
  onRunCorrection: () => Promise<void>;
}

export default function CorrectionPanel({
  lines,
  originalLines,
  userInstructions,
  onUserInstructionsChange,
  autoFixSettings,
  onAutoFixSettingsChange,
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
      <p className="mb-6 rounded-lg border border-amber-500/20 bg-amber-950/20 px-3 py-2 text-xs text-amber-100/90">
        <strong>DeepSeek</strong> (
        <code className="text-amber-200/80">DEEPSEEK_API_KEY</code>) + nástroj{" "}
        <strong>web_search</strong> (volitelně PERPLEXITY_API_KEY / TAVILY_API_KEY, jinak DuckDuckGo).
      </p>
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
      <label className="mb-4 block space-y-1">
        <span className="text-xs text-zinc-500">
          Vlastní instrukce pro opravu (názvy firem, které znáš, opravy překlepů)
        </span>
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
