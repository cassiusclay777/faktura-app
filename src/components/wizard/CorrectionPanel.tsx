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
  rawTranscript: string;
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
  rawTranscript,
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
      <div className="mb-4 flex flex-wrap gap-4 text-sm">
        <span className="text-zinc-500">Model:</span>
        <label className="flex items-center gap-2">
          <input
            type="radio"
            name="fixNamesProvider"
            checked={fixNamesProvider === "gemini"}
            onChange={() => onFixNamesProviderChange("gemini")}
          />
          Gemini
        </label>
        <label className="flex items-center gap-2">
          <input
            type="radio"
            name="fixNamesProvider"
            checked={fixNamesProvider === "deepseek"}
            onChange={() => onFixNamesProviderChange("deepseek")}
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
              onChange={(e) => onFixNamesWebChange(e.target.checked)}
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
      <button
        type="button"
        onClick={() => void onRunCorrection()}
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
            onClick={() => onShowCorrectionChange(false)}
            className="text-xs text-zinc-500 hover:text-zinc-300"
          >
            Skrýt porovnání
          </button>
        </div>
      )}
    </div>
  );
}