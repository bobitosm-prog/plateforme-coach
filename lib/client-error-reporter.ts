/**
 * Client-side error reporting → POST /api/log-error.
 * Throttle + dedup + anti-loop. Silence absolue on failure.
 */

const MAX_REPORTS_PER_MIN = 5
const DEDUP_WINDOW_MS = 60_000
const MAX_DETAILS_LENGTH = 2000

let installed = false
const recentMessages = new Map<string, number>() // message → timestamp
let reportCount = 0
let windowStart = 0

function isThrottled(): boolean {
  const now = Date.now()
  if (now - windowStart > 60_000) {
    windowStart = now
    reportCount = 0
  }
  if (reportCount >= MAX_REPORTS_PER_MIN) return true
  reportCount++
  return false
}

function isDuplicate(message: string): boolean {
  const now = Date.now()
  const last = recentMessages.get(message)
  if (last && now - last < DEDUP_WINDOW_MS) return true
  recentMessages.set(message, now)
  // Cleanup old entries
  if (recentMessages.size > 50) {
    for (const [k, v] of recentMessages) {
      if (now - v > DEDUP_WINDOW_MS) recentMessages.delete(k)
    }
  }
  return false
}

export function reportError(level: string, message: string, details?: Record<string, unknown>) {
  try {
    if (!message) return
    if (isThrottled()) return
    if (isDuplicate(message)) return

    // Anti-loop: skip if error originates from the reporter itself
    const stack = new Error().stack || ''
    if (stack.includes('client-error-reporter')) return

    const truncatedDetails = details ? JSON.stringify({
      ...details,
      env: process.env.NODE_ENV,
    }).slice(0, MAX_DETAILS_LENGTH) : JSON.stringify({ env: process.env.NODE_ENV })

    fetch('/api/log-error', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        level,
        message: message.slice(0, 500),
        details: truncatedDetails,
        page_url: typeof window !== 'undefined' ? window.location.pathname : null,
      }),
      keepalive: true,
    }).catch(() => {}) // silence absolue
  } catch {
    // silence absolue — un échec de report ne doit JAMAIS créer d'erreur
  }
}

export function initErrorReporting() {
  if (typeof window === 'undefined') return
  if (installed) return
  installed = true

  window.onerror = (message, source, lineno, colno, error) => {
    reportError('error', String(message), {
      source: source || undefined,
      lineno,
      colno,
      stack: error?.stack?.slice(0, MAX_DETAILS_LENGTH),
    })
  }

  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason
    const message = reason instanceof Error ? reason.message : String(reason || 'Unhandled rejection')
    reportError('error', message, {
      type: 'unhandledrejection',
      stack: reason instanceof Error ? reason.stack?.slice(0, MAX_DETAILS_LENGTH) : undefined,
    })
  })
}
