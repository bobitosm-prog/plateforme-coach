import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(), from: vi.fn(), checkRateLimit: vi.fn(), startAiUsage: vi.fn(), finalize: vi.fn(), generate: vi.fn(),
}))

vi.mock('server-only', () => ({}))
vi.mock('next/headers', () => ({ cookies: vi.fn(async () => ({ getAll: () => [] })) }))
vi.mock('@supabase/ssr', () => ({ createServerClient: () => ({ auth: { getUser: mocks.getUser }, from: mocks.from }) }))
vi.mock('@/lib/rate-limit', () => ({
  checkRateLimit: mocks.checkRateLimit,
  aiRateLimitResponse: () => Response.json({ error: 'Limite IA atteinte' }, { status: 429 }),
}))
vi.mock('@/lib/ai/usage', async importOriginal => ({
  ...(await importOriginal<typeof import('@/lib/ai/usage')>()),
  aiUsageCorrelationId: () => 'correlation-route-1',
  startAiUsage: mocks.startAiUsage,
}))
vi.mock('@/lib/ai/providers/anthropic', async importOriginal => ({
  ...(await importOriginal<typeof import('@/lib/ai/providers/anthropic')>()),
  createAnthropicProvider: () => ({ generate: mocks.generate }),
}))

import { POST as chatPost } from '@/app/api/chat-ai/route'
import { POST as recipePost } from '@/app/api/generate-recipe/route'
import { POST as suggestionPost } from '@/app/api/suggest-exercise/route'
import { POST as legacyProgramPost } from '@/app/api/generate-program/route'

function request(path: string, body: unknown): NextRequest {
  return new Request(`http://localhost${path}`, {
    method: 'POST', headers: { 'content-type': 'application/json', 'x-correlation-id': 'correlation-route-1' }, body: JSON.stringify(body),
  }) as NextRequest
}

function successful<T>(value: T, model: string) {
  return { ok: true as const, output: typeof value === 'string' ? 'text' as const : 'json' as const, value, metadata: { correlationId: 'correlation-route-1', requestedModel: model, actualModel: model, stopReason: 'end_turn' as const, usage: { inputTokens: 10, outputTokens: 5 } } }
}

beforeEach(() => {
  vi.clearAllMocks()
  process.env.ANTHROPIC_API_KEY = 'local-test-key'
  delete process.env.MOOVX_E2E
  delete process.env.ANTHROPIC_E2E_MESSAGES_URL
  delete process.env.SUPABASE_SERVICE_ROLE_KEY
  mocks.getUser.mockResolvedValue({ data: { user: { id: 'session-user' } } })
  mocks.checkRateLimit.mockReturnValue({ allowed: true })
  mocks.startAiUsage.mockResolvedValue({ status: 'started', remaining: 9, tracker: { finalize: mocks.finalize } })
  mocks.from.mockImplementation((table: string) => {
    if (table === 'profiles') return { select: () => ({ eq: () => ({ single: async () => ({ data: { full_name: 'Profil serveur', subscription_type: 'client_monthly' } }) }) }) }
    if (table === 'chat_ai_messages') return {
      select: () => ({ eq: () => ({ order: () => ({ limit: async () => ({ data: [{ role: 'assistant', content: 'historique' }] }) }) }) }),
      insert: vi.fn(async () => ({ error: null })),
    }
    throw new Error(`unexpected table ${table}`)
  })
})

describe('migrated AI route contracts', () => {
  it('keeps Athena history, model parameters, persistence order and usage metadata', async () => {
    mocks.generate.mockResolvedValue(successful('réponse Athena', 'claude-sonnet-4-6'))
    const response = await chatPost(request('/api/chat-ai', { message: `  ${'x'.repeat(550)}  ` }))
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ message: 'réponse Athena' })
    expect(mocks.generate).toHaveBeenCalledWith(expect.objectContaining({ output: 'text', model: 'claude-sonnet-4-6', maxTokens: 1024, messages: expect.arrayContaining([expect.objectContaining({ role: 'assistant' }), expect.objectContaining({ role: 'user' })]) }), expect.objectContaining({ correlationId: 'correlation-route-1' }))
    expect(mocks.startAiUsage).toHaveBeenCalledTimes(1)
    expect(mocks.startAiUsage).toHaveBeenCalledWith(expect.objectContaining({ feature: 'chat-ai', logicalModel: 'anthropic-sonnet-4.6', principal: { kind: 'user', id: 'session-user' } }))
    expect(mocks.finalize).toHaveBeenCalledWith(expect.objectContaining({ outcome: 'succeeded', providerModel: 'claude-sonnet-4-6', tokens: { inputTokens: 10, outputTokens: 5 } }))
  })

  it('preserves recipe JSON output, rounding, model and one usage reservation', async () => {
    const recipe = { title: 'Bol', category: 'dejeuner', ingredients: [{ name: 'Riz', quantity_g: 100, calories: 100, proteins: 2, carbs: 20, fat: 1 }], instructions: [{ step: 1, text: 'Cuire' }], prep_time_min: 5, cook_time_min: 10, calories_per_serving: 123.6, proteins_per_serving: 12.34, carbs_per_serving: 20.26, fat_per_serving: 3.25 }
    mocks.generate.mockResolvedValue(successful(recipe, 'claude-haiku-4-5-20251001'))
    const response = await recipePost(request('/api/generate-recipe', { category: 'dejeuner', profile: { calorie_goal: 2000, protein_goal: 140 } }))
    expect(response.status).toBe(200)
    expect((await response.json()).recipe).toMatchObject({ calories_per_serving: 124, proteins_per_serving: 12.3, carbs_per_serving: 20.3, fat_per_serving: 3.3 })
    expect(mocks.generate).toHaveBeenCalledWith(expect.objectContaining({ output: 'json', model: 'claude-haiku-4-5-20251001', maxTokens: 1500 }), expect.objectContaining({ correlationId: 'correlation-route-1' }))
    expect(mocks.startAiUsage).toHaveBeenCalledTimes(1)
  })

  it('preserves exercise suggestions and rejects invalid provider output', async () => {
    const suggestions = Array.from({ length: 3 }, (_, index) => ({ name: `Exercice ${index}`, muscles: 'Pectoraux', reason: 'Equivalent', difficulty: 'intermediaire' }))
    mocks.generate.mockResolvedValue(successful(suggestions, 'claude-haiku-4-5-20251001'))
    const response = await suggestionPost(request('/api/suggest-exercise', { exerciseName: 'Développé couché', reason: 'douleur' }))
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ suggestions })
    expect(mocks.generate).toHaveBeenCalledWith(expect.objectContaining({ output: 'json', model: 'claude-haiku-4-5-20251001', maxTokens: 500 }), expect.anything())
    mocks.generate.mockResolvedValue({ ok: false, error: { code: 'invalid_output', retryable: false }, metadata: { correlationId: 'correlation-route-1', requestedModel: 'claude-haiku-4-5-20251001' } })
    expect((await suggestionPost(request('/api/suggest-exercise', { exerciseName: 'Squat' }))).status).toBe(500)
  })

  it('preserves the legacy coach program request and seven-day normalization', async () => {
    mocks.generate.mockResolvedValue(successful({
      lundi: { isRest: false, day_name: 'Push', exercises: [] },
    }, 'claude-haiku-4-5-20251001'))
    const response = await legacyProgramPost(request('/api/generate-program', {
      objective: 'force', level: 'intermediaire', trainingDays: 3, weight: 80,
      targetWeight: 82, equipment: ['salle'],
    }))
    expect(mocks.generate).toHaveBeenCalledTimes(1)
    expect(response.status).toBe(200)
    const body = await response.json()
    expect(Object.keys(body.program)).toEqual(['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'])
    expect(body.program.lundi).toEqual({ isRest: false, day_name: 'Push', exercises: [] })
    expect(body.program.mardi).toEqual({ isRest: true, day_name: 'Repos', exercises: [] })
    expect(mocks.generate).toHaveBeenCalledWith(expect.objectContaining({ output: 'json', model: 'claude-haiku-4-5-20251001', maxTokens: 3000 }), expect.objectContaining({ correlationId: 'correlation-route-1' }))
    expect(mocks.startAiUsage).toHaveBeenCalledWith(expect.objectContaining({ feature: 'generate-program', logicalModel: 'anthropic-haiku-4.5', principal: { kind: 'user', id: 'session-user' } }))
  })

  it('preserves quota denial before provider and maps provider quota/network errors safely', async () => {
    mocks.startAiUsage.mockResolvedValueOnce({ status: 'denied', reason: 'hourly_exhausted', retryAfterMs: 1000 })
    expect((await chatPost(request('/api/chat-ai', { message: 'quota' }))).status).toBe(429)
    expect(mocks.generate).not.toHaveBeenCalled()
    mocks.generate.mockResolvedValue({ ok: false, error: { code: 'quota_exceeded', retryable: true }, metadata: { correlationId: 'correlation-route-1', requestedModel: 'claude-haiku-4-5-20251001' } })
    expect((await recipePost(request('/api/generate-recipe', { category: 'diner', profile: {} }))).status).toBe(429)
    expect(JSON.stringify(await (await recipePost(request('/api/generate-recipe', { category: 'diner', profile: {} }))).json())).not.toContain('local-test-key')
  })

  it.each(['provider_refused', 'network_error', 'invalid_output'] as const)(
    'keeps Athena %s failures and logs sanitized', async code => {
      const log = vi.spyOn(console, 'error').mockImplementation(() => {})
      mocks.generate.mockResolvedValue({
        ok: false, error: { code, retryable: true, detail: 'raw-provider-secret' },
        metadata: { correlationId: 'correlation-route-1', requestedModel: 'claude-sonnet-4-6' },
      })
      const response = await chatPost(request('/api/chat-ai', { message: 'question privée' }))
      expect(response.status).toBe(500)
      expect(await response.json()).toEqual({ error: 'Erreur serveur (500)' })
      expect(JSON.stringify(log.mock.calls)).not.toMatch(/raw-provider-secret|question privée/)
      expect(mocks.finalize).toHaveBeenCalledWith(expect.objectContaining({ outcome: 'failed' }))
      log.mockRestore()
    },
  )

  it('sanitizes Chat persistence errors while preserving the public failure', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {})
    mocks.from.mockImplementation((table: string) => {
      if (table === 'profiles') return { select: () => ({ eq: () => ({ single: async () => ({ data: { subscription_type: 'client_monthly' } }) }) }) }
      if (table === 'chat_ai_messages') return {
        select: () => ({ eq: () => ({ order: () => ({ limit: async () => ({ data: [] }) }) }) }),
        insert: vi.fn(async () => ({ error: { message: 'private SQL detail', content: 'message privé' } })),
      }
      throw new Error(`unexpected table ${table}`)
    })

    const response = await chatPost(request('/api/chat-ai', { message: 'message privé' }))
    expect(response.status).toBe(500)
    expect(await response.json()).toEqual({ error: 'Erreur sauvegarde message' })
    const serialized = JSON.stringify(log.mock.calls)
    expect(serialized).toContain('USER_MESSAGE_PERSISTENCE_FAILED')
    expect(serialized).not.toMatch(/private SQL detail|message privé/)
    log.mockRestore()
  })
})
