import type { AiCancellationSignal, AiClock, AiErrorCode, AiResult, AiTimeoutScheduler } from './types'

export type AiOperationKind = 'text' | 'json' | 'tool' | 'stream'

export interface AiRetryPolicy {
  maxAttempts: number
  attemptTimeoutMs: number
  globalBudgetMs: number
  baseDelayMs: number
  maxDelayMs: number
  maxRetryAfterMs: number
  allowQuotaRetry: boolean
}

export interface AiOperationSafety {
  kind: AiOperationKind
  idempotent: boolean
  idempotencyKey?: string
}

export interface AiAttemptContext {
  attempt: number
  timeoutMs: number
  correlationId: string
  requestedModel: string
  cancellation: AiCancellationSignal
}

export interface AiAttemptOutcome<T> {
  result: AiResult<T>
  retryAfter?: string
  streamEmitted?: boolean
}

export interface AiAttemptMetadata {
  attempt: number
  correlationId: string
  requestedModel: string
  actualModel?: string
  startedAtMs: number
  finishedAtMs: number
  elapsedMs: number
  timeoutMs: number
  outcome: 'success' | AiErrorCode
  delayAfterMs: number
}

export type AiRetryDecisionReason =
  | 'retry_allowed'
  | 'success'
  | 'non_retryable_error'
  | 'operation_not_idempotent'
  | 'idempotency_key_required'
  | 'stream_already_emitted'
  | 'retry_after_required'
  | 'max_attempts'

export type AiRetryDecision =
  | { retry: true; reason: 'retry_allowed'; delayMs: number; source: 'backoff' | 'retry_after' }
  | { retry: false; reason: Exclude<AiRetryDecisionReason, 'retry_allowed'> }

export type AiOperationCompletion = 'success' | 'non_retryable' | 'max_attempts' | 'budget_exhausted' | 'cancelled' | 'model_changed' | 'invalid_policy'

export interface AiOperationResult<T> {
  result: AiResult<T>
  attempts: readonly AiAttemptMetadata[]
  completion: AiOperationCompletion
}

export interface AiJitter {
  apply(delayMs: number, attempt: number): number
}

export interface AiResilienceDependencies {
  clock: AiClock
  scheduler: AiTimeoutScheduler
  jitter: AiJitter
}

export interface AiResilientOperationOptions<T> {
  policy: AiRetryPolicy
  safety: AiOperationSafety
  correlationId: string
  requestedModel: string
  cancellation?: AiCancellationSignal
  dependencies: AiResilienceDependencies
  execute(context: AiAttemptContext): Promise<AiAttemptOutcome<T>>
}
