const store = new Map<string, { count: number; reset: number }>()

export function checkRateLimit(id: string, max: number = 10, windowMs: number = 60000): { allowed: boolean; remaining: number; retryAfter?: number } {
  const now = Date.now()
  // Cleanup old entries periodically
  if (store.size > 5000) {
    for (const [k, v] of store) { if (now > v.reset) store.delete(k) }
  }
  const rec = store.get(id)
  if (!rec || now > rec.reset) {
    store.set(id, { count: 1, reset: now + windowMs })
    return { allowed: true, remaining: max - 1 }
  }
  if (rec.count >= max) {
    return { allowed: false, remaining: 0, retryAfter: Math.ceil((rec.reset - now) / 1000) }
  }
  rec.count++
  return { allowed: true, remaining: max - rec.count }
}
