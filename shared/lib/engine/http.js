import { engineConfig } from './config.js'

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function fetchWithTimeout(url, options = {}, timeoutMs = engineConfig.requestTimeoutMs) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetch(url, { ...options, signal: controller.signal })
  } finally {
    clearTimeout(timer)
  }
}

export async function requestJson(url, options = {}) {
  const retries = Math.max(0, engineConfig.maxRetries)
  let lastError = null

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const res = await fetchWithTimeout(url, options)
      if (!res.ok) {
        const body = await res.text().catch(() => '')
        // Retry only for transient server errors.
        if (res.status >= 500 && attempt < retries) {
          await sleep(engineConfig.backoffMs * (attempt + 1))
          continue
        }
        throw new Error(`HTTP ${res.status} ${res.statusText}${body ? `: ${body}` : ''}`)
      }
      return await res.json()
    } catch (err) {
      lastError = err
      if (attempt < retries) {
        await sleep(engineConfig.backoffMs * (attempt + 1))
        continue
      }
    }
  }

  throw lastError || new Error('Unknown request failure')
}
