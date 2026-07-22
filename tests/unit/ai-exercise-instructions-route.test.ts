import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  checkRateLimit: vi.fn(),
  startAiUsage: vi.fn(),
  finalize: vi.fn(),
  createAdminClient: vi.fn(),
  from: vi.fn(),
  generate: vi.fn(),
}))

vi.mock('server-only', () => ({}))
vi.mock('next/headers', () => ({ cookies: vi.fn(async () => ({ getAll: () => [] })) }))
vi.mock('@supabase/ssr', () => ({
  createServerClient: () => ({ auth: { getUser: mocks.getUser } }),
}))
vi.mock('@supabase/supabase-js', () => ({
  createClient: (...args: unknown[]) => mocks.createAdminClient(...args),
}))
vi.mock('@/lib/rate-limit', () => ({ checkRateLimit: mocks.checkRateLimit }))
vi.mock('@/lib/ai/usage', async importOriginal => ({
  ...(await importOriginal<typeof import('@/lib/ai/usage')>()),
  aiUsageCorrelationId: () => 'exercise-batch-correlation',
  startAiUsage: mocks.startAiUsage,
}))
vi.mock('@/lib/ai/providers/anthropic', async importOriginal => ({
  ...(await importOriginal<typeof import('@/lib/ai/providers/anthropic')>()),
  createAnthropicProvider: () => ({ generate: mocks.generate }),
}))

import { POST } from '@/app/api/generate-exercise-instructions/route'

const exercises = [
  { id: 'exercise-1', name: 'Développé couché', muscle_group: 'Pectoraux', equipment: 'Barre' },
  { id: 'exercise-2', name: 'Tractions', muscle_group: 'Dos', equipment: null },
]

function request(signal?: AbortSignal): NextRequest {
  return new Request('http://localhost/api/generate-exercise-instructions', {
    method: 'POST',
    headers: { 'x-forwarded-for': '192.0.2.1', 'x-correlation-id': 'exercise-batch-correlation' },
    signal,
  }) as NextRequest
}

function success(instructions: string, tokens?: { inputTokens: number; outputTokens: number }) {
  return {
    ok: true as const,
    output: 'json' as const,
    value: { instructions, tips: `Conseils ${instructions}` },
    metadata: {
      correlationId: 'exercise-batch-correlation',
      requestedModel: 'claude-haiku-4-5-20251001',
      actualModel: 'claude-haiku-4-5-20251001',
      stopReason: 'end_turn' as const,
      usage: tokens,
    },
  }
}

function failure(code: 'provider_refused' | 'network_error' | 'invalid_output' | 'cancelled') {
  return {
    ok: false as const,
    error: { code, retryable: code === 'network_error' },
    metadata: {
      correlationId: 'exercise-batch-correlation',
      requestedModel: 'claude-haiku-4-5-20251001',
    },
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://supabase.local'
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon-test-key'
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-test-key'
  process.env.ANTHROPIC_API_KEY = 'anthropic-test-key'
  process.env.ADMIN_EMAIL = 'admin@example.test'
  mocks.getUser.mockResolvedValue({ data: { user: { id: 'admin-user', email: 'admin@example.test' } } })
  mocks.checkRateLimit.mockReturnValue({ allowed: true })
  mocks.startAiUsage.mockResolvedValue({
    status: 'started', remaining: null,
    tracker: { correlationId: 'exercise-batch-correlation', finalize: mocks.finalize },
  })
  mocks.createAdminClient.mockReturnValue({ from: mocks.from })
  mocks.from.mockImplementation((table: string) => {
    if (table !== 'exercises_db') throw new Error(`unexpected table ${table}`)
    return {
      select: (projection: string) => ({
        is: (column: string, value: null) => ({
          limit: async (limit: number) => ({ data: exercises, projection, column, value, limit }),
        }),
      }),
      update: (payload: unknown) => ({ eq: async (column: string, id: string) => ({ error: null, payload, column, id }) }),
    }
  })
  mocks.generate
    .mockResolvedValueOnce(success('Instruction 1', { inputTokens: 10, outputTokens: 4 }))
    .mockResolvedValueOnce(success('Instruction 2', { inputTokens: 12, outputTokens: 6 }))
})

describe('POST /api/generate-exercise-instructions', () => {
  it('keeps the admin gate and rate limit before usage, admin client and provider', async () => {
    mocks.getUser.mockResolvedValueOnce({ data: { user: null } })
    expect((await POST(request())).status).toBe(401)
    expect(mocks.startAiUsage).not.toHaveBeenCalled()
    expect(mocks.createAdminClient).not.toHaveBeenCalled()

    mocks.getUser.mockResolvedValueOnce({ data: { user: { id: 'user', email: 'member@example.test' } } })
    expect((await POST(request())).status).toBe(403)
    expect(mocks.createAdminClient).not.toHaveBeenCalled()

    mocks.checkRateLimit.mockReturnValueOnce({ allowed: false })
    expect((await POST(request())).status).toBe(429)
    expect(mocks.checkRateLimit).toHaveBeenLastCalledWith('exinstr:192.0.2.1', 2, 60_000)
    expect(mocks.startAiUsage).not.toHaveBeenCalled()
    expect(mocks.generate).not.toHaveBeenCalled()
  })

  it('preserves the owner-independent admin source projection, limit and empty result', async () => {
    mocks.from.mockReturnValueOnce({
      select: (projection: string) => ({
        is: (column: string, value: null) => ({
          limit: async (limit: number) => {
            expect({ projection, column, value, limit }).toEqual({
              projection: 'id, name, muscle_group, equipment', column: 'instructions', value: null, limit: 20,
            })
            return { data: [] }
          },
        }),
      }),
    })
    const response = await POST(request())
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ done: true, count: 0 })
    expect(mocks.generate).not.toHaveBeenCalled()
    expect(mocks.finalize).toHaveBeenCalledOnce()
    expect(mocks.finalize).toHaveBeenCalledWith({ outcome: 'cancelled', reasonCode: 'nothing_to_process' })
  })

  it('runs sequentially in source order with the byte-equivalent invocation and exact writes', async () => {
    const calls: string[] = []
    const writes: Array<{ id: string; payload: unknown }> = []
    mocks.generate.mockReset()
    mocks.generate.mockImplementation(async requestInput => {
      const text = requestInput.messages[0].content[0].text as string
      const name = text.includes('Développé couché') ? 'exercise-1' : 'exercise-2'
      calls.push(`provider:${name}`)
      return success(`Instruction ${name}`, { inputTokens: 10, outputTokens: 5 })
    })
    mocks.from.mockImplementation(() => ({
      select: () => ({ is: () => ({ limit: async () => ({ data: exercises }) }) }),
      update: (payload: unknown) => ({ eq: async (_column: string, id: string) => { calls.push(`write:${id}`); writes.push({ id, payload }); return { error: null, payload } } }),
    }))

    const response = await POST(request())
    expect(await response.json()).toEqual({ done: false, processed: 2, remaining: 0 })
    expect(calls).toEqual(['provider:exercise-1', 'write:exercise-1', 'provider:exercise-2', 'write:exercise-2'])
    expect(writes).toEqual([
      { id: 'exercise-1', payload: { instructions: 'Instruction exercise-1', tips: 'Conseils Instruction exercise-1' } },
      { id: 'exercise-2', payload: { instructions: 'Instruction exercise-2', tips: 'Conseils Instruction exercise-2' } },
    ])
    expect(mocks.generate).toHaveBeenNthCalledWith(1, {
      output: 'json', model: 'claude-haiku-4-5-20251001', maxTokens: 500, system: undefined,
      temperature: undefined,
      messages: [{ role: 'user', content: [{ type: 'text', text: expect.stringContaining('"Développé couché"') }] }],
      validate: expect.any(Function),
    }, expect.objectContaining({ correlationId: 'exercise-batch-correlation' }))
    expect(mocks.startAiUsage).toHaveBeenCalledWith(expect.objectContaining({
      feature: 'generate-exercise-instructions', logicalModel: 'anthropic-haiku-4.5',
      principal: { kind: 'user', id: 'admin-user' }, correlationId: 'exercise-batch-correlation',
    }))
    expect(mocks.finalize).toHaveBeenCalledOnce()
    expect(mocks.finalize).toHaveBeenCalledWith(expect.objectContaining({
      outcome: 'succeeded', reasonCode: 'completed', providerModel: 'claude-haiku-4-5-20251001',
      tokens: { inputTokens: 20, outputTokens: 10 }, attemptCount: 2, tokenCompleteness: 'complete',
    }))
  })

  it('preserves successful writes and public ordering when one provider result fails', async () => {
    mocks.generate.mockReset()
      .mockResolvedValueOnce(success('Instruction 1', { inputTokens: 10, outputTokens: 4 }))
      .mockResolvedValueOnce(failure('provider_refused'))
    const response = await POST(request())
    expect(await response.json()).toEqual({ done: false, processed: 1, remaining: 1 })
    expect(mocks.generate).toHaveBeenCalledTimes(2)
    expect(mocks.finalize).toHaveBeenCalledWith(expect.objectContaining({
      outcome: 'succeeded', reasonCode: 'partial_completed', attemptCount: 2,
      tokens: { inputTokens: 10, outputTokens: 4 }, tokenCompleteness: 'partial',
    }))
  })

  it.each(['invalid_output', 'network_error'] as const)('does not write an item after %s and fails a wholly unsuccessful batch', async code => {
    mocks.generate.mockReset().mockResolvedValue(failure(code))
    const response = await POST(request())
    expect(await response.json()).toEqual({ done: false, processed: 0, remaining: 2 })
    expect(mocks.from).toHaveBeenCalledTimes(1)
    expect(mocks.finalize).toHaveBeenCalledOnce()
    expect(mocks.finalize).toHaveBeenCalledWith(expect.objectContaining({
      outcome: 'failed', reasonCode: code === 'invalid_output' ? 'invalid_output' : 'provider_error',
      attemptCount: 2, tokenCompleteness: 'unavailable',
    }))
  })

  it('uses the strict shared schema for empty, excessive, unknown and incorrectly typed output', async () => {
    mocks.generate.mockReset().mockImplementation(async requestInput => {
      const validate = requestInput.validate as (value: unknown) => { ok: boolean }
      expect(validate({ instructions: 'Position stable.', tips: 'Respirer.' }).ok).toBe(true)
      expect(validate({ instructions: '', tips: 'Respirer.' }).ok).toBe(false)
      expect(validate({ instructions: 'x'.repeat(10_001), tips: 'Respirer.' }).ok).toBe(false)
      expect(validate({ instructions: 'Position.', tips: 'Respirer.', unknown: true }).ok).toBe(false)
      expect(validate({ instructions: ['Position.'], tips: 4 }).ok).toBe(false)
      return failure('invalid_output')
    })
    const response = await POST(request())
    expect(await response.json()).toEqual({ done: false, processed: 0, remaining: 2 })
    expect(mocks.from).toHaveBeenCalledTimes(1)
  })

  it('stops before the next element after cancellation and finalizes once', async () => {
    mocks.generate.mockReset().mockResolvedValue(failure('cancelled'))
    const response = await POST(request())
    expect(await response.json()).toEqual({ done: false, processed: 0, remaining: 2 })
    expect(mocks.generate).toHaveBeenCalledOnce()
    expect(mocks.from).toHaveBeenCalledTimes(1)
    expect(mocks.finalize).toHaveBeenCalledOnce()
    expect(mocks.finalize).toHaveBeenCalledWith(expect.objectContaining({
      outcome: 'cancelled', reasonCode: 'request_cancelled', attemptCount: 1,
    }))
  })

  it('keeps historical SQL partial behavior without exposing SQL details', async () => {
    const secretSql = 'duplicate key value violates unique constraint secret_idx'
    mocks.from.mockImplementation(() => ({
      select: () => ({ is: () => ({ limit: async () => ({ data: exercises }) }) }),
      update: () => ({ eq: async (_column: string, id: string) => ({ error: id === 'exercise-2' ? { message: secretSql } : null }) }),
    }))
    const response = await POST(request())
    const body = await response.json()
    expect(body).toEqual({ done: false, processed: 2, remaining: 0 })
    expect(JSON.stringify(body)).not.toContain(secretSql)
    expect(mocks.finalize).toHaveBeenCalledOnce()
  })

  it('marks token totals partial when one executed call omits usage and never converts unknown to zero', async () => {
    mocks.generate.mockReset()
      .mockResolvedValueOnce(success('Instruction 1', { inputTokens: 7, outputTokens: 3 }))
      .mockResolvedValueOnce(success('Instruction 2'))
    await POST(request())
    expect(mocks.finalize).toHaveBeenCalledWith(expect.objectContaining({
      tokens: { inputTokens: 7, outputTokens: 3 }, tokenCompleteness: 'partial', attemptCount: 2,
    }))

    mocks.finalize.mockClear()
    mocks.generate.mockReset().mockResolvedValue(success('Instruction sans tokens'))
    await POST(request())
    expect(mocks.finalize).toHaveBeenCalledWith(expect.objectContaining({
      tokens: undefined, tokenCompleteness: 'unavailable', attemptCount: 2,
    }))
  })

  it('returns configuration and usage errors without creating the admin client', async () => {
    delete process.env.ANTHROPIC_API_KEY
    const missing = await POST(request())
    expect(missing.status).toBe(500)
    expect(mocks.createAdminClient).not.toHaveBeenCalled()
    expect(mocks.finalize).toHaveBeenCalledWith({ outcome: 'failed', reasonCode: 'provider_not_configured' })

    process.env.ANTHROPIC_API_KEY = 'anthropic-test-key'
    mocks.startAiUsage.mockResolvedValueOnce({ status: 'conflict' })
    expect((await POST(request())).status).toBe(409)
    mocks.startAiUsage.mockResolvedValueOnce({ status: 'unavailable' })
    expect((await POST(request())).status).toBe(503)
  })

  it('never logs provider, exercise or SQL content', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined)
    mocks.generate.mockReset().mockResolvedValue(failure('network_error'))
    await POST(request())
    expect(error).not.toHaveBeenCalled()
    expect(log).not.toHaveBeenCalled()
    error.mockRestore()
    log.mockRestore()
  })
})
