/**
 * Vyhledávání pro DeepSeek tool `web_search` (korekce názvů).
 * Tavily dává nejlepší výsledky pro LLM; bez klíče slabší DuckDuckGo (bez API účtu).
 */

type TavilyResult = {
  title?: string;
  url?: string;
  content?: string;
};

type TavilyResponse = {
  results?: TavilyResult[];
  answer?: string;
};

export async function searchWebForCorrection(query: string): Promise<string> {
  const q = query.trim();
  if (!q) return "(Prázdný dotaz.)";

  const tavilyKey = process.env.TAVILY_API_KEY?.trim();
  if (tavilyKey) {
    return tavilySearch(q, tavilyKey);
  }

  return duckDuckGoInstantAnswer(q);
}

async function tavilySearch(query: string, apiKey: string): Promise<string> {
  const res = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      api_key: apiKey,
      query,
      search_depth: "basic",
      max_results: 6,
      include_answer: true,
    }),
  });

  if (!res.ok) {
    const t = await res.text();
    return `(Tavily HTTP ${res.status}: ${t.slice(0, 400)})`;
  }

  const data = (await res.json()) as TavilyResponse;
  const parts: string[] = [];
  if (data.answer?.trim()) parts.push(`Shrnutí: ${data.answer.trim()}`);
  const results = data.results ?? [];
  for (const r of results) {
    const block = [r.title, r.url, r.content].filter(Boolean).join("\n");
    if (block.trim()) parts.push(block.trim());
  }
  return parts.length > 0
    ? parts.join("\n\n---\n\n")
    : "(Tavily: žádné výsledky.)";
}

async function duckDuckGoInstantAnswer(query: string): Promise<string> {
  const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`;
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "faktura-app/1.0 (korekce názvů)" },
    });
    if (!res.ok) {
      return `(DuckDuckGo HTTP ${res.status})`;
    }
    const data = (await res.json()) as {
      AbstractText?: string;
      RelatedTopics?: Array<{ Text?: string } | { Topics?: unknown }>;
    };
    const parts: string[] = [];
    if (data.AbstractText?.trim()) parts.push(data.AbstractText.trim());
    if (Array.isArray(data.RelatedTopics)) {
      for (const t of data.RelatedTopics.slice(0, 8)) {
        if (t && typeof t === "object" && "Text" in t && typeof t.Text === "string") {
          parts.push(t.Text);
        }
      }
    }
    return parts.length > 0
      ? parts.join("\n\n")
      : "(DuckDuckGo: žádné shrnutí — zvaž nastavení TAVILY_API_KEY.)";
  } catch (e) {
    return `(DuckDuckGo chyba: ${e instanceof Error ? e.message : String(e)})`;
  }
}
