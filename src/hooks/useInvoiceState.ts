import { useState, useCallback, useMemo, useEffect } from "react";
import type { ParsedPodklad } from "invoice-assistant";
import {
  DEFAULT_VAT_PERCENT,
  emptyHeader,
  totalsFromLines,
  tripLinesToEditable,
  type EditableInvoiceLine,
  type InvoiceHeader,
} from "@/lib/invoice";
import {
  clearInvoiceHistory,
  deleteInvoiceFromHistory,
  loadInvoiceHistory,
  saveInvoiceToHistory,
  type SavedInvoice,
} from "@/lib/invoiceHistory";
import { extractInvoiceHeaderHintsFromText } from "@/lib/extractInvoiceHeaderHints";

const HEADER_STORAGE_KEY = "faktura-invoice-header-v1";

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

export interface AutoFixSettings {
  enabled: boolean;
  idokladStyle: boolean;
  styleReference: string;
}

const AUTOFIX_STORAGE_KEY = "faktura-autofix-settings-v1";

function loadAutoFixSettings(): AutoFixSettings {
  if (typeof window === "undefined") {
    return { enabled: true, idokladStyle: true, styleReference: "" };
  }
  try {
    const raw = localStorage.getItem(AUTOFIX_STORAGE_KEY);
    if (!raw) return { enabled: true, idokladStyle: true, styleReference: "" };
    const o = JSON.parse(raw) as Partial<AutoFixSettings>;
    return {
      enabled: o.enabled ?? true,
      idokladStyle: o.idokladStyle ?? true,
      styleReference: o.styleReference ?? "",
    };
  } catch {
    return { enabled: true, idokladStyle: true, styleReference: "" };
  }
}

export interface UseInvoiceStateReturn {
  // State
  header: InvoiceHeader;
  autoFixSettings: AutoFixSettings;
  lines: EditableInvoiceLine[];
  rawTranscript: string;
  pasteText: string;
  provider: "ollama" | "deepseek";
  userInstructions: string;
  loading: boolean;
  error: string | null;
  tab: "podklad" | "faktura" | "nahled";
  originalLines: EditableInvoiceLine[];
  correcting: boolean;
  showCorrection: boolean;
  idokladExportHint: string | null;
  /** Informace po načtení PDF / textu (formát parseru, prázdné řádky) */
  podkladNotice: string | null;
  historyItems: SavedInvoice[];
  saveInvoiceLabel: string;
  aresLoading: "supplier" | "customer" | null;
  templateLoading: boolean;
  
  // Computed values
  vatPercent: number;
  totals: ReturnType<typeof import("@/lib/invoice").totalsFromLines>;
  
  // Actions
  setHeader: (header: InvoiceHeader | ((prev: InvoiceHeader) => InvoiceHeader)) => void;
  setAutoFixSettings: (settings: AutoFixSettings | ((prev: AutoFixSettings) => AutoFixSettings)) => void;
  setLines: (lines: EditableInvoiceLine[] | ((prev: EditableInvoiceLine[]) => EditableInvoiceLine[])) => void;
  setRawTranscript: (transcript: string) => void;
  setPasteText: (text: string) => void;
  setProvider: (provider: "ollama" | "deepseek") => void;
  setUserInstructions: (instructions: string) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setTab: (tab: "podklad" | "faktura" | "nahled") => void;
  setOriginalLines: (lines: EditableInvoiceLine[]) => void;
  setCorrecting: (correcting: boolean) => void;
  setShowCorrection: (show: boolean) => void;
  setIdokladExportHint: (hint: string | null) => void;
  setPodkladNotice: (notice: string | null) => void;
  setSaveInvoiceLabel: (label: string) => void;
  setAresLoading: (loading: "supplier" | "customer" | null) => void;
  setTemplateLoading: (loading: boolean) => void;
  
  // Business logic
  handleSaveToHistory: () => void;
  loadFromHistory: (item: SavedInvoice) => void;
  removeHistoryItem: (id: string) => void;
  handleClearHistory: () => void;
  refreshHistory: () => void;
  openIdokladCreate: () => void;
  handleParsedPodklad: (
    parsed: ParsedPodklad,
    rawText: string,
    notice?: string | null,
  ) => void;
  updateLine: (id: string, updates: Partial<EditableInvoiceLine>) => void;
  removeLine: (id: string) => void;
  addLine: () => void;
  clearAll: () => void;
  extractHeaderHints: (text: string) => void;
}

export function useInvoiceState(): UseInvoiceStateReturn {
  // State
  const [header, setHeader] = useState<InvoiceHeader>(() => emptyHeader());
  const [autoFixSettings, setAutoFixSettings] = useState<AutoFixSettings>(() => ({
    enabled: true,
    idokladStyle: true,
    styleReference: "",
  }));
  const [lines, setLines] = useState<EditableInvoiceLine[]>([]);
  const [rawTranscript, setRawTranscript] = useState("");
  const [pasteText, setPasteText] = useState("");
  const [provider, setProvider] = useState<"ollama" | "deepseek">("deepseek");
  const [userInstructions, setUserInstructions] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<"podklad" | "faktura" | "nahled">("podklad");
  const [originalLines, setOriginalLines] = useState<EditableInvoiceLine[]>([]);
  const [correcting, setCorrecting] = useState(false);
  const [showCorrection, setShowCorrection] = useState(false);
  const [idokladExportHint, setIdokladExportHint] = useState<string | null>(null);
  const [podkladNotice, setPodkladNotice] = useState<string | null>(null);
  const [historyItems, setHistoryItems] = useState<SavedInvoice[]>([]);
  const [saveInvoiceLabel, setSaveInvoiceLabel] = useState("");
  const [aresLoading, setAresLoading] = useState<"supplier" | "customer" | null>(null);
  const [templateLoading, setTemplateLoading] = useState(false);

  // Load initial state from localStorage
  useEffect(() => {
    setHeader(loadHeader());
    setAutoFixSettings(loadAutoFixSettings());
    setHistoryItems(loadInvoiceHistory());
  }, []);

  // Persist header to localStorage
  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem(HEADER_STORAGE_KEY, JSON.stringify(header));
  }, [header]);

  // Persist autoFixSettings to localStorage
  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem(AUTOFIX_STORAGE_KEY, JSON.stringify(autoFixSettings));
  }, [autoFixSettings]);

  // Computed values
  const vatPercent = DEFAULT_VAT_PERCENT;
  const totals = useMemo(
    () => totalsFromLines(lines, vatPercent),
    [lines, vatPercent],
  );

  // History management
  const refreshHistory = useCallback(() => {
    setHistoryItems(loadInvoiceHistory());
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
    clearInvoiceHistory();
    refreshHistory();
  }, [refreshHistory]);

  // iDoklad integration
  const openIdokladCreate = useCallback(() => {
    window.open(
      "https://app.idoklad.cz/IssuedInvoice/Create",
      "_blank",
      "noopener,noreferrer",
    );
  }, []);

  // Line management
  const handleParsedPodklad = useCallback(
    (parsed: ParsedPodklad, rawText: string, notice?: string | null) => {
      const editable = tripLinesToEditable(parsed.lines);
      setLines(editable);
      setOriginalLines(editable);
      setRawTranscript(rawText);
      setTab("faktura");
      setIdokladExportHint(null);
      setPodkladNotice(notice ?? null);
    },
    [],
  );

  const updateLine = useCallback((id: string, updates: Partial<EditableInvoiceLine>) => {
    setLines((prev) =>
      prev.map((l) => (l.id === id ? { ...l, ...updates } : l)),
    );
  }, []);

  const removeLine = useCallback((id: string) => {
    setLines((prev) => prev.filter((l) => l.id !== id));
  }, []);

  const addLine = useCallback(() => {
    setLines(prev => [
      ...prev,
      {
        id: `line-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        description: "",
        liters: 0,
        rate: 0,
        baseAmount: 0,
        dateIso: new Date().toISOString().split("T")[0],
      },
    ]);
  }, []);

  const clearAll = useCallback(() => {
    setLines([]);
    setRawTranscript("");
    setPasteText("");
    setOriginalLines([]);
    setError(null);
    setIdokladExportHint(null);
    setPodkladNotice(null);
  }, []);

  // Header hints extraction
  const extractHeaderHints = useCallback((text: string) => {
    const hints = extractInvoiceHeaderHintsFromText(text);
    if (hints) {
      setHeader(prev => ({ ...prev, ...hints }));
    }
  }, []);

  return {
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
    templateLoading,
    
    // Computed values
    vatPercent,
    totals,
    
    // Setters
    setHeader,
    setAutoFixSettings,
    setLines,
    setRawTranscript,
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
    setTemplateLoading,
    
    // Actions
    handleSaveToHistory,
    loadFromHistory,
    removeHistoryItem,
    handleClearHistory,
    refreshHistory,
    openIdokladCreate,
    handleParsedPodklad,
    updateLine,
    removeLine,
    addLine,
    clearAll,
    extractHeaderHints,
  };
}