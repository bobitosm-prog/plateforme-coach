import 'server-only'
import { purchaseEnvironment } from '@/lib/apple/environment'
import { supabaseAdmin } from '@/lib/supabase/admin'
import type { AppleEntitlement } from './apple-entitlement'

// A successful notification is not perpetual proof of absence of a later refund.
// Background reconciliation must refresh ALL purchases (including lifetime) before activation.
export const APPLE_ENTITLEMENT_FRESHNESS_MS = 24 * 60 * 60 * 1000
const PLANS = {
  'ch.moovx.app.athena.monthly': 'monthly',
  'ch.moovx.app.athena.yearly': 'yearly',
  'ch.moovx.app.athena.lifetime': 'lifetime',
} as const
export function selectAppleEntitlement(rows: unknown, now = Date.now()): AppleEntitlement | null {
  if (!Array.isArray(rows)) throw new Error('APPLE_ENTITLEMENT_INVALID_RESULT')
  const grants: AppleEntitlement[] = []
  for (const row of rows) {
    if (!row || typeof row !== 'object' || !Object.hasOwn(PLANS, row.product_id) ||
        !Number.isSafeInteger(row.checked_ms) || row.checked_ms <= 0 || row.checked_ms > now + 300000 ||
        typeof row.is_upgraded !== 'boolean') throw new Error('APPLE_ENTITLEMENT_INVALID_RESULT')
    const validUntil = row.checked_ms + APPLE_ENTITLEMENT_FRESHNESS_MS
    if (validUntil <= now || row.revoked_ms !== null || row.is_upgraded) continue
    const plan = PLANS[row.product_id as keyof typeof PLANS]
    if (row.state === 'lifetime' && plan === 'lifetime' && row.access_until_ms === null) {
      grants.push({ type: 'lifetime', plan, accessUntil: null, validUntil })
    } else if ((row.state === 'active' || row.state === 'grace') && plan !== 'lifetime' &&
        Number.isSafeInteger(row.access_until_ms) && row.access_until_ms > now) {
      grants.push({ type: 'paid', plan, accessUntil: row.access_until_ms, validUntil: Math.min(validUntil, row.access_until_ms) })
    }
  }
  // Prefer the strongest right; one expired/revoked purchase cannot cancel another valid one.
  grants.sort((a, b) => Number(b.type === 'lifetime') - Number(a.type === 'lifetime') || b.validUntil - a.validUntil)
  return grants[0] ?? null
}
export async function getActiveAppleEntitlement(userId: string): Promise<AppleEntitlement | null> {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId)) return null
  const { data, error } = await supabaseAdmin.rpc(purchaseEnvironment(userId) === 'Sandbox'
    ? 'read_apple_sandbox_entitlement_states' : 'read_apple_entitlement_states', { p_user_id: userId })
  if (error) throw new Error('APPLE_ENTITLEMENT_UNAVAILABLE')
  return selectAppleEntitlement(data)
}
