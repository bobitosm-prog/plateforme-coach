import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

import { resolveUserCapabilities } from '@/lib/entitlements/capabilities'
import { resolveEffectiveEntitlement } from '@/lib/entitlements/effective-entitlement'
import type { LegacyEntitlement } from '@/lib/entitlements/legacy-entitlements'

const NOW = new Date('2026-08-24T12:00:00.000Z')
const activeLegacyGrant: LegacyEntitlement = {
  type: 'legacy_invited_access',
  active: true,
  source: 'migration',
  startsAt: new Date('2026-08-23T12:00:00.000Z'),
  endsAt: null,
  revokedAt: null,
}
const coachManaged = {
  ai: false,
  training: false,
  nutrition: false,
  coachManaged: true,
}
const unrestricted = {
  ai: true,
  training: true,
  nutrition: true,
  coachManaged: false,
}

describe('remaining entitlement consumers', () => {
  it('routes the dashboard authority through the centralized resolvers', () => {
    const dashboard = readFileSync('app/hooks/useClientDashboard.ts', 'utf8')

    expect(dashboard).toContain('resolveEffectiveEntitlement(entitlementInput)')
    expect(dashboard).toContain('resolveUserCapabilities(entitlementInput)')
    expect(dashboard).not.toMatch(
      /profile(?:\?)?\.subscription_type\s*={2,3}\s*['"]/,
    )
    expect(dashboard).not.toMatch(/\bst\s*={2,3}\s*['"]invited['"]/)
  })

  it('keeps page and onboarding decisions derived from permissions or capabilities', () => {
    const page = readFileSync('app/(application)/page.tsx', 'utf8')
    const onboarding = readFileSync(
      'app/(application)/onboarding-v2/OnboardingV2Content.tsx',
      'utf8',
    )
    const permissions = readFileSync('lib/use-client-permissions.ts', 'utf8')

    expect(page).toContain('perms.isInvited')
    expect(onboarding).toContain('capabilities.coachManaged')
    expect(permissions).toContain('capabilities.coachManaged')
    expect(permissions).toContain('capabilities.training')
    expect(permissions).toContain('capabilities.nutrition')
  })

  it.each([
    ['invited', coachManaged],
    ['client_monthly', unrestricted],
    ['client_lifetime', unrestricted],
    ['beta', unrestricted],
    ['trial', unrestricted],
    ['unknown', unrestricted],
  ] as const)('preserves %s capabilities without a persisted grant', (
    subscriptionType,
    expected,
  ) => {
    expect(resolveUserCapabilities({ subscriptionType, now: NOW })).toEqual(expected)
  })

  it('keeps the invited fallback and active legacy grant behavior equivalent', () => {
    expect(resolveEffectiveEntitlement({
      subscriptionType: 'invited',
      legacyEntitlements: [],
      now: NOW,
    })).toEqual({ type: 'legacy_invited', source: 'subscription' })
    expect(resolveEffectiveEntitlement({
      subscriptionType: null,
      legacyEntitlements: [activeLegacyGrant],
      now: NOW,
    })).toEqual({ type: 'legacy_invited', source: 'legacy_entitlement' })
    expect(resolveUserCapabilities({
      subscriptionType: null,
      legacyEntitlements: [activeLegacyGrant],
      now: NOW,
    })).toEqual(coachManaged)
  })

  it('keeps paid, lifetime and beta above a legacy grant', () => {
    const expected = [
      ['client_monthly', 'paid', 'subscription'],
      ['client_lifetime', 'lifetime', 'subscription'],
      ['beta', 'beta', 'beta'],
    ] as const

    for (const [subscriptionType, type, source] of expected) {
      expect(resolveEffectiveEntitlement({
        subscriptionType,
        legacyEntitlements: [activeLegacyGrant],
        now: NOW,
      })).toEqual({ type, source })
    }
  })

  it('keeps relation state outside product entitlement authority', () => {
    const authority = [
      'lib/entitlements/effective-entitlement.ts',
      'lib/entitlements/capabilities.ts',
    ].map(path => readFileSync(path, 'utf8')).join('\n')

    expect(authority).not.toMatch(/coach_clients|invited_by_coach|relation\.status/)
    expect(authority).not.toMatch(/subscription_status|stripe/i)
  })

  it('limits remaining exact invited profile checks to display and admin code', () => {
    const allowedDisplayAndAdmin = [
      'app/components/tabs/profile/AccountSection.tsx',
      'app/(application)/coach/components/CoachAnalytics.tsx',
      'app/api/admin/stripe/stats/route.ts',
      'app/api/admin/users/[id]/subscription/route.ts',
    ].map(path => readFileSync(path, 'utf8')).join('\n')
    const runtimeConsumers = [
      'app/hooks/useClientDashboard.ts',
      'lib/api-guard.ts',
      'app/api/chat-ai/route.ts',
      'app/api/generate-recipe/route.ts',
    ].map(path => readFileSync(path, 'utf8')).join('\n')

    expect(allowedDisplayAndAdmin).toContain('invited')
    expect(runtimeConsumers).not.toMatch(
      /subscription_type\s*={2,3}\s*['"]invited['"]/,
    )
    expect(runtimeConsumers).not.toMatch(/\bst\s*={2,3}\s*['"]invited['"]/)
  })
})
