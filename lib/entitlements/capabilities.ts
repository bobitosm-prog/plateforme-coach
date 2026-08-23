import type { LegacyEntitlement } from './legacy-entitlements'

export type UserCapabilities = {
  ai: boolean
  training: boolean
  nutrition: boolean
  coachManaged: boolean
}

type CapabilitySource = {
  subscriptionType: string | null | undefined
  /** Shadow input only. Legacy grants are not an active authority yet. */
  legacyEntitlements?: readonly LegacyEntitlement[]
}

/**
 * Resolves the current product capabilities from the legacy subscription
 * authority. The optional legacy entitlement input is deliberately ignored
 * until persistence, migration and cutover are approved. This preserves all
 * existing rights while keeping the future resolver boundary stable.
 */
export function resolveUserCapabilities({
  subscriptionType,
}: CapabilitySource): UserCapabilities {
  const coachManaged = subscriptionType === 'invited'

  return {
    ai: !coachManaged,
    training: !coachManaged,
    nutrition: !coachManaged,
    coachManaged,
  }
}
