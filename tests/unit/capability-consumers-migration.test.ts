import { readFileSync } from 'node:fs'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  createServerClient: vi.fn(),
  checkRateLimit: vi.fn(),
  getActiveLegacyEntitlement: vi.fn(),
}))

vi.mock('server-only', () => ({}))
vi.mock('@supabase/ssr', () => ({
  createServerClient: mocks.createServerClient,
}))
vi.mock('next/headers', () => ({
  cookies: vi.fn(async () => ({ getAll: () => [] })),
}))
vi.mock('@/lib/rate-limit', () => ({
  checkRateLimit: mocks.checkRateLimit,
}))
vi.mock('@/lib/entitlements/legacy-entitlement-repository', () => ({
  getActiveLegacyEntitlement: mocks.getActiveLegacyEntitlement,
}))

import { POST } from '@/app/api/generate-recipe/route'

function createSessionClient(subscriptionType: string | null, profileError: unknown = null) {
  const maybeSingle = vi.fn().mockResolvedValue({
    data: subscriptionType === null ? null : { subscription_type: subscriptionType },
    error: profileError,
  })
  const eq = vi.fn().mockReturnValue({ maybeSingle })
  const from = vi.fn((table: string) => {
    if (table === 'profiles') return { select: vi.fn().mockReturnValue({ eq }) }
    throw new Error(`Unexpected table: ${table}`)
  })

  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-a' } } }),
    },
    from,
  }
}

function recipeRequest(bodySubscriptionType: string) {
  return new Request('http://localhost/api/generate-recipe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      category: 'dejeuner',
      profile: {
        subscription_type: bodySubscriptionType,
        calorie_goal: 2000,
        protein_goal: 120,
        dietary_type: 'omnivore',
      },
    }),
  })
}

describe('capability consumers migration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubEnv('ANTHROPIC_API_KEY', 'anthropic-test-key')
    mocks.checkRateLimit.mockReturnValue({ allowed: true })
    mocks.getActiveLegacyEntitlement.mockResolvedValue(null)
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({
      content: [{
        text: JSON.stringify({
          title: 'Recette test',
          calories_per_serving: 500,
          proteins_per_serving: 30,
          carbs_per_serving: 50,
          fat_per_serving: 15,
        }),
      }],
    }), { status: 200 })))
  })

  it('blocks a legacy invited user from the server profile despite a forged paid body', async () => {
    mocks.createServerClient.mockReturnValue(createSessionClient('invited'))

    const response = await POST(recipeRequest('client_monthly') as never)

    expect(response.status).toBe(403)
    expect(await response.json()).toEqual({ error: 'Fonctionnalité gérée par ton coach.' })
    expect(fetch).not.toHaveBeenCalled()
  })

  it('keeps a premium user allowed despite a forged invited body', async () => {
    mocks.createServerClient.mockReturnValue(createSessionClient('client_monthly'))

    const response = await POST(recipeRequest('invited') as never)

    expect(response.status).toBe(200)
    expect(fetch).toHaveBeenCalledOnce()
  })

  it('fails closed when no reliable server profile is available', async () => {
    mocks.createServerClient.mockReturnValue(createSessionClient(null))

    const response = await POST(recipeRequest('client_monthly') as never)

    expect(response.status).toBe(403)
    expect(await response.json()).toEqual({ error: 'Autorisation impossible' })
    expect(fetch).not.toHaveBeenCalled()
  })

  it('routes the remaining business consumers through capability contexts', () => {
    const serverConsumer = readFileSync(
      'app/api/generate-recipe/route.ts',
      'utf8',
    )
    const clientConsumers = [
      'app/hooks/useClientDashboard.ts',
      'app/(application)/onboarding-v2/OnboardingV2Content.tsx',
      'app/components/ChatAI.tsx',
      'app/components/tabs/NutritionTab.tsx',
      'app/components/tabs/TrainingTab.tsx',
    ].map(path => readFileSync(path, 'utf8'))

    expect(serverConsumer).toContain('loadEffectiveEntitlementContext')
    expect(serverConsumer).not.toMatch(
      /subscription_type\s*={2,3}\s*['"]invited['"]/,
    )
    for (const source of clientConsumers) {
      expect(source).toMatch(/fetchEffectiveEntitlementSnapshot|capabilities/)
      expect(source).not.toMatch(/subscription_type\s*={2,3}\s*['"]invited['"]/)
    }
  })

  it('keeps relation authority outside the capability resolver', () => {
    const resolver = readFileSync('lib/entitlements/capabilities.ts', 'utf8')
    expect(resolver).not.toMatch(/coach_clients|invited_by_coach|relation\.status/)
  })
})
