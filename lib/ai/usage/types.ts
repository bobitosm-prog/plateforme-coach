export const AI_FEATURES = [
  'chat-ai', 'generate-recipe', 'generate-meal-plan', 'analyze-meal-photo',
  'suggest-exercise', 'adapt-workout', 'generate-exercise-instructions',
  'generate-program', 'generate-custom-program', 'training-regen',
  'suggest-overload', 'analyze-body', 'analyze-progress-photo',
  'weekly-diagnostic', 'weekly-diagnostic-cron',
] as const

export type AiFeature = typeof AI_FEATURES[number]
export type AiUsageOperation = 'generate' | 'analyze' | 'suggest' | 'diagnose'
export type AiUsageOutcome = 'succeeded' | 'failed' | 'cancelled'
export type AiUsageCostStatus = 'complete' | 'partial' | 'unavailable' | 'invalid'

export interface AiQuotaWindow { kind: 'hourly' | 'rolling_30_days'; limit: number; windowMs: number }
export interface AiQuotaPolicy {
  id: string
  feature: AiFeature
  tracking: 'untracked' | 'logged' | 'quota'
  hourly?: AiQuotaWindow
  monthlyHeavy?: AiQuotaWindow
}

export type AiUsagePrincipal =
  | { kind: 'user'; id: string }
  | { kind: 'server'; id: string; subjectUserId: string }

export interface AiUsageReservation {
  id: string
  correlationId: string
  feature: AiFeature
  policyId: string
  principal: AiUsagePrincipal
  reservedAt: number
}

export type AiUsageDecision =
  | { status: 'allowed'; policy: AiQuotaPolicy; remaining: number | null }
  | { status: 'denied'; policy: AiQuotaPolicy; reason: 'hourly_exhausted' | 'monthly_exhausted'; retryAfterMs: number }
  | { status: 'unavailable'; policy: AiQuotaPolicy; reason: 'quota_store_unavailable' }
  | { status: 'failure'; reason: 'invalid_input' | 'unknown_feature' }

export type AiUsageReservationResult =
  | { status: 'allowed'; reservation: AiUsageReservation; remaining: number | null }
  | { status: 'denied'; reason: 'hourly_exhausted' | 'monthly_exhausted'; retryAfterMs: number }
  | { status: 'unavailable'; reason: 'quota_store_unavailable' }
  | { status: 'conflict'; reason: 'duplicate_correlation_id' }
  | { status: 'failure'; reason: 'invalid_input' | 'repository_failure' }

export interface AiRecordedTokens {
  inputTokens?: number
  outputTokens?: number
}

export interface AiUsageFinalization {
  reservationId: string
  correlationId: string
  feature: AiFeature
  policyId: string
  principal: AiUsagePrincipal
  outcome: AiUsageOutcome
  reasonCode: string
  requestedModel: string
  providerModel?: string
  tokens?: AiRecordedTokens
  estimatedCostMicros?: bigint
  costStatus?: AiUsageCostStatus
  durationMs: number
  attemptCount: number
}

export type AiUsageFinalizationResult =
  | { status: 'finalized' }
  | { status: 'conflict'; reason: 'already_finalized' }
  | { status: 'failure'; reason: 'invalid_input' | 'reservation_not_found' | 'repository_failure' }

export interface AiUsageEvent {
  timestamp: string
  event: 'AI_USAGE'
  feature: AiFeature
  operation: AiUsageOperation
  result: AiUsageOutcome
  reasonCode: string
  correlationId: string
  logicalModel: string
  providerModel?: string
  inputTokens?: number
  outputTokens?: number
  totalTokens?: number
  estimatedCostMicros?: bigint
  costStatus: AiUsageCostStatus
  durationMs: number
  attemptCount: number
  quotaPolicyId: string
}

export interface AiUsageClock { now(): number }

export interface AiUsageRepositoryPort {
  inspect(input: { principal: AiUsagePrincipal; policy: AiQuotaPolicy; now: number }): Promise<{ ok: true; hourlyCount: number; monthlyCount: number; oldestHourlyAt?: number; oldestMonthlyAt?: number } | { ok: false }>
  reserve(input: { principal: AiUsagePrincipal; policy: AiQuotaPolicy; correlationId: string; logicalModel?: string; now: number }): Promise<{ status: 'reserved'; reservationId: string; remaining: number | null } | { status: 'denied'; reason: 'hourly_exhausted' | 'monthly_exhausted'; retryAfterMs: number } | { status: 'conflict' } | { status: 'failure' }>
  finalize(input: AiUsageFinalization): Promise<{ status: 'finalized' | 'already_finalized' | 'not_found' | 'failure' }>
}

export interface AiUsageEventSink { write(event: AiUsageEvent): void | Promise<void> }
