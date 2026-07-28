import { existsSync, readFileSync } from 'node:fs'
import { describe, expect, it, vi } from 'vitest'
import type Stripe from 'stripe'
import {
  createBillingReconciliationStripePort,
  RC1_PHASE6_RECONCILIATION_SCOPE,
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
      historicalExcludedCount: 0,
      syntheticExcludedCount: 0,
      quarantinedExcludedCount: 0,
      ignoredInitialInvoiceCount: 0,
      pendingNotFinalizedCount: 0,
      issues: [], truncated: false, partial: false,
    })
    expect(repository.readSnapshot).toHaveBeenCalledWith({ limit: 100 })
  })

  it('keeps a finalized checkout payment linked to its successful webhook green', async () => {
    const snapshot = cleanSnapshot()
    snapshot.webhookEvents = [{
      eventId: 'evt_checkout', eventType: 'checkout.session.completed', status: 'success',
      processedAt: '2026-07-17T11:59:00.000Z', processingStartedAt: null,
      objectId: 'cs_checkout',
    }]
    snapshot.payments = [{
      id: 'pay_checkout',
      stripeEventId: 'evt_checkout',
      checkoutSessionId: 'cs_checkout',
      status: 'paid',
    }]

    const { report } = await audit(snapshot)

    expect(report.issues).not.toContainEqual(expect.objectContaining({
      code: 'PAYMENT_EVENT_ID_MISSING',
    }))
    expect(report.issues).not.toContainEqual(expect.objectContaining({
      code: 'PAYMENT_MISSING_FOR_EVENT',
    }))
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

  it('accepts a subscription_create invoice covered by its paid checkout', async () => {
    const snapshot: ReconciliationSnapshot = {
      webhookEvents: [
        {
          eventId: 'evt_checkout', eventType: 'checkout.session.completed',
          status: 'success', processedAt: NOW.toISOString(),
          processingStartedAt: null, objectId: 'cs_checkout',
          clientId: '76100000-0000-4000-8000-000000000003',
          customerId: 'cus_current', subscriptionId: 'sub_current',
          billingReason: null,
        },
        {
          eventId: 'evt_initial_invoice', eventType: 'invoice.payment_succeeded',
          status: 'success', processedAt: NOW.toISOString(),
          processingStartedAt: null, objectId: 'in_initial',
          clientId: null, customerId: 'cus_current',
          subscriptionId: 'sub_current', billingReason: 'subscription_create',
        },
      ],
      payments: [{
        id: 'pay_checkout', clientId: '76100000-0000-4000-8000-000000000003',
        stripeEventId: 'evt_checkout', checkoutSessionId: 'cs_checkout',
        status: 'paid',
      }],
      profiles: [],
    }

    const { report } = await audit(snapshot)

    expect(report.issues).toEqual([])
    expect(report.ignoredInitialInvoiceCount).toBe(1)
  })

  it('keeps the complete RC1 v2 checkout, payment, invoice and subscription scenario green', async () => {
    const clientId = '76100000-0000-4000-8000-000000000003'
    const snapshot: ReconciliationSnapshot = {
      webhookEvents: [
        {
          eventId: 'evt_rc1_checkout', eventType: 'checkout.session.completed',
          status: 'success', processedAt: NOW.toISOString(),
          processingStartedAt: null, objectId: 'cs_rc1',
          clientId, customerId: 'cus_rc1', subscriptionId: 'sub_rc1',
        },
        {
          eventId: 'evt_rc1_invoice', eventType: 'invoice.payment_succeeded',
          status: 'success', processedAt: NOW.toISOString(),
          processingStartedAt: null, objectId: 'in_rc1',
          customerId: 'cus_rc1', subscriptionId: 'sub_rc1',
          billingReason: 'subscription_create',
        },
      ],
      payments: [{
        id: 'pay_rc1', clientId, stripeEventId: 'evt_rc1_checkout',
        checkoutSessionId: 'cs_rc1', status: 'paid',
      }],
      profiles: [{
        id: clientId, stripeCustomerId: 'cus_rc1',
        stripeSubscriptionId: 'sub_rc1', stripeAccountId: null,
        subscriptionStatus: 'active',
      }],
    }
    const deps = ports(snapshot)
    vi.mocked(deps.stripe.retrieveSubscription).mockResolvedValue({
      ok: true, value: { status: 'active', customerId: 'cus_rc1' },
    })
    vi.mocked(deps.stripe.listRecentCompletedCheckouts).mockResolvedValue({
      ok: true,
      value: [{
        id: 'cs_rc1', clientId, hasMoovxMetadata: true,
      }],
    })

    const report = await reconcileBillingAudit({
      ...deps, now: () => NOW, scope: RC1_PHASE6_RECONCILIATION_SCOPE,
    })

    expect(report).toEqual(expect.objectContaining({
      readOnly: true,
      partial: false,
      truncated: false,
      ignoredInitialInvoiceCount: 1,
      issues: [],
    }))
    expect(report.scanned).toEqual({
      webhookEvents: 2,
      payments: 1,
      profiles: 1,
      completedCheckouts: 1,
    })
  })

  it('requires a payment for subscription_cycle invoices and accepts it when present', async () => {
    const snapshot: ReconciliationSnapshot = {
      webhookEvents: [{
        eventId: 'evt_cycle', eventType: 'invoice.payment_succeeded',
        status: 'success', processedAt: NOW.toISOString(),
        processingStartedAt: null, objectId: 'in_cycle',
        subscriptionId: 'sub_current', billingReason: 'subscription_cycle',
      }],
      payments: [],
      profiles: [],
    }

    const missing = await audit(snapshot)
    expect(missing.report.issues).toContainEqual(expect.objectContaining({
      code: 'PAYMENT_MISSING_FOR_EVENT',
    }))

    snapshot.payments.push({
      id: 'pay_cycle', clientId: '76100000-0000-4000-8000-000000000003',
      stripeEventId: 'evt_cycle', checkoutSessionId: null, status: 'paid',
    })
    const covered = await audit(snapshot)
    expect(covered.report.issues).toEqual([])
  })

  it.each([
    ['with session', 'cs_pending'],
    ['without session', null],
  ])('does not require an event for a pending payment %s', async (_label, sessionId) => {
    const snapshot: ReconciliationSnapshot = {
      webhookEvents: [],
      payments: [{
        id: 'pay_pending', clientId: '76100000-0000-4000-8000-000000000003',
        stripeEventId: null, checkoutSessionId: sessionId, status: 'pending',
      }],
      profiles: [],
    }

    const { report } = await audit(snapshot)

    expect(report.issues).toEqual([])
    expect(report.pendingNotFinalizedCount).toBe(1)
  })

  it('still requires an event for paid payments and pending payments with a successful checkout claim', async () => {
    const snapshot: ReconciliationSnapshot = {
      webhookEvents: [{
        eventId: 'evt_completed', eventType: 'checkout.session.completed',
        status: 'success', processedAt: NOW.toISOString(),
        processingStartedAt: null, objectId: 'cs_completed',
      }],
      payments: [
        {
          id: 'pay_paid', stripeEventId: null,
          checkoutSessionId: 'cs_paid', status: 'paid',
        },
        {
          id: 'pay_pending_completed', stripeEventId: null,
          checkoutSessionId: 'cs_completed', status: 'pending',
        },
      ],
      profiles: [],
    }

    const { report } = await audit(snapshot)

    expect(report.issues.filter(issue =>
      issue.code === 'PAYMENT_EVENT_ID_MISSING')).toHaveLength(2)
    expect(report.pendingNotFinalizedCount).toBe(0)
  })

  it('excludes the frozen 760 cohort and its historical Stripe authorities only in RC1 scope', async () => {
    const oldClient = '76000000-0000-4000-8000-000000000003'
    const snapshot: ReconciliationSnapshot = {
      webhookEvents: [
        {
          eventId: 'evt_old_checkout', eventType: 'checkout.session.completed',
          status: 'failed', processedAt: '2026-07-17T10:00:00Z',
          processingStartedAt: null, objectId: 'cs_old', clientId: oldClient,
          customerId: 'cus_old', subscriptionId: 'sub_old',
        },
        {
          eventId: 'evt_old_invoice', eventType: 'invoice.payment_succeeded',
          status: 'success', processedAt: '2026-07-17T10:00:01Z',
          processingStartedAt: null, objectId: 'in_old', clientId: null,
          customerId: 'cus_old', subscriptionId: 'sub_old',
          billingReason: 'subscription_create',
        },
      ],
      payments: [{
        id: 'pay_old', clientId: oldClient, stripeEventId: null,
        checkoutSessionId: 'cs_old', status: 'paid',
      }],
      profiles: [{
        id: oldClient, stripeCustomerId: 'cus_old',
        stripeSubscriptionId: 'sub_old', stripeAccountId: null,
        subscriptionStatus: 'active',
      }],
    }
    const deps = ports(snapshot)

    const report = await reconcileBillingAudit({
      ...deps, now: () => NOW, scope: RC1_PHASE6_RECONCILIATION_SCOPE,
    })

    expect(report.issues).toEqual([])
    expect(report.historicalExcludedCount).toBe(2)
    expect(report.quarantinedExcludedCount).toBe(2)
    expect(deps.stripe.retrieveCustomer).not.toHaveBeenCalled()
    expect(deps.stripe.retrieveSubscription).not.toHaveBeenCalled()
  })

  it('excludes only verified synthetic fixtures and metadata-free Stripe CLI checkouts', async () => {
    const snapshot: ReconciliationSnapshot = {
      webhookEvents: [{
        eventId: 'evt_rc1_platform_checkout_1785178456533',
        eventType: 'checkout.session.completed', status: 'failed',
        processedAt: NOW.toISOString(), processingStartedAt: null,
        objectId: 'cs_test_rc1_1785178456533', clientId: null,
      }],
      payments: [],
      profiles: [],
    }
    const deps = ports(snapshot)
    vi.mocked(deps.stripe.listRecentCompletedCheckouts).mockResolvedValue({
      ok: true,
      value: [{
        id: 'cs_cli_fixture', clientId: null, hasMoovxMetadata: false,
      }],
    })

    const report = await reconcileBillingAudit({
      ...deps, now: () => NOW, scope: RC1_PHASE6_RECONCILIATION_SCOPE,
    })

    expect(report.issues).toEqual([])
    expect(report.syntheticExcludedCount).toBe(2)
  })

  it('never excludes a current v2 failed event or malformed v2 checkout', async () => {
    const currentClient = '76100000-0000-4000-8000-000000000003'
    const snapshot: ReconciliationSnapshot = {
      webhookEvents: [{
        eventId: 'evt_rc1_platform_checkout_1785178456533',
        eventType: 'checkout.session.completed', status: 'failed',
        processedAt: NOW.toISOString(), processingStartedAt: null,
        objectId: 'cs_current_failed', clientId: currentClient,
      }],
      payments: [],
      profiles: [],
    }
    const deps = ports(snapshot)
    vi.mocked(deps.stripe.listRecentCompletedCheckouts).mockResolvedValue({
      ok: true,
      value: [{
        id: 'cs_current_malformed',
        clientId: currentClient,
        hasMoovxMetadata: false,
      }],
    })

    const report = await reconcileBillingAudit({
      ...deps, now: () => NOW, scope: RC1_PHASE6_RECONCILIATION_SCOPE,
    })

    expect(report.issues.map(issue => issue.code)).toEqual([
      'WEBHOOK_FAILED_STALE',
      'CHECKOUT_WEBHOOK_MISSING',
    ])
    expect(report.syntheticExcludedCount).toBe(0)
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
    expect(await port.listRecentCompletedCheckouts({ limit: 10 })).toEqual({
      ok: true,
      value: [{
        id: 'cs_complete',
        clientId: null,
        hasMoovxMetadata: false,
      }],
    })
    expect(JSON.stringify(await port.retrieveCustomer('cus_private'))).not.toContain('secret provider payload')
  })
})
