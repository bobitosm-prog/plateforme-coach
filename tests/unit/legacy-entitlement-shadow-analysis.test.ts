import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { resolveUserCapabilities } from '@/lib/entitlements/capabilities'
import {
  analyzeCapabilityDifference,
  analyzeCapabilityShadowContext,
  runCapabilityShadowAnalysis,
} from '@/lib/entitlements/shadow-analysis'
import type { LegacyEntitlement } from '@/lib/entitlements/legacy-entitlements'

const NOW = new Date('2026-08-23T12:00:00.000Z')

function legacyGrant(
  overrides: Partial<LegacyEntitlement> = {},
): LegacyEntitlement {
  return {
    type: 'legacy_invited_access',
    active: true,
    source: 'migration',
    startsAt: new Date('2026-01-01T00:00:00.000Z'),
    endsAt: null,
    revokedAt: null,
    ...overrides,
  }
}

describe('legacy entitlement shadow analysis', () => {
  it.each([
    'invited',
    'client_monthly',
    'lifetime',
    'beta',
    'trial',
  ])('reports MATCH for current %s behavior without legacy', subscriptionType => {
    expect(runCapabilityShadowAnalysis({ subscriptionType, now: NOW })).toEqual({
      status: 'MATCH',
      match: true,
      differences: [],
    })
  })

  it('reports every capability difference for an active legacy candidate', () => {
    expect(runCapabilityShadowAnalysis({
      subscriptionType: null,
      legacyEntitlements: [legacyGrant()],
      now: NOW,
    })).toEqual({
      status: 'DIFF',
      match: false,
      differences: [
        { field: 'ai', currentValue: true, shadowValue: false },
        { field: 'training', currentValue: true, shadowValue: false },
        { field: 'nutrition', currentValue: true, shadowValue: false },
        { field: 'coachManaged', currentValue: false, shadowValue: true },
      ],
    })
  })

  it.each([
    ['expired', legacyGrant({ endsAt: new Date('2026-08-22T12:00:00.000Z') })],
    ['revoked', legacyGrant({ revokedAt: new Date('2026-08-22T12:00:00.000Z') })],
  ])('reports MATCH for an %s grant because it has no shadow authority', (
    _label,
    entitlement,
  ) => {
    expect(runCapabilityShadowAnalysis({
      subscriptionType: 'trial',
      legacyEntitlements: [entitlement],
      now: NOW,
    }).status).toBe('MATCH')
  })

  it('reports precise detail for a single changed capability', () => {
    expect(analyzeCapabilityDifference(
      { ai: true, training: true, nutrition: true, coachManaged: false },
      { ai: false, training: true, nutrition: true, coachManaged: false },
    )).toEqual({
      status: 'DIFF',
      match: false,
      differences: [{ field: 'ai', currentValue: true, shadowValue: false }],
    })
  })

  it('accepts abstract context without exposing it in the observation', () => {
    const entitlement = legacyGrant()
    const currentCapabilities = resolveUserCapabilities({ subscriptionType: null })
    const shadowCapabilities = {
      ai: false,
      training: false,
      nutrition: false,
      coachManaged: true,
    }

    const result = analyzeCapabilityShadowContext({
      subscriptionType: 'private-subscription-context',
      legacyEntitlements: [entitlement],
      currentCapabilities,
      shadowCapabilities,
    })

    expect(result).not.toHaveProperty('subscriptionType')
    expect(result).not.toHaveProperty('legacyEntitlements')
    expect(JSON.stringify(result)).not.toContain('private-subscription-context')
  })

  it('does not mutate capabilities or entitlements', () => {
    const current = Object.freeze({
      ai: true,
      training: true,
      nutrition: true,
      coachManaged: false,
    })
    const shadow = Object.freeze({
      ai: false,
      training: false,
      nutrition: false,
      coachManaged: true,
    })
    const entitlements = Object.freeze([Object.freeze(legacyGrant())])

    analyzeCapabilityDifference(current, shadow)
    runCapabilityShadowAnalysis({
      subscriptionType: null,
      legacyEntitlements: entitlements,
      now: NOW,
    })

    expect(current.ai).toBe(true)
    expect(shadow.ai).toBe(false)
    expect(entitlements[0].active).toBe(true)
  })

  it('has no DB, relation, mutation, logging or external telemetry', () => {
    const source = readFileSync('lib/entitlements/shadow-analysis.ts', 'utf8')

    expect(source).not.toMatch(/supabase|legacy_entitlements|\.from\(/i)
    expect(source).not.toMatch(/coach_clients|invited_by_coach|invitation/i)
    expect(source).not.toMatch(/\.(?:insert|update|upsert|delete)\(/)
    expect(source).not.toMatch(/console\.|fetch\(|analytics|telemetry/i)
  })
})
