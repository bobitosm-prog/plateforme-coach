import {
  resolveUserCapabilities,
  type UserCapabilities,
} from './capabilities'
import type { LegacyEntitlement } from './legacy-entitlements'
import {
  compareCapabilityResults,
  resolveUserCapabilitiesShadow,
} from './shadow-resolver'

export type CapabilityAnalysisDifference = {
  field: keyof UserCapabilities
  currentValue: boolean
  shadowValue: boolean
}

export type CapabilityShadowAnalysis =
  | {
    status: 'MATCH'
    match: true
    differences: []
  }
  | {
    status: 'DIFF'
    match: false
    differences: CapabilityAnalysisDifference[]
  }

export type CapabilityShadowContext = {
  subscriptionType: string | null | undefined
  legacyEntitlements: readonly LegacyEntitlement[]
  currentCapabilities: UserCapabilities
  shadowCapabilities: UserCapabilities
}

type CapabilityShadowAnalysisInput = {
  subscriptionType: string | null | undefined
  legacyEntitlements?: readonly LegacyEntitlement[]
  now?: Date
}

/** Pure comparison. Its output contains capability booleans only, never PII. */
export function analyzeCapabilityDifference(
  currentCapabilities: UserCapabilities,
  shadowCapabilities: UserCapabilities,
): CapabilityShadowAnalysis {
  const comparison = compareCapabilityResults(
    currentCapabilities,
    shadowCapabilities,
  )
  if (comparison.status === 'MATCH') {
    return { status: 'MATCH', match: true, differences: [] }
  }

  return {
    status: 'DIFF',
    match: false,
    differences: comparison.differences.map(difference => ({
      field: difference.field,
      currentValue: difference.current,
      shadowValue: difference.shadow,
    })),
  }
}

/**
 * Accepts the complete abstract context but observes only the two capability
 * results. Subscription and entitlement inputs are never included in output.
 */
export function analyzeCapabilityShadowContext({
  currentCapabilities,
  shadowCapabilities,
}: CapabilityShadowContext): CapabilityShadowAnalysis {
  return analyzeCapabilityDifference(currentCapabilities, shadowCapabilities)
}

/**
 * Builds an in-memory observation. The shadow candidate is compared and then
 * discarded; effective callers continue to use resolveUserCapabilities().
 */
export function runCapabilityShadowAnalysis({
  subscriptionType,
  legacyEntitlements = [],
  now,
}: CapabilityShadowAnalysisInput): CapabilityShadowAnalysis {
  const currentCapabilities = resolveUserCapabilities({ subscriptionType })
  const shadowCapabilities = resolveUserCapabilitiesShadow({
    subscriptionType,
    legacyEntitlements,
    now,
  })

  return analyzeCapabilityShadowContext({
    subscriptionType,
    legacyEntitlements,
    currentCapabilities,
    shadowCapabilities,
  })
}
