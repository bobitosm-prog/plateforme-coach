import 'server-only'
import type { AppleEntitlement } from './apple-entitlement'

import { resolveUserCapabilities, type UserCapabilities } from './capabilities'
import {
  resolveEffectiveEntitlement,
  type EffectiveEntitlement,
} from './effective-entitlement'
import type { LegacyEntitlement } from './legacy-entitlements'

type LegacyEntitlementLoader = (
  userId: string,
) => Promise<LegacyEntitlement | null>

export type EffectiveEntitlementContext = {
  subscriptionType: string | null | undefined
  legacyEntitlements: readonly LegacyEntitlement[]
  effectiveEntitlement: EffectiveEntitlement
  capabilities: UserCapabilities
  appleEntitlement?: AppleEntitlement | null
}

async function loadPersistedLegacyEntitlement(
  userId: string,
): Promise<LegacyEntitlement | null> {
  const { getActiveLegacyEntitlement } = await import(
    './legacy-entitlement-repository'
  )
  return getActiveLegacyEntitlement(userId)
}

async function loadPersistedAppleEntitlement(userId: string): Promise<AppleEntitlement | null> {
  if (process.env.APPLE_IAP_ENTITLEMENTS_ENABLED !== 'true') return null
  return (await import('./apple-entitlement-repository')).getActiveAppleEntitlement(userId)
}

/**
 * Server-only product authority context. An absent grant preserves the
 * historical subscription fallback. Legacy lookup failures propagate; Apple
 * failures grant nothing while preserving independently valid rights.
 */
export async function loadEffectiveEntitlementContext(
  userId: string,
  subscriptionType: string | null | undefined,
  loadLegacyEntitlement: LegacyEntitlementLoader = loadPersistedLegacyEntitlement,
  loadAppleEntitlement: (userId: string) => Promise<AppleEntitlement | null> = loadPersistedAppleEntitlement,
): Promise<EffectiveEntitlementContext> {
  let legacyEntitlement: LegacyEntitlement | null = null
  try {
    legacyEntitlement = await loadLegacyEntitlement(userId)
  } catch {
    console.error('[effective-entitlement] Legacy grant lookup failed')
    throw new Error('EFFECTIVE_ENTITLEMENT_CONTEXT_UNAVAILABLE')
  }

  const legacyEntitlements = legacyEntitlement === null
    ? []
    : [legacyEntitlement]
  let appleEntitlement: AppleEntitlement | null = null
  try { appleEntitlement = await loadAppleEntitlement(userId) } catch {
    // Apple failure grants nothing and must not remove valid rights from other sources.
    console.error('[effective-entitlement] Apple grant lookup failed')
  }
  const input = { subscriptionType, legacyEntitlements, appleEntitlement }

  return {
    ...input,
    effectiveEntitlement: resolveEffectiveEntitlement(input),
    capabilities: resolveUserCapabilities(input),
  }
}
