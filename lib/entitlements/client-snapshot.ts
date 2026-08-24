import type { UserCapabilities } from './capabilities'
import type { EffectiveEntitlement } from './effective-entitlement'

export type EffectiveEntitlementSnapshot = {
  capabilities: UserCapabilities
  effectiveEntitlement: EffectiveEntitlement
}

export const DENIED_ENTITLEMENT_SNAPSHOT: EffectiveEntitlementSnapshot = {
  capabilities: {
    ai: false,
    training: false,
    nutrition: false,
    coachManaged: false,
  },
  effectiveEntitlement: {
    type: 'free',
    source: 'subscription',
  },
}

function isSnapshot(value: unknown): value is EffectiveEntitlementSnapshot {
  if (typeof value !== 'object' || value === null) return false
  const capabilities = Reflect.get(value, 'capabilities')
  const effectiveEntitlement = Reflect.get(value, 'effectiveEntitlement')
  if (typeof capabilities !== 'object' || capabilities === null) return false
  if (typeof effectiveEntitlement !== 'object' || effectiveEntitlement === null) return false

  return ['ai', 'training', 'nutrition', 'coachManaged'].every(
    key => typeof Reflect.get(capabilities, key) === 'boolean',
  ) && typeof Reflect.get(effectiveEntitlement, 'type') === 'string'
    && typeof Reflect.get(effectiveEntitlement, 'source') === 'string'
}

export async function fetchEffectiveEntitlementSnapshot(
  request: typeof fetch = fetch,
): Promise<EffectiveEntitlementSnapshot> {
  const response = await request('/api/entitlements/capabilities', {
    method: 'GET',
    cache: 'no-store',
  })
  if (!response.ok) throw new Error('ENTITLEMENT_SNAPSHOT_UNAVAILABLE')

  const body: unknown = await response.json()
  if (!isSnapshot(body)) throw new Error('ENTITLEMENT_SNAPSHOT_INVALID')
  return body
}
