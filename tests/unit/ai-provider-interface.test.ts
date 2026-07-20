import { describe, expect, it, vi } from 'vitest'
import {
  aiFailure,
  createAiStreamLifecycle,
  normalizeAiProviderError,
  normalizeMetadata,
  runAiOperation,
  validateAiRequest,
  validateStructuredOutput,
  type AiCancellationSignal,
  type AiResult,
  type AiTimeoutScheduler,
} from '../../lib/ai/provider'

const request = {
  output: 'text' as const,
  model: 'synthetic-model',
  maxTokens: 100,
  system: 'synthetic system',
  messages: [{ role: 'user' as const, content: [{ type: 'text' as const, text: 'synthetic input' }] }],
}

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>(done => { resolve = done })
  return { promise, resolve }
}

function schedulerPort() {
  let callback: (() => void) | undefined
  const scheduler: AiTimeoutScheduler = {
    schedule: vi.fn(next => { callback = next; return 'timer' }),
    cancel: vi.fn(),
  }
  return { scheduler, fire: () => callback?.() }
}

function cancellationPort(): AiCancellationSignal & { abort(): void; subscriptions: number } {
  let listener: (() => void) | undefined
  let aborted = false
  return {
    get aborted() { return aborted },
    get subscriptions() { return listener ? 1 : 0 },
    subscribe(next) { listener = next; return () => { listener = undefined } },
    abort() { aborted = true; listener?.() },
  }
}

describe('AI provider request and result contracts', () => {
  it('accepts bounded text, JSON and tool requests', () => {
    expect(validateAiRequest(request, { correlationId: 'req-1', timeoutMs: 1_000 })).toEqual({ ok: true })
    expect(validateAiRequest({ ...request, output: 'json', validate: () => ({ ok: false }) }, { correlationId: 'req-2', timeoutMs: 1_000 })).toEqual({ ok: true })
    expect(validateAiRequest({ ...request, output: 'tool', tools: [{ name: 'answer', inputSchema: { type: 'object' } }], forcedTool: 'answer', validate: () => ({ ok: false }) }, { correlationId: 'req-3', timeoutMs: 1_000 })).toEqual({ ok: true })
  })

  it('rejects unbounded, invalid and ambiguous inputs without exposing them', () => {
    expect(validateAiRequest({ ...request, maxTokens: Number.NaN }, { correlationId: 'req-1', timeoutMs: 1_000 })).toEqual({ ok: false, field: 'maxTokens' })
    expect(validateAiRequest({ ...request, model: 'user content must not be metadata' }, { correlationId: 'req-1', timeoutMs: 1_000 })).toEqual({ ok: false, field: 'model' })
    expect(validateAiRequest(request, { correlationId: 'bad id with spaces', timeoutMs: 1_000 })).toEqual({ ok: false, field: 'correlationId' })
    expect(validateAiRequest({ ...request, messages: [] }, { correlationId: 'req-1', timeoutMs: 1_000 })).toEqual({ ok: false, field: 'messages' })
    expect(validateAiRequest({ ...request, output: 'tool', tools: [{ name: 'one', inputSchema: {} }], forcedTool: 'missing', validate: () => ({ ok: false }) }, { correlationId: 'req-1', timeoutMs: 1_000 })).toEqual({ ok: false, field: 'tools' })
  })

  it('keeps structured validation fail-closed, deterministic and exception-safe', () => {
    const input = Object.freeze({ value: 4 })
    const validator = (raw: unknown) => typeof raw === 'object' && raw !== null && (raw as { value?: unknown }).value === 4
      ? { ok: true as const, value: { value: 4 } }
      : { ok: false as const }
    expect(validateStructuredOutput(input, validator)).toEqual({ ok: true, value: { value: 4 } })
    expect(validateStructuredOutput(input, validator)).toEqual({ ok: true, value: { value: 4 } })
    expect(validateStructuredOutput(input, () => { throw new Error('raw sensitive response') })).toEqual({ ok: false })
    expect(input).toEqual({ value: 4 })
  })

  it('normalizes every provider failure without raw messages', () => {
    expect(normalizeAiProviderError({ kind: 'refusal' })).toEqual({ code: 'provider_refused', retryable: false })
    expect(normalizeAiProviderError({ kind: 'quota' })).toEqual({ code: 'quota_exceeded', retryable: true })
    expect(normalizeAiProviderError({ kind: 'timeout' })).toEqual({ code: 'timeout', retryable: true })
    expect(normalizeAiProviderError({ kind: 'network' })).toEqual({ code: 'network_error', retryable: true })
    expect(normalizeAiProviderError({ kind: 'invalid_output' })).toEqual({ code: 'invalid_output', retryable: false })
    expect(normalizeAiProviderError({ kind: 'cancelled' })).toEqual({ code: 'cancelled', retryable: false })
    expect(normalizeAiProviderError({})).toEqual({ code: 'unexpected_error', retryable: false })
    expect(aiFailure({ code: 'network_error', retryable: true, correlationId: 'req-1', requestedModel: 'requested' })).not.toHaveProperty('message')
    expect(aiFailure({ code: 'network_error', retryable: true, correlationId: 'private content', requestedModel: 'private content' })).toMatchObject({ metadata: { correlationId: 'invalid-correlation-id', requestedModel: 'unknown-model' } })
  })

  it('preserves requested/actual models, stop reason and only valid token usage', () => {
    expect(normalizeMetadata({
      correlationId: 'req-1', requestedModel: 'requested', actualModel: 'actual', stopReason: 'max_tokens',
      usage: { inputTokens: 10, outputTokens: 5, cacheReadTokens: -1, cacheWriteTokens: Number.NaN },
    })).toEqual({ correlationId: 'req-1', requestedModel: 'requested', actualModel: 'actual', stopReason: 'max_tokens', usage: { inputTokens: 10, outputTokens: 5 } })
  })
})

describe('AI provider timeout and cancellation', () => {
  it('returns the operation result and always clears resources', async () => {
    const { scheduler } = schedulerPort()
    const cancellation = cancellationPort()
    const success: AiResult<string> = { ok: true, output: 'text', value: 'safe', metadata: { correlationId: 'req-1', requestedModel: 'm', actualModel: 'm', stopReason: 'end_turn' } }
    await expect(runAiOperation({ operation: async () => success, scheduler, timeoutMs: 1_000, correlationId: 'req-1', requestedModel: 'm', cancellation })).resolves.toEqual(success)
    expect(scheduler.cancel).toHaveBeenCalledWith('timer')
    expect(cancellation.subscriptions).toBe(0)
  })

  it('times out deterministically without retrying the operation', async () => {
    const pending = deferred<AiResult<string>>()
    const { scheduler, fire } = schedulerPort()
    const operation = vi.fn(() => pending.promise)
    const resultPromise = runAiOperation({ operation, scheduler, timeoutMs: 1_000, correlationId: 'req-1', requestedModel: 'm' })
    fire()
    await expect(resultPromise).resolves.toMatchObject({ ok: false, error: { code: 'timeout' } })
    expect(operation).toHaveBeenCalledTimes(1)
  })

  it('supports cancellation before and during an operation with idempotent cleanup', async () => {
    const alreadyCancelled = cancellationPort(); alreadyCancelled.abort()
    const unused = schedulerPort()
    await expect(runAiOperation({ operation: vi.fn(), scheduler: unused.scheduler, timeoutMs: 1_000, correlationId: 'req-1', requestedModel: 'm', cancellation: alreadyCancelled })).resolves.toMatchObject({ ok: false, error: { code: 'cancelled' } })
    expect(unused.scheduler.schedule).not.toHaveBeenCalled()

    const pending = deferred<AiResult<string>>()
    const active = cancellationPort()
    const scheduled = schedulerPort()
    const resultPromise = runAiOperation({ operation: () => pending.promise, scheduler: scheduled.scheduler, timeoutMs: 1_000, correlationId: 'req-2', requestedModel: 'm', cancellation: active })
    active.abort(); active.abort()
    await expect(resultPromise).resolves.toMatchObject({ ok: false, error: { code: 'cancelled' } })
    expect(scheduled.scheduler.cancel).toHaveBeenCalledTimes(1)
    expect(active.subscriptions).toBe(0)
  })
})

describe('AI stream lifecycle', () => {
  it('tracks partial output and accepts exactly one terminal event', () => {
    const lifecycle = createAiStreamLifecycle()
    expect(lifecycle.accept({ type: 'text_delta', value: 'safe' })).toEqual({ accepted: true, terminal: false })
    expect(lifecycle.partial).toBe(true)
    const result = { ok: true as const, output: 'text' as const, value: 'safe', metadata: { correlationId: 'req-1', requestedModel: 'm', actualModel: 'm', stopReason: 'end_turn' as const } }
    expect(lifecycle.accept({ type: 'completed', result })).toEqual({ accepted: true, terminal: true })
    expect(lifecycle.accept({ type: 'completed', result })).toEqual({ accepted: false, terminal: true })
    expect(lifecycle.cancel()).toEqual({ changed: false })
  })

  it('closes cancellation exactly once before any output', () => {
    const lifecycle = createAiStreamLifecycle()
    expect(lifecycle.cancel()).toEqual({ changed: true })
    expect(lifecycle.cancel()).toEqual({ changed: false })
    expect(lifecycle.partial).toBe(false)
  })
})
