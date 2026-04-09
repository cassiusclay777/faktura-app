# Faktura z podkladu (web)

Next.js aplikace s vestavěným balíčkem **`invoice-assistant`**: načte textový podklad nebo fotku, parsuje řádky jízd, umožní doplnit dodavatele/odběratele a zobrazí **náhled faktury** vhodný k **tisku / uložení jako PDF** (prohlížeč → Tisk → Uložit jako PDF).

**iDoklad:** v záložce Náhled můžeš **zkopírovat údaje do schránky** a **otevřít** [novou fakturu v iDokladu](https://app.idoklad.cz/IssuedInvoice/Create) – webové UI nepřijímá automatické předvyplnění z externí aplikace; plná integrace je přes [REST API + OAuth](https://api.idoklad.cz/) (viz `invoice-assistant/README.md`).

## Požadavky

- Node **20+** (LTS; v `package.json` je `engines.node`)
- `npm install` v kořeni tohoto repa sestaví i knihovnu (`invoice-assistant` má `prepare` → `tsc`).
- Testy knihovny: `npm test` (Vitest v `invoice-assistant`).

## Proměnné prostředí (`.env`)

Server načítá v tomto pořadí (pozdější přepíše dřívější):

1. `invoice-assistant/.env` (volitelné)
2. `.env`
3. `.env.local`

Pro **přepis z fotky/PDF** a **korekci názvů** nastav **`DEEPSEEK_API_KEY`** (výchozí ve UI), případně jen **Ollama** (`OLLAMA_VISION_MODEL` + `OLLAMA_BASE_URL`) – v **`.env`** nebo **`.env.local`**, případně v `invoice-assistant/.env`.

Implementace: [`src/lib/loadEnv.ts`](src/lib/loadEnv.ts) – volá se při načtení a na začátku požadavku v [`/api/process`](src/app/api/process/route.ts) (Node runtime).

## Spuštění

```bash
npm install
copy .env.example .env   # Windows; na Unixu: cp .env.example .env  — pak doplň DEEPSEEK (nebo Ollama) podle potřeby
npm run dev
```

Otevři [http://localhost:3000](http://localhost:3000).

## Konfigurace

- **Textový podklad (.txt nebo vložený text)** – API klíče nepotřebuješ.
- **PDF** – nejdřív se čte textová vrstva (bez klíče). Je-li to sken bez textu, použije se **DeepSeek vision** (`DEEPSEEK_API_KEY`) nebo **Ollama** (první stránka jako obrázek); bez klíče DeepSeek u skenu přejdi na PNG/JPEG nebo doplň `.env` podle `.env.example`.
- **Foto podkladu** – **`DEEPSEEK_API_KEY`** (cloud) nebo lokální **Ollama** + `OLLAMA_VISION_MODEL`.
- **Korekce názvů** – **`DEEPSEEK_API_KEY`**, model default `deepseek-chat`. „Vyhledávat na webu“ používá nástroj `web_search`; volitelně **`PERPLEXITY_API_KEY`** (Sonar) a/nebo **`TAVILY_API_KEY`**; případně `DEEPSEEK_WEB_SEARCH_PROVIDER=perplexity|tavily` (viz `.env.example`).

Údaje o dodavateli v formuláři se ukládají do `localStorage` v prohlížeči.

## Problémy

- **`npm install` odstranil stovky balíčků / chybí TypeScript** – obvykle je nastavené **`NODE_ENV=production`**. V tomto repu je `.npmrc` s `include=dev`. Spusť v čistém prostředí: `$env:NODE_ENV=$null` a znovu `npm install`.
- **Varování „non-standard NODE_ENV“ u `next dev`** – nastav `NODE_ENV` na `development` nebo proměnnou odeber.
- Konfigurace Next.js je v **`next.config.mjs`**.
