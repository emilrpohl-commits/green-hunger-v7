/**
 * Phase 2A: surface static/DB fallback usage without changing behavior.
 * Logs only in development (Vite) or when NODE_ENV is development.
 */

const env = typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env : {}
const isDev =
  !!env.DEV ||
  env.MODE === 'development' ||
  (typeof process !== 'undefined' && process.env?.NODE_ENV === 'development')

/**
 * @param {string} message
 * @param {Record<string, unknown>} [meta]
 */
export function warnFallback(message, meta = {}) {
  if (!isDev) return
  console.warn(`[FALLBACK] ${message}`, meta)
}

export function isDevTelemetryEnabled() {
  return isDev
}
