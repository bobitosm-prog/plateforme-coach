import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { NextRequest } from 'next/server'
import { readFileSync } from 'node:fs'

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(), checkRateLimit: vi.fn(), checkAiRateLimit: vi.fn(), checkAiQuota: vi.fn(), logAiUsage: vi.fn(),
  generateMealPlan: vi.fn(), provider: { generate: vi.fn() }, guardInvitedClient: vi.fn(),
}))

vi.mock('@supabase/ssr', () => ({ createServerClient: () => ({ auth: { getUser: mocks.getUser } }) }))
vi.mock('next/headers', () => ({ cookies: vi.fn(async () => ({ getAll: () => [] })) }))
vi.mock('@/lib/rate-limit', () => ({
  checkRateLimit: mocks.checkRateLimit, checkAiRateLimit: mocks.checkAiRateLimit, checkAiQuota: mocks.checkAiQuota, logAiUsage: mocks.logAiUsage,
  aiRateLimitResponse: () => new Response('{}', { status: 429 }), aiQuotaResponse: () => new Response('{}', { status: 429 }),
}))
vi.mock('@/lib/api-guard', () => ({ guardInvitedClient: mocks.guardInvitedClient }))
vi.mock('@/lib/nutrition/meal-generation', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/nutrition/meal-generation')>()
  return { ...actual, generateMealPlan: mocks.generateMealPlan, createAnthropicMealGenerationProvider: () => mocks.provider }
})

import { POST } from '../../app/api/generate-meal-plan/route'

const validBody = { calorie_goal: 2000, protein_goal: 140, carbs_goal: 220, fat_goal: 60, userId: 'forged-browser-id' }
const request = (body: unknown, headers: Record<string, string> = {}) => new Request('http://localhost/api/generate-meal-plan', {
  method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: JSON.stringify(body),
}) as NextRequest

beforeEach(() => {
  vi.clearAllMocks()
  delete process.env.SUPABASE_SERVICE_ROLE_KEY
  process.env.ANTHROPIC_API_KEY = 'local-only-test-key'
  mocks.getUser.mockResolvedValue({ data: { user: { id: 'session-user' } } })
  mocks.checkRateLimit.mockReturnValue({ allowed: true })
  mocks.checkAiRateLimit.mockResolvedValue({ allowed: true })
  mocks.checkAiQuota.mockResolvedValue({ allowed: true })
  mocks.generateMealPlan.mockImplementation(async (_params, _provider, progress) => {
    progress({ type: 'progress', day: 'lundi', index: 1, total: 7 })
    return { ok: true, partial: false, failedDays: 0, plan: { lundi: { meals: [] } } }
  })
})

describe('POST /api/generate-meal-plan adapter', () => {
  it('remains an HTTP adapter without prompt construction or direct provider transport', () => {
    const source = readFileSync('app/api/generate-meal-plan/route.ts', 'utf8')
    expect(source).not.toContain('NUTRITION_GENERATION_PROMPT')
    expect(source).not.toContain('api.anthropic.com')
    expect(source).not.toMatch(/\.from\(['"](?:meal_plans|profiles|custom_foods)/)
  })
  it('rejects anonymous callers before quota, provider or parsing', async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null } })
    const response = await POST(request(validBody, { 'x-request-id': 'request-valid-123' }))
    expect(response.status).toBe(401)
    expect(response.headers.get('x-request-id')).toBe('request-valid-123')
    expect(mocks.checkAiQuota).not.toHaveBeenCalled()
    expect(mocks.generateMealPlan).not.toHaveBeenCalled()
  })

  it('rejects invalid Nutrition input with the common validation contract', async () => {
    const response = await POST(request({ ...validBody, calorie_goal: -1 }))
    expect(response.status).toBe(400)
    expect(mocks.generateMealPlan).not.toHaveBeenCalled()
  })

  it('uses only session identity for quota, usage and invited-role guard', async () => {
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'configured'
    mocks.guardInvitedClient.mockResolvedValue(null)
    const response = await POST(request(validBody))
    expect(response.status).toBe(200)
    expect(mocks.checkAiQuota).toHaveBeenCalledWith(expect.anything(), 'session-user')
    expect(mocks.logAiUsage).toHaveBeenCalledWith(expect.anything(), 'session-user', 'generate-meal-plan')
    expect(mocks.guardInvitedClient).toHaveBeenCalledWith('session-user')
    expect(mocks.generateMealPlan).toHaveBeenCalledWith(expect.objectContaining({ calorie_goal: 2000 }), mocks.provider, expect.any(Function))
    expect(await response.text()).toContain('"type":"done"')
  })

  it('preserves the invited-role rejection and performs no generation', async () => {
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'configured'
    mocks.guardInvitedClient.mockResolvedValue(new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 }))
    const response = await POST(request(validBody))
    expect(response.status).toBe(403)
    expect(mocks.generateMealPlan).not.toHaveBeenCalled()
  })
})
