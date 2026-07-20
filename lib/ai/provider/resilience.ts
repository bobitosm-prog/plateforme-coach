import { createAiCancellationController } from './cancellation'
import { aiFailure, sanitizeAiSafeError } from './errors'
import type {
  AiAttemptMetadata,
  AiOperationResult,
  AiResilientOperationOptions,
  AiRetryDecision,
  AiRetryPolicy,
} from './resilience-types'
import { runAiOperation } from './timeout'
import type { AiCancellationSignal, AiResult, AiSafeError, AiTimeoutScheduler } from './types'
import { normalizeCorrelationId, normalizeMetadata, normalizeModelId, normalizeStopReason, normalizeTokenUsage } from './validation'

const MAX_ATTEMPTS = 10
const MAX_DURATION_MS = 900_000
const HTTP_DATE = /^(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun), \d{2} (?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) \d{4} \d{2}:\d{2}:\d{2} GMT$/

export type AiRetryAfterResult =
  | { ok: true; delayMs: number }
  | { ok: false }

export function validateAiRetryPolicy(policy: AiRetryPolicy): boolean {
  return Number.isInteger(policy.maxAttempts)
    && policy.maxAttempts >= 1
    && policy.maxAttempts <= MAX_ATTEMPTS
    && isDuration(policy.attemptTimeoutMs, false)
    && isDuration(policy.globalBudgetMs, false)
    && isDuration(policy.baseDelayMs, true)
    && isDuration(policy.maxDelayMs, true)
    && isDuration(policy.maxRetryAfterMs, false)
    && policy.baseDelayMs <= policy.maxDelayMs
    && policy.attemptTimeoutMs <= policy.globalBudgetMs
}

function isDuration(value: number, zeroAllowed: boolean): boolean {
  return Number.isFinite(value) && value >= (zeroAllowed ? 0 : 1) && value <= MAX_DURATION_MS
}

export function parseAiRetryAfter(value: string | undefined, nowMs: number, maxDelayMs: number): AiRetryAfterResult {
  if (!value || !Number.isFinite(nowMs) || !isDuration(maxDelayMs, false)) return { ok: false }
  const normalized = value.trim()
  if (/^\d+$/.test(normalized)) {
    const seconds = Number(normalized)
    const delayMs = seconds * 1_000
    return Number.isSafeInteger(seconds) && delayMs > 0 && delayMs <= maxDelayMs ? { ok: true, delayMs } : { ok: false }
  }
  if (!HTTP_DATE.test(normalized)) return { ok: false }
  const timestamp = Date.parse(normalized)
  const delayMs = timestamp - nowMs
  return Number.isFinite(timestamp) && delayMs > 0 && delayMs <= maxDelayMs ? { ok: true, delayMs } : { ok: false }
}

export function calculateAiBackoff(policy: Pick<AiRetryPolicy, 'baseDelayMs' | 'maxDelayMs'>, attempt: number, jitter: { apply(delayMs: number, attempt: number): number }): number {
  if (!Number.isInteger(attempt) || attempt < 1) return 0
  const exponential = Math.min(policy.maxDelayMs, policy.baseDelayMs * (2 ** Math.min(attempt - 1, 30)))
  const jittered = jitter.apply(exponential, attempt)
  return Number.isFinite(jittered) && jittered >= 0
    ? Math.min(policy.maxDelayMs, Math.round(jittered))
    : exponential
}

export function decideAiRetry(input: {
  error?: AiSafeError
  policy: AiRetryPolicy
  attempt: number
  safety: { kind: 'text' | 'json' | 'tool' | 'stream'; idempotent: boolean; idempotencyKey?: string }
  streamEmitted: boolean
  retryAfterMs?: number
  backoffMs: number
}): AiRetryDecision {
  if (!input.error) return { retry: false, reason: 'success' }
  if (!input.error.retryable) return { retry: false, reason: 'non_retryable_error' }
  if (input.error.code === 'provider_refused' || input.error.code === 'invalid_output' || input.error.code === 'unexpected_error' || input.error.code === 'cancelled') return { retry: false, reason: 'non_retryable_error' }
  if (input.streamEmitted) return { retry: false, reason: 'stream_already_emitted' }
  if (!input.safety.idempotent) return { retry: false, reason: 'operation_not_idempotent' }
  if ((input.safety.kind === 'json' || input.safety.kind === 'tool') && !input.safety.idempotencyKey) return { retry: false, reason: 'idempotency_key_required' }
  if (input.attempt >= input.policy.maxAttempts) return { retry: false, reason: 'max_attempts' }
  if (input.error.code === 'quota_exceeded') {
    if (!input.policy.allowQuotaRetry || input.retryAfterMs === undefined) return { retry: false, reason: 'retry_after_required' }
    return { retry: true, reason: 'retry_allowed', delayMs: input.retryAfterMs, source: 'retry_after' }
  }
  if (input.error.code === 'timeout' || input.error.code === 'network_error') {
    return { retry: true, reason: 'retry_allowed', delayMs: input.backoffMs, source: 'backoff' }
  }
  return { retry: false, reason: 'non_retryable_error' }
}

export async function waitForAiDelay(options: {
  delayMs: number
  scheduler: AiTimeoutScheduler
  cancellation?: AiCancellationSignal
}): Promise<'elapsed' | 'cancelled'> {
  if (options.cancellation?.aborted) return 'cancelled'
  return new Promise(resolve => {
    let settled = false
    let unsubscribe: () => void = () => undefined
    const scheduled: { handle?: unknown } = {}
    const finish = (result: 'elapsed' | 'cancelled') => {
      if (settled) return
      settled = true
      options.scheduler.cancel(scheduled.handle)
      unsubscribe()
      resolve(result)
    }
    scheduled.handle = options.scheduler.schedule(() => finish('elapsed'), options.delayMs)
    unsubscribe = options.cancellation?.subscribe(() => finish('cancelled')) ?? unsubscribe
  })
}

export async function executeAiWithResilience<T>(options: AiResilientOperationOptions<T>): Promise<AiOperationResult<T>> {
  const correlationId = normalizeCorrelationId(options.correlationId)
  const requestedModel = normalizeModelId(options.requestedModel)
  const attempts: AiAttemptMetadata[] = []
  const invalid = () => aiFailure<T>({ code: 'unexpected_error', retryable: false, correlationId, requestedModel })

  if (!validateAiRetryPolicy(options.policy) || correlationId === 'invalid-correlation-id' || requestedModel === 'unknown-model') {
    return { result: invalid(), attempts, completion: 'invalid_policy' }
  }

  const operationStartedAt = options.dependencies.clock.now()
  let observedActualModel: string | undefined

  for (let attempt = 1; attempt <= options.policy.maxAttempts; attempt += 1) {
    if (options.cancellation?.aborted) return { result: aiFailure({ code: 'cancelled', retryable: false, correlationId, requestedModel }), attempts, completion: 'cancelled' }
    const elapsedBeforeAttempt = options.dependencies.clock.now() - operationStartedAt
    const remainingBudget = options.policy.globalBudgetMs - elapsedBeforeAttempt
    if (!Number.isFinite(remainingBudget) || remainingBudget <= 0) return { result: aiFailure({ code: 'timeout', retryable: true, correlationId, requestedModel }), attempts, completion: 'budget_exhausted' }

    const timeoutMs = Math.min(options.policy.attemptTimeoutMs, remainingBudget)
    const startedAtMs = options.dependencies.clock.now()
    const attemptCancellation = createAiCancellationController()
    const unsubscribe = options.cancellation?.subscribe(() => attemptCancellation.abort()) ?? (() => undefined)
    let outcomeDetails: Pick<Awaited<ReturnType<typeof options.execute>>, 'retryAfter' | 'streamEmitted'> = {}
    const rawResult = await runAiOperation({
      operation: async () => {
        const outcome = await options.execute({ attempt, timeoutMs, correlationId, requestedModel, cancellation: attemptCancellation.signal })
        outcomeDetails = { retryAfter: outcome.retryAfter, streamEmitted: outcome.streamEmitted }
        return outcome.result
      },
      scheduler: options.dependencies.scheduler,
      timeoutMs,
      correlationId,
      requestedModel,
      cancellation: options.cancellation,
      onTimeout: () => attemptCancellation.abort(),
    })
    unsubscribe()
    const result = sanitizeAttemptResult(rawResult)
    const finishedAtMs = options.dependencies.clock.now()
    const actualModel = result.metadata.actualModel
    const modelChanged = result.metadata.requestedModel !== requestedModel
      || (actualModel !== undefined && observedActualModel !== undefined && actualModel !== observedActualModel)
    if (actualModel !== undefined && observedActualModel === undefined) observedActualModel = actualModel

    const retryAfter = result.ok || result.error.code !== 'quota_exceeded'
      ? { ok: false as const }
      : parseAiRetryAfter(outcomeDetails.retryAfter, finishedAtMs, options.policy.maxRetryAfterMs)
    const backoffMs = calculateAiBackoff(options.policy, attempt, options.dependencies.jitter)
    const decision = modelChanged ? { retry: false as const, reason: 'non_retryable_error' as const } : decideAiRetry({
      error: result.ok ? undefined : result.error,
      policy: options.policy,
      attempt,
      safety: options.safety,
      streamEmitted: outcomeDetails.streamEmitted === true,
      retryAfterMs: retryAfter.ok ? retryAfter.delayMs : undefined,
      backoffMs,
    })
    const delayAfterMs = decision.retry ? decision.delayMs : 0
    attempts.push({
      attempt,
      correlationId,
      requestedModel,
      actualModel,
      startedAtMs,
      finishedAtMs,
      elapsedMs: Math.max(0, finishedAtMs - startedAtMs),
      timeoutMs,
      outcome: result.ok ? 'success' : result.error.code,
      delayAfterMs,
    })

    if (modelChanged) return { result: invalid(), attempts, completion: 'model_changed' }
    if (result.ok) return { result, attempts, completion: 'success' }
    if (!decision.retry) return { result, attempts, completion: decision.reason === 'max_attempts' ? 'max_attempts' : result.error.code === 'cancelled' ? 'cancelled' : 'non_retryable' }

    const budgetAfterAttempt = options.policy.globalBudgetMs - (options.dependencies.clock.now() - operationStartedAt)
    if (decision.delayMs >= budgetAfterAttempt) return { result, attempts, completion: 'budget_exhausted' }
    const waited = await waitForAiDelay({ delayMs: decision.delayMs, scheduler: options.dependencies.scheduler, cancellation: options.cancellation })
    if (waited === 'cancelled') return { result: aiFailure({ code: 'cancelled', retryable: false, correlationId, requestedModel }), attempts, completion: 'cancelled' }
  }

  return { result: invalid(), attempts, completion: 'max_attempts' }
}

function sanitizeAttemptResult<T>(result: AiResult<T>): AiResult<T> {
  if (result.ok) return { ...result, metadata: normalizeMetadata(result.metadata) }
  return {
    ok: false,
    error: sanitizeAiSafeError(result.error),
    metadata: {
      correlationId: normalizeCorrelationId(result.metadata.correlationId),
      requestedModel: normalizeModelId(result.metadata.requestedModel),
      actualModel: result.metadata.actualModel === undefined ? undefined : normalizeModelId(result.metadata.actualModel),
      stopReason: result.metadata.stopReason === undefined ? undefined : normalizeStopReason(result.metadata.stopReason),
      usage: normalizeTokenUsage(result.metadata.usage),
    },
  }
}
