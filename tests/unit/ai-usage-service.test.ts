import { describe, expect, it } from 'vitest'

import { createAiUsageEvent, createAiUsageService, estimateRecordedAiCost, evaluateAiQuota, getAiQuotaPolicy } from '@/lib/ai/usage'
import type { AiUsageFinalization, AiUsageRepositoryPort } from '@/lib/ai/usage'

const NOW = Date.parse('2026-07-20T12:00:00.000Z')
const clock = { now: () => NOW }

function createRepository(limit = 20): AiUsageRepositoryPort & { reservations: Map<string, string>; finalized: Set<string> } {
  const reservations = new Map<string, string>()
  const finalized = new Set<string>()
  return {
    reservations,
    finalized,
    async inspect() { return { ok: true, hourlyCount: reservations.size, monthlyCount: 0 } },
    async reserve(input) {
      if (reservations.has(input.correlationId)) return { status: 'reserved', reservationId: reservations.get(input.correlationId)!, remaining: limit - reservations.size }
      if (reservations.size >= limit) return { status: 'denied', reason: 'hourly_exhausted', retryAfterMs: 1_000 }
      const id = `reservation:${reservations.size + 1}`
      reservations.set(input.correlationId, id)
      return { status: 'reserved', reservationId: id, remaining: limit - reservations.size }
    },
    async finalize(input) {
      if (![...reservations.values()].includes(input.reservationId)) return { status: 'not_found' }
      if (finalized.has(input.reservationId)) return { status: 'already_finalized' }
      finalized.add(input.reservationId)
      return { status: 'finalized' }
    },
  }
}

describe('AI usage policies and service', () => {
  it('preserves the exact existing hourly and heavy policies', () => {
    expect(getAiQuotaPolicy('chat-ai')).toMatchObject({ tracking: 'quota', hourly: { limit: 20, windowMs: 3_600_000 } })
    expect(getAiQuotaPolicy('generate-custom-program')).toMatchObject({ hourly: { limit: 5 }, monthlyHeavy: { limit: 6, windowMs: 2_592_000_000 } })
    expect(getAiQuotaPolicy('weekly-diagnostic')).toMatchObject({ tracking: 'logged' })
    expect(getAiQuotaPolicy('weekly-diagnostic')).not.toHaveProperty('hourly')
    expect(getAiQuotaPolicy('generate-recipe')).toMatchObject({ tracking: 'untracked' })
  })

  it('evaluates available, exhausted and rolling-window quota deterministically', () => {
    const policy = getAiQuotaPolicy('analyze-body')
    expect(evaluateAiQuota({ policy, hourlyCount: 4, monthlyCount: 5, now: NOW })).toMatchObject({ status: 'allowed', remaining: 1 })
    expect(evaluateAiQuota({ policy, hourlyCount: 5, monthlyCount: 0, now: NOW, oldestHourlyAt: NOW - 1_000 })).toMatchObject({ status: 'denied', reason: 'hourly_exhausted', retryAfterMs: 3_599_000 })
    expect(evaluateAiQuota({ policy, hourlyCount: 0, monthlyCount: 6, now: NOW, oldestMonthlyAt: NOW - 10_000 })).toMatchObject({ status: 'denied', reason: 'monthly_exhausted', retryAfterMs: 2_591_990_000 })
    expect(evaluateAiQuota({ policy, hourlyCount: Number.NaN, monthlyCount: 0, now: NOW })).toEqual({ status: 'failure', reason: 'invalid_input' })
  })

  it('allows only one of two concurrent reservations at the boundary', async () => {
    const repository = createRepository(1)
    const service = createAiUsageService({ repository, clock })
    const results = await Promise.all([
      service.reserveAiUsage({ feature: 'chat-ai', principal: { kind: 'user', id: 'user-1' }, correlationId: 'request-1' }),
      service.reserveAiUsage({ feature: 'chat-ai', principal: { kind: 'user', id: 'user-1' }, correlationId: 'request-2' }),
    ])
    expect(results.map(result => result.status).sort()).toEqual(['allowed', 'denied'])
  })

  it('replays identical reservations idempotently and rejects double finalization', async () => {
    const repository = createRepository()
    const service = createAiUsageService({ repository, clock })
    const first = await service.reserveAiUsage({ feature: 'chat-ai', principal: { kind: 'user', id: 'user-1' }, correlationId: 'request-1' })
    expect((await service.reserveAiUsage({ feature: 'chat-ai', principal: { kind: 'user', id: 'user-1' }, correlationId: 'request-1' })).status).toBe('allowed')
    if (first.status !== 'allowed') throw new Error('reservation expected')
    const finalization: AiUsageFinalization = { reservationId: first.reservation.id, correlationId: 'request-1', feature: 'chat-ai', policyId: 'ai.chat-ai.v1', principal: { kind: 'user', id: 'user-1' }, outcome: 'succeeded', reasonCode: 'completed', requestedModel: 'anthropic-haiku-4.5', durationMs: 100, attemptCount: 1 }
    expect(await service.finalizeAiUsage(finalization)).toEqual({ status: 'finalized' })
    expect(await service.finalizeAiUsage(finalization)).toEqual({ status: 'conflict', reason: 'already_finalized' })
  })

  it('fails closed when a governed quota store is unavailable', async () => {
    const repository = createRepository()
    repository.reserve = async () => ({ status: 'failure' })
    const service = createAiUsageService({ repository, clock })
    expect(await service.reserveAiUsage({ feature: 'chat-ai', principal: { kind: 'user', id: 'user-1' }, correlationId: 'request-1' })).toEqual({ status: 'unavailable', reason: 'quota_store_unavailable' })
  })

  it('logs untracked features without imposing a database quota', async () => {
    const repository = createRepository()
    const service = createAiUsageService({ repository, clock })
    expect((await service.reserveAiUsage({ feature: 'generate-recipe', principal: { kind: 'user', id: 'user-1' }, correlationId: 'request-1' })).status).toBe('allowed')
    expect(repository.reservations.size).toBe(1)
  })
})

describe('AI usage costs and events', () => {
  it('distinguishes complete, partial, absent and unknown-model cost data', () => {
    expect(estimateRecordedAiCost({ model: 'anthropic-haiku-4.5', tokens: { inputTokens: 1_000_000, outputTokens: 1_000_000 }, clock, maxPriceAgeMs: 86_400_000 })).toEqual({ status: 'complete', estimatedCostMicros: BigInt(6_000_000) })
    expect(estimateRecordedAiCost({ model: 'anthropic-haiku-4.5', tokens: { inputTokens: 0 }, clock, maxPriceAgeMs: 86_400_000 })).toMatchObject({ status: 'complete', estimatedCostMicros: BigInt(0) })
    expect(estimateRecordedAiCost({ model: 'anthropic-haiku-4.5', clock, maxPriceAgeMs: 86_400_000 })).toEqual({ status: 'unavailable' })
    expect(estimateRecordedAiCost({ model: 'unknown-model', tokens: { inputTokens: 1 }, clock, maxPriceAgeMs: 86_400_000 })).toEqual({ status: 'invalid' })
  })

  it('creates immutable bounded events without sensitive content', () => {
    const policy = getAiQuotaPolicy('chat-ai')
    const event = createAiUsageEvent({
      feature: 'chat-ai', operation: 'generate', policy, clock, maxPriceAgeMs: 86_400_000,
      finalization: { reservationId: 'reservation-1', correlationId: 'request-1', feature: 'chat-ai', policyId: policy.id, principal: { kind: 'user', id: 'user-1' }, outcome: 'failed', reasonCode: 'provider_error<script>', requestedModel: 'anthropic-sonnet-4.6', tokens: { inputTokens: 0 }, durationMs: 999_999, attemptCount: 99 },
    })
    expect(event).toMatchObject({ timestamp: '2026-07-20T12:00:00.000Z', reasonCode: 'invalid_reason', correlationId: 'request-1', inputTokens: 0, durationMs: 300_000, attemptCount: 10 })
    expect(event).not.toHaveProperty('outputTokens')
    expect(event).not.toHaveProperty('totalTokens')
    expect(Object.isFrozen(event)).toBe(true)
    expect(JSON.stringify(event, (_, value) => typeof value === 'bigint' ? value.toString() : value)).not.toContain('script')
  })
})
