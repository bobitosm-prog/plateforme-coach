import { expect, test, type Page } from '@playwright/test'
import {
  createBillingReconciliationRepository,
  createBillingReconciliationStripePort,
  reconcileBillingAudit,
} from '../lib/billing/reconciliation'
import { createRunSuffix, personaForRun } from '../tests/fixtures/personas'
import {
  cleanupLocalPersonas,
  createLocalAdminClient,
  createLocalPersona,
} from '../tests/fixtures/supabase'
import {
  createFakeInvoice,
  createLocalStripeClient,
  deliverPlatformEvent,
  readFakeStripeRequests,
  readFakeStripeState,
  resetFakeStripe,
  setFakeSubscriptionStatus,
  signPlatformEvent,
} from './helpers/billing-fixtures'

const supabaseUrl = process.env.API_URL!
const serviceRoleKey = process.env.SERVICE_ROLE_KEY!
const webhookSecret = process.env.STRIPE_PLATFORM_WEBHOOK_SECRET!
const stripeSecretKey = process.env.STRIPE_SECRET_KEY!
const password = 'Local-E2E-Password-42!'

async function login(page: Page, email: string) {
  await page.goto('/login?next=/')
  await page.locator('input[type="email"]').fill(email)
  await page.locator('input[type="password"]').fill(password)
  await page.locator('button.gold-btn').click()
  await expect.poll(() => new URL(page.url()).pathname, { timeout: 20_000 }).toBe('/')
}

test('réconciliation abonnement et Billing: cycle Platform, replay et retry', async ({ page, request }) => {
  test.setTimeout(180_000)
  for (const value of [supabaseUrl, process.env.MOOVX_E2E_APP_URL || 'http://127.0.0.1:3210']) {
    if (!['127.0.0.1', 'localhost'].includes(new URL(value).hostname)) {
      throw new Error('Billing reconciliation E2E must remain local')
    }
  }
  if (!webhookSecret || !stripeSecretKey) throw new Error('Local Stripe Billing E2E configuration is missing')

  const admin = createLocalAdminClient({ url: supabaseUrl, serviceRoleKey, mode: 'e2e' })
  const persona = personaForRun('client', `billing-${createRunSuffix()}`)
  const stripe = createLocalStripeClient(stripeSecretKey)
  const created = Math.floor(Date.now() / 1000)
  const runSuffix = createRunSuffix().replaceAll('-', '_')
  const eventIds = {
    checkout: `evt_billing_checkout_${runSuffix}`,
    updated: `evt_billing_updated_${runSuffix}`,
    renewal: `evt_billing_renewal_${runSuffix}`,
    retry: `evt_billing_retry_${runSuffix}`,
    deleted: `evt_billing_deleted_${runSuffix}`,
  }
  let personaCreated = false

  try {
    await resetFakeStripe()
    await createLocalPersona(admin, persona, password, {
      subscription_status: 'inactive',
      subscription_type: null,
      stripe_customer_id: null,
      stripe_subscription_id: null,
      subscription_end_date: null,
    })
    personaCreated = true
    await login(page, persona.email)

    const rejected = await page.evaluate(async foreignId => {
      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ planId: 'client_monthly', clientId: foreignId }),
      })
      return response.status
    }, crypto.randomUUID())
    expect(rejected).toBe(400)
    expect(await readFakeStripeRequests()).toHaveLength(0)

    const checkoutResponse = await page.evaluate(async () => {
      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ planId: 'client_monthly' }),
      })
      return { status: response.status, body: await response.json() }
    })
    expect(checkoutResponse.status).toBe(200)

    const pending = await admin.from('payments')
      .select('id,status,stripe_checkout_session_id,stripe_event_id,paid_at')
      .eq('client_id', persona.id)
      .is('coach_id', null)
      .single()
    expect(pending.error).toBeNull()
    if (!pending.data?.stripe_checkout_session_id) throw new Error('Billing checkout did not persist its session')
    expect(pending.data).toMatchObject({ status: 'pending', stripe_event_id: null, paid_at: null })

    const checkoutCalls = (await readFakeStripeRequests())
      .filter(call => call.method === 'POST' && call.path === '/v1/checkout/sessions')
    expect(checkoutCalls).toHaveLength(1)
    expect(checkoutCalls[0].idempotencyKey).toBe(`checkout-payment-${pending.data.id}`)

    const initialState = await readFakeStripeState()
    const session = initialState.checkoutSessions.find(candidate => candidate.id === pending.data?.stripe_checkout_session_id)
    if (!session) throw new Error('Fake Stripe checkout authority is missing')
    const subscription = initialState.subscriptions.find(candidate => candidate.id === session.subscription)
    if (!subscription) throw new Error('Fake Stripe subscription authority is missing')

    const checkoutEvent = signPlatformEvent({
      stripe,
      secret: webhookSecret,
      eventId: eventIds.checkout,
      type: 'checkout.session.completed',
      object: session,
      created,
    })
    expect(await deliverPlatformEvent(request, checkoutEvent)).toEqual({ status: 200, body: { received: true } })

    await expect.poll(async () => {
      const payment = await admin.from('payments')
        .select('status,paid_at,stripe_event_id,stripe_checkout_session_id')
        .eq('id', pending.data.id)
        .single()
      return payment.data
    }).toMatchObject({
      status: 'paid',
      stripe_event_id: eventIds.checkout,
      stripe_checkout_session_id: session.id,
    })
    const paid = await admin.from('payments').select('paid_at').eq('id', pending.data.id).single()
    expect(paid.data?.paid_at).not.toBeNull()

    const activeProfile = await admin.from('profiles')
      .select('stripe_customer_id,stripe_subscription_id,subscription_status,subscription_type,subscription_end_date')
      .eq('id', persona.id)
      .single()
    expect(activeProfile.data).toMatchObject({
      stripe_customer_id: session.customer,
      stripe_subscription_id: session.subscription,
      subscription_status: 'active',
      subscription_type: 'client_monthly',
    })
    expect(activeProfile.data?.subscription_end_date).not.toBeNull()

    const checkoutClaim = await admin.from('stripe_webhook_events')
      .select('processing_status,attempt_count')
      .eq('event_id', eventIds.checkout)
      .single()
    expect(checkoutClaim.data).toEqual({ processing_status: 'success', attempt_count: 1 })

    const providerReadsBeforeReplay = (await readFakeStripeRequests()).length
    expect(await deliverPlatformEvent(request, checkoutEvent)).toEqual({
      status: 200,
      body: { received: true, duplicate: true },
    })
    expect(await readFakeStripeRequests()).toHaveLength(providerReadsBeforeReplay)

    const pastDueSubscription = await setFakeSubscriptionStatus(subscription.id, 'past_due')
    const updatedEvent = signPlatformEvent({
      stripe,
      secret: webhookSecret,
      eventId: eventIds.updated,
      type: 'customer.subscription.updated',
      object: pastDueSubscription,
      created: created + 1,
    })
    expect(await deliverPlatformEvent(request, updatedEvent)).toEqual({ status: 200, body: { received: true } })
    const pastDueProfile = await admin.from('profiles')
      .select('stripe_subscription_id,subscription_status,subscription_type,subscription_end_date')
      .eq('id', persona.id)
      .single()
    expect(pastDueProfile.data).toEqual({
      stripe_subscription_id: subscription.id,
      subscription_status: 'past_due',
      subscription_type: 'client_monthly',
      subscription_end_date: activeProfile.data?.subscription_end_date,
    })

    await setFakeSubscriptionStatus(subscription.id, 'active')
    const renewalInvoice = await createFakeInvoice({
      id: `in_billing_renewal_${runSuffix}`,
      customer: session.customer,
      subscription: subscription.id,
    })
    await new Promise(resolve => setTimeout(resolve, 20))
    const renewalEvent = signPlatformEvent({
      stripe,
      secret: webhookSecret,
      eventId: eventIds.renewal,
      type: 'invoice.payment_succeeded',
      object: renewalInvoice,
      created: created + 2,
    })
    expect(await deliverPlatformEvent(request, renewalEvent)).toEqual({ status: 200, body: { received: true } })

    const renewalPayments = await admin.from('payments')
      .select('id,status,stripe_event_id,client_id')
      .eq('stripe_event_id', eventIds.renewal)
    expect(renewalPayments.error).toBeNull()
    expect(renewalPayments.data).toHaveLength(1)
    expect(renewalPayments.data?.[0]).toMatchObject({
      status: 'paid',
      stripe_event_id: eventIds.renewal,
      client_id: persona.id,
    })
    const renewedProfile = await admin.from('profiles')
      .select('subscription_status,subscription_end_date')
      .eq('id', persona.id)
      .single()
    expect(renewedProfile.data?.subscription_status).toBe('active')
    expect(Date.parse(renewedProfile.data?.subscription_end_date || '')).toBeGreaterThan(
      Date.parse(activeProfile.data?.subscription_end_date || ''),
    )

    expect(await deliverPlatformEvent(request, renewalEvent)).toEqual({
      status: 200,
      body: { received: true, duplicate: true },
    })
    const renewalReplayCount = await admin.from('payments')
      .select('id', { count: 'exact', head: true })
      .eq('stripe_event_id', eventIds.renewal)
    expect(renewalReplayCount.count).toBe(1)

    const retryInvoiceId = `in_billing_retry_${runSuffix}`
    const retryInvoiceObject = {
      id: retryInvoiceId,
      object: 'invoice',
      amount_paid: 1000,
      billing_reason: 'subscription_cycle',
      currency: 'chf',
      customer: session.customer,
      livemode: false,
      parent: {
        type: 'subscription_details',
        subscription_details: { subscription: subscription.id },
      },
      status: 'paid',
    }
    const retryEvent = signPlatformEvent({
      stripe,
      secret: webhookSecret,
      eventId: eventIds.retry,
      type: 'invoice.payment_succeeded',
      object: retryInvoiceObject,
      created: created + 3,
    })
    expect(await deliverPlatformEvent(request, retryEvent)).toEqual({
      status: 500,
      body: { error: 'Webhook processing failed' },
    })
    const failedClaim = await admin.from('stripe_webhook_events')
      .select('processing_status,attempt_count')
      .eq('event_id', eventIds.retry)
      .single()
    expect(failedClaim.data).toEqual({ processing_status: 'failed', attempt_count: 1 })
    const failedPaymentCount = await admin.from('payments')
      .select('id', { count: 'exact', head: true })
      .eq('stripe_event_id', eventIds.retry)
    expect(failedPaymentCount.count).toBe(0)

    await createFakeInvoice({
      id: retryInvoiceId,
      customer: session.customer,
      subscription: subscription.id,
    })
    expect(await deliverPlatformEvent(request, retryEvent)).toEqual({ status: 200, body: { received: true } })
    const recoveredClaim = await admin.from('stripe_webhook_events')
      .select('processing_status,attempt_count')
      .eq('event_id', eventIds.retry)
      .single()
    expect(recoveredClaim.data).toEqual({ processing_status: 'success', attempt_count: 2 })
    const recoveredPaymentCount = await admin.from('payments')
      .select('id', { count: 'exact', head: true })
      .eq('stripe_event_id', eventIds.retry)
    expect(recoveredPaymentCount.count).toBe(1)

    const canceledSubscription = await setFakeSubscriptionStatus(subscription.id, 'canceled')
    const beforeDeletion = await admin.from('profiles')
      .select('subscription_type,subscription_end_date')
      .eq('id', persona.id)
      .single()
    const deletedEvent = signPlatformEvent({
      stripe,
      secret: webhookSecret,
      eventId: eventIds.deleted,
      type: 'customer.subscription.deleted',
      object: canceledSubscription,
      created: created + 4,
    })
    expect(await deliverPlatformEvent(request, deletedEvent)).toEqual({ status: 200, body: { received: true } })
    const canceledProfile = await admin.from('profiles')
      .select('subscription_status,stripe_subscription_id,subscription_type,subscription_end_date')
      .eq('id', persona.id)
      .single()
    expect(canceledProfile.data).toEqual({
      subscription_status: 'canceled',
      stripe_subscription_id: null,
      subscription_type: beforeDeletion.data?.subscription_type,
      subscription_end_date: beforeDeletion.data?.subscription_end_date,
    })

    const finalClaim = await admin.from('stripe_webhook_events')
      .select('processing_status,attempt_count')
      .eq('event_id', eventIds.deleted)
      .single()
    expect(finalClaim.data).toEqual({ processing_status: 'success', attempt_count: 1 })

    const report = await reconcileBillingAudit({
      repository: createBillingReconciliationRepository(admin),
      stripe: createBillingReconciliationStripePort(stripe),
      limit: 100,
      maxIssues: 100,
    })
    expect(report).toMatchObject({
      readOnly: true,
      partial: false,
      truncated: false,
      issues: [],
      scanned: {
        profiles: 1,
        payments: 3,
        webhookEvents: 5,
        completedCheckouts: 1,
      },
    })
  } finally {
    await admin.from('stripe_webhook_events').delete().in('event_id', Object.values(eventIds))
    await admin.from('payments').delete().eq('client_id', persona.id)
    if (personaCreated) await cleanupLocalPersonas(admin, [persona.id])
    await resetFakeStripe().catch(() => undefined)
  }
})
