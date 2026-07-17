import { describe, expect, it } from 'vitest'
import {
  decideCoachProductAccess,
  decideProductAccess,
  isPaymentSuccessful,
  isProductEntitlementActive,
  isSubscriptionActive,
  normalizePaymentState,
  normalizeProductAccessState,
  normalizeSubscriptionState,
  resolveLegacyDashboardAccess,
  resolveLegacyRepositoryAccess,
  type CoachSubscription,
  type PlatformSubscription,
  type ProductEntitlement,
} from '../../lib/billing'

const now = new Date('2026-07-17T12:00:00.000Z')

const platformSubscription: PlatformSubscription = {
  id: 'sub_platform',
  kind: 'platform',
  userId: 'client-1',
  product: 'client_platform',
  state: 'active',
  period: {
    startsAt: '2026-07-01T00:00:00.000Z',
    endsAt: '2026-08-01T00:00:00.000Z',
    verified: true,
  },
}

const coachSubscription: CoachSubscription = {
  id: 'sub_coach',
  kind: 'coach_service',
  clientId: 'client-1',
  coachId: 'coach-1',
  product: 'coach_service',
  state: 'active',
  period: {
    startsAt: '2026-07-01T00:00:00.000Z',
    endsAt: '2026-08-01T00:00:00.000Z',
    verified: true,
  },
}

const lifetimeEntitlement: ProductEntitlement = {
  id: 'ent_lifetime',
  subjectId: 'client-1',
  product: 'client_platform',
  state: 'active',
  validFrom: '2026-01-01T00:00:00.000Z',
  validUntil: null,
  periodVerified: true,
}

describe('Billing domain model', () => {
  it.each([
    ['paid', 'paid', true],
    ['succeeded', 'paid', true],
    ['completed', 'paid', true],
    ['pending', 'pending', false],
    ['refunded', 'refunded', false],
    ['canceled', 'canceled', false],
    ['unexpected', 'unknown', false],
  ])('normalizes payment %s as %s without granting ambiguous success', (raw, expected, success) => {
    expect(normalizePaymentState(raw)).toBe(expected)
    expect(isPaymentSuccessful(raw)).toBe(success)
  })

  it('never grants durable product access from a successful payment alone', () => {
    expect(decideProductAccess({ product: 'client_platform', now, paymentState: 'paid' })).toEqual({
      allowed: false,
      reason: 'PAYMENT_NOT_AUTHORITY',
    })
  })

  it('grants access from a verified active subscription without requiring a recent payment', () => {
    expect(isSubscriptionActive(platformSubscription, now)).toBe(true)
    expect(decideProductAccess({ product: 'client_platform', now, subscription: platformSubscription })).toEqual({
      allowed: true,
      reason: 'SUBSCRIPTION_ACTIVE',
    })
  })

  it('fails closed when an active status has no verified current period', () => {
    expect(isSubscriptionActive({
      ...platformSubscription,
      period: { ...platformSubscription.period, verified: false },
    }, now)).toBe(false)
    expect(isSubscriptionActive({
      ...platformSubscription,
      period: { ...platformSubscription.period, endsAt: '2026-07-17T11:59:59.000Z' },
    }, now)).toBe(false)
  })

  it('requires an active, correctly scoped coach relationship despite payment or subscription state', () => {
    expect(decideCoachProductAccess({
      clientId: 'client-1', coachId: 'coach-1', relationship: 'inactive',
      now, subscription: coachSubscription, paymentState: 'paid',
    })).toEqual({ allowed: false, reason: 'RELATIONSHIP_NOT_ACTIVE' })

    expect(decideCoachProductAccess({
      clientId: 'client-1', coachId: 'coach-2', relationship: 'active',
      now, subscription: coachSubscription,
    })).toEqual({ allowed: false, reason: 'SUBSCRIPTION_SCOPE_MISMATCH' })
  })

  it('keeps platform and coach subscriptions independent', () => {
    expect(decideProductAccess({
      product: 'client_platform', now, subscription: coachSubscription,
    })).toEqual({ allowed: false, reason: 'ACCESS_NOT_ACTIVE' })
    expect(decideProductAccess({
      product: 'coach_service', now, subscription: platformSubscription,
    })).toEqual({ allowed: false, reason: 'ACCESS_NOT_ACTIVE' })
    expect(decideCoachProductAccess({
      clientId: 'client-1', coachId: 'coach-1', relationship: 'active', now,
      subscription: coachSubscription,
    })).toEqual({ allowed: true, reason: 'SUBSCRIPTION_ACTIVE' })
  })

  it('accepts a verified lifetime entitlement independently of payment history', () => {
    expect(isProductEntitlementActive(lifetimeEntitlement, now)).toBe(true)
    expect(decideProductAccess({
      product: 'client_platform', now, entitlement: lifetimeEntitlement,
    })).toEqual({ allowed: true, reason: 'ENTITLEMENT_ACTIVE' })
  })

  it.each(['refunded', 'canceled', 'unexpected'])(
    'fails closed for payment state %s without another authority',
    (paymentState) => {
      expect(decideProductAccess({ product: 'client_platform', now, paymentState })).toEqual({
        allowed: false,
        reason: 'ACCESS_NOT_ACTIVE',
      })
    },
  )

  it.each(['cancel_scheduled', 'canceled', 'expired', 'past_due', 'unknown'] as const)(
    'fails closed for subscription state %s',
    (state) => {
      expect(decideProductAccess({
        product: 'client_platform',
        now,
        subscription: { ...platformSubscription, state },
      })).toEqual({ allowed: false, reason: 'ACCESS_NOT_ACTIVE' })
    },
  )

  it.each(['suspended', 'expired', 'revoked', 'unknown'] as const)(
    'fails closed for entitlement state %s',
    (state) => {
      expect(decideProductAccess({
        product: 'client_platform',
        now,
        entitlement: { ...lifetimeEntitlement, state },
      })).toEqual({ allowed: false, reason: 'ACCESS_NOT_ACTIVE' })
    },
  )

  it('normalizes unknown subscription and access values as unknown', () => {
    expect(normalizeSubscriptionState('provider_future_state')).toBe('unknown')
    expect(normalizeProductAccessState('future_access')).toBe('unknown')
  })
})

describe('legacy Billing compatibility adapters', () => {
  it.each([
    ['invited', null, null, true, 'invited'],
    ['lifetime', null, null, true, 'lifetime'],
    ['beta', null, '2026-07-18T00:00:00.000Z', true, 'beta'],
    ['beta', null, '2026-07-17T00:00:00.000Z', false, 'none'],
    ['client_monthly', 'active', null, true, 'active'],
    ['client_monthly', 'active', '2026-07-18T00:00:00.000Z', true, 'active'],
    ['client_monthly', 'active', '2026-07-17T00:00:00.000Z', false, 'none'],
    [null, 'canceled', null, false, 'none'],
    [null, 'future_status', null, false, 'none'],
  ])(
    'preserves dashboard access for type=%s status=%s',
    (subscription_type, subscription_status, subscription_end_date, allowed, source) => {
      expect(resolveLegacyDashboardAccess({
        subscription_type,
        subscription_status,
        subscription_end_date,
      }, now)).toEqual({ allowed, source })
    },
  )

  it('preserves the repository trial compatibility independently of canonical subscriptions', () => {
    expect(resolveLegacyRepositoryAccess({
      subscription_type: null,
      subscription_status: null,
      subscription_end_date: null,
      trial_ends_at: '2026-07-18T00:00:00.000Z',
    }, now)).toEqual({ access: 'active', trial: 'active' })
    expect(resolveLegacyRepositoryAccess({
      subscription_type: null,
      subscription_status: null,
      subscription_end_date: null,
      trial_ends_at: 'invalid',
    }, now)).toEqual({ access: 'inactive', trial: 'invalid' })
  })
})
