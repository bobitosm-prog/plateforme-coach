export type NotificationDestinationResult =
  | { ok: true; value: string }
  | { ok: false; reason: string }

const CONTROL_CHARS = /[\u0000-\u001f\u007f-\u009f]/
const WHITESPACE = /\s/u

function validateLayer(value: string): string | null {
  if (!value) return 'destination is empty'
  if (value !== value.trim() || WHITESPACE.test(value)) return 'whitespace is not allowed'
  if (CONTROL_CHARS.test(value)) return 'control characters are not allowed'
  if (value.includes('\\')) return 'backslashes are not allowed'
  if (!value.startsWith('/') || value.startsWith('//')) return 'destination must start with exactly one slash'
  return null
}

export function parseNotificationDestination(value: unknown): NotificationDestinationResult {
  if (typeof value !== 'string') return { ok: false, reason: 'destination must be text' }

  let layer = value
  for (let depth = 0; depth < 5; depth++) {
    const reason = validateLayer(layer)
    if (reason) return { ok: false, reason }

    let decoded: string
    try {
      decoded = decodeURIComponent(layer)
    } catch {
      return { ok: false, reason: 'destination encoding is invalid' }
    }
    if (decoded === layer) return { ok: true, value }
    layer = decoded
  }

  return { ok: false, reason: 'destination encoding is too deeply nested' }
}

export function requireNotificationDestination(value: unknown): string {
  const parsed = parseNotificationDestination(value)
  if (!parsed.ok) throw new Error(`Invalid notification destination: ${parsed.reason}`)
  return parsed.value
}
