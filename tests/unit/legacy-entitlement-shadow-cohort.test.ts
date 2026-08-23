import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

import { resolveUserCapabilities } from '@/lib/entitlements/capabilities'
import type { LegacyEntitlement } from '@/lib/entitlements/legacy-entitlements'
import {
  analyzeCapabilityCohort,
  analyzeSingleUserCapabilities,
  type ShadowAnalysisInput,
} from '@/lib/entitlements/shadow-cohort'

const activeLegacyEntitlement: LegacyEntitlement = {
  type: 'legacy_invited_access',
  active: true,
  source: 'migration',
  startsAt: new Date('2020-01-01T00:00:00.000Z'),
  endsAt: null,
  revokedAt: null,
}

const matchInput: ShadowAnalysisInput = {
  subscriptionType: 'client_monthly',
  legacyEntitlements: [activeLegacyEntitlement],
}

const diffInput: ShadowAnalysisInput = {
  subscriptionType: null,
  legacyEntitlements: [activeLegacyEntitlement],
}

describe('legacy entitlement shadow cohort analysis', () => {
  it('returns an empty aggregate for an empty cohort', () => {
    expect(analyzeCapabilityCohort([])).toEqual({
      total: 0,
      matches: 0,
      diffs: 0,
      fieldsChanged: {
        ai: 0,
        training: 0,
        nutrition: 0,
        coachManaged: 0,
      },
    })
  })

  it('aggregates a cohort with only matches', () => {
    expect(analyzeCapabilityCohort([matchInput, matchInput])).toEqual({
      total: 2,
      matches: 2,
      diffs: 0,
      fieldsChanged: {
        ai: 0,
        training: 0,
        nutrition: 0,
        coachManaged: 0,
      },
    })
  })

  it('aggregates a cohort with only differences', () => {
    expect(analyzeCapabilityCohort([diffInput, diffInput])).toEqual({
      total: 2,
      matches: 0,
      diffs: 2,
      fieldsChanged: {
        ai: 2,
        training: 2,
        nutrition: 2,
        coachManaged: 2,
      },
    })
  })

  it('aggregates mixed matches and differences by capability field', () => {
    expect(analyzeCapabilityCohort([matchInput, diffInput, matchInput])).toEqual({
      total: 3,
      matches: 2,
      diffs: 1,
      fieldsChanged: {
        ai: 1,
        training: 1,
        nutrition: 1,
        coachManaged: 1,
      },
    })
  })

  it('returns current, shadow and field differences for one anonymized input', () => {
    const analysis = analyzeSingleUserCapabilities(diffInput)

    expect(analysis.current).toEqual({
      ai: true,
      training: true,
      nutrition: true,
      coachManaged: false,
    })
    expect(analysis.shadow).toEqual({
      ai: false,
      training: false,
      nutrition: false,
      coachManaged: true,
    })
    expect(analysis.differences.map(({ field }) => field)).toEqual([
      'ai',
      'training',
      'nutrition',
      'coachManaged',
    ])
  })

  it('returns only aggregate counters for a cohort', () => {
    const report = analyzeCapabilityCohort([diffInput])

    expect(Object.keys(report)).toEqual([
      'total',
      'matches',
      'diffs',
      'fieldsChanged',
    ])
    expect(JSON.stringify(report)).not.toMatch(
      /email|userId|uuid|metadata|subscriptionType|legacyEntitlements/i,
    )
  })

  it('does not mutate inputs or affect the current capability resolver', () => {
    const input = Object.freeze({
      subscriptionType: null,
      legacyEntitlements: Object.freeze([activeLegacyEntitlement]),
    }) satisfies ShadowAnalysisInput
    const currentBefore = resolveUserCapabilities({ subscriptionType: null })

    analyzeSingleUserCapabilities(input)
    analyzeCapabilityCohort([input])

    expect(resolveUserCapabilities({ subscriptionType: null })).toEqual(
      currentBefore,
    )
    expect(input.legacyEntitlements).toHaveLength(1)
  })

  it('keeps the framework pure and internal', () => {
    const source = readFileSync(
      resolve(process.cwd(), 'lib/entitlements/shadow-cohort.ts'),
      'utf8',
    )

    expect(source).not.toMatch(/supabase|\.from\(|fetch\(|console\.|localStorage/i)
  })
})
