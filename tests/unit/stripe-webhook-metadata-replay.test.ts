import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'
import type { NextRequest } from 'next/server'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const mocks = vi.hoisted(() => {
  const constructEvent = vi.fn()
  const checkoutRetrieve = vi.fn()
  const subscriptionRetrieve = vi.fn()
  const invoiceRetrieve = vi.fn()
  const stripeConstructor = vi.fn(function StripeMock() {
    return {
      webhooks: { constructEvent },
      checkout: { sessions: { retrieve: checkoutRetrieve } },
      subscriptions: { retrieve: subscriptionRetrieve },
      invoices: { retrieve: invoiceRetrieve },
    }
  })

  const dedupInsert = vi.fn()
  const webhookEventUpdateEq = vi.fn()
  const webhookEventUpdate = vi.fn(() => ({ eq: webhookEventUpdateEq }))
  const profileUpdateEq = vi.fn()
  const profileUpdate = vi.fn(() => ({ eq: profileUpdateEq }))
  const profileMaybeSingle = vi.fn()
  const profileSelectEq = vi.fn(() => ({ maybeSingle: profileMaybeSingle }))
  const profileSelect = vi.fn(() => ({ eq: profileSelectEq }))
  const paymentInsert = vi.fn()
  const paymentUpdateEq = vi.fn()
  const paymentUpdate = vi.fn(() => ({ eq: paymentUpdateEq }))
  const from = vi.fn((table: string) => {
    if (table === 'stripe_webhook_events') return { insert: dedupInsert, update: webhookEventUpdate }
    if (table === 'profiles') return { update: profileUpdate, select: profileSelect }
    if (table === 'payments') return { insert: paymentInsert, update: paymentUpdate }
    throw new Error(`Unexpected table: ${table}`)
  })
  const createClient = vi.fn(() => ({ from }))

  return {
    constructEvent,
    checkoutRetrieve,
    subscriptionRetrieve,
    invoiceRetrieve,
    stripeConstructor,
    dedupInsert,
    webhookEventUpdate,
    webhookEventUpdateEq,
    profileUpdate,
    profileUpdateEq,
    profileMaybeSingle,
    paymentInsert,
    paymentUpdate,
    paymentUpdateEq,
    from,
    createClient,
  }
})

vi.mock('stripe', () => ({ default: mocks.stripeConstructor }))
vi.mock('@supabase/supabase-js', () => ({ createClient: mocks.createClient }))

import { POST } from '../../app/api/stripe/webhook/route'

const CLIENT_ID = '00000000-0000-4000-8000-000000000001'
const FOREIGN_CLIENT_ID = '00000000-0000-4000-8000-000000000002'
const COACH_ID = '00000000-0000-4000-8000-000000000003'
const EVENT_ID = 'evt_checkout_001'

const originalEnv = {
  STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
  STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
}

type TestEvent = { id: string; type: string; data: { object: { id: string; [key: string]: unknown } } }

function event(type = 'checkout.session.completed', id = EVENT_ID): TestEvent {
  return { id, type, data: { object: { id: `obj_${id}` } } }
}

function request(signature: string | null = 'valid_signature'): NextRequest {
  const headers = new Headers()
  if (signature) headers.set('stripe-signature', signature)
  return new Request('http://localhost/api/stripe/webhook', {
    method: 'POST',
    headers,
    body: JSON.stringify({ fixture: true }),
  }) as NextRequest
}

function session(metadata: Record<string, string> | null = {
  clientId: CLIENT_ID,
  planId: 'client_monthly',
  coachId: 'platform',
  subType: 'client_monthly',
}) {
  return {
    id: 'cs_verified',
    metadata,
    customer: 'cus_verified',
    subscription: 'sub_verified',
    amount_total: 1000,
  }
}

function expectNoBusinessMutation() {
  expect(mocks.profileUpdate).not.toHaveBeenCalled()
  expect(mocks.paymentInsert).not.toHaveBeenCalled()
  expect(mocks.paymentUpdate).not.toHaveBeenCalled()
}

beforeEach(() => {
  vi.clearAllMocks()
  process.env.STRIPE_SECRET_KEY = 'sk_test_webhook_characterization'
  process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_characterization'
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'service_role_webhook_characterization'
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://supabase.test'
  mocks.constructEvent.mockReturnValue(event())
  mocks.dedupInsert.mockResolvedValue({ error: null })
  mocks.checkoutRetrieve.mockResolvedValue(session())
  mocks.subscriptionRetrieve.mockResolvedValue({ id: 'sub_1', customer: 'cus_1', status: 'active' })
  mocks.invoiceRetrieve.mockResolvedValue({ id: 'in_1', billing_reason: 'subscription_cycle', customer: 'cus_1', amount_paid: 1000, currency: 'chf' })
  mocks.profileMaybeSingle.mockResolvedValue({ data: { id: CLIENT_ID, subscription_type: 'client_monthly' }, error: null })
  mocks.profileUpdateEq.mockResolvedValue({ error: null })
  mocks.paymentInsert.mockResolvedValue({ error: null })
  mocks.paymentUpdateEq.mockResolvedValue({ error: null })
  mocks.webhookEventUpdateEq.mockResolvedValue({ error: null })
})

afterAll(() => {
  for (const [key, value] of Object.entries(originalEnv)) {
    if (value === undefined) delete process.env[key]
    else process.env[key] = value
  }
})

describe('POST /api/stripe/webhook — signatures and event inventory', () => {
  it('returns 400 when the signature is absent without reserving an event', async () => {
    const response = await POST(request(null))
    expect(response.status).toBe(400)
    expect(mocks.constructEvent).not.toHaveBeenCalled()
    expect(mocks.dedupInsert).not.toHaveBeenCalled()
  })

  it('returns 400 for an invalid signature without reserving an event', async () => {
    mocks.constructEvent.mockImplementation(() => { throw new Error('invalid signature') })
    const response = await POST(request('invalid'))
    expect(response.status).toBe(400)
    expect(mocks.dedupInsert).not.toHaveBeenCalled()
  })

  it.each([
    'checkout.session.completed',
    'customer.subscription.updated',
    'invoice.payment_succeeded',
    'customer.subscription.deleted',
    'account.updated',
  ])('reserves and accepts supported event %s', async type => {
    const current = event(type, `evt_${type}`)
    if (type === 'account.updated') current.data.object = { id: 'acct_1', charges_enabled: true, payouts_enabled: true }
    mocks.constructEvent.mockReturnValue(current)
    const response = await POST(request())
    expect(response.status).toBe(200)
    expect(mocks.dedupInsert).toHaveBeenCalledWith(expect.objectContaining({ event_id: current.id, event_type: type }))
  })

  it('reserves an unsupported event and returns received without business mutation', async () => {
    mocks.constructEvent.mockReturnValue(event('payment_intent.created', 'evt_unsupported'))
    const response = await POST(request())
    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ received: true })
    expectNoBusinessMutation()
  })
})

describe('POST /api/stripe/webhook — checkout metadata behavior', () => {
  it('accepts the secured platform checkout metadata and updates the server-derived client', async () => {
    const response = await POST(request())
    expect(response.status).toBe(200)
    expect(mocks.profileUpdateEq).toHaveBeenCalledWith('id', CLIENT_ID)
    expect(mocks.paymentUpdateEq).toHaveBeenCalledWith('stripe_checkout_session_id', 'cs_verified')
  })

  it('accepts the secured coach checkout metadata and records its coach', async () => {
    mocks.checkoutRetrieve.mockResolvedValue(session({ clientId: CLIENT_ID, coachId: COACH_ID, type: 'coach_subscription' }))
    const response = await POST(request())
    expect(response.status).toBe(200)
    expect(mocks.profileUpdate).toHaveBeenCalledWith(expect.objectContaining({ subscription_type: 'coach_paid' }))
    expect(mocks.paymentInsert).toHaveBeenCalledWith(expect.objectContaining({ client_id: CLIENT_ID, coach_id: COACH_ID }))
  })

  it.each([
    ['absent metadata', null],
    ['incomplete metadata', { subType: 'client_monthly' }],
    ['invalid client identity', { clientId: 'not-a-uuid', subType: 'client_monthly' }],
  ])('reserves then silently acknowledges %s as success', async (_label, metadata) => {
    mocks.checkoutRetrieve.mockResolvedValue(session(metadata as Record<string, string> | null))
    const response = await POST(request())
    expect(response.status).toBe(200)
    expect(mocks.dedupInsert).toHaveBeenCalledOnce()
    expect(mocks.webhookEventUpdate).not.toHaveBeenCalled()
    expectNoBusinessMutation()
  })

  it('accepts a foreign but well-formed clientId without checking the profile role or checkout ownership', async () => {
    mocks.checkoutRetrieve.mockResolvedValue(session({ clientId: FOREIGN_CLIENT_ID, subType: 'coach_monthly', coachId: 'platform' }))
    const response = await POST(request())
    expect(response.status).toBe(200)
    expect(mocks.profileUpdateEq).toHaveBeenCalledWith('id', FOREIGN_CLIENT_ID)
  })

  it('accepts an offer incompatible with the target role because no role is read', async () => {
    mocks.checkoutRetrieve.mockResolvedValue(session({ clientId: CLIENT_ID, subType: 'coach_monthly', coachId: 'platform' }))
    const response = await POST(request())
    expect(response.status).toBe(200)
    expect(mocks.profileUpdate).toHaveBeenCalledWith(expect.objectContaining({ subscription_type: 'coach_monthly', coach_subscription_active: true }))
    expect(mocks.profileMaybeSingle).not.toHaveBeenCalled()
  })

  it('documents that both secured checkout producers emit the metadata keys consumed by the webhook', () => {
    const platform = readFileSync(resolve(process.cwd(), 'app/api/stripe/checkout/route.ts'), 'utf8')
    const coach = readFileSync(resolve(process.cwd(), 'app/api/stripe/coach-checkout/route.ts'), 'utf8')
    expect(platform).toContain("clientId: user.id, planId: resolvedPlanId, coachId: 'platform', subType: plan.subType")
    expect(coach).toContain("metadata: { clientId, coachId, type: 'coach_subscription' }")
  })
})

describe('POST /api/stripe/webhook — deduplication and replay behavior', () => {
  it('returns 200 without processing an event already reserved', async () => {
    mocks.dedupInsert.mockResolvedValue({ error: { code: '23505', message: 'duplicate' } })
    const response = await POST(request())
    expect(response.status).toBe(200)
    expect(mocks.checkoutRetrieve).not.toHaveBeenCalled()
    expectNoBusinessMutation()
  })

  it('processes the first delivery and skips a sequential replay of the same event.id', async () => {
    mocks.dedupInsert
      .mockResolvedValueOnce({ error: null })
      .mockResolvedValueOnce({ error: { code: '23505', message: 'duplicate' } })
    await POST(request())
    await POST(request())
    expect(mocks.checkoutRetrieve).toHaveBeenCalledOnce()
    expect(mocks.profileUpdate).toHaveBeenCalledOnce()
  })

  it('returns 200 and never processes when dedup reservation fails for a non-duplicate reason', async () => {
    mocks.dedupInsert.mockResolvedValue({ error: { code: '08006', message: 'database unavailable' } })
    const response = await POST(request())
    expect(response.status).toBe(200)
    expect(mocks.checkoutRetrieve).not.toHaveBeenCalled()
    expectNoBusinessMutation()
  })

  it('marks a reserved event failed when processing throws', async () => {
    mocks.checkoutRetrieve.mockRejectedValue(new Error('Stripe retrieve failed'))
    const response = await POST(request())
    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ received: true, processing_error: true })
    expect(mocks.webhookEventUpdate).toHaveBeenCalledWith({ processing_status: 'failed', error_message: 'Stripe retrieve failed' })
    expect(mocks.webhookEventUpdateEq).toHaveBeenCalledWith('event_id', EVENT_ID)
  })

  it('permanently skips replay after a reserved event failed during processing', async () => {
    mocks.checkoutRetrieve.mockRejectedValueOnce(new Error('transient failure'))
    mocks.dedupInsert
      .mockResolvedValueOnce({ error: null })
      .mockResolvedValueOnce({ error: { code: '23505', message: 'duplicate' } })
    const first = await POST(request())
    const retry = await POST(request())
    expect(first.status).toBe(200)
    expect(retry.status).toBe(200)
    expect(mocks.checkoutRetrieve).toHaveBeenCalledOnce()
    expect(mocks.profileUpdate).not.toHaveBeenCalled()
  })

  it('cannot retry an incomplete metadata event because its reservation remains successful', async () => {
    mocks.checkoutRetrieve.mockResolvedValue(session(null))
    mocks.dedupInsert
      .mockResolvedValueOnce({ error: null })
      .mockResolvedValueOnce({ error: { code: '23505', message: 'duplicate' } })
    await POST(request())
    mocks.checkoutRetrieve.mockResolvedValue(session())
    await POST(request())
    expect(mocks.checkoutRetrieve).toHaveBeenCalledOnce()
    expectNoBusinessMutation()
  })
})
