import { engineConfig, getRulesetNamespace } from './config.js'
import { MemoryCache } from './cache.js'
import { requestJson } from './http.js'

const cache = new MemoryCache(engineConfig.cacheTtlMs)

function buildQuery(params = {}) {
  const search = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) {
    if (v == null || v === '') continue
    if (Array.isArray(v)) {
      v.forEach((item) => search.append(k, String(item)))
    } else {
      search.set(k, String(v))
    }
  }
  const qs = search.toString()
  return qs ? `?${qs}` : ''
}

function listPath(resource, ruleset) {
  return `/api/${getRulesetNamespace(ruleset)}/${resource}`
}

function detailPath(resource, index, ruleset) {
  return `/api/${getRulesetNamespace(ruleset)}/${resource}/${encodeURIComponent(index)}`
}

export async function healthCheck5eApi() {
  const start = Date.now()
  try {
    const url = `${engineConfig.baseUrl}/api/${getRulesetNamespace(engineConfig.primaryRuleset)}`
    const data = await requestJson(url, { method: 'GET' })
    return { ok: true, latencyMs: Date.now() - start, data }
  } catch (error) {
    return { ok: false, latencyMs: Date.now() - start, error: String(error?.message || error) }
  }
}

export async function listResource(resource, { ruleset, query = {}, force = false } = {}) {
  const path = `${listPath(resource, ruleset)}${buildQuery(query)}`
  const key = `list:${path}`
  if (!force) {
    const cached = cache.get(key)
    if (cached) return cached
  }
  const data = await requestJson(`${engineConfig.baseUrl}${path}`, { method: 'GET' })
  cache.set(key, data)
  return data
}

export async function getResource(resource, index, { ruleset, force = false } = {}) {
  const path = detailPath(resource, index, ruleset)
  const key = `get:${path}`
  if (!force) {
    const cached = cache.get(key)
    if (cached) return cached
  }
  const data = await requestJson(`${engineConfig.baseUrl}${path}`, { method: 'GET' })
  cache.set(key, data)
  return data
}

export function clearEngineCache() {
  cache.clear()
}
