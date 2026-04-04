# Invoice assistant (iDoklad)

Malá vlastní „vrstva“ mezi **podkladem** (text z papíru / přepis) a **vydanou fakturou** v iDokladu.

## Co umí teď (v0.1)

- **`parseTripText`** – z textu ve formátu „datum → popis → `litry / sazba / základ`“ vyrobí strukturovaná data + součet základů.
- **`transcribeHandwriting`** – přepis fotky ručního zápisu přes **Gemini** (free tier z AI Studio) nebo **Ollama** (lokální vision model, např. `llava`).
- Spuštění: `npm install && npm run parse:sample` (vyžaduje Node 18+).

### Gemini (cloud)

1. Klíč: [Google AI Studio](https://aistudio.google.com/apikey) → `GEMINI_API_KEY`.
2. Volitelně `GEMINI_MODEL` (výchozí `gemini-2.5-flash`; pokud API hlásí neznámý model, zkus `gemini-1.5-flash`).
3. `npx tsx src/index.ts --gemini cesta\\k\\fotce.jpg`

**Korekce názvů firem (volitelně, druhý krok přes Gemini):** po parsování opraví popisy tras (překlepy OCR / rukopis). Bez webu: `--fix-names`; s Google Search grounding: `--fix-names-web` (např. `... --gemini sken.jpg --fix-names-web`). Vyžaduje `GEMINI_API_KEY`; model jako u přepisu (`GEMINI_MODEL`).

### Ollama (zdarma lokálně)

1. [Ollama](https://ollama.com/) nainstalovat, pak `ollama pull llava` (nebo `moondream` atd.).
2. Env: `OLLAMA_VISION_MODEL=llava` (a volitelně `OLLAMA_BASE_URL` pokud neběžíš na `127.0.0.1:11434`).
3. `npx tsx src/index.ts --ollama cesta\\k\\fotce.jpg`

Šablona proměnných: zkopíruj `.env.example` → `.env` – `src/index.ts` načte proměnné přes `dotenv`.

### Webová appka (faktura jako dokument)

V adresáři [`../faktura-app`](../faktura-app) je Next.js UI: podklad → úpravy → náhled/tisk. Neposílá data do iDokladu; nejdřív v kořeni `invoice-assistant` spusť `npm run build`, pak v `faktura-app` `npm install` a `npm run dev`.

## Kam to směřovat (architektura)

| Vrstva | Možnosti |
|--------|-----------|
| **Vstup textu** | Ruční vložení, soubor `.txt`, později schránka z mobilu. |
| **Foto papíru** | 1) **Vision LLM** (OpenAI / Gemini / Claude) – nejlepší na rukopis česky. 2) Cloud **Document Intelligence**. 3) Lokální **Tesseract** – horší na rukopis, OK na tisk. |
| **Parsování** | Tento projekt (`parseTripText`) + případně úprava promptu u Vision, aby vracel přesně náš formát. |
| **Faktura** | REST **API v3** `https://api.idoklad.cz` – `POST /IssuedInvoices` s OAuth **Client credentials**. Oficiální **C# IdokladSdk** má stejné modely (`IssuedInvoicePostModel`). |
| **UI** | Jednoduchá webovka (Next.js) nebo **Tauri** (desktop); tajemství jen na serveru / v backendu. |

## iDoklad – co budete potřebovat

1. V účtu iDoklad zapnutý **API** (podle tarifu / nastavení u Seyfor).
2. Registrace **OAuth aplikace** → `ClientId` + `ClientSecret`.
3. Backend endpoint, který drží secret a zavolá API (nikdy secret do prohlížeče).

## Další krok v kódu

1. Doplň `src/ocr/visionTranscribe.ts` voláním zvoleného Vision API (obrázek → surový text).
2. Výstup textu pošli do `parseTripText`.
3. Namapuj `TripLine[]` na tělo `IssuedInvoicePostModel` (položky: množství = litry, jednotková cena = sazba, DPH 21 %, text = popis + datum).

## Bezpečnost

- API klíče a `ClientSecret` jen v `.env` / vaultu, `.env` v `.gitignore`.
