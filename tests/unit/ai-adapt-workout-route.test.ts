import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  checkRateLimit: vi.fn(),
  startAiUsage: vi.fn(),
  finalize: vi.fn(),
  generate: vi.fn(),
  correlationId: vi.fn(),
}))

vi.mock('server-only', () => ({}))
vi.mock('next/headers', () => ({ cookies: vi.fn(async () => ({ getAll: () => [] })) }))
vi.mock('@supabase/ssr', () => ({ createServerClient: () => ({ auth: { getUser: mocks.getUser } }) }))
vi.mock('@/lib/rate-limit', () => ({ checkRateLimit: mocks.checkRateLimit }))
vi.mock('@/lib/ai/usage', async importOriginal => ({
  ...(await importOriginal<typeof import('@/lib/ai/usage')>()),
  aiUsageCorrelationId: mocks.correlationId,
  startAiUsage: mocks.startAiUsage,
}))
vi.mock('@/lib/ai/providers/anthropic', async importOriginal => ({
  ...(await importOriginal<typeof import('@/lib/ai/providers/anthropic')>()),
  createAnthropicProvider: () => ({ generate: mocks.generate }),
}))

import { POST } from '@/app/api/adapt-workout/route'
import { buildAdaptWorkoutInvocation } from '@/lib/ai/prompts'

const input = {
  exercises: [{ name: 'Squat', sets: 4, reps: 8 }, { exercise_name: 'Curl', sets: 3, reps: '12' }],
  availableMinutes: 30,
  sessionType: 'force',
}
const adapted = [{ name: 'Squat', sets: 3, reps: 8, rest_seconds: 90, priority: 'haute', kept: true }]

function request(body: unknown, signal?: AbortSignal): NextRequest {
  return new Request('http://localhost/api/adapt-workout', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-forwarded-for': '192.0.2.1', 'x-correlation-id': 'adapt-correlation' },
    body: JSON.stringify(body),
    signal,
  }) as NextRequest
}

function success(usage?: { inputTokens?: number; outputTokens?: number }) {
  return {
    ok: true as const,
    output: 'json' as const,
    value: adapted,
    metadata: {
      correlationId: 'adapt-correlation', requestedModel: 'claude-sonnet-4-6', actualModel: 'claude-sonnet-4-6',
      stopReason: 'end_turn' as const, usage,
    },
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  process.env.ANTHROPIC_API_KEY = 'local-test-key'
  mocks.getUser.mockResolvedValue({ data: { user: { id: 'session-user' } } })
  mocks.checkRateLimit.mockReturnValue({ allowed: true })
  mocks.correlationId.mockReturnValue('adapt-correlation')
  mocks.startAiUsage.mockResolvedValue({ status: 'started', remaining: 4, tracker: { finalize: mocks.finalize } })
  mocks.generate.mockResolvedValue(success({ inputTokens: 120, outputTokens: 40 }))
})

describe('POST /api/adapt-workout AiProvider contract', () => {
  it('preserves the golden prompt, model, parameters, public success and usage metadata', async () => {
    const response = await POST(request(input))

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ exercises: adapted })
    expect(mocks.correlationId).toHaveBeenCalledTimes(1)
    expect(mocks.startAiUsage).toHaveBeenCalledWith(expect.objectContaining({
      feature: 'adapt-workout', principal: { kind: 'user', id: 'session-user' },
      correlationId: 'adapt-correlation', logicalModel: 'anthropic-sonnet-4.6',
    }))
    const invocation = buildAdaptWorkoutInvocation(input)
    expect(mocks.generate).toHaveBeenCalledWith(expect.objectContaining({
      output: 'json', model: 'claude-sonnet-4-6', maxTokens: invocation.max_tokens,
      system: invocation.system, temperature: invocation.temperature,
      messages: invocation.messages.map(message => ({ role: message.role, content: [{ type: 'text', text: message.content }] })),
      validate: expect.any(Function),
    }), expect.objectContaining({ correlationId: 'adapt-correlation', cancellation: expect.any(Object) }))
    expect(mocks.generate.mock.calls[0]?.[1]).not.toHaveProperty('retry')
    expect(mocks.finalize).toHaveBeenCalledTimes(1)
    expect(mocks.finalize).toHaveBeenCalledWith({
      outcome: 'succeeded', reasonCode: 'completed', providerModel: 'claude-sonnet-4-6',
      tokens: { inputTokens: 120, outputTokens: 40 },
    })
  })

  it('keeps unknown token usage unavailable instead of inventing zero', async () => {
    mocks.generate.mockResolvedValue(success())
    const response = await POST(request(input))
    expect(response.status).toBe(200)
    expect(mocks.finalize).toHaveBeenCalledWith(expect.objectContaining({ tokens: undefined }))
  })

  it.each(['provider_refused', 'network_error'] as const)('expurgates %s without changing the 500 class', async code => {
    mocks.generate.mockResolvedValue({ ok: false, error: { code, retryable: false }, metadata: { correlationId: 'adapt-correlation', requestedModel: 'claude-sonnet-4-6', actualModel: 'claude-sonnet-4-6', usage: { inputTokens: 12 } } })
    const response = await POST(request(input))
    expect(response.status).toBe(500)
    expect(await response.json()).toEqual({ error: 'Erreur inattendue' })
    expect(mocks.finalize).toHaveBeenCalledTimes(1)
    expect(mocks.finalize).toHaveBeenCalledWith(expect.objectContaining({ outcome: 'failed', reasonCode: 'request_failed', providerModel: 'claude-sonnet-4-6', tokens: { inputTokens: 12 } }))
  })

  it('keeps a provider quota response in the historical 500 response class', async () => {
    mocks.generate.mockResolvedValue({ ok: false, error: { code: 'quota_exceeded', retryable: true }, metadata: { correlationId: 'adapt-correlation', requestedModel: 'claude-sonnet-4-6' } })
    const response = await POST(request(input))
    expect(response.status).toBe(500)
    expect(await response.json()).toEqual({ error: 'Erreur inattendue' })
    expect(mocks.finalize).toHaveBeenCalledTimes(1)
  })

  it('preserves the invalid-output response and never invents an adaptation', async () => {
    mocks.generate.mockResolvedValue({ ok: false, error: { code: 'invalid_output', retryable: false }, metadata: { correlationId: 'adapt-correlation', requestedModel: 'claude-sonnet-4-6' } })
    const response = await POST(request(input))
    expect(response.status).toBe(500)
    expect(await response.json()).toEqual({ error: 'Format invalide' })
    expect(mocks.finalize).toHaveBeenCalledTimes(1)
  })

  it('propagates cancellation and finalizes it exactly once', async () => {
    const controller = new AbortController()
    controller.abort()
    mocks.generate.mockResolvedValue({ ok: false, error: { code: 'cancelled', retryable: false }, metadata: { correlationId: 'adapt-correlation', requestedModel: 'claude-sonnet-4-6' } })
    const response = await POST(request(input, controller.signal))
    expect(response.status).toBe(500)
    expect(mocks.generate.mock.calls[0]?.[1].cancellation.aborted).toBe(true)
    expect(mocks.finalize).toHaveBeenCalledTimes(1)
    expect(mocks.finalize).toHaveBeenCalledWith(expect.objectContaining({ outcome: 'cancelled', reasonCode: 'request_cancelled' }))
  })

  it('preserves authentication, IP limiting and usage denial before provider invocation', async () => {
    mocks.getUser.mockResolvedValueOnce({ data: { user: null } })
    expect((await POST(request(input))).status).toBe(401)
    mocks.checkRateLimit.mockReturnValueOnce({ allowed: false })
    expect((await POST(request(input))).status).toBe(429)
    mocks.startAiUsage.mockResolvedValueOnce({ status: 'denied', reason: 'hourly_exhausted', retryAfterMs: 1000 })
    expect((await POST(request(input))).status).toBe(503)
    expect(mocks.generate).not.toHaveBeenCalled()
    expect(mocks.finalize).not.toHaveBeenCalled()
  })

  it('validates minimal and complete output and rejects unknown or invalid values', async () => {
    await POST(request(input))
    const validate = mocks.generate.mock.calls[0]?.[0].validate as (value: unknown) => { ok: boolean }
    expect(validate([{ name: 'Squat', sets: 1, reps: 1, rest_seconds: 0, priority: 'moyenne', kept: false }]).ok).toBe(true)
    expect(validate(adapted).ok).toBe(true)
    expect(validate([{ ...adapted[0], unknown: true }]).ok).toBe(false)
    expect(validate([{ ...adapted[0], sets: 0 }]).ok).toBe(false)
    expect(validate(Array.from({ length: 101 }, () => adapted[0])).ok).toBe(false)
  })
})
