import 'server-only'

import { supabaseAdmin } from '@/lib/supabase/admin'
import type {
  LegacyEntitlement,
  LegacyEntitlementOrigin,
} from './legacy-entitlements'

const LEGACY_ENTITLEMENT_PROJECTION = [
  'id',
  'user_id',
  'type',
  'source',
  'starts_at',
  'ends_at',
  'revoked_at',
].join(',')

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const LEGACY_SOURCES = new Set<LegacyEntitlementOrigin>([
  'migration',
  'admin',
  'support_reconciliation',
])

type LegacyEntitlementRow = {
  id: string
  user_id: string
  type: 'legacy_invited_access'
  source: LegacyEntitlementOrigin
  starts_at: string
  ends_at: string | null
  revoked_at: null
}

export interface LegacyEntitlementRepository {
  getActiveLegacyEntitlement(userId: string): Promise<LegacyEntitlement | null>
}

function safeErrorCode(error: unknown): string {
  if (typeof error !== 'object' || error === null || !('code' in error)) {
    return 'UNKNOWN'
  }
  const code = Reflect.get(error, 'code')
  return typeof code === 'string' && /^[A-Z0-9_]{1,64}$/i.test(code)
    ? code
    : 'UNKNOWN'
}

function parseActiveRow(
  value: unknown,
  expectedUserId: string,
  now: Date,
): LegacyEntitlementRow | null {
  if (typeof value !== 'object' || value === null) return null

  const id = Reflect.get(value, 'id')
  const userId = Reflect.get(value, 'user_id')
  const type = Reflect.get(value, 'type')
  const source = Reflect.get(value, 'source')
  const startsAtValue = Reflect.get(value, 'starts_at')
  const endsAtValue = Reflect.get(value, 'ends_at')
  const revokedAt = Reflect.get(value, 'revoked_at')

  if (
    typeof id !== 'string'
    || !UUID_PATTERN.test(id)
    || typeof userId !== 'string'
    || !UUID_PATTERN.test(userId)
    || userId !== expectedUserId
    || type !== 'legacy_invited_access'
    || typeof source !== 'string'
    || !LEGACY_SOURCES.has(source as LegacyEntitlementOrigin)
    || typeof startsAtValue !== 'string'
    || (endsAtValue !== null && typeof endsAtValue !== 'string')
    || revokedAt !== null
  ) {
    return null
  }

  const startsAt = new Date(startsAtValue)
  const endsAt = endsAtValue === null ? null : new Date(endsAtValue)
  if (
    Number.isNaN(startsAt.getTime())
    || startsAt > now
    || (endsAt !== null && (
      Number.isNaN(endsAt.getTime())
      || endsAt <= startsAt
      || endsAt <= now
    ))
  ) {
    return null
  }

  return {
    id,
    user_id: userId,
    type,
    source: source as LegacyEntitlementOrigin,
    starts_at: startsAtValue,
    ends_at: endsAtValue,
    revoked_at: null,
  }
}

async function readActiveLegacyEntitlement(
  userId: string,
): Promise<LegacyEntitlement | null> {
  if (!UUID_PATTERN.test(userId)) return null

  const now = new Date()
  const nowIso = now.toISOString()
  const { data, error } = await supabaseAdmin
    .from('legacy_entitlements')
    .select(LEGACY_ENTITLEMENT_PROJECTION)
    .eq('user_id', userId)
    .eq('type', 'legacy_invited_access')
    .lte('starts_at', nowIso)
    .is('revoked_at', null)
    .or(`ends_at.is.null,ends_at.gt.${nowIso}`)
    .limit(2)

  if (error) {
    const code = safeErrorCode(error)
    // Transitional compatibility: a deployment where the dark table has not
    // been applied cannot contain persisted grants. Treat that exact schema
    // absence as an empty repository and let subscription authority (including
    // the historical `invited` fallback) resolve capabilities normally.
    // Every other repository failure remains fail-closed.
    if (code === 'PGRST205') {
      console.warn('[legacy-entitlements] Shadow table unavailable; using subscription fallback')
      return null
    }
    console.error('[legacy-entitlements] Shadow lookup failed', {
      code,
    })
    throw new Error('LEGACY_ENTITLEMENT_LOOKUP_FAILED')
  }
  if (!Array.isArray(data)) {
    console.error('[legacy-entitlements] Shadow lookup returned invalid data')
    throw new Error('LEGACY_ENTITLEMENT_INVALID_RESULT')
  }
  if (data.length > 1) {
    console.error('[legacy-entitlements] Integrity violation: multiple active grants')
    throw new Error('LEGACY_ENTITLEMENT_INTEGRITY_ERROR')
  }
  if (data.length === 0) return null

  const row = parseActiveRow(data[0], userId, now)
  if (!row) {
    console.error('[legacy-entitlements] Shadow lookup returned an invalid grant')
    throw new Error('LEGACY_ENTITLEMENT_INVALID_GRANT')
  }

  return {
    type: row.type,
    active: true,
    source: row.source,
    startsAt: new Date(row.starts_at),
    endsAt: row.ends_at === null ? null : new Date(row.ends_at),
    revokedAt: null,
  }
}

export const legacyEntitlementRepository: LegacyEntitlementRepository = {
  getActiveLegacyEntitlement: readActiveLegacyEntitlement,
}

/**
 * Server-only grant read used by the effective entitlement server context.
 */
export function getActiveLegacyEntitlement(
  userId: string,
): Promise<LegacyEntitlement | null> {
  return legacyEntitlementRepository.getActiveLegacyEntitlement(userId)
}
