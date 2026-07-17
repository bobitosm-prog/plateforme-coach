import { existsSync, readFileSync } from 'node:fs'
import { describe, expect, it, vi } from 'vitest'
import type Stripe from 'stripe'
import {
  createBillingReconciliationStripePort,
  reconcileBillingAudit,
  type BillingReconciliationRepository,
  type BillingReconciliationStripePort,
  type ReconciliationSnapshot,
} from '@/lib/billing/reconciliation'

const NOW = new Date('2026-07-17T12:00:00.000Z')

function cleanSnapshot(): ReconciliationSnapshot {
  return {
    webhookEvents: [{
      eventId: 'evt_paid', eventType: 'invoice.payment_succeeded', status: 'success',
      processedAt: '2026-07-17T11:59:00.000Z', processingStartedAt: null, objectId: 'in_paid',
    }],
    payments: [{ id: 'pay_1', stripeEventId: 'evt_paid', checkoutSessionId: null, status: 'paid' }],
    profiles: [{
      id: 'profile_1', stripeCustomerId: 'cus_1', stripeSubscriptionId: 'sub_1',
      stripeAccountId: 'acct_1', subscriptionStatus: 'active',
    }],
  }
}

function ports(snapshot = cleanSnapshot()) {
  const repository: BillingReconciliationRepository = {
    readSnapshot: vi.fn(async () => snapshot),
  }
  const stripe: BillingReconciliationStripePort = {
    retrieveCustomer: vi.fn(async () => ({ ok: true as const, value: { deleted: false } })),
    retrieveSubscription: vi.fn(async () => ({ ok: true as const, value: { status: 'active', customerId: 'cus_1' } })),
    retrieveConnectAccount: vi.fn(async () => ({
      ok: true as const, value: { chargesEnabled: true, payoutsEnabled: true, detailsSubmitted: true },
    })),
    listRecentCompletedCheckouts: vi.fn(async () => ({ ok: true as const, value: [] })),
  }
  return { repository, stripe }
}

async function audit(snapshot = cleanSnapshot(), overrides: Partial<ReturnType<typeof ports>['stripe']> = {}, maxIssues?: number) {
  const deps = ports(snapshot)
  Object.assign(deps.stripe, overrides)
  const report = await reconcileBillingAudit({ ...deps, now: () => NOW, maxIssues })
  return { report, ...deps }
}

describe('Billing reconciliation audit', () => {
  it('returns an empty read-only report when local and Stripe states agree', async () => {
    const { report, repository } = await audit()
    expect(report).toEqual({
      generatedAt: NOW.toISOString(), readOnly: true,
      scanned: { webhookEvents: 1, payments: 1, profiles: 1, completedCheckouts: 0 },
      issues: [], truncated: false, partial: false,
    })
    expect(repository.readSnapshot).toHaveBeenCalledWith({ limit: 100 })
  })

  it('detects stale failed and processing webhook claims', async () => {
    const snapshot = cleanSnapshot()
    snapshot.webhookEvents.push(
      { eventId: 'evt_failed', eventType: 'checkout.session.completed', status: 'failed', processedAt: '2026-07-17T11:00:00Z', processingStartedAt: null, objectId: 'cs_failed' },
      { eventId: 'evt_processing', eventType: 'account.updated', status: 'processing', processedAt: '2026-07-17T11:00:00Z', processingStartedAt: '2026-07-17T11:50:00Z', objectId: 'acct_stale' },
    )
    const { report } = await audit(snapshot)
    expect(report.issues.map(issue => issue.code)).toEqual(expect.arrayContaining(['WEBHOOK_FAILED_STALE', 'WEBHOOK_PROCESSING_STALE']))
  })

  it('detects missing, absent-authority and duplicated payments', async () => {
    const snapshot = cleanSnapshot()
    snapshot.webhookEvents.push({
      eventId: 'evt_missing', eventType: 'checkout.session.completed', status: 'success',
      processedAt: NOW.toISOString(), processingStartedAt: null, objectId: 'cs_missing',
    })
    snapshot.payments.push(
      { id: 'pay_no_event', stripeEventId: null, checkoutSessionId: null, status: 'paid' },
      { id: 'pay_duplicate', stripeEventId: 'evt_paid', checkoutSessionId: null, status: 'paid' },
    )
    const { report } = await audit(snapshot)
    expect(report.issues.map(issue => issue.code)).toEqual(expect.arrayContaining([
      'PAYMENT_MISSING_FOR_EVENT', 'PAYMENT_EVENT_ID_MISSING', 'PAYMENT_EVENT_ID_DUPLICATED',
    ]))
  })

  it('detects missing customer authority and a deleted Stripe customer', async () => {
    const snapshot = cleanSnapshot()
    snapshot.profiles.push({
      id: 'profile_without_customer', stripeCustomerId: null, stripeSubscriptionId: 'sub_2',
      stripeAccountId: null, subscriptionStatus: 'active',
    })
    const { report } = await audit(snapshot, {
      retrieveCustomer: vi.fn(async () => ({ ok: true as const, value: { deleted: true } })),
    })
    expect(report.issues.map(issue => issue.code)).toEqual(expect.arrayContaining([
      'PROFILE_CUSTOMER_ID_MISSING', 'STRIPE_CUSTOMER_NOT_FOUND',
    ]))
  })

  it('detects divergent and unknown subscription statuses fail-closed', async () => {
    const snapshot = cleanSnapshot()
    const diverged = await audit(snapshot, {
      retrieveSubscription: vi.fn(async () => ({ ok: true as const, value: { status: 'past_due', customerId: 'cus_1' } })),
    })
    expect(diverged.report.issues).toContainEqual(expect.objectContaining({ code: 'SUBSCRIPTION_STATUS_DIVERGED' }))

    snapshot.profiles[0].subscriptionStatus = 'future_state'
    const unknown = await audit(snapshot)
    expect(unknown.report.issues).toContainEqual(expect.objectContaining({ code: 'SUBSCRIPTION_STATUS_UNKNOWN' }))
  })

  it('detects a subscription attached to another Stripe customer', async () => {
    const { report } = await audit(cleanSnapshot(), {
      retrieveSubscription: vi.fn(async () => ({
        ok: true as const, value: { status: 'active', customerId: 'cus_foreign' },
      })),
    })
    expect(report.issues).toContainEqual(expect.objectContaining({ code: 'SUBSCRIPTION_CUSTOMER_DIVERGED' }))
    expect(JSON.stringify(report)).not.toContain('cus_foreign')
  })

  it('detects incomplete Connect authority', async () => {
    const { report } = await audit(cleanSnapshot(), {
      retrieveConnectAccount: vi.fn(async () => ({
        ok: true as const, value: { chargesEnabled: true, payoutsEnabled: false, detailsSubmitted: false },
      })),
    })
    expect(report.issues).toContainEqual(expect.objectContaining({
      code: 'CONNECT_ACCOUNT_INCOMPLETE', recommendation: 'COMPLETE_CONNECT_ONBOARDING',
    }))
  })

  it('classifies absent remote subscription and Connect authorities without treating them as transport outages', async () => {
    const { report } = await audit(cleanSnapshot(), {
      retrieveSubscription: vi.fn(async () => ({ ok: false as const, reason: 'not_found' as const })),
      retrieveConnectAccount: vi.fn(async () => ({ ok: false as const, reason: 'not_found' as const })),
    })
    expect(report.partial).toBe(false)
    expect(report.issues.map(issue => issue.code)).toEqual(expect.arrayContaining([
      'STRIPE_SUBSCRIPTION_NOT_FOUND', 'CONNECT_ACCOUNT_NOT_FOUND',
    ]))
  })

  it('detects a completed checkout without a local webhook claim', async () => {
    const { report } = await audit(cleanSnapshot(), {
      listRecentCompletedCheckouts: vi.fn(async () => ({ ok: true as const, value: [{ id: 'cs_orphan' }] })),
    })
    expect(report.issues).toContainEqual(expect.objectContaining({ code: 'CHECKOUT_WEBHOOK_MISSING' }))
  })

  it('continues after a partial Stripe outage without exposing provider errors', async () => {
    const { report } = await audit(cleanSnapshot(), {
      retrieveSubscription: vi.fn(async () => ({ ok: false as const, reason: 'unavailable' as const })),
    })
    expect(report.partial).toBe(true)
    expect(report.issues).toContainEqual(expect.objectContaining({ code: 'STRIPE_READ_FAILED' }))
    expect(JSON.stringify(report)).not.toMatch(/secret|token|signature|email|https?:\/\//i)
  })

  it('bounds issues and replaces raw authorities with opaque references', async () => {
    const snapshot = cleanSnapshot()
    snapshot.payments = Array.from({ length: 5 }, (_, index) => ({
      id: `pay_sensitive_${index}`, stripeEventId: null, checkoutSessionId: null, status: 'paid',
    }))
    const { report } = await audit(snapshot, {}, 2)
    expect(report.issues).toHaveLength(2)
    expect(report.truncated).toBe(true)
    expect(JSON.stringify(report)).not.toContain('pay_sensitive_')
    expect(report.issues.every(issue => /^[a-z]+:[a-f0-9]{12}$/.test(issue.entityRef))).toBe(true)
  })

  it('exposes no mutation port and no public reconciliation route', async () => {
    const { repository, stripe } = ports()
    await reconcileBillingAudit({ repository, stripe, now: () => NOW })
    expect(Object.keys(repository)).toEqual(['readSnapshot'])
    expect(Object.keys(stripe).every(key => key.startsWith('retrieve') || key.startsWith('list'))).toBe(true)

    expect(existsSync('app/api/stripe/reconciliation/route.ts')).toBe(false)
    expect(existsSync('app/api/admin/billing/reconciliation/route.ts')).toBe(false)
    expect(readFileSync('app/api/stripe/webhook/route.ts', 'utf8')).not.toContain('reconcileBillingAudit')
  })
})

describe('Billing reconciliation Stripe adapter', () => {
  it('normalizes provider reads and never returns provider error details', async () => {
    const stripe = {
      customers: { retrieve: vi.fn().mockRejectedValue({ statusCode: 500, message: 'secret provider payload' }) },
      subscriptions: { retrieve: vi.fn().mockResolvedValue({ status: 'active', customer: 'cus_server' }) },
      accounts: { retrieve: vi.fn().mockResolvedValue({ charges_enabled: true, payouts_enabled: false, details_submitted: true }) },
      checkout: { sessions: { list: vi.fn().mockResolvedValue({ data: [{ id: 'cs_complete', status: 'complete' }, { id: 'cs_open', status: 'open' }] }) } },
    } as unknown as Stripe
    const port = createBillingReconciliationStripePort(stripe)

    expect(await port.retrieveCustomer('cus_private')).toEqual({ ok: false, reason: 'unavailable' })
    expect(await port.retrieveSubscription('sub_private')).toEqual({ ok: true, value: { status: 'active', customerId: 'cus_server' } })
    expect(await port.retrieveConnectAccount('acct_private')).toEqual({
      ok: true, value: { chargesEnabled: true, payoutsEnabled: false, detailsSubmitted: true },
    })
    expect(await port.listRecentCompletedCheckouts({ limit: 10 })).toEqual({ ok: true, value: [{ id: 'cs_complete' }] })
    expect(JSON.stringify(await port.retrieveCustomer('cus_private'))).not.toContain('secret provider payload')
  })
})
