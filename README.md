# Faktura z podkladu (web)

Next.js aplikace s vestavěným balíčkem **`invoice-assistant`**: načte textový podklad nebo fotku, parsuje řádky jízd, umožní doplnit dodavatele/odběratele a zobrazí **náhled faktury** vhodný k **tisku / uložení jako PDF** (prohlížeč → Tisk → Uložit jako PDF).

**Do iDokladu se nic neposílá** – jde o vytvoření faktury jako dokumentu.

## Požadavky

- Node **20+** (LTS; v `package.json` je `engines.node`)
- `npm install` v kořeni tohoto repa sestaví i knihovnu (`invoice-assistant` má `prepare` → `tsc`).
- Testy knihovny: `npm test` (Vitest v `invoice-assistant`).

## Proměnné prostředí (`.env`)

Server načítá v tomto pořadí (pozdější přepíše dřívější):

1. `invoice-assistant/.env` (volitelné)
2. `.env`
3. `.env.local`

Stačí mít **`OPENROUTER_API_KEY`** (a případně Ollama), pro volitelnou korekci přes Gemini navíc `GEMINI_API_KEY`, v **`.env`** nebo **`.env.local`** – případně v `invoice-assistant/.env`.

Implementace: [`src/lib/loadEnv.ts`](src/lib/loadEnv.ts) – volá se při startu serveru ([`instrumentation`](src/instrumentation.ts)) a znovu na začátku [`/api/process`](src/app/api/process/route.ts).

## Spuštění

```bash
npm install
copy .env.example .env   # nebo .env.local; doplň OPENROUTER / OLLAMA / GEMINI podle potřeby
npm run dev
```

Otevři [http://localhost:3000](http://localhost:3000).

## Konfigurace

- **Textový podklad (.txt nebo vložený text)** – API klíče nepotřebuješ.
- **PDF** – nejdřív se čte textová vrstva (bez klíče). Je-li to sken bez textu, jde OCR přes zvolený provider z UI (OpenRouter/Ollama); Ollama sken PDF neumí – nahraj PNG/JPEG.
- **Foto podkladu** – `OPENROUTER_API_KEY` (OpenRouter) nebo lokální Ollama + `OLLAMA_VISION_MODEL`.
- **Korekce názvů** – v záložce Faktura zvol **Gemini** (`GEMINI_API_KEY`, volitelně vyhledávání na webu) nebo **OpenRouter** (`OPENROUTER_API_KEY`, model default `deepseek/deepseek-chat-v3-0324`). Vlastní instrukce v poli pod tím platí pro oba.

Údaje o dodavateli v formuláři se ukládají do `localStorage` v prohlížeči.

## Problémy

- **`npm install` odstranil stovky balíčků / chybí TypeScript** – obvykle je nastavené **`NODE_ENV=production`**. V tomto repu je `.npmrc` s `include=dev`. Spusť v čistém prostředí: `$env:NODE_ENV=$null` a znovu `npm install`.
- **Varování „non-standard NODE_ENV“ u `next dev`** – nastav `NODE_ENV` na `development` nebo proměnnou odeber.
- Konfigurace Next.js je v **`next.config.mjs`**.
