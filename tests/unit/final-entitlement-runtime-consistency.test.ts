import { readFileSync } from 'node:fs'
import { describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

import { guardCoachManagedCapabilities } from '@/lib/api-guard'
import { resolveActiveCoachForOnboarding } from '@/lib/coach-relations/onboarding-reader'
import {
  fetchEffectiveEntitlementSnapshot,
  type EffectiveEntitlementSnapshot,
} from '@/lib/entitlements/client-snapshot'
import { loadEffectiveEntitlementContext } from '@/lib/entitlements/server-context'
import type { LegacyEntitlement } from '@/lib/entitlements/legacy-entitlements'

const USER_ID = '10000000-0000-4000-8000-000000000001'
const COACH_ID = '20000000-0000-4000-8000-000000000002'
const activeGrant: LegacyEntitlement = {
  type: 'legacy_invited_access',
  active: true,
  source: 'migration',
  startsAt: new Date('2026-08-23T00:00:00.000Z'),
  endsAt: null,
  revokedAt: null,
}

function profileClient(result: { data: unknown; error: unknown }) {
  const query = {
    select: vi.fn(),
    eq: vi.fn(),
    maybeSingle: vi.fn().mockResolvedValue(result),
  }
  query.select.mockReturnValue(query)
  query.eq.mockReturnValue(query)
  return { from: vi.fn().mockReturnValue(query) }
}

describe('final entitlement runtime consistency', () => {
  it.each([
    [null, activeGrant],
    ['invited', null],
    ['client_monthly', activeGrant],
    ['client_lifetime', activeGrant],
    ['beta', activeGrant],
  ] as const)('propagates the server snapshot unchanged for %s', async (
    subscriptionType,
    grant,
  ) => {
    const context = await loadEffectiveEntitlementContext(
      USER_ID,
      subscriptionType,
      vi.fn().mockResolvedValue(grant),
    )
    const serverSnapshot: EffectiveEntitlementSnapshot = {
      capabilities: context.capabilities,
      effectiveEntitlement: context.effectiveEntitlement,
    }
    const request = vi.fn().mockResolvedValue(new Response(
      JSON.stringify(serverSnapshot),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    ))

    await expect(fetchEffectiveEntitlementSnapshot(request)).resolves.toEqual(
      serverSnapshot,
    )
  })

  it('fails the guard closed when server configuration is absent', async () => {
    const response = await guardCoachManagedCapabilities(USER_ID, {
      supabaseUrl: '',
      serviceKey: '',
    })
    expect(response?.status).toBe(403)
  })

  it.each([
    ['profile absent', { data: null, error: null }],
    ['profile DB error', { data: null, error: { code: 'DB_TIMEOUT' } }],
  ])('fails the guard closed for %s', async (_label, result) => {
    const response = await guardCoachManagedCapabilities(USER_ID, {
      supabaseUrl: 'https://example.supabase.co',
      serviceKey: 'test-service-key',
      createServerClient: vi.fn().mockReturnValue(profileClient(result)) as never,
    })
    expect(response?.status).toBe(403)
  })

  it('fails the guard closed when the grant lookup fails', async () => {
    const response = await guardCoachManagedCapabilities(USER_ID, {
      supabaseUrl: 'https://example.supabase.co',
      serviceKey: 'test-service-key',
      createServerClient: vi.fn().mockReturnValue(profileClient({
        data: { subscription_type: 'client_monthly' },
        error: null,
      })) as never,
      loadContext: vi.fn().mockRejectedValue(new Error('lookup failed')),
    })
    expect(response?.status).toBe(403)
  })

  it('maps only an active relation to an onboarding coach', async () => {
    const active = await resolveActiveCoachForOnboarding(
      {} as never,
      USER_ID,
      vi.fn().mockResolvedValue({
        kind: 'active',
        relation: {
          id: '30000000-0000-4000-8000-000000000003',
          coach_id: COACH_ID,
          client_id: USER_ID,
          status: 'active',
        },
      }),
    )
    const ended = await resolveActiveCoachForOnboarding(
      {} as never,
      USER_ID,
      vi.fn().mockResolvedValue({ kind: 'not_found' }),
    )
    const failed = await resolveActiveCoachForOnboarding(
      {} as never,
      USER_ID,
      vi.fn().mockResolvedValue({ kind: 'error', code: 'DB_TIMEOUT' }),
    )

    expect(active).toEqual({ kind: 'active', coachId: COACH_ID })
    expect(ended).toEqual({ kind: 'inactive' })
    expect(failed).toEqual({ kind: 'denied' })
  })

  it('removes parallel client authority and direct onboarding relation reads', () => {
    const targetedConsumers = [
      'app/components/ChatAI.tsx',
      'app/components/tabs/NutritionTab.tsx',
      'app/components/tabs/TrainingTab.tsx',
      'app/(application)/onboarding-v2/OnboardingV2Content.tsx',
    ].map(path => readFileSync(path, 'utf8'))

    for (const source of targetedConsumers) {
      expect(source).not.toContain('resolveUserCapabilities(')
      expect(source).not.toMatch(/subscriptionType\s*:/)
      expect(source).not.toMatch(/legacy-entitlement-repository|server-context/)
    }

    const onboarding = targetedConsumers[3]
    expect(onboarding).not.toContain(".from('coach_clients')")
    expect(onboarding).toContain('resolveActiveCoachForOnboarding')
  })
})
