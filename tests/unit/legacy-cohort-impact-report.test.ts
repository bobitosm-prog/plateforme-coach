import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

import { resolveUserCapabilities } from '@/lib/entitlements/capabilities'
import {
  generateLegacyCohortImpactReport,
  type LegacyCohortEntry,
} from '@/lib/entitlements/legacy-cohort-impact'
import type { LegacyEntitlement } from '@/lib/entitlements/legacy-entitlements'

const activeLegacyEntitlement: LegacyEntitlement = {
  type: 'legacy_invited_access',
  active: true,
  source: 'migration',
  startsAt: new Date('2020-01-01T00:00:00.000Z'),
  endsAt: null,
  revokedAt: null,
}

const expiredLegacyEntitlement: LegacyEntitlement = {
  ...activeLegacyEntitlement,
  endsAt: new Date('2021-01-01T00:00:00.000Z'),
}

const activeLegacyEntry: LegacyCohortEntry = {
  subscriptionType: null,
  legacyEntitlements: [activeLegacyEntitlement],
}

const unchangedImpact = (count: number) => ({
  unchanged: count,
  gained: 0,
  lost: 0,
})

describe('legacy cohort impact report', () => {
  it('returns zeroed counters for an empty cohort', () => {
    expect(generateLegacyCohortImpactReport([])).toEqual({
      totalUsers: 0,
      matches: 0,
      differences: 0,
      capabilityImpact: {
        ai: unchangedImpact(0),
        training: unchangedImpact(0),
        nutrition: unchangedImpact(0),
        coachManaged: unchangedImpact(0),
      },
    })
  })

  it('counts a cohort without differences as unchanged', () => {
    const report = generateLegacyCohortImpactReport([
      { subscriptionType: 'trial', legacyEntitlements: [] },
      { subscriptionType: 'invited', legacyEntitlements: [] },
    ])

    expect(report.matches).toBe(2)
    expect(report.differences).toBe(0)
    expect(report.capabilityImpact).toEqual({
      ai: unchangedImpact(2),
      training: unchangedImpact(2),
      nutrition: unchangedImpact(2),
      coachManaged: unchangedImpact(2),
    })
  })

  it('counts the capability impact of an active legacy entitlement', () => {
    const report = generateLegacyCohortImpactReport([activeLegacyEntry])

    expect(report).toEqual({
      totalUsers: 1,
      matches: 0,
      differences: 1,
      capabilityImpact: {
        ai: { unchanged: 0, gained: 0, lost: 1 },
        training: { unchanged: 0, gained: 0, lost: 1 },
        nutrition: { unchanged: 0, gained: 0, lost: 1 },
        coachManaged: { unchanged: 0, gained: 1, lost: 0 },
      },
    })
  })

  it('ignores an expired legacy entitlement', () => {
    const report = generateLegacyCohortImpactReport([{
      subscriptionType: 'trial',
      legacyEntitlements: [expiredLegacyEntitlement],
    }])

    expect(report.matches).toBe(1)
    expect(report.differences).toBe(0)
    expect(report.capabilityImpact.ai).toEqual(unchangedImpact(1))
  })

  it('keeps premium, lifetime and beta above legacy while evaluating trial', () => {
    const report = generateLegacyCohortImpactReport([
      { subscriptionType: 'client_monthly', legacyEntitlements: [activeLegacyEntitlement] },
      { subscriptionType: 'lifetime', legacyEntitlements: [activeLegacyEntitlement] },
      { subscriptionType: 'beta', legacyEntitlements: [activeLegacyEntitlement] },
      { subscriptionType: 'trial', legacyEntitlements: [activeLegacyEntitlement] },
    ])

    expect(report.totalUsers).toBe(4)
    expect(report.matches).toBe(3)
    expect(report.differences).toBe(1)
    expect(report.capabilityImpact).toEqual({
      ai: { unchanged: 3, gained: 0, lost: 1 },
      training: { unchanged: 3, gained: 0, lost: 1 },
      nutrition: { unchanged: 3, gained: 0, lost: 1 },
      coachManaged: { unchanged: 3, gained: 1, lost: 0 },
    })
  })

  it('returns aggregate counters without personal or individual data', () => {
    const entryWithExtraneousPersonalData = {
      ...activeLegacyEntry,
      email: 'not-returned@example.test',
      userId: 'not-returned-user-id',
      metadata: { name: 'not-returned' },
    }
    const report = generateLegacyCohortImpactReport([
      entryWithExtraneousPersonalData,
    ])
    const serialized = JSON.stringify(report)

    expect(Object.keys(report)).toEqual([
      'totalUsers',
      'matches',
      'differences',
      'capabilityImpact',
    ])
    expect(serialized).not.toContain('not-returned')
    expect(serialized).not.toMatch(/email|userId|uuid|metadata/i)
  })

  it('does not mutate entries or change the current resolver result', () => {
    const entry = Object.freeze({
      subscriptionType: null,
      legacyEntitlements: Object.freeze([activeLegacyEntitlement]),
    }) satisfies LegacyCohortEntry
    const currentBefore = resolveUserCapabilities({ subscriptionType: null })

    generateLegacyCohortImpactReport([entry])

    expect(resolveUserCapabilities({ subscriptionType: null })).toEqual(
      currentBefore,
    )
    expect(entry.legacyEntitlements).toHaveLength(1)
  })

  it('has no database, API, storage or telemetry dependency', () => {
    const source = readFileSync(
      resolve(process.cwd(), 'lib/entitlements/legacy-cohort-impact.ts'),
      'utf8',
    )

    expect(source).not.toMatch(
      /supabase|\.from\(|fetch\(|console\.|localStorage|analytics|telemetry/i,
    )
  })
})
