import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { resolveUserCapabilities } from '@/lib/entitlements/capabilities'
import {
  FUTURE_ENTITLEMENT_PRIORITY,
  type LegacyEntitlement,
} from '@/lib/entitlements/legacy-entitlements'

const unrestricted = {
  ai: true,
  training: true,
  nutrition: true,
  coachManaged: false,
}

const shadowGrant: LegacyEntitlement = {
  type: 'legacy_invited_access',
  active: true,
  source: 'migration',
  startsAt: new Date('2026-01-01T00:00:00.000Z'),
}

describe('legacy entitlement shadow layer', () => {
  it('keeps resolver output identical with an empty shadow input', () => {
    for (const subscriptionType of ['invited', 'client_monthly', 'lifetime', 'beta']) {
      expect(resolveUserCapabilities({ subscriptionType, legacyEntitlements: [] })).toEqual(
        resolveUserCapabilities({ subscriptionType }),
      )
    }
  })

  it('does not activate a supplied legacy grant before cutover', () => {
    expect(resolveUserCapabilities({
      subscriptionType: 'invited',
      legacyEntitlements: [shadowGrant],
    })).toEqual({
      ai: false,
      training: false,
      nutrition: false,
      coachManaged: true,
    })
  })

  it.each(['client_monthly', 'lifetime', 'beta'])(
    'preserves existing %s capabilities',
    subscriptionType => {
      expect(resolveUserCapabilities({ subscriptionType })).toEqual(unrestricted)
    },
  )

  it('documents the future priority without activating it', () => {
    expect(FUTURE_ENTITLEMENT_PRIORITY).toEqual([
      'paid_subscription',
      'lifetime',
      'beta',
      'legacy_invited_access',
      'trial',
      'free',
    ])
  })

  it('does not couple the shadow layer to coach relations or databases', () => {
    const sources = [
      'lib/entitlements/legacy-entitlements.ts',
      'lib/entitlements/capabilities.ts',
    ].map(path => readFileSync(path, 'utf8')).join('\n')

    expect(sources).not.toMatch(/coach_clients|invited_by_coach|relation\.status/)
    expect(sources).not.toMatch(/createClient|createServerClient|\.from\(/)
    expect(sources).not.toMatch(/\.(?:insert|update|upsert|delete)\(/)
  })
})
