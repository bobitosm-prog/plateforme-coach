import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

import { resolveUserCapabilities } from '@/lib/entitlements/capabilities'
import { resolveEffectiveEntitlement } from '@/lib/entitlements/effective-entitlement'
import type { LegacyEntitlement } from '@/lib/entitlements/legacy-entitlements'

const NOW = new Date('2026-08-23T12:00:00.000Z')
const activeLegacyGrant: LegacyEntitlement = {
  type: 'legacy_invited_access',
  active: true,
  source: 'migration',
  startsAt: new Date('2026-01-01T00:00:00.000Z'),
  endsAt: null,
  revokedAt: null,
}

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

describe('effective entitlement resolver', () => {
  it('preserves an historical invited profile without a persisted grant', () => {
    expect(resolveEffectiveEntitlement({
      subscriptionType: 'invited',
      legacyEntitlements: [],
      now: NOW,
    })).toEqual({ type: 'legacy_invited', source: 'subscription' })
    expect(resolveUserCapabilities({ subscriptionType: 'invited' })).toEqual(
      coachManaged,
    )
  })

  it('resolves an active legacy grant as legacy invited authority', () => {
    expect(resolveEffectiveEntitlement({
      subscriptionType: null,
      legacyEntitlements: [activeLegacyGrant],
      now: NOW,
    })).toEqual({
      type: 'legacy_invited',
      source: 'legacy_entitlement',
    })
    expect(resolveUserCapabilities({
      subscriptionType: null,
      legacyEntitlements: [activeLegacyGrant],
      now: NOW,
    })).toEqual(coachManaged)
  })

  it('keeps paid authority above a legacy grant', () => {
    expect(resolveEffectiveEntitlement({
      subscriptionType: 'client_monthly',
      legacyEntitlements: [activeLegacyGrant],
      now: NOW,
    })).toEqual({ type: 'paid', source: 'subscription' })
  })

  it('keeps lifetime authority above a legacy grant', () => {
    expect(resolveEffectiveEntitlement({
      subscriptionType: 'client_lifetime',
      legacyEntitlements: [activeLegacyGrant],
      now: NOW,
    })).toEqual({ type: 'lifetime', source: 'subscription' })
  })

  it('keeps beta authority above a legacy grant', () => {
    expect(resolveEffectiveEntitlement({
      subscriptionType: 'beta',
      legacyEntitlements: [activeLegacyGrant],
      now: NOW,
    })).toEqual({ type: 'beta', source: 'beta' })
  })

  it.each([
    ['trial', { type: 'trial', source: 'subscription' }],
    ['free', { type: 'free', source: 'subscription' }],
    [null, { type: 'free', source: 'subscription' }],
    ['unknown', { type: 'free', source: 'subscription' }],
  ] as const)('resolves the %s fallback', (subscriptionType, expected) => {
    expect(resolveEffectiveEntitlement({
      subscriptionType,
      legacyEntitlements: [],
      now: NOW,
    })).toEqual(expected)
  })

  it('ignores expired and revoked legacy grants', () => {
    const expired = {
      ...activeLegacyGrant,
      endsAt: new Date('2026-08-22T12:00:00.000Z'),
    }
    const revoked = {
      ...activeLegacyGrant,
      revokedAt: new Date('2026-08-22T12:00:00.000Z'),
    }

    for (const legacyEntitlement of [expired, revoked]) {
      expect(resolveEffectiveEntitlement({
        subscriptionType: 'trial',
        legacyEntitlements: [legacyEntitlement],
        now: NOW,
      })).toEqual({ type: 'trial', source: 'subscription' })
    }
  })

  it('preserves current capability results when no legacy grant is supplied', () => {
    const expectedBySubscription = [
      ['client_monthly', unrestricted],
      ['client_yearly', unrestricted],
      ['lifetime', unrestricted],
      ['client_lifetime', unrestricted],
      ['beta', unrestricted],
      ['trial', unrestricted],
      ['free', unrestricted],
      [null, unrestricted],
      ['unknown', unrestricted],
      ['invited', coachManaged],
    ] as const

    for (const [subscriptionType, expected] of expectedBySubscription) {
      expect(resolveUserCapabilities({ subscriptionType })).toEqual(expected)
    }
  })

  it('has no relation, invitation, database or mutation dependency', () => {
    const source = readFileSync(
      'lib/entitlements/effective-entitlement.ts',
      'utf8',
    )

    expect(source).not.toMatch(/coach_clients|invited_by_coach|invitation/i)
    expect(source).not.toMatch(/supabase|createClient|\.from\(/i)
    expect(source).not.toMatch(/\.(?:insert|update|upsert|delete)\(/)
  })
})
