import type { APIRequestContext } from '@playwright/test'
import Stripe from 'stripe'
import { assertLocalE2eUrl } from '../../scripts/e2e-local-contract.mjs'

export const LOCAL_STRIPE_URL = 'http://127.0.0.1:55326'

export type FakeStripeRequest = {
  method: string
  path: string
  params: Record<string, string>
  idempotencyKey: string | null
}

export type FakeStripeCustomer = {
  id: string
  object: 'customer'
  deleted: boolean
  livemode: false
}

export type FakeStripeSubscription = {
  id: string
  object: 'subscription'
  customer: string
  status: Stripe.Subscription.Status
  current_period_end: number
  livemode: false
}

export type FakeStripeCheckout = {
  id: string
  object: 'checkout.session'
  customer: string
  subscription: string
  metadata: Record<string, string>
  payment_status: 'paid'
  status: 'complete'
  livemode: false
}

export type FakeStripeInvoice = {
  id: string
  object: 'invoice'
  amount_paid: number
  billing_reason: 'subscription_cycle'
  currency: string
  customer: string
  livemode: false
  parent: {
    type: 'subscription_details'
    subscription_details: { subscription: string }
  }
  status: 'paid'
}

export type FakeStripeState = {
  customers: FakeStripeCustomer[]
  checkoutSessions: FakeStripeCheckout[]
  subscriptions: FakeStripeSubscription[]
  invoices: FakeStripeInvoice[]
}

type SignedEvent = {
  payload: string
  signature: string
  eventId: string
}

function assertFakeStripeBoundary() {
  const url = assertLocalE2eUrl(LOCAL_STRIPE_URL, 'fake Stripe URL')
  if (url.protocol !== 'http:' || url.port !== '55326') {
    throw new Error('Billing E2E requires the canonical fake Stripe boundary')
  }
}

async function control(path: string, init?: RequestInit) {
  assertFakeStripeBoundary()
  const response = await fetch(`${LOCAL_STRIPE_URL}${path}`, init)
  if (!response.ok) throw new Error(`Fake Stripe control failed with HTTP ${response.status}`)
  return response
}

export async function resetFakeStripe(): Promise<void> {
  await control('/__requests', { method: 'DELETE' })
}

export async function readFakeStripeRequests(): Promise<FakeStripeRequest[]> {
  return await (await control('/__requests')).json() as FakeStripeRequest[]
}

export async function readFakeStripeState(): Promise<FakeStripeState> {
  return await (await control('/__state')).json() as FakeStripeState
}

export async function setFakeSubscriptionStatus(
  subscriptionId: string,
  status: Stripe.Subscription.Status,
): Promise<FakeStripeSubscription> {
  return await (await control(`/__subscriptions/${encodeURIComponent(subscriptionId)}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ status }),
  })).json() as FakeStripeSubscription
}

export async function createFakeInvoice(input: {
  id: string
  customer: string
  subscription: string
  amountPaid?: number
}): Promise<FakeStripeInvoice> {
  return await (await control('/__invoices', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      id: input.id,
      customer: input.customer,
      subscription: input.subscription,
      billing_reason: 'subscription_cycle',
      amount_paid: input.amountPaid || 1000,
      currency: 'chf',
      status: 'paid',
      paid_at: 1_796_169_600,
    }),
  })).json() as FakeStripeInvoice
}

export function createLocalStripeClient(secretKey: string): Stripe {
  assertFakeStripeBoundary()
  return new Stripe(secretKey, {
    host: '127.0.0.1',
    port: 55326,
    protocol: 'http',
  })
}

export function signPlatformEvent(input: {
  stripe: Stripe
  secret: string
  eventId: string
  type: Stripe.Event.Type
  object: Record<string, unknown>
  created: number
}): SignedEvent {
  const payload = JSON.stringify({
    id: input.eventId,
    object: 'event',
    api_version: '2025-06-30.basil',
    created: input.created,
    data: { object: input.object },
    livemode: false,
    pending_webhooks: 1,
    request: { id: null, idempotency_key: null },
    type: input.type,
  })
  return {
    eventId: input.eventId,
    payload,
    signature: input.stripe.webhooks.generateTestHeaderString({
      payload,
      secret: input.secret,
      timestamp: input.created,
    }),
  }
}

export async function deliverPlatformEvent(
  request: APIRequestContext,
  event: SignedEvent,
): Promise<{ status: number; body: Record<string, unknown> }> {
  const response = await request.post('/api/stripe/webhook/platform', {
    data: event.payload,
    headers: {
      'content-type': 'application/json',
      'stripe-signature': event.signature,
    },
  })
  return {
    status: response.status(),
    body: await response.json() as Record<string, unknown>,
  }
}
