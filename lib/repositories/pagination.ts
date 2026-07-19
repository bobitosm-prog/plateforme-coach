export interface PageRequest {
  readonly cursor?: string
  readonly limit?: number
}

export interface PaginatedResult<T> {
  readonly items: readonly T[]
  readonly hasMore: boolean
  readonly nextCursor: string | null
}

export const DEFAULT_PAGE_SIZE = 20
export const MAX_PAGE_SIZE = 50

export function boundedPageSize(limit: number | undefined): number {
  if (limit === undefined) return DEFAULT_PAGE_SIZE
  if (!Number.isFinite(limit)) return DEFAULT_PAGE_SIZE
  return Math.max(1, Math.min(MAX_PAGE_SIZE, Math.trunc(limit)))
}

export interface TimestampCursor {
  readonly timestamp: string | null
  readonly id: string
}

export function encodeTimestampCursor(cursor: TimestampCursor): string {
  return btoa(JSON.stringify([cursor.timestamp, cursor.id])).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '')
}

export function decodeTimestampCursor(value: string): TimestampCursor | null {
  try {
    if (!/^[A-Za-z0-9_-]{8,512}$/.test(value)) return null
    const padded = value.replaceAll('-', '+').replaceAll('_', '/').padEnd(Math.ceil(value.length / 4) * 4, '=')
    const decoded: unknown = JSON.parse(atob(padded))
    if (!Array.isArray(decoded) || decoded.length !== 2) return null
    const [timestamp, id] = decoded
    if (timestamp !== null && (typeof timestamp !== 'string' || !Number.isFinite(Date.parse(timestamp)))) return null
    if (typeof id !== 'string' || !/^[0-9a-f-]{16,64}$/i.test(id)) return null
    return { timestamp, id }
  } catch {
    return null
  }
}
