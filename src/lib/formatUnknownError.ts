/**
 * Text pro UI z neočekávaných hodnot v catch.
 * `new Error(domEvent)` dá message přesně "[object Event]" — to musíme přepsat.
 */
const BAD_ERROR_MESSAGE = /^\[object (Event|Object)\]$/;

function messageFromError(e: Error): string {
  const raw = e.message?.trim() ?? "";
  if (BAD_ERROR_MESSAGE.test(raw) || raw === "") {
    if (e.cause !== undefined) return formatUnknownError(e.cause);
    return "Neočekávaná chyba (místo popisu chyby přišla neplatná hodnota, typicky událost z DOMu). Zkus akci znovu.";
  }
  return raw || e.name || "Chyba";
}

export function formatUnknownError(e: unknown): string {
  if (e instanceof Error) return messageFromError(e);
  if (typeof e === "string") return e;
  if (e && typeof e === "object") {
    const m = (e as { message?: unknown }).message;
    if (typeof m === "string" && m.trim() && !BAD_ERROR_MESSAGE.test(m.trim())) {
      return m;
    }
    if (typeof Event !== "undefined" && e instanceof Event) {
      return `Neočekávaná událost (${e.type || "unknown"}). Zkus akci znovu.`;
    }
  }
  const s = String(e);
  if (s === "[object Event]" || s === "[object Object]") {
    return "Neočekávaná chyba (událost nebo objekt místo Error). Zkus znovu.";
  }
  return s;
}
