# AGENTS.md

## Project overview

- Project: `faktura-app` (Next.js 15, App Router) with local package `invoice-assistant`.
- Main flow: input text / TXT / PDF / image -> parse and optional OCR/correction -> editable invoice -> print/save as PDF in browser.
- Stack: Next.js 15, React 19, TypeScript, Tailwind v4, Vitest (inside `invoice-assistant`).

## Priority order

1. Security and secret handling (`GEMINI_API_KEY`, `DEEPSEEK_API_KEY`).
2. Correct parsing and totals (`parseTripText`, invoice calculations).
3. OCR + correction provider behavior (Gemini/DeepSeek/Ollama).
4. UI workflow stability (Podklad -> Faktura -> Nahled).

## Repository map

- UI: `src/components/FakturaApp.tsx`
- API route: `src/app/api/process/route.ts`
- Env loader: `src/lib/loadEnv.ts`
- Invoice math/helpers: `src/lib/invoice.ts`
- Parsing core: `invoice-assistant/src/parseTripText.ts`
- OCR + correction: `invoice-assistant/src/ocr/*`
- Library tests: `invoice-assistant/src/*.test.ts`, `invoice-assistant/src/ocr/*.test.ts`

## Run and build

- Install deps: `npm install`
- Dev server: `npm run dev`
- Lint: `npm run lint`
- Library tests: `npm test` (runs `npm --prefix invoice-assistant run test`)

## Environment and secrets

- Required for Gemini paths: `GEMINI_API_KEY`
- Required for DeepSeek correction: `DEEPSEEK_API_KEY`
- Optional: `GEMINI_MODEL`, `DEEPSEEK_MODEL`, `DEEPSEEK_API_BASE`, `OLLAMA_*`
- Env load order in server runtime:
  1. `invoice-assistant/.env`
  2. `.env`
  3. `.env.local`
- Never commit real API keys or log them in responses.

## Coding guidelines

- Respect existing style and naming; prefer small, focused edits.
- Keep business logic in pure helpers where possible; keep I/O at boundaries (route/UI).
- Avoid `any` unless unavoidable and documented.
- Keep error messages actionable; for user-facing errors, follow existing Czech wording style.
- Do not rewrite unrelated modules.

## Testing guidelines

- For parser/logic changes: run `npm test` and, if relevant, targeted Vitest files in `invoice-assistant`.
- For API changes: run `npm run lint` + exercise `/api/process` path (raw text and file validation cases).
- For UI changes: run `npm run dev` and manually verify key flow in browser:
  - process pasted text
  - correction toggle/provider behavior
  - invoice edit and preview/print state

## Cursor Cloud specific instructions

- Prefer minimal, high-signal checks first (`npm run lint`, targeted tests).
- If you change UI behavior, include a short demo video artifact plus one final-state screenshot.
- If external API keys are unavailable, verify non-key paths (raw text parsing, validation errors) and clearly note limitation.
- Leave the dev server running after testing unless cleanup is explicitly requested.
