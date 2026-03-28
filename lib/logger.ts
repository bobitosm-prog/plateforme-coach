type Level = 'info' | 'warning' | 'error' | 'critical'

async function log(level: Level, message: string, details?: any) {
  try {
    await fetch('/api/log-error', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        level,
        message,
        details: details ?? null,
        page_url: typeof window !== 'undefined' ? window.location.href : null,
      }),
    })
  } catch (e) {
    console.error('[logger] Failed to send log:', e)
  }
}

export const logger = {
  info:     (message: string, details?: any) => log('info', message, details),
  warning:  (message: string, details?: any) => log('warning', message, details),
  error:    (message: string, details?: any) => log('error', message, details),
  critical: (message: string, details?: any) => log('critical', message, details),
}
