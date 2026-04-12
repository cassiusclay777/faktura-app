# AGENTS.md – faktura-app

## Project Overview

**faktura-app** is a Next.js 15 (App Router) web application for generating invoices from trip/mileage records. It parses a structured text or photo of a trip log, lets the user fill in vendor/client details, and renders a printable invoice (browser → Print → Save as PDF). Nothing is sent to iDoklad or any external invoicing service.

Core package `invoice-assistant` lives at `./invoice-assistant/` and is referenced as a local workspace dependency. It handles all parsing and AI OCR/correction logic. The Next.js app in `src/` consumes it via `import … from "invoice-assistant"`.

## Repository Layout

```
/
├── src/
│   ├── app/
│   │   ├── api/process/route.ts   # Main API endpoint
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── components/FakturaApp.tsx  # Primary UI component
│   └── lib/
│       ├── extractPdfText.ts
│       ├── formatUnknownError.ts
│       ├── invoice.ts
│       ├── loadEnv.ts             # Env loader (dotenv, multi-file)
│       └── readJsonResponse.ts
├── invoice-assistant/             # Local package (ESM, TypeScript)
│   └── src/
│       ├── core.ts
│       ├── types.ts
│       ├── parseTripText.ts       # Core trip parser
│       ├── parseTripText.test.ts  # Vitest unit tests
│       └── ocr/
│           ├── geminiVision.ts
│           ├── ollamaVision.ts
│           ├── correctNamesGemini.ts
│           ├── correctNamesDeepSeek.ts
│           └── …
├── .env.example
├── next.config.mjs
├── tsconfig.json
└── eslint.config.mjs
```

## Tech Stack

| Layer | Tech |
|---|---|
| Framework | Next.js 15 (App Router), React 19 |
| Styling | Tailwind CSS v4 |
| Language | TypeScript 5.9 (strict) |
| AI / OCR | Google Gemini (`@google/generative-ai`), DeepSeek (REST), Ollama |
| PDF parsing | `pdf-parse` (server-external, no webpack bundling) |
| Tests | Vitest (inside `invoice-assistant`) |
| Lint | ESLint 9 flat config (`next/core-web-vitals`, `next/typescript`) |
| Node | ≥ 20 LTS |

## Environment Variables

Copy `.env.example` to `.env` or `.env.local` in the repo root.

| Variable | Required | Purpose |
|---|---|---|
| `GEMINI_API_KEY` | For image/PDF OCR and Gemini name-correction | `gemini-2.5-flash` (default) |
| `DEEPSEEK_API_KEY` | For DeepSeek name-correction | `deepseek-chat` (default) |
| `OLLAMA_VISION_MODEL` | Optional | Local Ollama model (e.g. `llava`) |
| `OLLAMA_BASE_URL` | Optional | Default `http://127.0.0.1:11434` |
| `GEMINI_MODEL` | Optional | Override Gemini model |
| `DEEPSEEK_MODEL` | Optional | Override DeepSeek model |
| `DEEPSEEK_API_BASE` | Optional | Override DeepSeek endpoint |

Env loading: `src/lib/loadEnv.ts` is called at Next.js startup (`src/instrumentation.ts`) and again at the start of every `/api/process` request. It reads `invoice-assistant/.env`, then `.env`, then `.env.local` in order (later files win).

## Development Setup

```bash
# Install everything (root install also triggers invoice-assistant prepare → tsc)
npm install

# Dev server (http://localhost:3000)
npm run dev

# Build
npm run build

# Lint
npm run lint

# Unit tests (Vitest inside invoice-assistant)
npm test
```

> **NODE_ENV gotcha**: if `NODE_ENV=production` is set globally, `npm install` skips devDependencies. The repo ships `.npmrc` with `include=dev` to counteract this. If you still see issues, unset `NODE_ENV` before installing.

## Key Architectural Notes

- **`invoice-assistant` is ESM**: `"type": "module"` in its `package.json`. The compiled output is in `dist/`. Rebuild with `npm run build` inside `invoice-assistant/` after source changes, or rely on `next.config.mjs` `transpilePackages: ["invoice-assistant"]` for dev.
- **`pdf-parse` must not be webpack-bundled**: declared in `serverExternalPackages` in `next.config.mjs`. Do not move it to client-side code.
- **API route** (`/api/process`): handles multipart form data, dispatches to `parseTripText`, `transcribeHandwritingFromBuffer`, `correctTripLineDescriptions`, or `correctTripLineDescriptionsDeepSeek` from `invoice-assistant`. `runtime = "nodejs"`, `maxDuration = 120`.
- **No auth, no DB**: fully stateless; vendor/client data lives in browser `localStorage`.

## Testing Strategy

### Unit tests
```bash
npm test
# runs: npm --prefix invoice-assistant run test (vitest run)
```
Tests live in `invoice-assistant/src/parseTripText.test.ts` and `invoice-assistant/src/ocr/geminiVision.smoke.test.ts` (smoke test, requires `GEMINI_API_KEY`).

### Manual / end-to-end testing
1. `npm run dev` → open [http://localhost:3000](http://localhost:3000)
2. Paste text from `invoice-assistant/sample-podklad.txt` into the text area → click "Zpracovat"
3. Verify trip lines appear in the Faktura tab
4. Test image/PDF upload with a real scan if `GEMINI_API_KEY` is available
5. Test name-correction with Gemini or DeepSeek

## Cursor Cloud Specific Instructions

- Secrets `GEMINI_API_KEY` and `DEEPSEEK_API_KEY` should be added in the Cursor Dashboard (Cloud Agents → Secrets) for any task that exercises OCR or name-correction paths.
- Run `npm install` at the start of every agent session to ensure `invoice-assistant/dist/` is up to date.
- After editing any file under `invoice-assistant/src/`, rebuild the package before running Next.js: `npm run build --prefix invoice-assistant`.
- For lint checks run `npm run lint` from the repo root.
- For unit tests run `npm test` from the repo root.
- Do NOT run `next build` in CI without `GEMINI_API_KEY` / `DEEPSEEK_API_KEY` set — the build will succeed but smoke tests will be skipped.

## Code Conventions

- TypeScript strict mode; no `any` unless unavoidable.
- ESM throughout `invoice-assistant`; CommonJS is not used anywhere.
- Tailwind utility classes in JSX; no separate CSS modules.
- API responses are typed; use `src/lib/readJsonResponse.ts` helpers.
- Error formatting via `src/lib/formatUnknownError.ts`.
- Keep AI provider logic isolated in `invoice-assistant/src/ocr/`; the Next.js layer should not call AI SDKs directly.
