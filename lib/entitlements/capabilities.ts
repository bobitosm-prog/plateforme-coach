import type { LegacyEntitlement } from './legacy-entitlements'
import { resolveEffectiveEntitlement } from './effective-entitlement'

export type UserCapabilities = {
  ai: boolean
  training: boolean
  nutrition: boolean
  coachManaged: boolean
}

type CapabilitySource = {
  subscriptionType: string | null | undefined
  legacyEntitlements?: readonly LegacyEntitlement[]
  now?: Date
}

/**
 * Maps the effective product authority to the existing capability contract.
 * Callers that have not loaded legacy grants retain subscription fallback.
 */
export function resolveUserCapabilities({
  subscriptionType,
  legacyEntitlements = [],
  now,
}: CapabilitySource): UserCapabilities {
  const entitlement = resolveEffectiveEntitlement({
    subscriptionType,
    legacyEntitlements,
    now,
  })
  const coachManaged = entitlement.type === 'legacy_invited'

  return {
    ai: !coachManaged,
    training: !coachManaged,
    nutrition: !coachManaged,
    coachManaged,
  }
}
