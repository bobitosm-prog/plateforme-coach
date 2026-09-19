import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => ({
  user: vi.fn(), guard: vi.fn(), persist: vi.fn(), usage: vi.fn(),
}))
vi.mock('next/headers', () => ({ cookies: async () => ({ getAll: () => [] }) }))
vi.mock('@supabase/ssr', () => ({ createServerClient: () => ({ auth: { getUser: mocks.user } }) }))
vi.mock('@/lib/api-guard', () => ({ guardCoachManagedCapabilities: mocks.guard }))
vi.mock('@/lib/athena/generation-context', () => ({ loadAthenaGenerationContext: async () => ({ ok: true, prompt: 'Synthetic test profile' }) }))
vi.mock('@/lib/meal-plan/replace-personal-plan', () => ({ replacePersonalMealPlan: mocks.persist }))
vi.mock('@/lib/rate-limit', () => ({
  checkRateLimit: () => ({ allowed: true }),
  checkAiRateLimit: async () => ({ allowed: true }),
  checkAiQuota: async () => ({ allowed: true }),
  logAiUsage: mocks.usage,
  aiRateLimitResponse: () => new Response(null, { status: 429 }),
  aiQuotaResponse: () => new Response(null, { status: 429 }),
}))

import { POST } from '@/app/api/generate-meal-plan/route'
import { NUTRITION_PROVIDER_OUTPUT_FORMAT } from '@/lib/athena/nutrition-provider-output'

const entry = (aliment: string, quantite_g: number) => ({ aliment, quantite_g, kcal: 0, proteines: 0, glucides: 0, lipides: 0 })
const day = () => ({ repas: {
  petit_dejeuner: [entry("Flocons d'avoine secs", 100)],
  dejeuner: [entry('Blanc de poulet cuit', 200), entry('Riz basmati cuit', 300)],
  collation: [entry('Banane', 200), entry('Amandes', 50)],
  diner: [entry('Lentilles cuites', 300), entry("Huile d'olive", 10)],
} })
const provider = (value = day(), stop_reason = 'end_turn') => Response.json({
  stop_reason, content: [{ type: 'text', text: JSON.stringify(value) }],
})
const request = () => new Request('http://localhost/api/generate-meal-plan', {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ calorie_goal: 2003, protein_goal: 123, carbs_goal: 268, fat_goal: 52, persist_generated_plan: true }),
}) as NextRequest
async function run() {
  const response = await POST(request())
  const body = await response.text()
  const events = body.split('\n').filter(line => line.startsWith('data: ')).map(line => JSON.parse(line.slice(6)))
  return { response, events }
}

beforeEach(() => {
  vi.stubEnv('ANTHROPIC_API_KEY', 'synthetic-test-key')
  mocks.user.mockResolvedValue({ data: { user: { id: 'synthetic-user' } } })
  mocks.guard.mockResolvedValue(null)
  mocks.persist.mockResolvedValue({ ok: true, id: 'synthetic-plan' })
  mocks.usage.mockResolvedValue(undefined)
  vi.spyOn(console, 'warn').mockImplementation(() => {})
  vi.spyOn(console, 'error').mockImplementation(() => {})
  vi.spyOn(console, 'info').mockImplementation(() => {})
})
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.unstubAllEnvs(); vi.clearAllMocks() })

describe('nutrition POST runtime with synthetic provider and persistence', () => {
  it('sends the catalogue schema on all seven requests, validates and persists before done', async () => {
    const fetch = vi.fn().mockImplementation(async () => provider())
    vi.stubGlobal('fetch', fetch)
    const { response, events } = await run()
    expect(response.status).toBe(200)
    expect(fetch).toHaveBeenCalledTimes(7)
    for (const [, options] of fetch.mock.calls) {
      expect(JSON.parse(options.body).output_config.format).toEqual(NUTRITION_PROVIDER_OUTPUT_FORMAT)
    }
    expect(events.filter(e => e.type === 'done')).toHaveLength(1)
    expect(events.some(e => e.type === 'error')).toBe(false)
    expect(Object.keys(events.at(-1).plan)).toHaveLength(7)
    expect(mocks.persist).toHaveBeenCalledOnce()
    expect(mocks.usage).toHaveBeenCalledOnce()
  })
  it('reproduces an unknown Thursday twice: error event, no saved partial plan', async () => {
    const fetch = vi.fn().mockImplementation(async (_url, options) => {
      const value = day()
      if (JSON.parse(options.body).messages[0].content.includes('Génère le plan pour JEUDI.')) {
        value.repas.diner[0].aliment = 'Aliment inconnu synthétique'
      }
      return provider(value)
    })
    vi.stubGlobal('fetch', fetch)
    const { events } = await run()
    expect(fetch).toHaveBeenCalledTimes(8)
    expect(events.at(-1).type).toBe('error')
    expect(events.some(e => e.type === 'done')).toBe(false)
    expect(mocks.persist).not.toHaveBeenCalled()
    expect(mocks.usage).not.toHaveBeenCalled()
  })
  it('recovers after one rejected response without loosening validation', async () => {
    let calls = 0
    vi.stubGlobal('fetch', vi.fn().mockImplementation(async () => {
      const value = day(); if (++calls === 1) value.repas.diner[0].aliment = 'Inconnu'
      return provider(value)
    }))
    const { events } = await run()
    expect(calls).toBe(8)
    expect(events.at(-1).type).toBe('done')
    expect(mocks.persist).toHaveBeenCalledOnce()
  })
  it('rejects truncated responses even when their text happens to be valid JSON', async () => {
    const fetch = vi.fn().mockImplementation(async () => provider(day(), 'max_tokens'))
    vi.stubGlobal('fetch', fetch)
    const { events } = await run()
    expect(fetch).toHaveBeenCalledTimes(14)
    expect(events.at(-1).type).toBe('error')
    expect(mocks.persist).not.toHaveBeenCalled()
  })
  it('does not emit done when persistence fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockImplementation(async () => provider()))
    mocks.persist.mockResolvedValue({ ok: false, stage: 'insert' })
    const { events } = await run()
    expect(events.at(-1).type).toBe('error')
    expect(mocks.usage).not.toHaveBeenCalled()
  })
  it('never calls the provider for an unauthenticated request', async () => {
    const fetch = vi.fn(); vi.stubGlobal('fetch', fetch)
    mocks.user.mockResolvedValue({ data: { user: null } })
    expect((await POST(request())).status).toBe(401)
    expect(fetch).not.toHaveBeenCalled()
  })
  it('never calls the provider when capabilities deny generation', async () => {
    const fetch = vi.fn(); vi.stubGlobal('fetch', fetch)
    mocks.guard.mockResolvedValue(new Response(null, { status: 403 }))
    expect((await POST(request())).status).toBe(403)
    expect(fetch).not.toHaveBeenCalled()
  })
})
