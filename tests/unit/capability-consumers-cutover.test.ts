import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

import { resolveUserCapabilities } from '@/lib/entitlements/capabilities'
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

const readSources = (paths: readonly string[]) => (
  paths.map(path => ({ path, source: readFileSync(path, 'utf8') }))
)

describe('capability consumers cutover', () => {
  it('routes P0 permission and direct API consumers through capability contexts', () => {
    const clientConsumers = readSources([
      'lib/permissions.ts',
    ])
    const serverConsumers = readSources([
      'lib/api-guard.ts',
      'app/api/chat-ai/route.ts',
      'app/api/generate-recipe/route.ts',
    ])

    for (const { path, source } of clientConsumers) {
      expect(source, path).toContain('resolveUserCapabilities')
      expect(source, path).not.toMatch(
        /subscription_type\s*={2,3}\s*['"]invited['"]/,
      )
    }
    for (const { path, source } of serverConsumers) {
      expect(source, path).toContain('loadEffectiveEntitlementContext')
      expect(source, path).not.toMatch(
        /subscription_type\s*={2,3}\s*['"]invited['"]/,
      )
    }
  })

  it('routes delegated AI, nutrition and training APIs through the guard', () => {
    const consumers = readSources([
      'app/api/generate-custom-program/route.ts',
      'app/api/generate-meal-plan/route.ts',
      'app/api/suggest-exercise/route.ts',
      'app/api/suggest-overload/route.ts',
    ])

    for (const { path, source } of consumers) {
      expect(source, path).toContain('guardCoachManagedCapabilities')
      expect(source, path).not.toMatch(
        /subscription_type\s*={2,3}\s*['"]invited['"]/,
      )
    }
  })

  it('routes P1 application consumers through capabilities', () => {
    const consumers = readSources([
      'app/hooks/useClientDashboard.ts',
      'app/(application)/onboarding-v2/OnboardingV2Content.tsx',
      'app/components/ChatAI.tsx',
      'app/components/tabs/NutritionTab.tsx',
      'app/components/tabs/TrainingTab.tsx',
    ])

    for (const { path, source } of consumers) {
      expect(source, path).toMatch(/fetchEffectiveEntitlementSnapshot|capabilities/)
      expect(source, path).not.toMatch(
        /subscription_type\s*={2,3}\s*['"]invited['"]/,
      )
    }
  })

  it.each([
    ['invited', coachManaged],
    ['client_monthly', unrestricted],
    ['lifetime', unrestricted],
    ['beta', unrestricted],
    ['trial', unrestricted],
  ] as const)('preserves %s capabilities without a legacy grant', (
    subscriptionType,
    expected,
  ) => {
    expect(resolveUserCapabilities({ subscriptionType })).toEqual(expected)
    expect(resolveUserCapabilities({
      subscriptionType,
      legacyEntitlements: [],
      now: NOW,
    })).toEqual(expected)
  })

  it('uses an explicitly supplied active legacy grant without local logic', () => {
    expect(resolveUserCapabilities({
      subscriptionType: null,
      legacyEntitlements: [activeLegacyGrant],
      now: NOW,
    })).toEqual(coachManaged)
  })

  it('keeps higher-priority subscriptions above an active legacy grant', () => {
    for (const subscriptionType of [
      'client_monthly',
      'lifetime',
      'beta',
    ]) {
      expect(resolveUserCapabilities({
        subscriptionType,
        legacyEntitlements: [activeLegacyGrant],
        now: NOW,
      })).toEqual(unrestricted)
    }
  })

  it('limits exact subscription invited checks to authority and historical account display', () => {
    const authority = readFileSync(
      'lib/entitlements/effective-entitlement.ts',
      'utf8',
    )
    const historicalDisplay = readFileSync(
      'app/components/tabs/profile/AccountSection.tsx',
      'utf8',
    )
    const coachAnalytics = readFileSync(
      'app/(application)/coach/components/CoachAnalytics.tsx',
      'utf8',
    )

    expect(authority).toMatch(/subscriptionType\s*===\s*['"]invited['"]/)
    expect(historicalDisplay).toMatch(
      /subType\s*===\s*['"]invited['"]/,
    )
    expect(coachAnalytics).not.toMatch(/subscription_type|['"]invited['"]/)
  })
})
