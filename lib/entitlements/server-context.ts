import 'server-only'

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
}

async function loadPersistedLegacyEntitlement(
  userId: string,
): Promise<LegacyEntitlement | null> {
  const { getActiveLegacyEntitlement } = await import(
    './legacy-entitlement-repository'
  )
  return getActiveLegacyEntitlement(userId)
}

/**
 * Server-only product authority context. An absent grant preserves the
 * historical subscription fallback; a repository failure is propagated so
 * authorization callers can fail closed.
 */
export async function loadEffectiveEntitlementContext(
  userId: string,
  subscriptionType: string | null | undefined,
  loadLegacyEntitlement: LegacyEntitlementLoader = loadPersistedLegacyEntitlement,
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
  const input = { subscriptionType, legacyEntitlements }

  return {
    ...input,
    effectiveEntitlement: resolveEffectiveEntitlement(input),
    capabilities: resolveUserCapabilities(input),
  }
}
