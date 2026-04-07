"use client";

import type { EditableInvoiceLine, InvoiceHeader } from "@/lib/invoice";
import type { SavedInvoice } from "@/lib/invoiceHistory";
import type { AutoFixSettings } from "./UploadStep";
import HistoryPanel from "./HistoryPanel";
import HeaderForms from "./HeaderForms";
import LinesTable from "./LinesTable";
import CorrectionPanel from "./CorrectionPanel";
import RawTranscriptPanel from "./RawTranscriptPanel";

interface InvoiceStepProps {
  // History
  historyItems: SavedInvoice[];
  saveInvoiceLabel: string;
  onSaveInvoiceLabelChange: (label: string) => void;
  onSaveInvoice: () => void;
  onLoadFromHistory: (item: SavedInvoice) => void;
  onRemoveHistoryItem: (id: string) => void;
  onClearHistory: () => void;
  
  // Header
  header: InvoiceHeader;
  onHeaderChange: (header: InvoiceHeader) => void;
  aresLoading: "supplier" | "customer" | null;
  onFillFromAres: (side: "supplier" | "customer") => Promise<void>;
  
  // Lines
  lines: EditableInvoiceLine[];
  originalLines: EditableInvoiceLine[];
  onUpdateLine: (id: string, updates: Partial<EditableInvoiceLine>) => void;
  onRemoveLine: (id: string) => void;
  vatPercent: number;
  
  // Correction
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

export default function InvoiceStep({
  // History
  historyItems,
  saveInvoiceLabel,
  onSaveInvoiceLabelChange,
  onSaveInvoice,
  onLoadFromHistory,
  onRemoveHistoryItem,
  onClearHistory,
  
  // Header
  header,
  onHeaderChange,
  aresLoading,
  onFillFromAres,
  
  // Lines
  lines,
  originalLines,
  onUpdateLine,
  onRemoveLine,
  vatPercent,
  
  // Correction
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
}: InvoiceStepProps) {
  return (
    <section className="space-y-6">
      <HistoryPanel
        historyItems={historyItems}
        saveInvoiceLabel={saveInvoiceLabel}
        onSaveInvoiceLabelChange={onSaveInvoiceLabelChange}
        onSaveInvoice={onSaveInvoice}
        onLoadFromHistory={onLoadFromHistory}
        onRemoveHistoryItem={onRemoveHistoryItem}
        onClearHistory={onClearHistory}
      />
      
      <HeaderForms
        header={header}
        onHeaderChange={onHeaderChange}
        aresLoading={aresLoading}
        onFillFromAres={onFillFromAres}
      />
      
      <LinesTable
        lines={lines}
        onUpdateLine={onUpdateLine}
        onRemoveLine={onRemoveLine}
        vatPercent={vatPercent}
      />
      
      <RawTranscriptPanel rawTranscript={rawTranscript} />
      
      <CorrectionPanel
        lines={lines}
        originalLines={originalLines}
        fixNamesProvider={fixNamesProvider}
        onFixNamesProviderChange={onFixNamesProviderChange}
        fixNamesWeb={fixNamesWeb}
        onFixNamesWebChange={onFixNamesWebChange}
        userInstructions={userInstructions}
        onUserInstructionsChange={onUserInstructionsChange}
        autoFixSettings={autoFixSettings}
        onAutoFixSettingsChange={onAutoFixSettingsChange}
        deepSeekWebSearchAvailable={deepSeekWebSearchAvailable}
        correcting={correcting}
        showCorrection={showCorrection}
        onShowCorrectionChange={onShowCorrectionChange}
        onRunCorrection={onRunCorrection}
      />
    </section>
  );
}