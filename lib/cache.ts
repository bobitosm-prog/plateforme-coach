const CACHE_PREFIX = 'moovx_'

export const cache = {
  set: (key: string, data: any, ttl: number = 5 * 60 * 1000) => {
    try {
      const item = { data, expiry: Date.now() + ttl }
      sessionStorage.setItem(CACHE_PREFIX + key, JSON.stringify(item))
    } catch { /* sessionStorage full or unavailable */ }
  },

  get: (key: string): any | null => {
    try {
      const raw = sessionStorage.getItem(CACHE_PREFIX + key)
      if (!raw) return null
      const item = JSON.parse(raw)
      if (Date.now() > item.expiry) {
        sessionStorage.removeItem(CACHE_PREFIX + key)
        return null
      }
      return item.data
    } catch { return null }
  },

  remove: (key: string) => {
    try { sessionStorage.removeItem(CACHE_PREFIX + key) } catch {}
  },

  clearAll: () => {
    try {
      Object.keys(sessionStorage)
        .filter(k => k.startsWith(CACHE_PREFIX))
        .forEach(k => sessionStorage.removeItem(k))
    } catch {}
  },
}
