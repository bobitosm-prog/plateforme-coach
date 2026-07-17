export const WEBHOOK_CLAIM_OUTCOMES = {
  claimed: 'claimed',
  alreadySuccess: 'already_success',
  alreadySkipped: 'already_skipped',
  alreadyProcessing: 'already_processing',
  claimFailed: 'claim_failed',
} as const

export const STRIPE_EVENT_ID_CONFLICT_TARGET = 'stripe_event_id' as const

export function buildPlatformCheckoutIdempotencyKey(userId: string, planId: string, nowMs: number): string {
  return `checkout-${userId}-${planId}-${nowMs}`
}

export function buildCoachCheckoutIdempotencyKey(clientId: string, coachId: string, nowMs: number): string {
  return `coach-checkout-${clientId}-${coachId}-${nowMs}`
}

export function isCompletedWebhookClaim(claim: unknown): boolean {
  return claim === WEBHOOK_CLAIM_OUTCOMES.alreadySuccess || claim === WEBHOOK_CLAIM_OUTCOMES.alreadySkipped
}
