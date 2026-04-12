import { loadImageAsBase64 } from "./imageFile.js";

export type OpenRouterVisionOptions = {
  apiKey: string;
  model?: string; // výchozí "qwen/qwen2.5-vl-72b-instruct"
  baseUrl?: string; // výchozí "https://openrouter.ai/api/v1"
  imagePath: string;
  prompt?: string;
  maxTokens?: number;
  temperature?: number;
  verbose?: boolean;
  /** Referer pro OpenRouter statistiky (nepovinné) */
  httpReferer?: string;
  /** Název aplikace pro OpenRouter */
  appTitle?: string;
};

type OpenRouterMessage = {
  role: "user" | "system" | "assistant";
  content: string | Array<{
    type: "text" | "image_url";
    text?: string;
    image_url?: {
      url: string;
      detail?: "low" | "high" | "auto";
    };
  }>;
};

const DEFAULT_SYSTEM_PROMPT = `Jsi specializovaný OCR asistent pro české dokumenty.
Tvým úkolem je PŘESNĚ přepsat veškerý text z dodaného obrázku (faktura, účtenka, výpis jízdy).

PRAVIDLA:
1. Přepiš VŠECHEN text, který na obrázku vidíš – čísla, data, názvy firem, částky, variabilní symboly, vše.
2. Zachovej strukturu a formátování tam, kde to dává smysl.
3. Pokud je text rozmazaný nebo nečitelný, napiš "[nečitelné]".
4. NEVYMÝŠLEJ SI nic, co na obrázku není.
5. Odpověz POUZE přepsaným textem, žádné komentáře, vysvětlivky ani formátování navíc.`;

/**
 * Přepíše text z obrázku pomocí OpenRouter API s multimodálním modelem.
 * Používá Qwen2.5-VL-72B-Instruct (zdarma na OpenRouteru).
 */
export async function transcribeWithOpenRouter(
  opts: OpenRouterVisionOptions
): Promise<string> {
  const apiKey = opts.apiKey.trim();
  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY není nastaven");
  }

  const baseUrl = opts.baseUrl ?? "https://openrouter.ai/api/v1";
  const model = opts.model ?? "qwen/qwen2.5-vl-72b-instruct";
  const prompt = opts.prompt ?? "Přepiš přesně všechen text z tohoto obrázku.";
  
  const { mimeType, base64: base64Image } = loadImageAsBase64(opts.imagePath);
  const dataUrl = `data:${mimeType};base64,${base64Image}`;

  if (opts.verbose) {
    console.error(`[OpenRouter] Používám model: ${model}`);
    console.error(`[OpenRouter] Obrázek: ${opts.imagePath} (${mimeType})`);
  }

  const messages: OpenRouterMessage[] = [
    {
      role: "system",
      content: DEFAULT_SYSTEM_PROMPT,
    },
    {
      role: "user",
      content: [
        {
          type: "text",
          text: prompt,
        },
        {
          type: "image_url",
          image_url: {
            url: dataUrl,
            detail: "high", // Vyšší přesnost pro OCR
          },
        },
      ],
    },
  ];

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${apiKey}`,
  };

  // OpenRouter specifické hlavičky pro atribuci
  if (opts.httpReferer) {
    headers["HTTP-Referer"] = opts.httpReferer;
  }
  if (opts.appTitle) {
    headers["X-OpenRouter-Title"] = opts.appTitle;
  }

  const requestBody = {
    model,
    messages,
    max_tokens: opts.maxTokens ?? 4000,
    temperature: opts.temperature ?? 0.1, // Nízká teplota pro přesný přepis
  };

  if (opts.verbose) {
    console.error(`[OpenRouter] Odesílám požadavek na API...`);
  }

  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers,
    body: JSON.stringify(requestBody),
  });

  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`OpenRouter API ${res.status}: ${errBody.slice(0, 600)}`);
  }

  const data = (await res.json()) as {
    choices?: Array<{
      message?: {
        content?: string;
      };
    }>;
    usage?: {
      total_tokens: number;
      cost?: number;
    };
  };

  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("OpenRouter API vrátilo prázdnou odpověď.");
  }

  if (opts.verbose && data.usage) {
    console.error(`[OpenRouter] Tokeny: ${data.usage.total_tokens}, Cena: $${data.usage.cost?.toFixed(6) ?? "N/A"}`);
  }

  return content.trim();
}
