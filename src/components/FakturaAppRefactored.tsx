"use client";

import React, { Suspense } from "react";
import type { ParsedPodklad, PodkladParseFormat } from "invoice-assistant";
import { formatUnknownError } from "@/lib/formatUnknownError";
import { buildIdokladExportText } from "@/lib/idokladExport";
import { tripLinesToEditable } from "@/lib/invoice";
import { readJsonResponse } from "@/lib/readJsonResponse";
import AppHeader from "@/components/ui/AppHeader";
import UploadStep from "@/components/wizard/UploadStep";
import { useInvoiceState } from "@/hooks/useInvoiceState";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { ApiCallStatus, ProcessingState } from "@/components/LoadingState";

interface ProcessApiResponse {
  rawTranscript?: string;
  parsed: ParsedPodklad;
  parseFormat?: PodkladParseFormat;
  error?: string;
}

function podkladNoticeFromParse(
  parseFormat: PodkladParseFormat | undefined,
  lineCount: number,
  rawLen: number,
): string | null {
  if (parseFormat === "invoice_loose" && lineCount > 0) {
    return "Řádky jsme odvodili z tabulkového textu PDF (typicky iDoklad). Zkontroluj základy a popisy — jde o heuristiku, ne o účetní přesnost.";
  }
  if (lineCount === 0 && rawLen > 120) {
    return "Z dokumentu se nepodařilo vyčíst řádky faktury (očekává se buď ruční podklad „datum + litry/sazba/základ“, nebo tabulka s částkami jako u iDokladu). Zkus jiný soubor nebo vlož text ručně.";
  }
  return null;
}

interface AresApiResponse {
  name?: string;
  address?: string;
  dic?: string;
  error?: string;
}

export default function FakturaAppRefactored() {
  const {
    // State
    header,
    autoFixSettings,
    lines,
    rawTranscript,
    pasteText,
    provider,
    userInstructions,
    loading,
    error,
    tab,
    originalLines,
    correcting,
    showCorrection,
    idokladExportHint,
    podkladNotice,
    historyItems,
    saveInvoiceLabel,
    aresLoading,

    // Computed values
    vatPercent,

    // Setters
    setHeader,
    setAutoFixSettings,
    setLines,
    setPasteText,
    setProvider,
    setUserInstructions,
    setLoading,
    setError,
    setTab,
    setOriginalLines,
    setCorrecting,
    setShowCorrection,
    setIdokladExportHint,
    setPodkladNotice,
    setSaveInvoiceLabel,
    setAresLoading,

    // Actions
    handleSaveToHistory,
    loadFromHistory,
    removeHistoryItem,
    handleClearHistory,
    openIdokladCreate,
    handleParsedPodklad,
    updateLine,
    removeLine,
    extractHeaderHints,
  } = useInvoiceState();

  const InvoiceStep = React.lazy(() => import("@/components/wizard/InvoiceStep"));
  const PreviewStep = React.lazy(() => import("@/components/wizard/PreviewStep"));

  const handleFileUpload = async (file: File) => {
    setLoading(true);
    setError(null);
    setPodkladNotice(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("provider", provider);
      formData.append("fixNames", autoFixSettings.enabled.toString());
      formData.append("userInstructions", userInstructions);
      formData.append("fixNamesIdokladStyle", autoFixSettings.idokladStyle.toString());
      if (autoFixSettings.styleReference) {
        formData.append("styleReference", autoFixSettings.styleReference);
      }

       const response = await fetch("/api/process", {
        method: "POST",
        body: formData,
      });

      const result = await readJsonResponse<ProcessApiResponse>(response);
      
      if (!response.ok) {
        throw new Error(result.error || `HTTP ${response.status}`);
      }

      const raw = result.rawTranscript || "";
      handleParsedPodklad(
        result.parsed,
        raw,
        podkladNoticeFromParse(
          result.parseFormat,
          result.parsed.lines.length,
          raw.length,
        ),
      );

      // Extract header hints from raw text
      if (raw) {
        extractHeaderHints(raw);
      }
    } catch (err) {
      setError(formatUnknownError(err));
      console.error("File upload error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handlePasteProcess = async () => {
    if (!pasteText.trim()) {
      setError("Vlož text pro zpracování.");
      return;
    }

    setLoading(true);
    setError(null);
    setPodkladNotice(null);

    try {
      const response = await fetch("/api/process", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          rawText: pasteText,
          provider,
          fixNames: autoFixSettings.enabled,
          userInstructions,
          fixNamesIdokladStyle: autoFixSettings.idokladStyle,
          styleReference: autoFixSettings.styleReference || undefined,
        }),
      });

      const result = await readJsonResponse<ProcessApiResponse>(response);
      
      if (!response.ok) {
        throw new Error(result.error || `HTTP ${response.status}`);
      }

      handleParsedPodklad(
        result.parsed,
        pasteText,
        podkladNoticeFromParse(
          result.parseFormat,
          result.parsed.lines.length,
          pasteText.length,
        ),
      );

      // Extract header hints from pasted text
      extractHeaderHints(pasteText);
    } catch (err) {
      setError(formatUnknownError(err));
      console.error("Paste processing error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleCorrection = async () => {
    if (lines.length === 0) {
      setError("Nejdřív načti podklad (řádky faktury).");
      return;
    }

    setCorrecting(true);
    setError(null);
    setOriginalLines(lines);

    try {
      const response = await fetch("/api/process", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          rawText: rawTranscript,
          provider,
          fixNames: true,
          userInstructions,
          fixNamesIdokladStyle: autoFixSettings.idokladStyle,
          styleReference: autoFixSettings.styleReference || undefined,
        }),
      });

      const result = await readJsonResponse<ProcessApiResponse>(response);
      
      if (!response.ok) {
        throw new Error(result.error || `HTTP ${response.status}`);
      }

      const corrected = tripLinesToEditable(result.parsed.lines || []);
      setLines(corrected);
      setShowCorrection(true);
    } catch (err) {
      setError(formatUnknownError(err));
      console.error("Correction error:", err);
    } finally {
      setCorrecting(false);
    }
  };

  const handleAresLookup = async (type: "supplier" | "customer") => {
    const ico = type === "supplier" ? header.supplierIco : header.customerIco;
    if (!ico.trim()) {
      setError(`Zadej IČO pro ${type === "supplier" ? "dodavatele" : "odběratele"}.`);
      return;
    }

    setAresLoading(type);
    setError(null);
    
    try {
      const response = await fetch(`/api/ares?ico=${encodeURIComponent(ico)}`);
      const result = await readJsonResponse<AresApiResponse>(response);
      
      if (!response.ok) {
        throw new Error(result.error || `HTTP ${response.status}`);
      }

      setHeader(prev => ({
        ...prev,
        ...(type === "supplier"
          ? {
              supplierName: result.name || prev.supplierName,
              supplierAddress: result.address || prev.supplierAddress,
            }
          : {
              customerName: result.name || prev.customerName,
              customerAddress: result.address || prev.customerAddress,
              customerDic: result.dic || prev.customerDic,
            }),
      }));
    } catch (err) {
      setError(formatUnknownError(err));
      console.error("ARES lookup error:", err);
    } finally {
      setAresLoading(null);
    }
  };

  const copyIdokladExport = () => {
    const text = buildIdokladExportText(header, lines, vatPercent);
    navigator.clipboard.writeText(text).then(
      () => {
        setIdokladExportHint("Zkopírováno do schránky!");
        setTimeout(() => setIdokladExportHint(null), 3000);
      },
      (err) => {
        setError("Nepodařilo se zkopírovat do schránky: " + String(err));
      },
    );
  };

  // Render current tab content
  const renderTabContent = () => {
    switch (tab) {
      case "podklad":
        return (
          <ErrorBoundary>
            <UploadStep
              pasteText={pasteText}
              onPasteTextChange={setPasteText}
              provider={provider}
              onProviderChange={setProvider}
              autoFixSettings={autoFixSettings}
              onAutoFixSettingsChange={setAutoFixSettings}
              loading={loading}
              onProcess={async (file) => {
                if (file) await handleFileUpload(file);
                else await handlePasteProcess();
              }}
            />
          </ErrorBoundary>
        );

      case "faktura":
        return (
          <ErrorBoundary>
            <InvoiceStep
              historyItems={historyItems}
              saveInvoiceLabel={saveInvoiceLabel}
              onSaveInvoiceLabelChange={setSaveInvoiceLabel}
              onSaveInvoice={handleSaveToHistory}
              onLoadFromHistory={loadFromHistory}
              onRemoveHistoryItem={removeHistoryItem}
              onClearHistory={handleClearHistory}
              header={header}
              onHeaderChange={setHeader}
              aresLoading={aresLoading}
              onFillFromAres={handleAresLookup}
              lines={lines}
              originalLines={originalLines}
              onUpdateLine={updateLine}
              onRemoveLine={removeLine}
              vatPercent={vatPercent}
              rawTranscript={rawTranscript}
              userInstructions={userInstructions}
              onUserInstructionsChange={setUserInstructions}
              autoFixSettings={autoFixSettings}
              onAutoFixSettingsChange={setAutoFixSettings}
              correcting={correcting}
              showCorrection={showCorrection}
              onShowCorrectionChange={setShowCorrection}
              onRunCorrection={handleCorrection}
            />
          </ErrorBoundary>
        );

      case "nahled":
        return (
          <ErrorBoundary>
            <PreviewStep
              header={header}
              lines={lines}
              vatPercent={vatPercent}
              onPrint={() => window.print()}
              onCopyIdokladExport={async () => {
                copyIdokladExport();
              }}
              onOpenIdokladCreate={openIdokladCreate}
              idokladExportHint={idokladExportHint}
            />
          </ErrorBoundary>
        );
      
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <AppHeader currentTab={tab} onTabChange={setTab} />
      
      <main className="mx-auto max-w-5xl px-4 py-6">
        {/* Global loading overlay */}
        {loading && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/80 backdrop-blur-sm">
            <ProcessingState
              state="processing"
              progress={50}
              message="Zpracovávám soubor..."
              detailed={true}
            />
          </div>
        )}
        
        {/* Global error display */}
        {error && (
          <div className="mb-6">
            <ApiCallStatus
              isLoading={false}
              error={error}
              inline={false}
            />
          </div>
        )}

        {podkladNotice && (
          <div className="mb-6 flex flex-wrap items-start gap-2 rounded-lg border border-amber-500/35 bg-amber-950/35 px-4 py-3 text-sm text-amber-100/95">
            <span className="min-w-0 flex-1">{podkladNotice}</span>
            <button
              type="button"
              className="shrink-0 text-amber-400/90 underline decoration-amber-500/50 hover:text-amber-300"
              onClick={() => setPodkladNotice(null)}
            >
              Zavřít
            </button>
          </div>
        )}
        
        {/* Main content */}
        <div className="space-y-6">
          <Suspense
            fallback={
              <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-8 text-center text-sm text-zinc-400">
                Načítám krok…
              </div>
            }
          >
            {renderTabContent()}
          </Suspense>
        </div>
      </main>
    </div>
  );
}