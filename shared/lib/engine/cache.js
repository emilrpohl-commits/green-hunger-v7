export class MemoryCache {
  constructor(ttlMs = 300000) {
    this.ttlMs = ttlMs
    this.map = new Map()
  }

  get(key) {
    const entry = this.map.get(key)
    if (!entry) return null
    if (entry.expiresAt < Date.now()) {
      this.map.delete(key)
      return null
    }
    return entry.value
  }

  set(key, value, ttlMs = this.ttlMs) {
    this.map.set(key, { value, expiresAt: Date.now() + Math.max(0, ttlMs) })
  }

  delete(key) {
    this.map.delete(key)
  }

  clear() {
    this.map.clear()
  }
}
