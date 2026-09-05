import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { resolveUserCapabilities } from '@/lib/entitlements/capabilities'
import {
  compareCapabilityResults,
  resolveUserCapabilitiesShadow,
} from '@/lib/entitlements/shadow-resolver'
import type { LegacyEntitlement } from '@/lib/entitlements/legacy-entitlements'

const NOW = new Date('2026-08-23T12:00:00.000Z')
const unrestricted = {
  ai: true,
  training: true,
  nutrition: true,
  coachManaged: false,
}
const coachManaged = {
  ai: false,
  training: false,
  nutrition: false,
  coachManaged: true,
}

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

describe('legacy entitlement shadow resolver', () => {
  it.each([
    ['invited', coachManaged],
    ['client_monthly', unrestricted],
    ['lifetime', unrestricted],
    ['beta', unrestricted],
    ['trial', unrestricted],
  ])('matches current capabilities for %s without a legacy grant', (
    subscriptionType,
    expected,
  ) => {
    const current = resolveUserCapabilities({ subscriptionType })
    const shadow = resolveUserCapabilitiesShadow({ subscriptionType, now: NOW })

    expect(current).toEqual(expected)
    expect(shadow).toEqual(expected)
    expect(compareCapabilityResults(current, shadow)).toEqual({
      status: 'MATCH',
      differences: [],
    })
  })

  it('computes but does not apply an active legacy candidate', () => {
    const current = resolveUserCapabilities({ subscriptionType: null })
    const shadow = resolveUserCapabilitiesShadow({
      subscriptionType: null,
      legacyEntitlements: [legacyGrant()],
      now: NOW,
    })

    expect(current).toEqual(unrestricted)
    expect(shadow).toEqual(coachManaged)
    expect(compareCapabilityResults(current, shadow)).toEqual({
      status: 'DIFF',
      differences: [
        { field: 'ai', current: true, shadow: false },
        { field: 'training', current: true, shadow: false },
        { field: 'nutrition', current: true, shadow: false },
        { field: 'coachManaged', current: false, shadow: true },
      ],
    })
    expect(resolveUserCapabilities({ subscriptionType: null })).toEqual(unrestricted)
  })

  it.each([
    ['expired', legacyGrant({ endsAt: new Date('2026-08-22T12:00:00.000Z') })],
    ['revoked', legacyGrant({ revokedAt: new Date('2026-08-22T12:00:00.000Z') })],
  ])('ignores an %s legacy grant', (_label, entitlement) => {
    const current = resolveUserCapabilities({ subscriptionType: 'trial' })
    const shadow = resolveUserCapabilitiesShadow({
      subscriptionType: 'trial',
      legacyEntitlements: [entitlement],
      now: NOW,
    })

    expect(shadow).toEqual(current)
    expect(compareCapabilityResults(current, shadow).status).toBe('MATCH')
  })

  it.each([
    'client_monthly',
    'client_yearly',
    'coach_monthly',
    'coach_paid',
    'lifetime',
    'client_lifetime',
    'beta',
  ])('keeps higher-priority %s above an active legacy grant', subscriptionType => {
    const current = resolveUserCapabilities({ subscriptionType })
    const shadow = resolveUserCapabilitiesShadow({
      subscriptionType,
      legacyEntitlements: [legacyGrant()],
      now: NOW,
    })

    expect(shadow).toEqual(unrestricted)
    expect(compareCapabilityResults(current, shadow).status).toBe('MATCH')
  })

  it('has no repository, relation, mutation or telemetry dependency', () => {
    const source = readFileSync('lib/entitlements/shadow-resolver.ts', 'utf8')

    expect(source).not.toMatch(/legacy_entitlements|supabase|\.from\(/i)
    expect(source).not.toMatch(/coach_clients|invited_by_coach|invitation/i)
    expect(source).not.toMatch(/\.(?:insert|update|upsert|delete)\(/)
    expect(source).not.toMatch(/console\.|fetch\(|analytics|telemetry/i)
  })
})
