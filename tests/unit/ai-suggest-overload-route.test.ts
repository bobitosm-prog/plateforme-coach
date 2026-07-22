import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(), checkRateLimit: vi.fn(), startAiUsage: vi.fn(), finalize: vi.fn(), generate: vi.fn(),
  correlationId: vi.fn(), guardInvitedClient: vi.fn(), createServiceClient: vi.fn(), maybeSingle: vi.fn(),
  historyLimit: vi.fn(), insert: vi.fn(),
}))

vi.mock('server-only', () => ({}))
vi.mock('next/headers', () => ({ cookies: vi.fn(async () => ({ getAll: () => [] })) }))
vi.mock('@supabase/ssr', () => ({ createServerClient: () => ({ auth: { getUser: mocks.getUser } }) }))
vi.mock('@supabase/supabase-js', () => ({ createClient: mocks.createServiceClient }))
vi.mock('@/lib/rate-limit', () => ({ checkRateLimit: mocks.checkRateLimit }))
vi.mock('@/lib/api-guard', () => ({ guardInvitedClient: mocks.guardInvitedClient }))
vi.mock('@/lib/ai/usage', async importOriginal => ({
  ...(await importOriginal<typeof import('@/lib/ai/usage')>()),
  aiUsageCorrelationId: mocks.correlationId,
  startAiUsage: mocks.startAiUsage,
}))
vi.mock('@/lib/ai/providers/anthropic', async importOriginal => ({
  ...(await importOriginal<typeof import('@/lib/ai/providers/anthropic')>()),
  createAnthropicProvider: () => ({ generate: mocks.generate }),
}))

import { POST } from '@/app/api/suggest-overload/route'
import { buildOverloadInvocation } from '@/lib/ai/prompts'
import { overloadSuggestionOutputSchema } from '@/lib/ai/schemas'

const input = { exerciseName: 'Squat', currentWeight: 100, currentReps: 5, setsCompleted: 4, setsTarget: 4, sessionId: 'session-1' }
const suggestion = { weight: 102.5, reps: 5, reasoning: 'Progression maîtrisée' }
const history = [
  { weight: 100, reps: 5, completed: true, set_number: 1, session_id: 'old-session', created_at: '2026-07-20T10:00:00Z' },
  { weight: 100, reps: 5, completed: true, set_number: 2, session_id: 'old-session', created_at: '2026-07-20T10:01:00Z' },
]

function request(body: unknown, signal?: AbortSignal): NextRequest {
  return new Request('http://localhost/api/suggest-overload', {
    method: 'POST', headers: { 'content-type': 'application/json', 'x-forwarded-for': '192.0.2.3', 'x-correlation-id': 'overload-correlation' },
    body: JSON.stringify(body), signal,
  }) as NextRequest
}

function serviceClient() {
  return {
    from(table: string) {
      if (table === 'progressive_overload_suggestions') return {
        select: () => ({ eq: () => ({ eq: () => ({ eq: () => ({ maybeSingle: mocks.maybeSingle }) }) }) }),
        insert: mocks.insert,
      }
      if (table === 'workout_sets') return {
        select: () => ({ eq: () => ({ eq: () => ({ order: () => ({ limit: mocks.historyLimit }) }) }) }),
      }
      throw new Error(`unexpected table ${table}`)
    },
  }
}

function providerSuccess(text = JSON.stringify(suggestion), usage?: { inputTokens?: number; outputTokens?: number }) {
  return {
    ok: true as const, output: 'text' as const, value: text,
    metadata: { correlationId: 'overload-correlation', requestedModel: 'claude-haiku-4-5-20251001', actualModel: 'claude-haiku-4-5-20251001', stopReason: 'end_turn' as const, usage },
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  process.env.ANTHROPIC_API_KEY = 'local-test-key'
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'local-service-key'
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://127.0.0.1:54321'
  mocks.getUser.mockResolvedValue({ data: { user: { id: 'session-user' } } })
  mocks.checkRateLimit.mockReturnValue({ allowed: true })
  mocks.correlationId.mockReturnValue('overload-correlation')
  mocks.startAiUsage.mockResolvedValue({ status: 'started', remaining: null, tracker: { finalize: mocks.finalize } })
  mocks.guardInvitedClient.mockResolvedValue(null)
  mocks.createServiceClient.mockReturnValue(serviceClient())
  mocks.maybeSingle.mockResolvedValue({ data: null })
  mocks.historyLimit.mockResolvedValue({ data: history })
  mocks.insert.mockResolvedValue({ error: null })
  mocks.generate.mockResolvedValue(providerSuccess(JSON.stringify(suggestion), { inputTokens: 100, outputTokens: 20 }))
})

describe('POST /api/suggest-overload AiProvider contract', () => {
  it('preserves provider request, owner-scoped reads, exact insert and public success', async () => {
    const response = await POST(request(input))
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ ok: true, suggestion: { exerciseName: 'Squat', currentWeight: 100, suggestedWeight: 102.5, suggestedReps: 5, reasoning: 'Progression maîtrisée' } })

    const invocation = buildOverloadInvocation({ exerciseName: 'Squat', currentWeight: 100, currentReps: 5, setsCompleted: 4, historyLines: '2026-07-20 : 2x5@100kg (2/2 réussies)' })
    expect(mocks.generate).toHaveBeenCalledWith(expect.objectContaining({
      output: 'text', model: 'claude-haiku-4-5-20251001', maxTokens: 300, temperature: 0.3,
      system: invocation.system, messages: [{ role: 'user', content: [{ type: 'text', text: (invocation.messages[0]?.content as string) }] }],
    }), expect.objectContaining({ correlationId: 'overload-correlation', cancellation: expect.any(Object) }))
    expect(mocks.startAiUsage).toHaveBeenCalledWith(expect.objectContaining({ feature: 'suggest-overload', principal: { kind: 'user', id: 'session-user' }, correlationId: 'overload-correlation', logicalModel: 'anthropic-haiku-4.5' }))
    expect(mocks.insert).toHaveBeenCalledTimes(1)
    expect(mocks.insert).toHaveBeenCalledWith({ user_id: 'session-user', exercise_name: 'Squat', current_weight: 100, current_reps: 5, suggested_weight: 102.5, suggested_reps: 5, reasoning: 'Progression maîtrisée', status: 'pending', session_id_origin: 'session-1' })
    expect(mocks.generate.mock.invocationCallOrder[0]).toBeLessThan(mocks.insert.mock.invocationCallOrder[0])
    expect(mocks.finalize).toHaveBeenCalledTimes(1)
    expect(mocks.finalize).toHaveBeenCalledWith({ outcome: 'succeeded', reasonCode: 'completed', providerModel: 'claude-haiku-4-5-20251001', tokens: { inputTokens: 100, outputTokens: 20 } })
  })

  it('keeps absent tokens unknown and the exact fallback payload fields', async () => {
    mocks.generate.mockResolvedValue(providerSuccess(JSON.stringify({ weight: 102.5, reps: 6, reasoning: 'Continue' })))
    const response = await POST(request({ ...input, sessionId: undefined }))
    expect(response.status).toBe(200)
    expect(mocks.insert).toHaveBeenCalledWith(expect.objectContaining({ suggested_reps: 6, session_id_origin: null }))
    expect(mocks.finalize).toHaveBeenCalledWith(expect.objectContaining({ tokens: undefined }))
  })

  it('skips before provider when sets are incomplete or a pending suggestion exists', async () => {
    const incomplete = await POST(request({ ...input, setsCompleted: 3 }))
    expect(incomplete.status).toBe(200)
    expect(await incomplete.json()).toEqual({ error: 'Toutes les séries doivent être réussies', skipped: true })
    mocks.maybeSingle.mockResolvedValueOnce({ data: { id: 'pending-1' } })
    const existing = await POST(request(input))
    expect(await existing.json()).toEqual({ skipped: true, reason: 'already_pending' })
    expect(mocks.generate).not.toHaveBeenCalled()
    expect(mocks.insert).not.toHaveBeenCalled()
  })

  it.each(['provider_refused', 'network_error'] as const)('%s never writes and returns a safe provider error', async code => {
    mocks.generate.mockResolvedValue({ ok: false, error: { code, retryable: false }, metadata: { correlationId: 'overload-correlation', requestedModel: 'claude-haiku-4-5-20251001' } })
    const response = await POST(request(input))
    expect(response.status).toBe(500)
    expect(await response.json()).toEqual({ error: 'Erreur IA' })
    expect(mocks.insert).not.toHaveBeenCalled()
    expect(mocks.finalize).toHaveBeenCalledTimes(1)
  })

  it('preserves parser-specific public errors and never writes invalid output', async () => {
    for (const [text, error] of [['{"weight":', 'JSON parse échoué'], ['{"weight":-1,"reps":5,"reasoning":"x"}', 'Suggestion invalide'], ['', 'Format IA invalide']] as const) {
      vi.clearAllMocks()
      mocks.getUser.mockResolvedValue({ data: { user: { id: 'session-user' } } })
      mocks.checkRateLimit.mockReturnValue({ allowed: true })
      mocks.correlationId.mockReturnValue('overload-correlation')
      mocks.startAiUsage.mockResolvedValue({ status: 'started', remaining: null, tracker: { finalize: mocks.finalize } })
      mocks.guardInvitedClient.mockResolvedValue(null)
      mocks.createServiceClient.mockReturnValue(serviceClient())
      mocks.maybeSingle.mockResolvedValue({ data: null })
      mocks.historyLimit.mockResolvedValue({ data: history })
      mocks.generate.mockResolvedValue(providerSuccess(text))
      const response = await POST(request(input))
      expect(response.status).toBe(500)
      expect(await response.json()).toEqual({ error })
      expect(mocks.insert).not.toHaveBeenCalled()
    }
  })

  it('propagates cancellation without writing and finalizes once', async () => {
    const controller = new AbortController()
    controller.abort()
    mocks.generate.mockResolvedValue({ ok: false, error: { code: 'cancelled', retryable: false }, metadata: { correlationId: 'overload-correlation', requestedModel: 'claude-haiku-4-5-20251001' } })
    const response = await POST(request(input, controller.signal))
    expect(response.status).toBe(500)
    expect(await response.json()).toEqual({ error: 'Erreur IA' })
    expect(mocks.generate.mock.calls[0]?.[1].cancellation.aborted).toBe(true)
    expect(mocks.insert).not.toHaveBeenCalled()
    expect(mocks.finalize).toHaveBeenCalledTimes(1)
    expect(mocks.finalize).toHaveBeenCalledWith(expect.objectContaining({ outcome: 'cancelled', reasonCode: 'request_cancelled' }))
  })

  it('preserves HTTP 200 partial failure after provider success and expurgates SQL details', async () => {
    mocks.insert.mockResolvedValue({ error: { code: '23514', message: 'private SQL payload', details: 'private details', hint: 'private hint' } })
    const response = await POST(request(input))
    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body).toEqual({ skipped: true, reason: 'insert_failed' })
    expect(JSON.stringify(body)).not.toMatch(/private|SQL|details|hint/i)
    expect(mocks.generate).toHaveBeenCalledTimes(1)
    expect(mocks.insert).toHaveBeenCalledTimes(1)
    expect(mocks.finalize).toHaveBeenCalledTimes(1)
    expect(mocks.finalize).toHaveBeenCalledWith(expect.objectContaining({ outcome: 'failed', providerModel: 'claude-haiku-4-5-20251001', tokens: { inputTokens: 100, outputTokens: 20 } }))
  })

  it('preserves duplicate insert as an already-pending partial result', async () => {
    mocks.insert.mockResolvedValue({ error: { code: '23505', message: 'duplicate' } })
    const response = await POST(request(input))
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ skipped: true, reason: 'already_pending' })
    expect(mocks.insert).toHaveBeenCalledTimes(1)
  })

  it('preserves auth, invited gate, validation, IP limit and untracked usage fail-closed', async () => {
    mocks.getUser.mockResolvedValueOnce({ data: { user: null } })
    expect((await POST(request(input))).status).toBe(401)
    mocks.checkRateLimit.mockReturnValueOnce({ allowed: false })
    expect((await POST(request(input))).status).toBe(429)
    mocks.startAiUsage.mockResolvedValueOnce({ status: 'unavailable' })
    expect((await POST(request(input))).status).toBe(503)
    mocks.guardInvitedClient.mockResolvedValueOnce(Response.json({ error: 'Fonctionnalité gérée par ton coach.' }, { status: 403 }))
    expect((await POST(request(input))).status).toBe(403)
    expect((await POST(request({ ...input, exerciseName: '' }))).status).toBe(400)
    expect((await POST(request({ ...input, currentWeight: 0 }))).status).toBe(400)
    expect(mocks.generate).not.toHaveBeenCalled()
    expect(mocks.insert).not.toHaveBeenCalled()
  })

  it('validates complete output and rejects absent, negative, non-finite, mistyped, unknown and oversized values', async () => {
    const valid = overloadSuggestionOutputSchema.safeParse(suggestion)
    expect(valid.success).toBe(true)
    for (const candidate of [
      { weight: 102.5, reasoning: 'x' }, { weight: -1, reps: 5, reasoning: 'x' },
      { weight: Number.NaN, reps: 5, reasoning: 'x' }, { weight: Number.POSITIVE_INFINITY, reps: 5, reasoning: 'x' },
      { weight: '102.5', reps: 5, reasoning: 'x' }, { ...suggestion, unknown: true },
      { ...suggestion, reasoning: 'x'.repeat(5_001) },
    ]) expect(overloadSuggestionOutputSchema.safeParse(candidate).success).toBe(false)
  })

  it('does not log performance, prompts, provider responses or persistence errors', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    mocks.insert.mockResolvedValue({ error: { code: '23514', message: 'private SQL payload' } })
    await POST(request(input))
    expect(log).not.toHaveBeenCalled()
    log.mockRestore()
  })
})
