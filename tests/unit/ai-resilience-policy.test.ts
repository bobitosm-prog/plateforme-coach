import { describe, expect, it, vi } from 'vitest'
import {
  aiFailure,
  calculateAiBackoff,
  createAiCancellationController,
  decideAiRetry,
  executeAiWithResilience,
  normalizeAiProviderError,
  parseAiRetryAfter,
  validateAiRetryPolicy,
  waitForAiDelay,
  type AiJitter,
  type AiResult,
  type AiRetryPolicy,
  type AiTimeoutScheduler,
} from '../../lib/ai/provider'

const policy: AiRetryPolicy = {
  maxAttempts: 3,
  attemptTimeoutMs: 1_000,
  globalBudgetMs: 10_000,
  baseDelayMs: 100,
  maxDelayMs: 1_000,
  maxRetryAfterMs: 5_000,
  allowQuotaRetry: true,
}

function success(value = 'safe', actualModel = 'model-a'): AiResult<string> {
  return { ok: true, output: 'text', value, metadata: { correlationId: 'req-1', requestedModel: 'model-a', actualModel, stopReason: 'end_turn' } }
}

function failure(code: Parameters<typeof aiFailure<string>>[0]['code'], actualModel?: string): AiResult<string> & { ok: false } {
  const result = aiFailure<string>({ code, retryable: code === 'timeout' || code === 'network_error' || code === 'quota_exceeded', correlationId: 'req-1', requestedModel: 'model-a' })
  return actualModel ? { ...result, metadata: { ...result.metadata, actualModel } } : result
}

function runtime(options: { jitter?: AiJitter; onSchedule?: (delayMs: number) => void } = {}) {
  let now = Date.parse('2026-07-20T10:00:00.000Z')
  let cancelCount = 0
  const scheduler: AiTimeoutScheduler = {
    schedule(callback, delayMs) {
      const handle = setTimeout(() => {
        now += delayMs
        options.onSchedule?.(delayMs)
        callback()
      }, 0)
      return handle
    },
    cancel(handle) {
      cancelCount += 1
      clearTimeout(handle as ReturnType<typeof setTimeout>)
    },
  }
  return {
    dependencies: {
      clock: { now: () => now },
      scheduler,
      jitter: options.jitter ?? { apply: (delayMs: number) => delayMs },
    },
    scheduler,
    get cancelCount() { return cancelCount },
  }
}

describe('AI retry policy primitives', () => {
  it('validates distinct attempt, budget, delay and retry-after bounds', () => {
    expect(validateAiRetryPolicy(policy)).toBe(true)
    expect(validateAiRetryPolicy({ ...policy, maxAttempts: 0 })).toBe(false)
    expect(validateAiRetryPolicy({ ...policy, maxAttempts: 11 })).toBe(false)
    expect(validateAiRetryPolicy({ ...policy, attemptTimeoutMs: policy.globalBudgetMs + 1 })).toBe(false)
    expect(validateAiRetryPolicy({ ...policy, baseDelayMs: -1 })).toBe(false)
    expect(validateAiRetryPolicy({ ...policy, globalBudgetMs: Number.POSITIVE_INFINITY })).toBe(false)
  })

  it('parses Retry-After seconds and HTTP dates with an injected clock', () => {
    const now = Date.parse('2026-07-20T10:00:00.000Z')
    expect(parseAiRetryAfter('3', now, 5_000)).toEqual({ ok: true, delayMs: 3_000 })
    expect(parseAiRetryAfter('Mon, 20 Jul 2026 10:00:04 GMT', now, 5_000)).toEqual({ ok: true, delayMs: 4_000 })
    for (const value of ['-1', '0', '1.5', 'invalid', '2026-07-20T10:00:04Z', 'Mon, 20 Jul 2026 09:59:59 GMT', '99']) {
      expect(parseAiRetryAfter(value, now, 5_000)).toEqual({ ok: false })
    }
  })

  it('calculates bounded exponential backoff with deterministic jitter', () => {
    const jitter = { apply: (delayMs: number, attempt: number) => delayMs + attempt * 10 }
    expect(calculateAiBackoff(policy, 1, jitter)).toBe(110)
    expect(calculateAiBackoff(policy, 2, jitter)).toBe(220)
    expect(calculateAiBackoff(policy, 9, jitter)).toBe(1_000)
    expect(calculateAiBackoff(policy, 1, { apply: () => Number.NaN })).toBe(100)
  })

  it('implements the exact retry matrix', () => {
    const common = { policy, attempt: 1, safety: { kind: 'text' as const, idempotent: true }, streamEmitted: false, backoffMs: 100 }
    expect(decideAiRetry({ ...common, error: undefined })).toEqual({ retry: false, reason: 'success' })
    expect(decideAiRetry({ ...common, error: { code: 'timeout', retryable: true } })).toMatchObject({ retry: true, source: 'backoff' })
    expect(decideAiRetry({ ...common, error: { code: 'timeout', retryable: false } })).toEqual({ retry: false, reason: 'non_retryable_error' })
    expect(decideAiRetry({ ...common, error: { code: 'network_error', retryable: true } })).toMatchObject({ retry: true, source: 'backoff' })
    expect(decideAiRetry({ ...common, error: { code: 'quota_exceeded', retryable: true }, retryAfterMs: 300 })).toEqual({ retry: true, reason: 'retry_allowed', delayMs: 300, source: 'retry_after' })
    expect(decideAiRetry({ ...common, policy: { ...policy, allowQuotaRetry: false }, error: { code: 'quota_exceeded', retryable: true }, retryAfterMs: 300 })).toEqual({ retry: false, reason: 'retry_after_required' })
    for (const code of ['provider_refused', 'invalid_output', 'unexpected_error', 'cancelled'] as const) {
      expect(decideAiRetry({ ...common, error: { code, retryable: false } })).toEqual({ retry: false, reason: 'non_retryable_error' })
    }
    expect(decideAiRetry({ ...common, error: { code: 'timeout', retryable: true }, safety: { kind: 'text', idempotent: false } })).toEqual({ retry: false, reason: 'operation_not_idempotent' })
    expect(decideAiRetry({ ...common, error: { code: 'network_error', retryable: true }, safety: { kind: 'tool', idempotent: true } })).toEqual({ retry: false, reason: 'idempotency_key_required' })
    expect(decideAiRetry({ ...common, error: { code: 'network_error', retryable: true }, streamEmitted: true })).toEqual({ retry: false, reason: 'stream_already_emitted' })
    expect(decideAiRetry({ ...common, error: { code: 'quota_exceeded', retryable: true } })).toEqual({ retry: false, reason: 'retry_after_required' })
    expect(decideAiRetry({ ...common, policy: { ...policy, maxAttempts: 1 }, error: { code: 'provider_refused', retryable: false } })).toEqual({ retry: false, reason: 'non_retryable_error' })
  })

  it('normalizes unknown failures without carrying the original value', () => {
    const raw = Object.freeze({ message: 'secret provider payload', stack: 'secret stack', token: 'secret' })
    expect(normalizeAiProviderError({})).toEqual({ code: 'unexpected_error', retryable: false })
    expect(JSON.stringify(normalizeAiProviderError({}))).not.toContain(raw.message)
    expect(raw).toHaveProperty('token', 'secret')
  })
})

describe('explicit AI attempt orchestrator', () => {
  it('supports zero retry and success on the first attempt', async () => {
    const execute = vi.fn(async () => ({ result: success() }))
    const result = await executeAiWithResilience({ policy: { ...policy, maxAttempts: 1 }, safety: { kind: 'text', idempotent: true }, correlationId: 'req-1', requestedModel: 'model-a', dependencies: runtime().dependencies, execute })
    expect(result).toMatchObject({ completion: 'success', result: { ok: true } })
    expect(result.attempts).toHaveLength(1)
    expect(execute).toHaveBeenCalledTimes(1)
  })

  it('retries an idempotent timeout once and then succeeds', async () => {
    const rt = runtime()
    const execute = vi.fn(({ attempt, cancellation }: { attempt: number; cancellation: { subscribe(listener: () => void): () => void } }) => {
      if (attempt === 2) return Promise.resolve({ result: success() })
      return new Promise<{ result: AiResult<string> }>(() => cancellation.subscribe(() => undefined))
    })
    const result = await executeAiWithResilience({ policy, safety: { kind: 'text', idempotent: true }, correlationId: 'req-1', requestedModel: 'model-a', dependencies: rt.dependencies, execute })
    expect(result.completion).toBe('success')
    expect(result.attempts.map(item => item.outcome)).toEqual(['timeout', 'success'])
    expect(execute).toHaveBeenCalledTimes(2)
  })

  it('stops network failures at the maximum attempt count', async () => {
    const execute = vi.fn(async () => ({ result: failure('network_error') }))
    const result = await executeAiWithResilience({ policy: { ...policy, maxAttempts: 2 }, safety: { kind: 'text', idempotent: true }, correlationId: 'req-1', requestedModel: 'model-a', dependencies: runtime().dependencies, execute })
    expect(result.completion).toBe('max_attempts')
    expect(result.attempts).toHaveLength(2)
    expect(execute).toHaveBeenCalledTimes(2)
  })

  it('does not retry non-retryable, non-idempotent, partial stream or unkeyed tool operations', async () => {
    const cases = [
      { result: failure('provider_refused'), safety: { kind: 'text' as const, idempotent: true }, streamEmitted: false },
      { result: failure('network_error'), safety: { kind: 'text' as const, idempotent: false }, streamEmitted: false },
      { result: failure('network_error'), safety: { kind: 'stream' as const, idempotent: true }, streamEmitted: true },
      { result: failure('network_error'), safety: { kind: 'tool' as const, idempotent: true }, streamEmitted: false },
    ]
    for (const current of cases) {
      const execute = vi.fn(async () => ({ result: current.result, streamEmitted: current.streamEmitted }))
      const result = await executeAiWithResilience({ policy, safety: current.safety, correlationId: 'req-1', requestedModel: 'model-a', dependencies: runtime().dependencies, execute })
      expect(result.completion).toBe('non_retryable')
      expect(execute).toHaveBeenCalledTimes(1)
    }
  })

  it('requires a valid Retry-After for quota retry', async () => {
    const valid = vi.fn()
      .mockResolvedValueOnce({ result: failure('quota_exceeded'), retryAfter: '2' })
      .mockResolvedValueOnce({ result: success() })
    const validResult = await executeAiWithResilience({ policy, safety: { kind: 'text', idempotent: true }, correlationId: 'req-1', requestedModel: 'model-a', dependencies: runtime().dependencies, execute: valid })
    expect(validResult.completion).toBe('success')
    expect(validResult.attempts[0].delayAfterMs).toBe(2_000)

    const invalid = vi.fn(async () => ({ result: failure('quota_exceeded'), retryAfter: 'expired' }))
    const invalidResult = await executeAiWithResilience({ policy, safety: { kind: 'text', idempotent: true }, correlationId: 'req-1', requestedModel: 'model-a', dependencies: runtime().dependencies, execute: invalid })
    expect(invalidResult.completion).toBe('non_retryable')
    expect(invalid).toHaveBeenCalledTimes(1)
  })

  it('stops before backoff when the global budget is exhausted', async () => {
    const execute = vi.fn(async () => ({ result: failure('network_error') }))
    const result = await executeAiWithResilience({ policy: { ...policy, globalBudgetMs: 1_000, attemptTimeoutMs: 1_000, baseDelayMs: 1_000 }, safety: { kind: 'text', idempotent: true }, correlationId: 'req-1', requestedModel: 'model-a', dependencies: runtime().dependencies, execute })
    expect(result.completion).toBe('budget_exhausted')
    expect(execute).toHaveBeenCalledTimes(1)
  })

  it('cancels before and during an attempt', async () => {
    const before = createAiCancellationController(); before.abort()
    const executeBefore = vi.fn(async () => ({ result: success() }))
    const beforeResult = await executeAiWithResilience({ policy, safety: { kind: 'text', idempotent: true }, correlationId: 'req-1', requestedModel: 'model-a', cancellation: before.signal, dependencies: runtime().dependencies, execute: executeBefore })
    expect(beforeResult.completion).toBe('cancelled')
    expect(executeBefore).not.toHaveBeenCalled()

    const during = createAiCancellationController()
    const executeDuring = vi.fn(async ({ cancellation }: { cancellation: { subscribe(listener: () => void): () => void } }) => new Promise<{ result: AiResult<string> }>(resolve => {
      cancellation.subscribe(() => resolve({ result: failure('cancelled') }))
      queueMicrotask(() => during.abort())
    }))
    const duringResult = await executeAiWithResilience({ policy, safety: { kind: 'text', idempotent: true }, correlationId: 'req-1', requestedModel: 'model-a', cancellation: during.signal, dependencies: runtime().dependencies, execute: executeDuring })
    expect(duringResult.completion).toBe('cancelled')
  })

  it('cancels during backoff and cleans the scheduled resource once', async () => {
    const cancellation = createAiCancellationController()
    const rt = runtime({ jitter: { apply(delayMs) { queueMicrotask(() => cancellation.abort()); return delayMs } } })
    const execute = vi.fn(async () => ({ result: failure('network_error') }))
    const result = await executeAiWithResilience({ policy, safety: { kind: 'text', idempotent: true }, correlationId: 'req-1', requestedModel: 'model-a', cancellation: cancellation.signal, dependencies: rt.dependencies, execute })
    expect(result.completion).toBe('cancelled')
    expect(execute).toHaveBeenCalledTimes(1)
    expect(rt.cancelCount).toBeGreaterThanOrEqual(2)
  })

  it('keeps correlation ID stable and rejects a model change between attempts', async () => {
    const contexts: Array<{ correlationId: string; requestedModel: string }> = []
    const execute = vi.fn(async (context: { attempt: number; correlationId: string; requestedModel: string }) => {
      contexts.push({ correlationId: context.correlationId, requestedModel: context.requestedModel })
      return context.attempt === 1 ? { result: failure('network_error', 'actual-a') } : { result: success('safe', 'actual-b') }
    })
    const result = await executeAiWithResilience({ policy, safety: { kind: 'text', idempotent: true }, correlationId: 'req-1', requestedModel: 'model-a', dependencies: runtime().dependencies, execute })
    expect(result.completion).toBe('model_changed')
    expect(contexts).toEqual([{ correlationId: 'req-1', requestedModel: 'model-a' }, { correlationId: 'req-1', requestedModel: 'model-a' }])
    expect(result.result).toMatchObject({ ok: false, error: { code: 'unexpected_error' } })
  })

  it('turns thrown unknown values into an expurgated final failure', async () => {
    const execute = vi.fn(async () => { throw { prompt: 'secret', stack: 'secret', token: 'secret' } })
    const result = await executeAiWithResilience({ policy, safety: { kind: 'text', idempotent: true }, correlationId: 'req-1', requestedModel: 'model-a', dependencies: runtime().dependencies, execute })
    expect(result).toMatchObject({ completion: 'non_retryable', result: { ok: false, error: { code: 'unexpected_error' } } })
    expect(JSON.stringify(result)).not.toContain('secret')
  })

  it('expurgates invalid technical metadata returned by an attempt', async () => {
    const unsafe = failure('network_error')
    const execute = vi.fn(async () => ({ result: { ...unsafe, metadata: { ...unsafe.metadata, actualModel: 'private model content' } } }))
    const result = await executeAiWithResilience({ policy: { ...policy, maxAttempts: 1 }, safety: { kind: 'text', idempotent: true }, correlationId: 'req-1', requestedModel: 'model-a', dependencies: runtime().dependencies, execute })
    expect(result.attempts[0].actualModel).toBe('unknown-model')
    expect(JSON.stringify(result)).not.toContain('private model content')
  })
})

describe('AI delay cleanup', () => {
  it('cleans timer and listener exactly once when cancelled', async () => {
    const cancellation = createAiCancellationController()
    let callback: (() => void) | undefined
    const scheduler = { schedule: vi.fn(next => { callback = next; return 'timer' }), cancel: vi.fn() }
    const resultPromise = waitForAiDelay({ delayMs: 100, scheduler, cancellation: cancellation.signal })
    cancellation.abort(); cancellation.abort(); callback?.()
    await expect(resultPromise).resolves.toBe('cancelled')
    expect(scheduler.cancel).toHaveBeenCalledTimes(1)
  })
})
