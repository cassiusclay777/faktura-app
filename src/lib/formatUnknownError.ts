/**
 * Text pro UI z neočekávaných hodnot v catch (Event z DOMu dá jinak jen "[object Event]").
 */
export function formatUnknownError(e: unknown): string {
  if (e instanceof Error) return e.message || e.name || "Chyba";
  if (typeof e === "string") return e;
  if (e && typeof e === "object") {
    const m = (e as { message?: unknown }).message;
    if (typeof m === "string" && m.trim()) return m;
    if (typeof Event !== "undefined" && e instanceof Event) {
      return `Neočekávaná událost (${e.type || "unknown"}). Zkus akci znovu.`;
    }
  }
  const s = String(e);
  if (s === "[object Event]") {
    return "Neočekávaná chyba (událost prohlížeče). Zkus znovu nebo vypni rozšíření.";
  }
  return s;
}
