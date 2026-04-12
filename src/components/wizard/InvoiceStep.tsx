"use client";

import type { EditableInvoiceLine, InvoiceHeader } from "@/lib/invoice";
import type { SavedInvoice } from "@/lib/invoiceHistory";
import type { AutoFixSettings } from "./UploadStep";
import HistoryPanel from "./HistoryPanel";
import { InvoiceHeaderForm } from "@/components/forms/InvoiceHeaderForm";
import LinesTable from "./LinesTable";
import CorrectionPanel from "./CorrectionPanel";
import RawTranscriptPanel from "./RawTranscriptPanel";
import type { InvoiceHeaderInput } from "@/lib/validation";

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
  userInstructions: string;
  onUserInstructionsChange: (instructions: string) => void;
  autoFixSettings: AutoFixSettings;
  onAutoFixSettingsChange: (settings: AutoFixSettings) => void;
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
  userInstructions,
  onUserInstructionsChange,
  autoFixSettings,
  onAutoFixSettingsChange,
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
      
      <InvoiceHeaderForm
        initialData={header}
        onSubmit={(data: InvoiceHeaderInput) => {
          // Convert InvoiceHeaderInput to InvoiceHeader
          const updatedHeader: InvoiceHeader = {
            ...header,
            ...data,
            // Ensure numeric fields are properly typed
            supplierIco: data.supplierIco,
            customerIco: data.customerIco,
            customerReliableVatPayer: data.customerReliableVatPayer || false,
          };
          onHeaderChange(updatedHeader);
        }}
        onAresLookup={onFillFromAres}
        aresLoading={aresLoading}
        showAresButton={true}
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
        userInstructions={userInstructions}
        onUserInstructionsChange={onUserInstructionsChange}
        autoFixSettings={autoFixSettings}
        onAutoFixSettingsChange={onAutoFixSettingsChange}
        correcting={correcting}
        showCorrection={showCorrection}
        onShowCorrectionChange={onShowCorrectionChange}
        onRunCorrection={onRunCorrection}
      />
    </section>
  );
}