import {
  resolveUserCapabilities,
  type UserCapabilities,
} from './capabilities'
import type { LegacyEntitlement } from './legacy-entitlements'

const CAPABILITY_FIELDS = [
  'ai',
  'training',
  'nutrition',
  'coachManaged',
] as const satisfies readonly (keyof UserCapabilities)[]

type ShadowCapabilitySource = {
  subscriptionType: string | null | undefined
  legacyEntitlements?: readonly LegacyEntitlement[]
  now?: Date
}

export type CapabilityDifference = {
  field: keyof UserCapabilities
  current: boolean
  shadow: boolean
}

export type CapabilityComparison =
  | { status: 'MATCH'; differences: [] }
  | { status: 'DIFF'; differences: CapabilityDifference[] }

/**
 * Computes the effective candidate without loading or mutating persistence.
 * Priority and transitional fallback live in resolveEffectiveEntitlement().
 */
export function resolveUserCapabilitiesShadow({
  subscriptionType,
  legacyEntitlements = [],
  now = new Date(),
}: ShadowCapabilitySource): UserCapabilities {
  return resolveUserCapabilities({
    subscriptionType,
    legacyEntitlements,
    now,
  })
}

export function compareCapabilityResults(
  current: UserCapabilities,
  shadow: UserCapabilities,
): CapabilityComparison {
  const differences = CAPABILITY_FIELDS.flatMap(field => (
    current[field] === shadow[field]
      ? []
      : [{ field, current: current[field], shadow: shadow[field] }]
  ))

  return differences.length === 0
    ? { status: 'MATCH', differences: [] }
    : { status: 'DIFF', differences }
}
