import {
  resolveUserCapabilities,
  type UserCapabilities,
} from './capabilities'
import type { LegacyEntitlement } from './legacy-entitlements'
import {
  analyzeCapabilityDifference,
  type CapabilityShadowAnalysis as CapabilityDifferenceAnalysis,
} from './shadow-analysis'
import { resolveUserCapabilitiesShadow } from './shadow-resolver'

export type ShadowAnalysisInput = {
  subscriptionType: string | null
  legacyEntitlements: readonly LegacyEntitlement[]
}

export type CapabilityShadowAnalysis = CapabilityDifferenceAnalysis & {
  current: UserCapabilities
  shadow: UserCapabilities
}

export type ShadowCohortReport = {
  total: number
  matches: number
  diffs: number
  fieldsChanged: Record<keyof UserCapabilities, number>
}

const emptyFieldCounts = (): ShadowCohortReport['fieldsChanged'] => ({
  ai: 0,
  training: 0,
  nutrition: 0,
  coachManaged: 0,
})

export function analyzeSingleUserCapabilities(
  input: ShadowAnalysisInput,
): CapabilityShadowAnalysis {
  const current = resolveUserCapabilities({
    subscriptionType: input.subscriptionType,
  })
  const shadow = resolveUserCapabilitiesShadow(input)
  const analysis = analyzeCapabilityDifference(current, shadow)

  return {
    ...analysis,
    current,
    shadow,
  }
}

export function analyzeCapabilityCohort(
  inputs: readonly ShadowAnalysisInput[],
): ShadowCohortReport {
  const report: ShadowCohortReport = {
    total: inputs.length,
    matches: 0,
    diffs: 0,
    fieldsChanged: emptyFieldCounts(),
  }

  for (const input of inputs) {
    const analysis = analyzeSingleUserCapabilities(input)

    if (analysis.match) {
      report.matches += 1
      continue
    }

    report.diffs += 1
    for (const difference of analysis.differences) {
      report.fieldsChanged[difference.field] += 1
    }
  }

  return report
}
