import { describe, expect, it, vi } from 'vitest'

import { aiUsageCorrelationId, createSupabaseAiUsageRepository, getAiQuotaPolicy, startAiUsage } from '@/lib/ai/usage'
import type { DatabaseClient } from '@/lib/supabase/types'

function clientWithRpc(rpc: ReturnType<typeof vi.fn>): DatabaseClient {
  return { rpc } as unknown as DatabaseClient
}

describe('Supabase AI usage adapter', () => {
  it('keeps a valid inbound correlation and replaces unsafe content', () => {
    expect(aiUsageCorrelationId({ headers: { get: name => name === 'x-correlation-id' ? 'request.safe-1' : null } })).toBe('request.safe-1')
    expect(aiUsageCorrelationId({ headers: { get: name => name === 'x-correlation-id' ? 'unsafe content' : null } })).toMatch(/^[0-9a-f-]{36}$/)
  })
  it('uses the authenticated RPC without accepting a browser user id', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: { status: 'allowed', reservationId: '71000000-0000-4000-8000-000000000099', remaining: 19 }, error: null })
    const repository = createSupabaseAiUsageRepository(clientWithRpc(rpc))
    await expect(repository.reserve({
      principal: { kind: 'user', id: '71000000-0000-4000-8000-000000000001' },
      policy: getAiQuotaPolicy('chat-ai'), correlationId: 'request-1', logicalModel: 'claude-sonnet-4-6', now: 0,
    })).resolves.toEqual({ status: 'reserved', reservationId: '71000000-0000-4000-8000-000000000099', remaining: 19 })
    expect(rpc).toHaveBeenCalledWith('reserve_ai_usage', {
      p_feature: 'chat-ai', p_correlation_id: 'request-1', p_logical_model: 'claude-sonnet-4-6',
    })
  })

  it('uses the server-only RPC with an explicit technical principal and subject', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: { status: 'allowed', reservationId: '71000000-0000-4000-8000-000000000099' }, error: null })
    const repository = createSupabaseAiUsageRepository(clientWithRpc(rpc))
    await repository.reserve({
      principal: { kind: 'server', id: 'cron.training-regen', subjectUserId: '71000000-0000-4000-8000-000000000001' },
      policy: getAiQuotaPolicy('training-regen'), correlationId: 'request-1', logicalModel: 'claude-opus-4-8', now: 0,
    })
    expect(rpc).toHaveBeenCalledWith('reserve_ai_usage_server', expect.objectContaining({
      p_user_id: '71000000-0000-4000-8000-000000000001', p_principal_id: 'cron.training-regen',
    }))
  })

  it('expurgates database errors and preserves zero token values', async () => {
    const failed = createSupabaseAiUsageRepository(clientWithRpc(vi.fn().mockResolvedValue({ data: null, error: { message: 'sensitive sql' } })))
    await expect(failed.reserve({ principal: { kind: 'user', id: 'user-1' }, policy: getAiQuotaPolicy('chat-ai'), correlationId: 'request-1', now: 0 })).resolves.toEqual({ status: 'failure' })

    const rpc = vi.fn().mockResolvedValue({ data: { status: 'finalized' }, error: null })
    const repository = createSupabaseAiUsageRepository(clientWithRpc(rpc))
    await expect(repository.finalize({
      reservationId: '71000000-0000-4000-8000-000000000099', correlationId: 'request-1',
      feature: 'chat-ai', policyId: 'ai.chat-ai.v1', principal: { kind: 'user', id: 'user-1' },
      outcome: 'succeeded', reasonCode: 'completed', requestedModel: 'claude-sonnet-4-6',
      tokens: { inputTokens: 0, outputTokens: 12 }, estimatedCostMicros: BigInt(42), costStatus: 'complete', durationMs: 10, attemptCount: 1,
    })).resolves.toEqual({ status: 'finalized' })
    expect(rpc).toHaveBeenCalledWith('finalize_ai_usage', expect.objectContaining({ p_input_tokens: 0, p_output_tokens: 12, p_estimated_cost_micros: 42 }))
  })

  it('reserves then finalizes one runtime operation with deterministic metadata', async () => {
    const rpc = vi.fn()
      .mockResolvedValueOnce({ data: { status: 'allowed', reservationId: '71000000-0000-4000-8000-000000000099', remaining: 4 }, error: null })
      .mockResolvedValueOnce({ data: { status: 'finalized' }, error: null })
    let now = 1_000
    const started = await startAiUsage({
      client: clientWithRpc(rpc), feature: 'generate-custom-program',
      principal: { kind: 'user', id: 'user-1' }, correlationId: 'request-1',
      logicalModel: 'claude-opus-4-8', clock: { now: () => now },
    })
    expect(started).toMatchObject({ status: 'started', remaining: 4 })
    if (started.status !== 'started') throw new Error('tracker expected')
    now = 1_125
    await started.tracker.finalize({ outcome: 'failed', reasonCode: 'provider_error', attemptCount: 1 })
    expect(rpc).toHaveBeenLastCalledWith('finalize_ai_usage', expect.objectContaining({
      p_feature: 'generate-custom-program', p_policy_id: 'ai.generate-custom-program.v1',
      p_status: 'failed', p_duration_ms: 125,
    }))
  })

  it('preserves availability for unlimited legacy flows while governed quotas fail closed', async () => {
    const client = clientWithRpc(vi.fn().mockResolvedValue({ data: null, error: { message: 'private database error' } }))
    await expect(startAiUsage({ client, feature: 'generate-recipe', principal: { kind: 'user', id: 'user-1' }, correlationId: 'request-free', logicalModel: 'claude-haiku-4-5-20251001' })).resolves.toMatchObject({ status: 'started' })
    await expect(startAiUsage({ client, feature: 'chat-ai', principal: { kind: 'user', id: 'user-1' }, correlationId: 'request-quota', logicalModel: 'claude-sonnet-4-6' })).resolves.toEqual({ status: 'unavailable' })
  })
})
