import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'
import type Stripe from 'stripe'
import type { NextRequest } from 'next/server'
import {
  CONNECT_WEBHOOK_EVENTS,
  createScopedStripeWebhookHandler,
  PLATFORM_WEBHOOK_EVENTS,
} from '../../lib/billing/webhook/scoped-http-handler'

vi.mock('@/lib/supabase/admin', () => ({
  createSupabaseAdminClient: vi.fn(),
}))

const PLATFORM_SECRET = 'whsec_platform_unit_test'
const CONNECT_SECRET = 'whsec_connect_unit_test'
const RAW_BODY = '{"fixture":"raw-body-preserved"}'

const originalEnv = {
  STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
  STRIPE_PLATFORM_WEBHOOK_SECRET:
    process.env.STRIPE_PLATFORM_WEBHOOK_SECRET,
  STRIPE_CONNECT_WEBHOOK_SECRET:
    process.env.STRIPE_CONNECT_WEBHOOK_SECRET,
  STRIPE_WEBHOOK_EXPECTED_LIVEMODE:
    process.env.STRIPE_WEBHOOK_EXPECTED_LIVEMODE,
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
}

function stripeEvent(
  type: string,
  options: {
    livemode?: boolean
    account?: string
    objectId?: string
  } = {},
): Stripe.Event {
  return {
    id: `evt_${type}`,
    object: 'event',
    api_version: '2026-02-25.clover',
    created: 0,
    data: {
      object: {
        id: options.objectId ?? `obj_${type}`,
      },
    },
    livemode: options.livemode ?? false,
    pending_webhooks: 0,
    request: null,
    type,
    ...(options.account === undefined ? {} : { account: options.account }),
  } as unknown as Stripe.Event
}

function request(
  path: 'platform' | 'connect',
  signature: string | null,
  body = RAW_BODY,
): NextRequest {
  const headers = new Headers()
  if (signature) headers.set('stripe-signature', signature)
  return new Request(`http://localhost/api/stripe/webhook/${path}`, {
    method: 'POST',
    headers,
    body,
  }) as NextRequest
}

function harness(scope: 'platform' | 'connect', event: Stripe.Event) {
  const constructEvent = vi.fn(
    (body: string, signature: string, secret: string) => {
      if (body !== RAW_BODY || signature !== `signed:${secret}`) {
        throw new Error('invalid signature')
      }
      return event
    },
  )
  const deliver = vi.fn().mockResolvedValue({ outcome: 'success' })
  const createSupabase = vi.fn(() => ({ kind: 'supabase-mock' }))
  const createStripe = vi.fn(() => ({
    webhooks: { constructEvent },
  }))
  const config = scope === 'platform'
    ? {
        scope,
        operation: 'POST /api/stripe/webhook/platform',
        secretVariable: 'STRIPE_PLATFORM_WEBHOOK_SECRET' as const,
        allowedEvents: PLATFORM_WEBHOOK_EVENTS,
      }
    : {
        scope,
        operation: 'POST /api/stripe/webhook/connect',
        secretVariable: 'STRIPE_CONNECT_WEBHOOK_SECRET' as const,
        allowedEvents: CONNECT_WEBHOOK_EVENTS,
      }
  const POST = createScopedStripeWebhookHandler(config, {
    createStripe: createStripe as never,
    createSupabase: createSupabase as never,
    deliver,
  })
  return {
    POST,
    constructEvent,
    createStripe,
    createSupabase,
    deliver,
  }
}

function expectNoDurableWorkflow(
  test: ReturnType<typeof harness>,
) {
  expect(test.deliver).not.toHaveBeenCalled()
  expect(test.createSupabase).not.toHaveBeenCalled()
}

beforeEach(() => {
  process.env.STRIPE_SECRET_KEY = 'sk_test_scoped_webhook'
  process.env.STRIPE_PLATFORM_WEBHOOK_SECRET = PLATFORM_SECRET
  process.env.STRIPE_CONNECT_WEBHOOK_SECRET = CONNECT_SECRET
  process.env.STRIPE_WEBHOOK_EXPECTED_LIVEMODE = 'false'
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://supabase.test'
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'service_role_scoped_webhook'
})

afterAll(() => {
  for (const [name, value] of Object.entries(originalEnv)) {
    if (value === undefined) delete process.env[name]
    else process.env[name] = value
  }
})

describe('platform-scoped Stripe webhook', () => {
  it.each(PLATFORM_WEBHOOK_EVENTS)(
    'accepts signed test event %s',
    async type => {
      const test = harness('platform', stripeEvent(type))
      const response = await test.POST(
        request('platform', `signed:${PLATFORM_SECRET}`),
      )
      expect(response.status).toBe(200)
      expect(test.constructEvent).toHaveBeenCalledWith(
        RAW_BODY,
        `signed:${PLATFORM_SECRET}`,
        PLATFORM_SECRET,
      )
      expect(test.deliver).toHaveBeenCalledOnce()
    },
  )

  it('rejects a signature produced for the Connect endpoint', async () => {
    const test = harness(
      'platform',
      stripeEvent('checkout.session.completed'),
    )
    const response = await test.POST(
      request('platform', `signed:${CONNECT_SECRET}`),
    )
    expect(response.status).toBe(400)
    expectNoDurableWorkflow(test)
  })

  it('rejects account.updated before the durable workflow', async () => {
    const test = harness(
      'platform',
      stripeEvent('account.updated', {
        account: 'acct_connected',
        objectId: 'acct_connected',
      }),
    )
    const response = await test.POST(
      request('platform', `signed:${PLATFORM_SECRET}`),
    )
    expect(response.status).toBe(400)
    expectNoDurableWorkflow(test)
  })

  it('rejects a connected-account delivery even for a platform event type', async () => {
    const test = harness(
      'platform',
      stripeEvent('customer.subscription.updated', {
        account: 'acct_connected',
      }),
    )
    const response = await test.POST(
      request('platform', `signed:${PLATFORM_SECRET}`),
    )
    expect(response.status).toBe(400)
    expectNoDurableWorkflow(test)
  })

  it('rejects live events when test mode is required', async () => {
    const test = harness(
      'platform',
      stripeEvent('checkout.session.completed', { livemode: true }),
    )
    const response = await test.POST(
      request('platform', `signed:${PLATFORM_SECRET}`),
    )
    expect(response.status).toBe(400)
    expectNoDurableWorkflow(test)
  })

  it('accepts live events only when live mode is explicitly required', async () => {
    process.env.STRIPE_WEBHOOK_EXPECTED_LIVEMODE = 'true'
    const test = harness(
      'platform',
      stripeEvent('checkout.session.completed', { livemode: true }),
    )
    const response = await test.POST(
      request('platform', `signed:${PLATFORM_SECRET}`),
    )
    expect(response.status).toBe(200)
    expect(test.deliver).toHaveBeenCalledOnce()
  })
})

describe('Connect-scoped Stripe webhook', () => {
  it('accepts account.updated with matching connected-account authority', async () => {
    const test = harness(
      'connect',
      stripeEvent('account.updated', {
        account: 'acct_connected',
        objectId: 'acct_connected',
      }),
    )
    const response = await test.POST(
      request('connect', `signed:${CONNECT_SECRET}`),
    )
    expect(response.status).toBe(200)
    expect(test.constructEvent).toHaveBeenCalledWith(
      RAW_BODY,
      `signed:${CONNECT_SECRET}`,
      CONNECT_SECRET,
    )
    expect(test.deliver).toHaveBeenCalledOnce()
  })

  it('rejects a signature produced for the platform endpoint', async () => {
    const test = harness(
      'connect',
      stripeEvent('account.updated', {
        account: 'acct_connected',
        objectId: 'acct_connected',
      }),
    )
    const response = await test.POST(
      request('connect', `signed:${PLATFORM_SECRET}`),
    )
    expect(response.status).toBe(400)
    expectNoDurableWorkflow(test)
  })

  it('rejects a platform event before the durable workflow', async () => {
    const test = harness(
      'connect',
      stripeEvent('checkout.session.completed'),
    )
    const response = await test.POST(
      request('connect', `signed:${CONNECT_SECRET}`),
    )
    expect(response.status).toBe(400)
    expectNoDurableWorkflow(test)
  })

  it('rejects account.updated without event.account', async () => {
    const test = harness(
      'connect',
      stripeEvent('account.updated', { objectId: 'acct_connected' }),
    )
    const response = await test.POST(
      request('connect', `signed:${CONNECT_SECRET}`),
    )
    expect(response.status).toBe(400)
    expectNoDurableWorkflow(test)
  })

  it('rejects account.updated when event.account and Account.id diverge', async () => {
    const test = harness(
      'connect',
      stripeEvent('account.updated', {
        account: 'acct_connected',
        objectId: 'acct_foreign',
      }),
    )
    const response = await test.POST(
      request('connect', `signed:${CONNECT_SECRET}`),
    )
    expect(response.status).toBe(400)
    expectNoDurableWorkflow(test)
  })

  it('rejects live events when test mode is required', async () => {
    const test = harness(
      'connect',
      stripeEvent('account.updated', {
        livemode: true,
        account: 'acct_connected',
        objectId: 'acct_connected',
      }),
    )
    const response = await test.POST(
      request('connect', `signed:${CONNECT_SECRET}`),
    )
    expect(response.status).toBe(400)
    expectNoDurableWorkflow(test)
  })
})

describe('scoped Stripe webhook common guards', () => {
  it.each([
    ['missing route secret', 'STRIPE_PLATFORM_WEBHOOK_SECRET', undefined],
    ['missing livemode', 'STRIPE_WEBHOOK_EXPECTED_LIVEMODE', undefined],
    ['invalid livemode', 'STRIPE_WEBHOOK_EXPECTED_LIVEMODE', 'test'],
    ['missing Stripe key', 'STRIPE_SECRET_KEY', undefined],
  ])('returns 503 for %s', async (_label, name, value) => {
    if (value === undefined) delete process.env[name]
    else process.env[name] = value
    const test = harness(
      'platform',
      stripeEvent('checkout.session.completed'),
    )
    const response = await test.POST(
      request('platform', `signed:${PLATFORM_SECRET}`),
    )
    expect(response.status).toBe(503)
    expect(test.constructEvent).not.toHaveBeenCalled()
    expectNoDurableWorkflow(test)
  })

  it('returns 400 for a missing signature', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const test = harness(
      'platform',
      stripeEvent('checkout.session.completed'),
    )
    const response = await test.POST(request('platform', null))
    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({ error: 'Invalid webhook request' })
    expect(JSON.parse(String(warn.mock.calls[0][0])).reason).toBe('STRIPE_SIGNATURE_INVALID')
    expect(test.constructEvent).not.toHaveBeenCalled()
    expectNoDurableWorkflow(test)
  })

  it('returns 400 for an invalid signature', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const test = harness(
      'platform',
      stripeEvent('checkout.session.completed'),
    )
    const response = await test.POST(request('platform', 'invalid'))
    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({ error: 'Invalid webhook request' })
    expect(JSON.parse(String(warn.mock.calls[0][0])).reason).toBe('STRIPE_SIGNATURE_INVALID')
    expectNoDurableWorkflow(test)
  })

  it('returns 503 for missing Supabase configuration after all event guards', async () => {
    delete process.env.SUPABASE_SERVICE_ROLE_KEY
    const test = harness(
      'platform',
      stripeEvent('checkout.session.completed'),
    )
    const response = await test.POST(
      request('platform', `signed:${PLATFORM_SECRET}`),
    )
    expect(response.status).toBe(503)
    expect(test.constructEvent).toHaveBeenCalledOnce()
    expectNoDurableWorkflow(test)
  })

  it('never logs the secret, signature, or raw payload on rejection', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const sensitiveBody = '{"card":"payload-must-not-be-logged"}'
    const test = harness(
      'platform',
      stripeEvent('checkout.session.completed'),
    )
    const response = await test.POST(
      request('platform', 'signature-must-not-be-logged', sensitiveBody),
    )
    expect(response.status).toBe(400)
    const logs = warn.mock.calls.flat().join('\n')
    expect(logs).not.toContain(PLATFORM_SECRET)
    expect(logs).not.toContain('signature-must-not-be-logged')
    expect(logs).not.toContain('payload-must-not-be-logged')
    expectNoDurableWorkflow(test)
  })

  it.each([
    [{ outcome: 'duplicate' }, 200],
    [{ outcome: 'already_processing' }, 409],
    [{ outcome: 'reservation_failed' }, 503],
    [{ outcome: 'success' }, 200],
    [{
      outcome: 'processing_failed',
      reason: 'WEBHOOK_PROCESSING_FAILED',
    }, 500],
    [{
      outcome: 'finalization_failed',
      reason: 'WEBHOOK_PROCESSING_FAILED',
      processingFailed: false,
    }, 503],
    [{
      outcome: 'finalization_failed',
      reason: 'WEBHOOK_PROCESSING_FAILED',
      processingFailed: true,
    }, 503],
  ] as const)('maps delivery result %# to HTTP %s', async (result, status) => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const test = harness(
      'platform',
      stripeEvent('checkout.session.completed'),
    )
    test.deliver.mockResolvedValue(result)
    const response = await test.POST(
      request('platform', `signed:${PLATFORM_SECRET}`),
    )
    expect(response.status).toBe(status)
    expect(test.deliver).toHaveBeenCalledOnce()
    warn.mockRestore()
  })
})
