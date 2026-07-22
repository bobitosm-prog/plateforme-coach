import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  checkRateLimit: vi.fn(),
  startAiUsage: vi.fn(),
  finalize: vi.fn(),
  generate: vi.fn(),
  fetchImage: vi.fn(),
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
  aiUsageCorrelationId: () => 'body-correlation-1',
  startAiUsage: mocks.startAiUsage,
}))
vi.mock('@/lib/ai/providers/anthropic', async importOriginal => ({
  ...(await importOriginal<typeof import('@/lib/ai/providers/anthropic')>()),
  createAnthropicProvider: () => ({ generate: mocks.generate }),
}))

import { POST } from '@/app/api/analyze-body/route'

const bodyAnalysis = {
  body_fat_estimate: 18,
  lean_mass_estimate: 61.5,
  strengths: ['Posture stable', 'Dos développé'],
  improvements: ['Mobilité', 'Équilibre'],
  symmetry_score: 82,
  summary: 'Analyse visuelle synthétique.',
}

function request(body: unknown, signal?: AbortSignal): NextRequest {
  return new Request('http://localhost/api/analyze-body', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-forwarded-for': '192.0.2.10', 'x-correlation-id': 'body-correlation-1' },
    body: JSON.stringify(body),
    signal,
  }) as NextRequest
}

const validRequest = {
  photoFrontUrl: 'https://storage.test/front',
  photoBackUrl: 'https://storage.test/back',
  photoSideUrl: 'https://storage.test/side',
  weight: 70,
  height: 175,
}

function providerSuccess(tokens?: { inputTokens: number; outputTokens: number }) {
  return {
    ok: true as const,
    output: 'tool' as const,
    value: bodyAnalysis,
    metadata: {
      correlationId: 'body-correlation-1', requestedModel: 'claude-opus-4-8', actualModel: 'claude-opus-4-8',
      stopReason: 'tool_use' as const, usage: tokens,
    },
  }
}

function providerFailure(code: 'provider_refused' | 'quota_exceeded' | 'network_error' | 'invalid_output' | 'cancelled') {
  return {
    ok: false as const,
    error: { code, retryable: code === 'quota_exceeded' || code === 'network_error' },
    metadata: { correlationId: 'body-correlation-1', requestedModel: 'claude-opus-4-8' },
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://supabase.local'
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon-test-key'
  process.env.ANTHROPIC_API_KEY = 'anthropic-test-key'
  mocks.getUser.mockResolvedValue({ data: { user: { id: 'body-user' } } })
  mocks.checkRateLimit.mockReturnValue({ allowed: true })
  mocks.startAiUsage.mockResolvedValue({
    status: 'started', remaining: 4,
    tracker: { correlationId: 'body-correlation-1', finalize: mocks.finalize },
  })
  mocks.generate.mockResolvedValue(providerSuccess({ inputTokens: 120, outputTokens: 35 }))
  mocks.fetchImage.mockImplementation(async (input: string | URL | Request) => {
    const url = String(input)
    const marker = url.endsWith('/front') ? 'front-image' : url.endsWith('/back') ? 'back-image' : 'side-image'
    const mediaType = url.endsWith('/front') ? 'image/jpeg' : url.endsWith('/back') ? 'image/png' : 'image/webp'
    return new Response(new TextEncoder().encode(marker), { status: 200, headers: { 'content-type': `${mediaType}; charset=binary` } })
  })
  vi.stubGlobal('fetch', mocks.fetchImage)
})

afterEach(() => vi.unstubAllGlobals())

describe('POST /api/analyze-body', () => {
  it('preserves authentication and the 5/min IP limit before usage and provider', async () => {
    mocks.getUser.mockResolvedValueOnce({ data: { user: null } })
    expect((await POST(request(validRequest))).status).toBe(401)
    expect(mocks.startAiUsage).not.toHaveBeenCalled()

    mocks.checkRateLimit.mockReturnValueOnce({ allowed: false })
    expect((await POST(request(validRequest))).status).toBe(429)
    expect(mocks.checkRateLimit).toHaveBeenLastCalledWith('body:192.0.2.10', 5, 60_000)
    expect(mocks.startAiUsage).not.toHaveBeenCalled()
    expect(mocks.generate).not.toHaveBeenCalled()
  })

  it('preserves hourly and heavy quota failures with one fail-closed reservation', async () => {
    mocks.startAiUsage.mockResolvedValueOnce({ status: 'denied', reason: 'hourly_exhausted', retryAfterMs: 4_000 })
    expect((await POST(request(validRequest))).status).toBe(429)
    expect(mocks.generate).not.toHaveBeenCalled()

    mocks.startAiUsage.mockResolvedValueOnce({ status: 'denied', reason: 'monthly_exhausted', retryAfterMs: 8_000 })
    expect((await POST(request(validRequest))).status).toBe(429)
    expect(mocks.startAiUsage).toHaveBeenCalledTimes(2)

    mocks.startAiUsage.mockResolvedValueOnce({ status: 'unavailable' })
    expect((await POST(request(validRequest))).status).toBe(503)
    mocks.startAiUsage.mockResolvedValueOnce({ status: 'conflict' })
    expect((await POST(request(validRequest))).status).toBe(409)
  })

  it('preserves missing-photo and API-key errors without image or provider calls', async () => {
    const missing = await POST(request({ ...validRequest, photoSideUrl: '' }))
    expect(missing.status).toBe(400)
    expect(await missing.json()).toEqual({ error: '3 photos requises (face, dos, profil)' })
    expect(mocks.fetchImage).not.toHaveBeenCalled()

    delete process.env.ANTHROPIC_API_KEY
    const noKey = await POST(request(validRequest))
    expect(noKey.status).toBe(500)
    expect(await noKey.json()).toEqual({ error: 'API key manquante' })
    expect(mocks.fetchImage).not.toHaveBeenCalled()
  })

  it('keeps the exact image order, media types, prompt, tool and forced tool choice', async () => {
    const response = await POST(request(validRequest))
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual(bodyAnalysis)
    expect(mocks.fetchImage.mock.calls.map(call => String(call[0]))).toEqual([
      validRequest.photoFrontUrl, validRequest.photoBackUrl, validRequest.photoSideUrl,
    ])
    expect(mocks.generate).toHaveBeenCalledOnce()
    const [providerRequest, context] = mocks.generate.mock.calls[0]
    expect(providerRequest).toMatchObject({
      output: 'tool', model: 'claude-opus-4-8', maxTokens: 1024, temperature: undefined,
      forcedTool: 'body_analysis_output',
      tools: [expect.objectContaining({ name: 'body_analysis_output', inputSchema: expect.objectContaining({
        required: ['body_fat_estimate', 'lean_mass_estimate', 'strengths', 'improvements', 'symmetry_score', 'summary'],
      }) })],
    })
    expect(providerRequest.messages[0].content.map((block: { type: string }) => block.type)).toEqual(['image', 'image', 'image', 'text'])
    expect(providerRequest.messages[0].content.slice(0, 3).map((block: { mediaType: string }) => block.mediaType)).toEqual(['image/jpeg', 'image/png', 'image/webp'])
    expect(providerRequest.messages[0].content.slice(0, 3).map((block: { dataBase64: string }) => Buffer.from(block.dataBase64, 'base64').toString())).toEqual(['front-image', 'back-image', 'side-image'])
    expect(providerRequest.messages[0].content[3].text).toContain('poids 70 kg, taille 175 cm')
    expect(context).toMatchObject({ correlationId: 'body-correlation-1', cancellation: expect.any(Object) })
    expect(mocks.startAiUsage).toHaveBeenCalledOnce()
    expect(mocks.startAiUsage).toHaveBeenCalledWith(expect.objectContaining({
      feature: 'analyze-body', logicalModel: 'anthropic-opus-4.8', principal: { kind: 'user', id: 'body-user' }, correlationId: 'body-correlation-1',
    }))
    expect(mocks.finalize).toHaveBeenCalledOnce()
    expect(mocks.finalize).toHaveBeenCalledWith(expect.objectContaining({
      outcome: 'succeeded', reasonCode: 'completed', providerModel: 'claude-opus-4-8', tokens: { inputTokens: 120, outputTokens: 35 },
    }))
  })

  it('uses the strict body schema and accepts exactly one legacy input wrapper through the common adapter', async () => {
    mocks.generate.mockImplementationOnce(async providerRequest => {
      const validate = providerRequest.validate as (value: unknown) => { ok: boolean }
      expect(validate(bodyAnalysis).ok).toBe(true)
      expect(validate({ input: bodyAnalysis }).ok).toBe(false)
      expect(validate({ ...bodyAnalysis, body_fat_estimate: -1 }).ok).toBe(false)
      expect(validate({ ...bodyAnalysis, strengths: [] }).ok).toBe(false)
      expect(validate({ ...bodyAnalysis, private: 'hidden' }).ok).toBe(false)
      return providerSuccess()
    })
    expect((await POST(request(validRequest))).status).toBe(200)
  })

  it.each(['provider_refused', 'network_error', 'invalid_output'] as const)('does not return or persist analysis after %s', async code => {
    mocks.generate.mockResolvedValue(providerFailure(code))
    const response = await POST(request(validRequest))
    expect(response.status).toBe(500)
    expect(await response.json()).toEqual({ error: code === 'invalid_output' ? 'Format IA invalide' : 'Erreur IA' })
    expect(mocks.generate).toHaveBeenCalledOnce()
    expect(mocks.finalize).toHaveBeenCalledOnce()
    expect(mocks.finalize).toHaveBeenCalledWith(expect.objectContaining({ outcome: 'failed' }))
  })

  it('preserves provider quota as HTTP 429 without exposing provider content', async () => {
    mocks.generate.mockResolvedValue(providerFailure('quota_exceeded'))
    const response = await POST(request(validRequest))
    expect(response.status).toBe(429)
    expect(await response.json()).toEqual({ error: 'Erreur IA (429)' })
    expect(mocks.finalize).toHaveBeenCalledOnce()
  })

  it('propagates cancellation, returns no analysis and finalizes once', async () => {
    mocks.generate.mockResolvedValue(providerFailure('cancelled'))
    const response = await POST(request(validRequest))
    expect(response.status).toBe(500)
    expect(await response.json()).toEqual({ error: 'Erreur interne' })
    expect(mocks.finalize).toHaveBeenCalledOnce()
    expect(mocks.finalize).toHaveBeenCalledWith(expect.objectContaining({ outcome: 'cancelled', reasonCode: 'request_cancelled' }))
  })

  it('keeps unknown tokens unavailable instead of recording zero', async () => {
    mocks.generate.mockResolvedValue(providerSuccess())
    await POST(request(validRequest))
    expect(mocks.finalize).toHaveBeenCalledWith(expect.objectContaining({ tokens: undefined }))
  })

  it('fails safely on missing, invalid or oversized downloaded images', async () => {
    mocks.fetchImage.mockResolvedValueOnce(new Response('', { status: 404 }))
    let response = await POST(request(validRequest))
    expect(response.status).toBe(500)
    expect(await response.json()).toEqual({ error: 'Erreur interne' })
    expect(mocks.generate).not.toHaveBeenCalled()

    mocks.fetchImage.mockReset().mockResolvedValue(new Response('not-an-image', { status: 200, headers: { 'content-type': 'text/plain' } }))
    response = await POST(request(validRequest))
    expect(response.status).toBe(500)
    expect(await response.json()).toEqual({ error: 'Erreur interne' })
    expect(mocks.generate).not.toHaveBeenCalled()

    mocks.fetchImage.mockReset()
      .mockResolvedValueOnce(new Response(new Uint8Array(10_500_001), { status: 200, headers: { 'content-type': 'image/jpeg' } }))
      .mockResolvedValue(new Response('small', { status: 200, headers: { 'content-type': 'image/jpeg' } }))
    response = await POST(request(validRequest))
    expect(response.status).toBe(500)
    expect(await response.json()).toEqual({ error: 'Erreur interne' })
    expect(mocks.generate).not.toHaveBeenCalled()
  })

  it('never logs URLs, measurements, image data, provider output or failures', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined)
    mocks.generate.mockResolvedValue(providerFailure('network_error'))
    const response = await POST(request(validRequest))
    expect(JSON.stringify(await response.json())).not.toMatch(/storage\.test|70|175|Posture stable/)
    expect(error).not.toHaveBeenCalled()
    expect(log).not.toHaveBeenCalled()
    error.mockRestore()
    log.mockRestore()
  })
})
