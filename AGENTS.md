# AGENTS.md

## Cursor Cloud specific instructions

### Project overview

**Faktura z podkladu** — a Czech-language Next.js 15 invoice generator. Users paste trip/delivery text (or upload photos/PDFs), the app parses lines, and produces a printable invoice preview. No database, no Docker, no external services required for text-only flow.

### Services

| Service | Command | Notes |
|---------|---------|-------|
| Next.js dev server | `npm run dev` | Runs on port 3000. Only required service. |

### Lint / Test / Build

Standard `package.json` scripts — see README for details:

- **Lint:** `npm run lint` (ESLint)
- **Test:** `npm test` (runs Vitest in `invoice-assistant/`)
- **Build:** `npm run build` (Next.js production build)

### Gotchas

- **`instrumentation.ts` + dotenv:** The `register()` function in `src/instrumentation.ts` must use a dynamic `await import()` guarded by `process.env.NEXT_RUNTIME === "nodejs"`. Without this, the dev server fails with "Module not found: Can't resolve 'path'" because Next.js compiles instrumentation for both Node.js and Edge runtimes.
- **`dotenv` in `serverExternalPackages`:** `next.config.mjs` lists `dotenv` (alongside `pdf-parse`) in `serverExternalPackages` to prevent webpack from bundling it.
- **API keys are optional for text flow:** `GEMINI_API_KEY` / `DEEPSEEK_API_KEY` are only needed for image/PDF OCR and AI name correction. Text input works without any keys.
- **`.npmrc` includes dev deps:** The repo has `include=dev` in `.npmrc`. If `NODE_ENV=production` is set, dev dependencies (TypeScript, ESLint) won't install. Unset it before `npm install`.
