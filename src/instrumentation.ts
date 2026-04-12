/**
 * Intentionally no-op.
 * `.env` values are loaded lazily inside API routes via `loadServerEnv()`.
 *
 * This avoids Webpack trying to bundle Node-only dotenv/fs/path modules
 * through instrumentation in some local Windows setups.
 */
export function register() {
  // no-op
}
