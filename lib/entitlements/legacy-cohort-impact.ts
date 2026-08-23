import type { UserCapabilities } from './capabilities'
import type { LegacyEntitlement } from './legacy-entitlements'
import { analyzeSingleUserCapabilities } from './shadow-cohort'

export type LegacyCohortEntry = {
  subscriptionType: string | null
  legacyEntitlements: readonly LegacyEntitlement[]
}

type CapabilityImpactCount = {
  unchanged: number
  gained: number
  lost: number
}

export type LegacyCohortImpactReport = {
  totalUsers: number
  matches: number
  differences: number
  capabilityImpact: Record<keyof UserCapabilities, CapabilityImpactCount>
}

const CAPABILITY_FIELDS = [
  'ai',
  'training',
  'nutrition',
  'coachManaged',
] as const satisfies readonly (keyof UserCapabilities)[]

const emptyCapabilityImpact = (): LegacyCohortImpactReport['capabilityImpact'] => ({
  ai: { unchanged: 0, gained: 0, lost: 0 },
  training: { unchanged: 0, gained: 0, lost: 0 },
  nutrition: { unchanged: 0, gained: 0, lost: 0 },
  coachManaged: { unchanged: 0, gained: 0, lost: 0 },
})

export function generateLegacyCohortImpactReport(
  entries: readonly LegacyCohortEntry[],
): LegacyCohortImpactReport {
  const report: LegacyCohortImpactReport = {
    totalUsers: entries.length,
    matches: 0,
    differences: 0,
    capabilityImpact: emptyCapabilityImpact(),
  }

  for (const entry of entries) {
    const analysis = analyzeSingleUserCapabilities(entry)

    if (analysis.match) {
      report.matches += 1
    } else {
      report.differences += 1
    }

    for (const field of CAPABILITY_FIELDS) {
      const current = analysis.current[field]
      const shadow = analysis.shadow[field]
      const impact = report.capabilityImpact[field]

      if (current === shadow) {
        impact.unchanged += 1
      } else if (shadow) {
        impact.gained += 1
      } else {
        impact.lost += 1
      }
    }
  }

  return report
}
