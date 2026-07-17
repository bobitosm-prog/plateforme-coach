import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import {
  buildCoachCheckoutMetadata,
  buildCoachCustomerMetadata,
  buildPlatformCheckoutMetadata,
  buildSubscriptionMetadata,
  parseCheckoutMetadata,
  STRIPE_METADATA_KEYS,
} from '@/lib/stripe/metadata'
import {
  buildCoachCheckoutIdempotencyKey,
  buildPlatformCheckoutIdempotencyKey,
  isCompletedWebhookClaim,
  STRIPE_EVENT_ID_CONFLICT_TARGET,
  WEBHOOK_CLAIM_OUTCOMES,
} from '@/lib/billing/idempotency'

const CLIENT_ID = '11111111-1111-4111-8111-111111111111'
const COACH_ID = '22222222-2222-4222-8222-222222222222'

describe('central Stripe metadata contract', () => {
  it('builds the unchanged platform metadata and parses it', () => {
    const metadata = buildPlatformCheckoutMetadata(CLIENT_ID, 'client_yearly')
    expect(metadata).toEqual({ clientId: CLIENT_ID, planId: 'client_yearly', coachId: 'platform', subType: 'client_yearly' })
    expect(parseCheckoutMetadata(metadata)).toEqual({
      ok: true, clientId: CLIENT_ID, subType: 'client_yearly', isCoachSubscription: false, coachId: null,
    })
  })

  it('builds the unchanged coach metadata and parses it', () => {
    const metadata = buildCoachCheckoutMetadata(CLIENT_ID, COACH_ID)
    expect(metadata).toEqual({ clientId: CLIENT_ID, coachId: COACH_ID, subType: 'coach_monthly', type: 'coach_subscription' })
    expect(parseCheckoutMetadata(metadata)).toEqual({
      ok: true, clientId: CLIENT_ID, subType: 'coach_monthly', isCoachSubscription: true, coachId: COACH_ID,
    })
  })

  it('keeps subscription and customer metadata values compatible', () => {
    expect(buildSubscriptionMetadata(CLIENT_ID, 'client_monthly')).toEqual({ clientId: CLIENT_ID, subType: 'client_monthly' })
    expect(buildCoachCustomerMetadata(CLIENT_ID, COACH_ID)).toEqual({ userId: CLIENT_ID, coachId: COACH_ID })
    expect(Object.values(STRIPE_METADATA_KEYS)).toEqual(['clientId', 'coachId', 'planId', 'subType', 'type'])
  })

  it.each([
    null,
    { clientId: CLIENT_ID, coachId: 'platform', subType: 'client_monthly' },
    { clientId: CLIENT_ID, planId: 'client_monthly', coachId: 'platform', subType: 'client_monthly', extra: 'forbidden' },
    { clientId: CLIENT_ID, planId: 'client_yearly', coachId: 'platform', subType: 'client_monthly' },
    { clientId: CLIENT_ID, coachId: COACH_ID, subType: 'coach_monthly', type: 'unexpected' },
    { clientId: CLIENT_ID, coachId: COACH_ID, subType: 'client_monthly', type: 'coach_subscription' },
  ])('rejects missing, unknown or incompatible metadata: %j', metadata => {
    expect(parseCheckoutMetadata(metadata as Record<string, string> | null)).toMatchObject({ ok: false })
  })
})

describe('central Billing idempotency contract', () => {
  it('preserves the checkout keys including their current timestamp limitation', () => {
    expect(buildPlatformCheckoutIdempotencyKey(CLIENT_ID, 'client_monthly', 123)).toBe(`checkout-${CLIENT_ID}-client_monthly-123`)
    expect(buildCoachCheckoutIdempotencyKey(CLIENT_ID, COACH_ID, 456)).toBe(`coach-checkout-${CLIENT_ID}-${COACH_ID}-456`)
  })

  it('classifies durable webhook terminal claims and the payment conflict authority', () => {
    expect(isCompletedWebhookClaim(WEBHOOK_CLAIM_OUTCOMES.alreadySuccess)).toBe(true)
    expect(isCompletedWebhookClaim(WEBHOOK_CLAIM_OUTCOMES.alreadySkipped)).toBe(true)
    expect(isCompletedWebhookClaim(WEBHOOK_CLAIM_OUTCOMES.claimed)).toBe(false)
    expect(isCompletedWebhookClaim('failed')).toBe(false)
    expect(STRIPE_EVENT_ID_CONFLICT_TARGET).toBe('stripe_event_id')
  })

  it('keeps production metadata construction and parsing on the central boundary', () => {
    const checkout = readFileSync('lib/billing/checkout/service.ts', 'utf8')
    const webhook = readFileSync('lib/billing/webhook/service.ts', 'utf8')
    const standaloneCheck = readFileSync('scripts/test-stripe-metadata.mjs', 'utf8')
    expect(checkout).toContain('buildPlatformCheckoutMetadata')
    expect(checkout).toContain('buildCoachCheckoutMetadata')
    expect(checkout).toContain('buildPlatformCheckoutIdempotencyKey')
    expect(checkout).toContain('buildCoachCheckoutIdempotencyKey')
    expect(checkout).not.toMatch(/metadata:\s*\{\s*clientId/)
    expect(webhook).toContain('parseCheckoutMetadata')
    expect(standaloneCheck).toContain("from '../lib/stripe/metadata.ts'")
    expect(standaloneCheck).not.toContain('function parseCheckoutMetadata')
  })
})
