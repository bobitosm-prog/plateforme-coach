import { readFileSync } from 'node:fs'

import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  getActiveLegacyEntitlement: vi.fn(),
}))

vi.mock('server-only', () => ({}))
vi.mock('@/lib/entitlements/legacy-entitlement-repository', () => ({
  getActiveLegacyEntitlement: mocks.getActiveLegacyEntitlement,
}))

import type { LegacyEntitlement } from '@/lib/entitlements/legacy-entitlements'
import { loadEffectiveEntitlementContext } from '@/lib/entitlements/server-context'

const USER_ID = '10000000-0000-4000-8000-000000000001'
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

describe('runtime legacy entitlement loading', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    mocks.getActiveLegacyEntitlement.mockReset()
    mocks.getActiveLegacyEntitlement.mockResolvedValue(null)
  })

  it('loads an active grant and exposes the effective authority context', async () => {
    mocks.getActiveLegacyEntitlement.mockResolvedValue(activeLegacyGrant)

    const context = await loadEffectiveEntitlementContext(
      USER_ID,
      null,
    )

    expect(mocks.getActiveLegacyEntitlement).toHaveBeenCalledWith(USER_ID)
    expect(context.legacyEntitlements).toEqual([activeLegacyGrant])
    expect(context.effectiveEntitlement).toEqual({
      type: 'legacy_invited',
      source: 'legacy_entitlement',
    })
    expect(context.capabilities).toEqual(coachManaged)
  })

  it('preserves the historical invited fallback without a grant', async () => {
    const context = await loadEffectiveEntitlementContext(
      USER_ID,
      'invited',
      vi.fn().mockResolvedValue(null),
    )

    expect(context.effectiveEntitlement).toEqual({
      type: 'legacy_invited',
      source: 'subscription',
    })
    expect(context.capabilities).toEqual(coachManaged)
  })

  it.each([
    ['client_monthly', 'paid', 'subscription'],
    ['client_lifetime', 'lifetime', 'subscription'],
    ['beta', 'beta', 'beta'],
  ] as const)(
    'keeps %s above a loaded legacy grant',
    async (subscriptionType, type, source) => {
      const context = await loadEffectiveEntitlementContext(
        USER_ID,
        subscriptionType,
        vi.fn().mockResolvedValue(activeLegacyGrant),
      )

      expect(context.effectiveEntitlement).toEqual({ type, source })
      expect(context.capabilities).toEqual(unrestricted)
    },
  )

  it('treats a repository error as no grant and keeps the fallback', async () => {
    const errorLog = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    mocks.getActiveLegacyEntitlement.mockRejectedValue(
      new Error('sensitive repository error'),
    )
    const context = await loadEffectiveEntitlementContext(
      USER_ID,
      'invited',
    )

    expect(context.legacyEntitlements).toEqual([])
    expect(context.effectiveEntitlement).toEqual({
      type: 'legacy_invited',
      source: 'subscription',
    })
    expect(context.capabilities).toEqual(coachManaged)
    expect(errorLog).toHaveBeenCalledWith(
      '[effective-entitlement] Legacy grant lookup failed',
    )
    expect(JSON.stringify(errorLog.mock.calls)).not.toContain('sensitive')
  })

  it('keeps relation, invitation and browser database access outside the context', () => {
    const contextSource = readFileSync(
      'lib/entitlements/server-context.ts',
      'utf8',
    )
    const clientSources = [
      'app/components/ChatAI.tsx',
      'app/components/tabs/NutritionTab.tsx',
      'app/components/tabs/TrainingTab.tsx',
      'lib/use-client-permissions.ts',
    ].map(path => readFileSync(path, 'utf8')).join('\n')

    expect(contextSource).not.toMatch(/coach_clients|invited_by_coach|invitation/i)
    expect(contextSource).not.toMatch(/createClient|createServerClient|\.from\(/)
    expect(clientSources).not.toMatch(
      /legacy-entitlement-repository|server-context/,
    )
  })

  it('routes AI, nutrition and training server paths through the loader', () => {
    const directConsumers = [
      'lib/api-guard.ts',
      'app/api/chat-ai/route.ts',
      'app/api/generate-recipe/route.ts',
    ].map(path => readFileSync(path, 'utf8'))
    const guardedConsumers = [
      'app/api/generate-custom-program/route.ts',
      'app/api/generate-meal-plan/route.ts',
      'app/api/suggest-exercise/route.ts',
      'app/api/suggest-overload/route.ts',
    ].map(path => readFileSync(path, 'utf8'))

    for (const source of directConsumers) {
      expect(source).toContain('loadEffectiveEntitlementContext')
    }
    for (const source of guardedConsumers) {
      expect(source).toContain('guardCoachManagedCapabilities')
    }
  })
})
