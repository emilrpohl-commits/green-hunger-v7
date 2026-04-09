const env = (typeof import.meta !== 'undefined' && import.meta.env) ? import.meta.env : {}

function toInt(value, fallback) {
  const n = parseInt(String(value ?? ''), 10)
  return Number.isFinite(n) ? n : fallback
}

export const engineConfig = {
  baseUrl: String(env.VITE_DND5E_API_BASE || 'https://www.dnd5eapi.co').replace(/\/+$/, ''),
  primaryRuleset: String(env.VITE_DND5E_PRIMARY_RULESET || '2024'),
  fallbackRuleset: String(env.VITE_DND5E_FALLBACK_RULESET || '2014'),
  requestTimeoutMs: toInt(env.VITE_DND5E_TIMEOUT_MS, 9000),
  maxRetries: toInt(env.VITE_DND5E_MAX_RETRIES, 2),
  backoffMs: toInt(env.VITE_DND5E_BACKOFF_MS, 250),
  cacheTtlMs: toInt(env.VITE_DND5E_CACHE_TTL_MS, 5 * 60 * 1000),
}

export function getRulesetNamespace(ruleset) {
  const value = String(ruleset || engineConfig.primaryRuleset).trim()
  return value === '2014' || value === '2024' ? value : engineConfig.primaryRuleset
}
