import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(), checkRateLimit: vi.fn(), startAiUsage: vi.fn(), finalize: vi.fn(), generate: vi.fn(), correlationId: vi.fn(),
}))

vi.mock('server-only', () => ({}))
vi.mock('next/headers', () => ({ cookies: vi.fn(async () => ({ getAll: () => [] })) }))
vi.mock('@supabase/ssr', () => ({ createServerClient: () => ({ auth: { getUser: mocks.getUser } }) }))
vi.mock('@/lib/rate-limit', () => ({
  checkRateLimit: mocks.checkRateLimit,
  aiRateLimitResponse: (limit: number, retryAfter: number) => Response.json({ error: 'Limite IA atteinte', limit, retryAfter }, { status: 429 }),
}))
vi.mock('@/lib/ai/usage', async importOriginal => ({
  ...(await importOriginal<typeof import('@/lib/ai/usage')>()),
  aiUsageCorrelationId: mocks.correlationId,
  startAiUsage: mocks.startAiUsage,
}))
vi.mock('@/lib/ai/providers/anthropic', async importOriginal => ({
  ...(await importOriginal<typeof import('@/lib/ai/providers/anthropic')>()),
  createAnthropicProvider: () => ({ generate: mocks.generate }),
}))

import { POST } from '@/app/api/analyze-meal-photo/route'
import { buildMealPhotoInvocation } from '@/lib/ai/prompts'

const IMAGE_DATA = 'AQID'
const IMAGE = `data:image/png;base64,${IMAGE_DATA}`
const completeAnalysis = {
  foods: [{ name: 'Riz', quantity_g: 120, calories: 156, proteins: 3.2, carbs: 33.6, fats: 0.4 }],
  total_calories: 156,
  confidence: 'high' as const,
}

function request(body: unknown, signal?: AbortSignal): NextRequest {
  return new Request('http://localhost/api/analyze-meal-photo', {
    method: 'POST', headers: { 'content-type': 'application/json', 'x-forwarded-for': '192.0.2.2', 'x-correlation-id': 'meal-photo-correlation' },
    body: JSON.stringify(body), signal,
  }) as NextRequest
}

function success(value = completeAnalysis, usage?: { inputTokens?: number; outputTokens?: number }) {
  return {
    ok: true as const, output: 'json' as const, value,
    metadata: { correlationId: 'meal-photo-correlation', requestedModel: 'claude-sonnet-4-6', actualModel: 'claude-sonnet-4-6', stopReason: 'end_turn' as const, usage },
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  process.env.ANTHROPIC_API_KEY = 'local-test-key'
  mocks.getUser.mockResolvedValue({ data: { user: { id: 'session-user' } } })
  mocks.checkRateLimit.mockReturnValue({ allowed: true })
  mocks.correlationId.mockReturnValue('meal-photo-correlation')
  mocks.startAiUsage.mockResolvedValue({ status: 'started', remaining: 14, tracker: { finalize: mocks.finalize } })
  mocks.generate.mockResolvedValue(success(completeAnalysis, { inputTokens: 200, outputTokens: 50 }))
})

describe('POST /api/analyze-meal-photo AiProvider contract', () => {
  it('preserves the exact multimodal invocation, public success and usage metadata', async () => {
    const response = await POST(request({ image: IMAGE }))
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual(completeAnalysis)

    const invocation = buildMealPhotoInvocation(IMAGE_DATA)
    expect(mocks.generate).toHaveBeenCalledWith(expect.objectContaining({
      output: 'json', model: 'claude-sonnet-4-6', maxTokens: invocation.max_tokens,
      system: invocation.system, temperature: invocation.temperature,
      messages: [{ role: 'user', content: [
        { type: 'image', mediaType: 'image/jpeg', dataBase64: IMAGE_DATA },
        { type: 'text', text: (invocation.messages[0]?.content as Array<{ text?: string }>)[1]?.text },
      ] }],
      validate: expect.any(Function),
    }), expect.objectContaining({ correlationId: 'meal-photo-correlation', cancellation: expect.any(Object) }))
    expect(mocks.startAiUsage).toHaveBeenCalledWith(expect.objectContaining({
      feature: 'analyze-meal-photo', principal: { kind: 'user', id: 'session-user' },
      correlationId: 'meal-photo-correlation', logicalModel: 'anthropic-sonnet-4.6',
    }))
    expect(mocks.finalize).toHaveBeenCalledTimes(1)
    expect(mocks.finalize).toHaveBeenCalledWith({ outcome: 'succeeded', reasonCode: 'completed', providerModel: 'claude-sonnet-4-6', tokens: { inputTokens: 200, outputTokens: 50 } })
  })

  it('keeps absent provider tokens unknown rather than inventing zero', async () => {
    mocks.generate.mockResolvedValue(success(completeAnalysis))
    expect((await POST(request({ image: IMAGE }))).status).toBe(200)
    expect(mocks.finalize).toHaveBeenCalledWith(expect.objectContaining({ tokens: undefined }))
  })

  it('preserves missing-image and oversized-image responses before provider invocation', async () => {
    const missing = await POST(request({}))
    expect(missing.status).toBe(400)
    expect(await missing.json()).toEqual({ error: 'Image requise' })
    const excessive = await POST(request({ image: 'a'.repeat(6_700_001) }))
    expect(excessive.status).toBe(413)
    expect(await excessive.json()).toEqual({ error: 'Image trop volumineuse (max 5 MB)' })
    expect(mocks.generate).not.toHaveBeenCalled()
    expect(mocks.finalize).toHaveBeenCalledTimes(2)
  })

  it('preserves the legacy opaque-string behavior for an unsupported data URI', async () => {
    const opaque = 'data:image/svg+xml;base64,PHN2Zy8+'
    expect((await POST(request({ image: opaque }))).status).toBe(200)
    expect(mocks.generate.mock.calls[0]?.[0]).toMatchObject({ messages: [{ content: [{ type: 'image', mediaType: 'image/jpeg', dataBase64: opaque }, { type: 'text' }] }] })
  })

  it.each(['provider_refused', 'network_error'] as const)('maps %s to the historical safe provider error', async code => {
    mocks.generate.mockResolvedValue({ ok: false, error: { code, retryable: false }, metadata: { correlationId: 'meal-photo-correlation', requestedModel: 'claude-sonnet-4-6', actualModel: 'claude-sonnet-4-6', usage: { inputTokens: 4 } } })
    const response = await POST(request({ image: IMAGE }))
    expect(response.status).toBe(500)
    expect(await response.json()).toEqual({ error: 'Erreur IA' })
    expect(mocks.finalize).toHaveBeenCalledTimes(1)
    expect(mocks.finalize).toHaveBeenCalledWith(expect.objectContaining({ outcome: 'failed', reasonCode: 'request_failed', providerModel: 'claude-sonnet-4-6', tokens: { inputTokens: 4 } }))
  })

  it('preserves invalid-output failure without inventing an empty meal', async () => {
    mocks.generate.mockResolvedValue({ ok: false, error: { code: 'invalid_output', retryable: false }, metadata: { correlationId: 'meal-photo-correlation', requestedModel: 'claude-sonnet-4-6' } })
    const response = await POST(request({ image: IMAGE }))
    expect(response.status).toBe(500)
    expect(await response.json()).toEqual({ error: 'Reponse IA invalide' })
    expect(mocks.finalize).toHaveBeenCalledTimes(1)
  })

  it('propagates cancellation and finalizes it exactly once', async () => {
    const controller = new AbortController()
    controller.abort()
    mocks.generate.mockResolvedValue({ ok: false, error: { code: 'cancelled', retryable: false }, metadata: { correlationId: 'meal-photo-correlation', requestedModel: 'claude-sonnet-4-6' } })
    const response = await POST(request({ image: IMAGE }, controller.signal))
    expect(response.status).toBe(500)
    expect(await response.json()).toEqual({ error: 'Erreur IA' })
    expect(mocks.generate.mock.calls[0]?.[1].cancellation.aborted).toBe(true)
    expect(mocks.finalize).toHaveBeenCalledTimes(1)
    expect(mocks.finalize).toHaveBeenCalledWith(expect.objectContaining({ outcome: 'cancelled', reasonCode: 'request_cancelled' }))
  })

  it('preserves authentication, IP quota, DB quota and unavailable usage ordering', async () => {
    mocks.getUser.mockResolvedValueOnce({ data: { user: null } })
    expect((await POST(request({ image: IMAGE }))).status).toBe(401)

    mocks.checkRateLimit.mockReturnValueOnce({ allowed: false, retryAfter: 17 })
    const ipLimited = await POST(request({ image: IMAGE }))
    expect(ipLimited.status).toBe(429)
    expect(await ipLimited.json()).toEqual({ error: 'Trop de requetes. Reessayez dans 17s.' })

    mocks.startAiUsage.mockResolvedValueOnce({ status: 'denied', reason: 'hourly_exhausted', retryAfterMs: 2000 })
    const quota = await POST(request({ image: IMAGE }))
    expect(quota.status).toBe(429)
    expect(await quota.json()).toEqual({ error: 'Limite IA atteinte', limit: 15, retryAfter: 2 })

    mocks.startAiUsage.mockResolvedValueOnce({ status: 'unavailable' })
    expect((await POST(request({ image: IMAGE }))).status).toBe(503)
    expect(mocks.generate).not.toHaveBeenCalled()
  })

  it('validates minimal, complete and unknown foods while rejecting invalid structures', async () => {
    await POST(request({ image: IMAGE }))
    const validate = mocks.generate.mock.calls[0]?.[0].validate as (input: unknown) => { ok: boolean }
    expect(validate({ foods: [], total_calories: 0, confidence: 'low' }).ok).toBe(true)
    expect(validate(completeAnalysis).ok).toBe(true)
    expect(validate({ ...completeAnalysis, foods: [{ ...completeAnalysis.foods[0], name: 'Aliment inconnu' }] }).ok).toBe(true)
    expect(validate({ foods: [{ name: 'Riz' }], total_calories: 10, confidence: 'low' }).ok).toBe(false)
    expect(validate({ ...completeAnalysis, unexpected: true }).ok).toBe(false)
    expect(validate({ ...completeAnalysis, total_calories: Number.NaN }).ok).toBe(false)
    expect(validate({ ...completeAnalysis, foods: Array.from({ length: 101 }, () => completeAnalysis.foods[0]) }).ok).toBe(false)
  })

  it('does not log image data, prompts or provider errors', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    mocks.generate.mockResolvedValue({ ok: false, error: { code: 'network_error', retryable: true }, metadata: { correlationId: 'meal-photo-correlation', requestedModel: 'claude-sonnet-4-6' } })
    await POST(request({ image: IMAGE }))
    expect(log).not.toHaveBeenCalled()
    log.mockRestore()
  })
})
