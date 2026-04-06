/**
 * Přečte tělo odpovědi jako JSON; při HTML chybové stránce nebo prázdném těle hodí srozumitelnou chybu.
 */
export async function readJsonResponse<T>(res: Response): Promise<T> {
  const text = await res.text();
  const trimmed = text.trim();
  if (!trimmed) {
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${res.statusText || "prázdná odpověď"}`);
    }
    return {} as T;
  }
  try {
    return JSON.parse(trimmed) as T;
  } catch {
    throw new Error(
      res.ok
        ? `Odpověď není platný JSON: ${trimmed.slice(0, 280)}`
        : `HTTP ${res.status}: ${trimmed.slice(0, 400)}`,
    );
  }
}
