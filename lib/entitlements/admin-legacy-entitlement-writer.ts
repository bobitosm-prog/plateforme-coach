import 'server-only'

import { supabaseAdmin } from '@/lib/supabase/admin'

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export type AdminLegacyEntitlementGrantResult =
  | { kind: 'created' }
  | { kind: 'already_exists' }

function safeErrorCode(error: unknown): string {
  if (typeof error !== 'object' || error === null || !('code' in error)) {
    return 'UNKNOWN'
  }
  const code = Reflect.get(error, 'code')
  return typeof code === 'string' && /^[A-Z0-9_]{1,64}$/i.test(code)
    ? code
    : 'UNKNOWN'
}

/**
 * Creates the bounded legacy grant without touching subscriptions or coaching
 * relations. Existing rows are preserved, including revoked or expired rows.
 */
export async function grantAdminLegacyInvitedAccess({
  userId,
  actorId,
  now = new Date(),
}: {
  userId: string
  actorId: string
  now?: Date
}): Promise<AdminLegacyEntitlementGrantResult> {
  if (
    !UUID_PATTERN.test(userId)
    || !UUID_PATTERN.test(actorId)
    || Number.isNaN(now.getTime())
  ) {
    throw new Error('INVALID_ADMIN_LEGACY_ENTITLEMENT_GRANT')
  }

  const { error } = await supabaseAdmin
    .from('legacy_entitlements')
    .insert({
      user_id: userId,
      type: 'legacy_invited_access',
      source: 'admin',
      starts_at: now.toISOString(),
      ends_at: null,
      created_by: actorId,
      metadata: { origin: 'admin_console' },
    })

  if (!error) return { kind: 'created' }
  if (safeErrorCode(error) === '23505') return { kind: 'already_exists' }

  console.error('[admin-legacy-entitlement] Grant failed', {
    code: safeErrorCode(error),
  })
  throw new Error('ADMIN_LEGACY_ENTITLEMENT_GRANT_FAILED')
}
