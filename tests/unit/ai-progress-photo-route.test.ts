import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(), checkRateLimit: vi.fn(), startAiUsage: vi.fn(), finalize: vi.fn(),
  generate: vi.fn(), fetchImage: vi.fn(),
}))

vi.mock('server-only', () => ({}))
vi.mock('next/headers', () => ({ cookies: vi.fn(async () => ({ getAll: () => [] })) }))
vi.mock('@supabase/ssr', () => ({ createServerClient: () => ({ auth: { getUser: mocks.getUser } }) }))
vi.mock('@/lib/rate-limit', () => ({
  checkRateLimit: mocks.checkRateLimit,
  aiRateLimitResponse: (limit: number, retryAfter: number) => Response.json({ error: `Limite IA atteinte (${limit})`, retryAfter }, { status: 429 }),
  aiQuotaResponse: (limit: number, retryAfter: number) => Response.json({ error: `Quota IA atteint (${limit})`, retryAfter }, { status: 429 }),
}))
vi.mock('@/lib/ai/usage', async importOriginal => ({
  ...(await importOriginal<typeof import('@/lib/ai/usage')>()),
  aiUsageCorrelationId: () => 'progress-photo-correlation',
  startAiUsage: mocks.startAiUsage,
}))
vi.mock('@/lib/ai/providers/anthropic', async importOriginal => ({
  ...(await importOriginal<typeof import('@/lib/ai/providers/anthropic')>()),
  createAnthropicProvider: () => ({ generate: mocks.generate }),
}))

import { POST } from '@/app/api/analyze-progress-photo/route'

const profileData = { full_name: 'Personne synthétique', current_weight: 70, height: 175, objective: 'cut' }
const assessmentBody = {
  mode: 'assessment', profileData,
  photoFrontUrl: 'https://storage.test/front', photoBackUrl: 'https://storage.test/back', photoSideUrl: 'https://storage.test/side',
}
const simpleBody = { photoUrl: 'https://storage.test/main', profileData }
const comparisonBody = { ...simpleBody, previousPhotoUrl: 'https://storage.test/previous' }

function request(body: unknown, signal?: AbortSignal): NextRequest {
  return new Request('http://localhost/api/analyze-progress-photo', {
    method: 'POST', signal,
    headers: { 'content-type': 'application/json', 'x-forwarded-for': '192.0.2.20', 'x-correlation-id': 'progress-photo-correlation' },
    body: JSON.stringify(body),
  }) as NextRequest
}

function success(value = 'Analyse synthétique valide.', tokens?: { inputTokens: number; outputTokens: number }) {
  return {
    ok: true as const, output: 'text' as const, value,
    metadata: {
      correlationId: 'progress-photo-correlation', requestedModel: 'claude-opus-4-8', actualModel: 'claude-opus-4-8',
      stopReason: 'end_turn' as const, usage: tokens,
    },
  }
}

function failure(code: 'provider_refused' | 'quota_exceeded' | 'network_error' | 'invalid_output' | 'cancelled' | 'unexpected_error') {
  return {
    ok: false as const, error: { code, retryable: code === 'quota_exceeded' || code === 'network_error' },
    metadata: { correlationId: 'progress-photo-correlation', requestedModel: 'claude-opus-4-8' },
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://supabase.local'
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon-test-key'
  process.env.ANTHROPIC_API_KEY = 'anthropic-test-key'
  mocks.getUser.mockResolvedValue({ data: { user: { id: 'progress-user' } } })
  mocks.checkRateLimit.mockReturnValue({ allowed: true })
  mocks.startAiUsage.mockResolvedValue({ status: 'started', remaining: 9, tracker: { correlationId: 'progress-photo-correlation', finalize: mocks.finalize } })
  mocks.generate.mockResolvedValue(success('Analyse synthétique valide.', { inputTokens: 90, outputTokens: 30 }))
  mocks.fetchImage.mockImplementation(async (input: string | URL | Request) => {
    const url = String(input)
    const marker = url.split('/').pop() ?? 'image'
    const mediaType = marker === 'back' ? 'image/png' : marker === 'side' ? 'image/webp' : 'image/jpeg'
    return new Response(new TextEncoder().encode(`${marker}-bytes`), { status: 200, headers: { 'content-type': `${mediaType}; charset=binary` } })
  })
  vi.stubGlobal('fetch', mocks.fetchImage)
})

afterEach(() => vi.unstubAllGlobals())

describe('POST /api/analyze-progress-photo', () => {
  it('preserves authentication and the real 3/min IP limit before usage', async () => {
    mocks.getUser.mockResolvedValueOnce({ data: { user: null } })
    expect((await POST(request(simpleBody))).status).toBe(401)
    expect(mocks.startAiUsage).not.toHaveBeenCalled()

    mocks.checkRateLimit.mockReturnValueOnce({ allowed: false })
    expect((await POST(request(simpleBody))).status).toBe(429)
    expect(mocks.checkRateLimit).toHaveBeenLastCalledWith('photo:192.0.2.20', 3, 60_000)
    expect(mocks.startAiUsage).not.toHaveBeenCalled()
    expect(mocks.generate).not.toHaveBeenCalled()
  })

  it('preserves 10/hour, 6/30-day and fail-closed usage decisions', async () => {
    mocks.startAiUsage.mockResolvedValueOnce({ status: 'denied', reason: 'hourly_exhausted', retryAfterMs: 2_000 })
    expect((await POST(request(simpleBody))).status).toBe(429)
    mocks.startAiUsage.mockResolvedValueOnce({ status: 'denied', reason: 'monthly_exhausted', retryAfterMs: 4_000 })
    expect((await POST(request(simpleBody))).status).toBe(429)
    mocks.startAiUsage.mockResolvedValueOnce({ status: 'unavailable' })
    expect((await POST(request(simpleBody))).status).toBe(503)
    mocks.startAiUsage.mockResolvedValueOnce({ status: 'conflict' })
    expect((await POST(request(simpleBody))).status).toBe(409)
    expect(mocks.generate).not.toHaveBeenCalled()
  })

  it('preserves assessment image order, prompt, model and parameters', async () => {
    const response = await POST(request(assessmentBody))
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ analysis: 'Analyse synthétique valide.' })
    expect(mocks.fetchImage.mock.calls.map(call => String(call[0]))).toEqual([
      assessmentBody.photoFrontUrl, assessmentBody.photoBackUrl, assessmentBody.photoSideUrl,
    ])
    const [providerRequest, context] = mocks.generate.mock.calls[0]
    expect(providerRequest).toMatchObject({ output: 'text', model: 'claude-opus-4-8', maxTokens: 2048, temperature: undefined })
    expect(providerRequest.messages[0].content.map((block: { type: string }) => block.type)).toEqual(['image', 'image', 'image', 'text'])
    expect(providerRequest.messages[0].content.slice(0, 3).map((block: { dataBase64: string }) => Buffer.from(block.dataBase64, 'base64').toString())).toEqual(['front-bytes', 'back-bytes', 'side-bytes'])
    expect(providerRequest.messages[0].content[3].text).toContain('BILAN CORPOREL COMPLET')
    expect(context).toMatchObject({ correlationId: 'progress-photo-correlation', cancellation: expect.any(Object) })
  })

  it('preserves the simple branch with one image then text', async () => {
    const response = await POST(request(simpleBody))
    expect(await response.json()).toEqual({ analysis: 'Analyse synthétique valide.' })
    const providerRequest = mocks.generate.mock.calls[0][0]
    expect(providerRequest).toMatchObject({ output: 'text', model: 'claude-opus-4-8', maxTokens: 1024, temperature: undefined })
    expect(providerRequest.messages[0].content.map((block: { type: string }) => block.type)).toEqual(['image', 'text'])
    expect(providerRequest.messages[0].content[1].text).toContain('Analyse cette photo de progression')
  })

  it('preserves comparison order as previous, current, text', async () => {
    const response = await POST(request(comparisonBody))
    expect(await response.json()).toEqual({ analysis: 'Analyse synthétique valide.' })
    const providerRequest = mocks.generate.mock.calls[0][0]
    expect(providerRequest.messages[0].content.map((block: { type: string }) => block.type)).toEqual(['image', 'image', 'text'])
    expect(providerRequest.messages[0].content.slice(0, 2).map((block: { dataBase64: string }) => Buffer.from(block.dataBase64, 'base64').toString())).toEqual(['previous-bytes', 'main-bytes'])
    expect(providerRequest.messages[0].content[2].text).toContain('Compare ces deux photos de progression (avant → après)')
  })

  it('preserves the legacy previous-image download fallback to the explicit single branch', async () => {
    mocks.fetchImage.mockImplementation(async input => {
      if (String(input).endsWith('/previous')) return new Response('', { status: 404 })
      return new Response('main-bytes', { status: 200, headers: { 'content-type': 'image/jpeg' } })
    })
    const response = await POST(request(comparisonBody))
    expect(response.status).toBe(200)
    const providerRequest = mocks.generate.mock.calls[0][0]
    expect(providerRequest.messages[0].content.map((block: { type: string }) => block.type)).toEqual(['image', 'text'])
    expect(providerRequest.messages[0].content[1].text).toContain('Analyse cette photo de progression')
  })

  it('preserves missing-photo and API-key errors without provider calls', async () => {
    let response = await POST(request({ profileData }))
    expect(response.status).toBe(400)
    expect(await response.json()).toEqual({ error: 'Photo URL manquante' })
    delete process.env.ANTHROPIC_API_KEY
    response = await POST(request(simpleBody))
    expect(response.status).toBe(500)
    expect(await response.json()).toEqual({ error: 'API key manquante' })
    expect(mocks.generate).not.toHaveBeenCalled()
  })

  it('fails safely on absent, invalid, empty or excessive image content', async () => {
    mocks.fetchImage.mockResolvedValueOnce(new Response('', { status: 404 }))
    let response = await POST(request(simpleBody))
    expect(response.status).toBe(500)
    expect(await response.json()).toEqual({ error: 'Erreur interne' })
    expect(mocks.generate).not.toHaveBeenCalled()

    mocks.fetchImage.mockReset().mockResolvedValue(new Response('', { status: 200, headers: { 'content-type': 'image/jpeg' } }))
    response = await POST(request(simpleBody))
    expect(response.status).toBe(500)

    mocks.fetchImage.mockReset().mockResolvedValue(new Response('not-image', { status: 200, headers: { 'content-type': 'text/plain' } }))
    response = await POST(request(simpleBody))
    expect(response.status).toBe(500)

    mocks.fetchImage.mockReset().mockResolvedValue(new Response(new Uint8Array(10_500_001), { status: 200, headers: { 'content-type': 'image/jpeg' } }))
    response = await POST(request(simpleBody))
    expect(response.status).toBe(500)
    expect(mocks.generate).not.toHaveBeenCalled()
  })

  it.each(['provider_refused', 'network_error', 'invalid_output', 'unexpected_error'] as const)('never returns synthetic analysis after %s', async code => {
    mocks.generate.mockResolvedValue(failure(code))
    const response = await POST(request(simpleBody))
    expect(response.status).toBe(500)
    const body = await response.json()
    expect(body).toEqual({ error: code === 'invalid_output' ? 'Format IA invalide' : 'Erreur IA' })
    expect(body).not.toHaveProperty('analysis')
    expect(JSON.stringify(body)).not.toMatch(/Analyse indisponible|Impossible de générer/)
    expect(mocks.finalize).toHaveBeenCalledOnce()
    expect(mocks.finalize).toHaveBeenCalledWith(expect.objectContaining({ outcome: 'failed' }))
  })

  it('never returns synthetic analysis after cancellation', async () => {
    mocks.generate.mockResolvedValue(failure('cancelled'))
    const response = await POST(request(assessmentBody))
    expect(response.status).toBe(500)
    expect(await response.json()).toEqual({ error: 'Erreur interne' })
    expect(mocks.finalize).toHaveBeenCalledOnce()
    expect(mocks.finalize).toHaveBeenCalledWith(expect.objectContaining({ outcome: 'cancelled', reasonCode: 'request_cancelled' }))
  })

  it.each(['', '   ', 'x'.repeat(100_001)])('rejects empty, blank or excessive successful text without fallback', async value => {
    mocks.generate.mockResolvedValue(success(value))
    const response = await POST(request(simpleBody))
    expect(response.status).toBe(500)
    expect(await response.json()).toEqual({ error: 'Format IA invalide' })
    expect(mocks.finalize).toHaveBeenCalledWith(expect.objectContaining({ outcome: 'failed', reasonCode: 'invalid_output' }))
  })

  it('propagates model, known tokens and unknown token absence with one finalization', async () => {
    await POST(request(simpleBody))
    expect(mocks.startAiUsage).toHaveBeenCalledOnce()
    expect(mocks.startAiUsage).toHaveBeenCalledWith(expect.objectContaining({
      feature: 'analyze-progress-photo', logicalModel: 'anthropic-opus-4.8', principal: { kind: 'user', id: 'progress-user' }, correlationId: 'progress-photo-correlation',
    }))
    expect(mocks.finalize).toHaveBeenCalledOnce()
    expect(mocks.finalize).toHaveBeenCalledWith(expect.objectContaining({
      outcome: 'succeeded', reasonCode: 'completed', providerModel: 'claude-opus-4-8', tokens: { inputTokens: 90, outputTokens: 30 },
    }))
    mocks.finalize.mockClear()
    mocks.generate.mockResolvedValue(success('Sans tokens'))
    await POST(request(simpleBody))
    expect(mocks.finalize).toHaveBeenCalledWith(expect.objectContaining({ tokens: undefined }))
  })

  it('keeps provider quota as HTTP 429 and logs no sensitive content', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined)
    mocks.generate.mockResolvedValue(failure('quota_exceeded'))
    const response = await POST(request(simpleBody))
    expect(response.status).toBe(429)
    expect(await response.json()).toEqual({ error: 'Erreur IA (429)' })
    expect(error).not.toHaveBeenCalled()
    expect(log).not.toHaveBeenCalled()
    error.mockRestore()
    log.mockRestore()
  })
})
