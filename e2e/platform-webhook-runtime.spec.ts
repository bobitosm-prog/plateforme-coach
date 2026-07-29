import { expect, test, type Page } from '@playwright/test'
import Stripe from 'stripe'
import { createRunSuffix, personaForRun } from '../tests/fixtures/personas'
import {
  cleanupLocalPersonas,
  createLocalAdminClient,
  createLocalPersona,
} from '../tests/fixtures/supabase'

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

test('platform webhook runtime signé + replay', async ({ page, request }) => {
  test.setTimeout(120_000)
  for (const value of [supabaseUrl, process.env.MOOVX_E2E_APP_URL || 'http://127.0.0.1:3210']) {
    if (!['127.0.0.1', 'localhost'].includes(new URL(value).hostname)) {
      throw new Error('Platform webhook E2E must remain local')
    }
  }
  if (!webhookSecret || !stripeSecretKey) throw new Error('Local Stripe webhook E2E configuration is missing')

  const admin = createLocalAdminClient({ url: supabaseUrl, serviceRoleKey, mode: 'e2e' })
  const persona = personaForRun('client', `platform-webhook-${createRunSuffix()}`)
  const stripe = new Stripe(stripeSecretKey)
  const eventId = `evt_platform_webhook_${createRunSuffix()}`
  let created = false

  try {
    await createLocalPersona(admin, persona, password, {
      subscription_status: 'inactive',
      subscription_type: null,
      stripe_customer_id: null,
      stripe_subscription_id: null,
      subscription_end_date: null,
    })
    created = true
    await login(page, persona.email)

    const checkout = await page.evaluate(async () => {
      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ planId: 'client_monthly' }),
      })
      return { status: response.status, body: await response.json() }
    })
    expect(checkout.status).toBe(200)

    const pending = await admin
      .from('payments')
      .select('id,status,stripe_checkout_session_id,stripe_event_id,paid_at')
      .eq('client_id', persona.id)
      .is('coach_id', null)
      .single()
    expect(pending.error).toBeNull()
    if (!pending.data?.stripe_checkout_session_id) {
      throw new Error('Platform checkout did not persist its local session authority')
    }
    expect(pending.data).toMatchObject({
      status: 'pending',
      stripe_event_id: null,
      paid_at: null,
    })

    const createdAt = Math.floor(Date.now() / 1000)
    const payload = JSON.stringify({
      id: eventId,
      object: 'event',
      api_version: '2025-06-30.basil',
      created: createdAt,
      data: {
        object: {
          id: pending.data.stripe_checkout_session_id,
          object: 'checkout.session',
          amount_total: 1000,
          currency: 'chf',
          customer: `cus_local_${persona.id}`,
          livemode: false,
          metadata: {
            clientId: persona.id,
            planId: 'client_monthly',
            coachId: 'platform',
            subType: 'client_monthly',
          },
          mode: 'subscription',
          payment_status: 'paid',
          status: 'complete',
          subscription: `sub_local_${persona.id}`,
        },
      },
      livemode: false,
      pending_webhooks: 1,
      request: { id: null, idempotency_key: null },
      type: 'checkout.session.completed',
    })
    const signature = stripe.webhooks.generateTestHeaderString({
      payload,
      secret: webhookSecret,
      timestamp: createdAt,
    })

    const firstDelivery = await request.post('/api/stripe/webhook/platform', {
      data: payload,
      headers: {
        'content-type': 'application/json',
        'stripe-signature': signature,
      },
    })
    const firstDeliveryBody = await firstDelivery.json()
    expect(firstDelivery.status()).toBe(200)
    expect(firstDeliveryBody).toEqual({ received: true })

    const claim = await admin
      .from('stripe_webhook_events')
      .select('event_id,event_type,processing_status,attempt_count')
      .eq('event_id', eventId)
      .single()
    expect(claim.error).toBeNull()
    expect(claim.data).toMatchObject({
      event_id: eventId,
      event_type: 'checkout.session.completed',
      processing_status: 'success',
      attempt_count: 1,
    })

    const finalized = await admin
      .from('payments')
      .select('id,status,stripe_checkout_session_id,stripe_event_id,paid_at')
      .eq('id', pending.data.id)
      .single()
    expect(finalized.error).toBeNull()
    expect(finalized.data).toMatchObject({
      id: pending.data.id,
      status: 'paid',
      stripe_checkout_session_id: pending.data.stripe_checkout_session_id,
      stripe_event_id: eventId,
    })
    expect(finalized.data?.paid_at).not.toBeNull()

    const replay = await request.post('/api/stripe/webhook/platform', {
      data: payload,
      headers: {
        'content-type': 'application/json',
        'stripe-signature': signature,
      },
    })
    expect(replay.status()).toBe(200)
    expect(await replay.json()).toEqual({ received: true, duplicate: true })

    const afterReplay = await admin
      .from('payments')
      .select('id,status,stripe_checkout_session_id,stripe_event_id,paid_at')
      .eq('id', pending.data.id)
      .single()
    expect(afterReplay.error).toBeNull()
    expect(afterReplay.data).toEqual(finalized.data)
  } finally {
    await admin.from('stripe_webhook_events').delete().eq('event_id', eventId)
    await admin.from('payments').delete().eq('client_id', persona.id)
    if (created) await cleanupLocalPersonas(admin, [persona.id])
  }
})
