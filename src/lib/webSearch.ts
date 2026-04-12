/**
 * Vyhledávání pro DeepSeek tool `web_search` (korekce názvů).
 *
 * Backends: **Perplexity Sonar** (`PERPLEXITY_API_KEY`) nebo **Tavily** (`TAVILY_API_KEY`).
 * Volba: `DEEPSEEK_WEB_SEARCH_PROVIDER=perplexity|tavily` — jinak auto: Perplexity, pokud je klíč, jinak Tavily.
 * DuckDuckGo jen jako nouzový fallback, pokud není nastaven žádný z backendů.
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

/** Má smysl nabízet „web“ u korekce DeepSeek (alespoň jeden backend). */
export function hasDeepSeekWebSearchCredentials(): boolean {
  return !!(
    process.env.PERPLEXITY_API_KEY?.trim() ||
    process.env.TAVILY_API_KEY?.trim()
  );
}

type WebBackend = "perplexity" | "tavily";

function resolveWebBackend(): WebBackend | null {
  const explicit = process.env.DEEPSEEK_WEB_SEARCH_PROVIDER?.trim().toLowerCase();
  const pplx = process.env.PERPLEXITY_API_KEY?.trim();
  const tavily = process.env.TAVILY_API_KEY?.trim();

  if (explicit === "perplexity") {
    if (pplx) return "perplexity";
    if (tavily) return "tavily";
    return null;
  }
  if (explicit === "tavily") {
    if (tavily) return "tavily";
    if (pplx) return "perplexity";
    return null;
  }
  if (pplx) return "perplexity";
  if (tavily) return "tavily";
  return null;
}

export async function searchWebForCorrection(query: string): Promise<string> {
  const q = query.trim();
  if (!q) return "(Prázdný dotaz.)";

  const backend = resolveWebBackend();
  if (backend === "perplexity") {
    return perplexitySearch(q, process.env.PERPLEXITY_API_KEY!.trim());
  }
  if (backend === "tavily") {
    return tavilySearch(q, process.env.TAVILY_API_KEY!.trim());
  }

  return duckDuckGoInstantAnswer(q);
}

async function perplexitySearch(query: string, apiKey: string): Promise<string> {
  const model =
    process.env.PERPLEXITY_MODEL?.trim() || "sonar";
  const res = await fetch("https://api.perplexity.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: "system",
          content:
            "Krátce a věcně odpovídej česky. Pomáháš ověřit správný zápis českých názvů firem (IČO, sídlo), obcí a míst. Uveď preferovaný oficiální název nebo přepis, pokud je známý.",
        },
        { role: "user", content: query },
      ],
      temperature: 0.2,
      max_tokens: 1200,
    }),
  });

  if (!res.ok) {
    const t = await res.text();
    return `(Perplexity HTTP ${res.status}: ${t.slice(0, 400)})`;
  }

  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const text = data.choices?.[0]?.message?.content?.trim();
  if (!text) {
    return "(Perplexity: prázdná odpověď.)";
  }
  return text.slice(0, 14_000);
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
      : "(DuckDuckGo: žádné shrnutí — nastav PERPLEXITY_API_KEY nebo TAVILY_API_KEY.)";
  } catch (e) {
    return `(DuckDuckGo chyba: ${e instanceof Error ? e.message : String(e)})`;
  }
}
