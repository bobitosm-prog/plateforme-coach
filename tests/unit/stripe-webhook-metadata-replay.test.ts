import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'
import type { NextRequest } from 'next/server'
import { buildCoachMetadata, buildPlatformMetadata, resolvePlatformPlan } from '../../lib/billing/checkout'

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
  const paymentUpsert = vi.fn()
  const paymentUpdateEq = vi.fn()
  const paymentUpdate = vi.fn(() => ({ eq: paymentUpdateEq }))
  const paymentMaybeSingle = vi.fn()
  const paymentSelectEq = vi.fn(() => ({ maybeSingle: paymentMaybeSingle }))
  const paymentSelect = vi.fn(() => ({ eq: paymentSelectEq }))
  const relationMaybeSingle = vi.fn()
  const relationStatusEq = vi.fn(() => ({ maybeSingle: relationMaybeSingle }))
  const relationCoachEq = vi.fn(() => ({ eq: relationStatusEq }))
  const relationClientEq = vi.fn(() => ({ eq: relationCoachEq }))
  const relationSelect = vi.fn(() => ({ eq: relationClientEq }))
  const rpc = vi.fn()
  const from = vi.fn((table: string) => {
    if (table === 'stripe_webhook_events') return { insert: dedupInsert, update: webhookEventUpdate }
    if (table === 'profiles') return { update: profileUpdate, select: profileSelect }
    if (table === 'payments') return { insert: paymentInsert, upsert: paymentUpsert, update: paymentUpdate, select: paymentSelect }
    if (table === 'coach_clients') return { select: relationSelect }
    throw new Error(`Unexpected table: ${table}`)
  })
  const createClient = vi.fn(() => ({ from, rpc }))

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
    paymentUpsert,
    paymentUpdate,
    paymentUpdateEq,
    paymentMaybeSingle,
    relationMaybeSingle,
    rpc,
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
  expect(mocks.paymentUpsert).not.toHaveBeenCalled()
  expect(mocks.paymentUpdate).not.toHaveBeenCalled()
}

beforeEach(() => {
  vi.clearAllMocks()
  process.env.STRIPE_SECRET_KEY = 'sk_test_webhook_characterization'
  process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_characterization'
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'service_role_webhook_characterization'
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://supabase.test'
  mocks.constructEvent.mockReturnValue(event())
  mocks.rpc.mockImplementation(async (name: string) => {
    if (name === 'claim_stripe_webhook_event') return { data: 'claimed', error: null }
    if (name === 'finalize_stripe_webhook_event') return { data: true, error: null }
    throw new Error(`Unexpected RPC: ${name}`)
  })
  mocks.dedupInsert.mockResolvedValue({ error: null })
  mocks.checkoutRetrieve.mockResolvedValue(session())
  mocks.subscriptionRetrieve.mockResolvedValue({ id: 'sub_1', customer: 'cus_1', status: 'active' })
  mocks.invoiceRetrieve.mockResolvedValue({ id: 'in_1', billing_reason: 'subscription_cycle', customer: 'cus_1', amount_paid: 1000, currency: 'chf' })
  mocks.profileMaybeSingle.mockResolvedValue({ data: { id: CLIENT_ID, role: 'client', subscription_type: 'client_monthly' }, error: null })
  mocks.paymentMaybeSingle.mockResolvedValue({ data: { client_id: CLIENT_ID, coach_id: null }, error: null })
  mocks.relationMaybeSingle.mockResolvedValue({ data: { coach_id: COACH_ID }, error: null })
  mocks.profileUpdateEq.mockResolvedValue({ error: null })
  mocks.paymentInsert.mockResolvedValue({ error: null })
  mocks.paymentUpsert.mockResolvedValue({ error: null })
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
    expect(mocks.rpc).not.toHaveBeenCalled()
  })

  it('returns 400 for an invalid signature without reserving an event', async () => {
    mocks.constructEvent.mockImplementation(() => { throw new Error('invalid signature') })
    const response = await POST(request('invalid'))
    expect(response.status).toBe(400)
    expect(mocks.rpc).not.toHaveBeenCalled()
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
    expect(mocks.rpc).toHaveBeenCalledWith('claim_stripe_webhook_event', expect.objectContaining({ p_event_id: current.id, p_event_type: type }))
  })

  it('reserves an unsupported event and returns received without business mutation', async () => {
    mocks.constructEvent.mockReturnValue(event('payment_intent.created', 'evt_unsupported'))
    const response = await POST(request())
    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ received: true, skipped: true })
    expect(mocks.rpc).toHaveBeenCalledWith('finalize_stripe_webhook_event', expect.objectContaining({ p_status: 'skipped' }))
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
    mocks.checkoutRetrieve.mockResolvedValue(session({ clientId: CLIENT_ID, coachId: COACH_ID, subType: 'coach_monthly', type: 'coach_subscription' }))
    const response = await POST(request())
    expect(response.status).toBe(200)
    expect(mocks.profileUpdate).toHaveBeenCalledWith(expect.objectContaining({ subscription_type: 'coach_paid' }))
    expect(mocks.paymentUpsert).toHaveBeenCalledWith(
      expect.objectContaining({ client_id: CLIENT_ID, coach_id: COACH_ID, stripe_event_id: EVENT_ID }),
      { onConflict: 'stripe_event_id', ignoreDuplicates: true }
    )
  })

  it.each([
    ['absent metadata', null],
    ['incomplete metadata', { subType: 'client_monthly' }],
    ['invalid client identity', { clientId: 'not-a-uuid', subType: 'client_monthly' }],
  ])('rejects %s and records a retryable failure', async (_label, metadata) => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    mocks.checkoutRetrieve.mockResolvedValue(session(metadata as Record<string, string> | null))
    const response = await POST(request())
    expect(response.status).toBe(500)
    expect(response.headers.get('x-request-id')).toMatch(/^[0-9a-f-]{36}$/)
    expect(JSON.parse(String(warn.mock.calls[0][0])).reason).toBe('INVALID_METADATA')
    expect(mocks.rpc).toHaveBeenCalledWith('finalize_stripe_webhook_event', expect.objectContaining({ p_status: 'failed' }))
    expectNoBusinessMutation()
  })

  it('rejects a foreign but well-formed clientId whose payment ownership does not match', async () => {
    mocks.checkoutRetrieve.mockResolvedValue(session({ clientId: FOREIGN_CLIENT_ID, subType: 'coach_monthly', coachId: 'platform' }))
    const response = await POST(request())
    expect(response.status).toBe(500)
    expectNoBusinessMutation()
  })

  it('rejects an offer incompatible with the beneficiary role', async () => {
    mocks.checkoutRetrieve.mockResolvedValue(session({ clientId: CLIENT_ID, subType: 'coach_monthly', coachId: 'platform' }))
    const response = await POST(request())
    expect(response.status).toBe(500)
    expectNoBusinessMutation()
  })

  it('documents that both secured checkout producers emit the metadata keys consumed by the webhook', () => {
    expect(buildPlatformMetadata(CLIENT_ID, resolvePlatformPlan('client_monthly'))).toEqual({
      clientId: CLIENT_ID, planId: 'client_monthly', coachId: 'platform', subType: 'client_monthly',
    })
    expect(buildCoachMetadata(CLIENT_ID, COACH_ID)).toEqual({
      clientId: CLIENT_ID, coachId: COACH_ID, subType: 'coach_monthly', type: 'coach_subscription',
    })
  })
})

describe('POST /api/stripe/webhook — deduplication and replay behavior', () => {
  it('returns 200 without processing an event already completed successfully', async () => {
    mocks.rpc.mockResolvedValueOnce({ data: 'already_success', error: null })
    const response = await POST(request())
    expect(response.status).toBe(200)
    expect(mocks.checkoutRetrieve).not.toHaveBeenCalled()
    expectNoBusinessMutation()
  })

  it('processes the first delivery and skips a sequential replay of the same event.id', async () => {
    let claims = 0
    mocks.rpc.mockImplementation(async (name: string) => {
      if (name === 'claim_stripe_webhook_event') return { data: claims++ === 0 ? 'claimed' : 'already_success', error: null }
      return { data: true, error: null }
    })
    await POST(request())
    await POST(request())
    expect(mocks.checkoutRetrieve).toHaveBeenCalledOnce()
    expect(mocks.profileUpdate).toHaveBeenCalledOnce()
  })

  it('returns 503 and never processes when reservation fails', async () => {
    mocks.rpc.mockResolvedValueOnce({ data: null, error: { code: '08006', message: 'database unavailable' } })
    const response = await POST(request())
    expect(response.status).toBe(503)
    expect(mocks.checkoutRetrieve).not.toHaveBeenCalled()
    expectNoBusinessMutation()
  })

  it('marks a reserved event failed when processing throws', async () => {
    mocks.checkoutRetrieve.mockRejectedValue(new Error('Stripe retrieve failed'))
    const response = await POST(request())
    expect(response.status).toBe(500)
    expect(mocks.rpc).toHaveBeenCalledWith('finalize_stripe_webhook_event', expect.objectContaining({ p_status: 'failed', p_error_message: 'Stripe retrieve failed' }))
  })

  it('reclaims and successfully replays an event failed during processing', async () => {
    mocks.checkoutRetrieve.mockRejectedValueOnce(new Error('transient failure'))
    let claims = 0
    mocks.rpc.mockImplementation(async (name: string) => {
      if (name === 'claim_stripe_webhook_event') return { data: claims++ === 0 ? 'claimed' : 'claimed_retry', error: null }
      return { data: true, error: null }
    })
    mocks.checkoutRetrieve.mockResolvedValueOnce(session())
    const first = await POST(request())
    const retry = await POST(request())
    expect(first.status).toBe(500)
    expect(retry.status).toBe(200)
    expect(mocks.checkoutRetrieve).toHaveBeenCalledTimes(2)
    expect(mocks.profileUpdate).toHaveBeenCalledOnce()
  })

  it('returns 409 without processing when the event is already processing', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    mocks.rpc.mockResolvedValueOnce({ data: 'already_processing', error: null })
    const response = await POST(request())
    expect(response.status).toBe(409)
    expect(response.headers.get('x-request-id')).toMatch(/^[0-9a-f-]{36}$/)
    expect(JSON.parse(String(warn.mock.calls[0][0])).reason).toBe('WEBHOOK_ALREADY_PROCESSING')
    expect(mocks.checkoutRetrieve).not.toHaveBeenCalled()
    expectNoBusinessMutation()
  })

  it('allows only one of two concurrent deliveries to execute business mutations', async () => {
    let resolveRetrieve!: (value: ReturnType<typeof session>) => void
    const pendingRetrieve = new Promise<ReturnType<typeof session>>(resolve => { resolveRetrieve = resolve })
    let claims = 0
    mocks.rpc.mockImplementation(async (name: string) => {
      if (name === 'claim_stripe_webhook_event') return { data: claims++ === 0 ? 'claimed' : 'already_processing', error: null }
      return { data: true, error: null }
    })
    mocks.checkoutRetrieve.mockReturnValue(pendingRetrieve)
    const firstPromise = POST(request())
    await vi.waitFor(() => expect(mocks.checkoutRetrieve).toHaveBeenCalledOnce())
    const second = await POST(request())
    resolveRetrieve(session())
    const first = await firstPromise
    expect(first.status).toBe(200)
    expect(second.status).toBe(409)
    expect(mocks.profileUpdate).toHaveBeenCalledOnce()
  })

  it('returns 503 when the durable final status cannot be persisted', async () => {
    mocks.rpc.mockImplementation(async (name: string) => {
      if (name === 'claim_stripe_webhook_event') return { data: 'claimed', error: null }
      return { data: false, error: { message: 'finalization unavailable' } }
    })
    const response = await POST(request())
    expect(response.status).toBe(503)
  })
})
