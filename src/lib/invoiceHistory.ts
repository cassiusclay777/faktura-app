import type { EditableInvoiceLine, InvoiceHeader } from "./invoice";

const HISTORY_STORAGE_KEY = "faktura-invoice-history-v1";
const MAX_HISTORY_ITEMS = 50;

export type SavedInvoice = {
  id: string;
  savedAt: string; // ISO timestamp
  name: string; // user-friendly name (e.g., customer name or VS)
  header: InvoiceHeader;
  lines: EditableInvoiceLine[];
  rawTranscript: string;
};

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function loadHistory(): SavedInvoice[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(HISTORY_STORAGE_KEY);
    if (!raw) return [];
    const items = JSON.parse(raw) as SavedInvoice[];
    return items.sort((a, b) => b.savedAt.localeCompare(a.savedAt));
  } catch {
    return [];
  }
}

function saveHistory(items: SavedInvoice[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(items));
  } catch {
    // Storage full or unavailable - silently fail
  }
}

export function saveInvoiceToHistory(
  header: InvoiceHeader,
  lines: EditableInvoiceLine[],
  rawTranscript: string,
  nameOverride?: string,
): SavedInvoice {
  const existing = loadHistory();
  const newItem: SavedInvoice = {
    id: generateId(),
    savedAt: new Date().toISOString(),
    name:
      nameOverride?.trim() ||
      header.customerName ||
      header.variableSymbol ||
      "Faktura",
    header,
    lines,
    rawTranscript,
  };
  const updated = [newItem, ...existing].slice(0, MAX_HISTORY_ITEMS);
  saveHistory(updated);
  return newItem;
}

export function loadInvoiceHistory(): SavedInvoice[] {
  return loadHistory();
}

export function deleteInvoiceFromHistory(id: string): void {
  const existing = loadHistory();
  const updated = existing.filter((item) => item.id !== id);
  saveHistory(updated);
}

export function clearInvoiceHistory(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(HISTORY_STORAGE_KEY);
}