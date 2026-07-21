import type { AiQuotaPolicy, AiUsageDecision } from './types'

export function evaluateAiQuota(input: { policy: AiQuotaPolicy; hourlyCount: number; monthlyCount: number; now: number; oldestHourlyAt?: number; oldestMonthlyAt?: number }): AiUsageDecision {
  const { policy } = input
  if (![input.hourlyCount, input.monthlyCount, input.now].every(Number.isFinite) || input.hourlyCount < 0 || input.monthlyCount < 0) return { status: 'failure', reason: 'invalid_input' }
  if (policy.hourly && input.hourlyCount >= policy.hourly.limit) {
    return { status: 'denied', policy, reason: 'hourly_exhausted', retryAfterMs: retryAfter(input.oldestHourlyAt, input.now, policy.hourly.windowMs) }
  }
  if (policy.monthlyHeavy && input.monthlyCount >= policy.monthlyHeavy.limit) {
    return { status: 'denied', policy, reason: 'monthly_exhausted', retryAfterMs: retryAfter(input.oldestMonthlyAt, input.now, policy.monthlyHeavy.windowMs) }
  }
  const remaining = policy.hourly ? Math.max(0, policy.hourly.limit - input.hourlyCount) : null
  return { status: 'allowed', policy, remaining }
}

function retryAfter(oldest: number | undefined, now: number, windowMs: number): number {
  return oldest === undefined || !Number.isFinite(oldest) ? windowMs : Math.max(0, oldest + windowMs - now)
}
