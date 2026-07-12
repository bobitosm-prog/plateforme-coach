import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'
import type { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => {
  process.env.NEXT_PUBLIC_PRICE_CLIENT_MONTHLY = 'price_client_monthly_test'
  process.env.NEXT_PUBLIC_PRICE_COACH_MONTHLY = 'price_coach_monthly_test'
  const sessionsCreate = vi.fn()
  const stripeConstructor = vi.fn(function StripeMock() {
    return { checkout: { sessions: { create: sessionsCreate } } }
  })

  const ownerMaybeSingle = vi.fn()
  const ownerEq = vi.fn(() => ({ maybeSingle: ownerMaybeSingle }))
  const ownerSelect = vi.fn(() => ({ eq: ownerEq }))
  const paymentsInsert = vi.fn()
  const from = vi.fn((table: string) => {
    if (table === 'profiles') return { select: ownerSelect }
    if (table === 'payments') return { insert: paymentsInsert }
    throw new Error(`Unexpected table: ${table}`)
  })
  const createClient = vi.fn(() => ({ from }))

  return {
    sessionsCreate,
    stripeConstructor,
    ownerMaybeSingle,
    paymentsInsert,
    from,
    createClient,
  }
})

vi.mock('stripe', () => ({ default: mocks.stripeConstructor }))
vi.mock('@supabase/supabase-js', () => ({ createClient: mocks.createClient }))

import { POST } from '../../app/api/stripe/checkout/route'

const CLIENT_ID = '00000000-0000-4000-8000-000000000001'
const FOREIGN_CLIENT_ID = '00000000-0000-4000-8000-000000000002'
const COACH_ID = '00000000-0000-4000-8000-000000000003'
const FOREIGN_COACH_ID = '00000000-0000-4000-8000-000000000004'

const originalEnv = {
  STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  NEXT_PUBLIC_PRICE_CLIENT_MONTHLY: process.env.NEXT_PUBLIC_PRICE_CLIENT_MONTHLY,
  NEXT_PUBLIC_PRICE_COACH_MONTHLY: process.env.NEXT_PUBLIC_PRICE_COACH_MONTHLY,
}

function request(body: Record<string, unknown>): NextRequest {
  return new Request('http://localhost/api/stripe/checkout', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  }) as NextRequest
}

beforeEach(() => {
  vi.clearAllMocks()
  process.env.STRIPE_SECRET_KEY = 'sk_test_checkout_characterization'
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'service_role_checkout_characterization'
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://supabase.test'
  process.env.NEXT_PUBLIC_APP_URL = 'http://app.test'
  process.env.NEXT_PUBLIC_PRICE_CLIENT_MONTHLY = 'price_client_monthly_test'
  process.env.NEXT_PUBLIC_PRICE_COACH_MONTHLY = 'price_coach_monthly_test'
  mocks.ownerMaybeSingle.mockResolvedValue({ data: null, error: null })
  mocks.sessionsCreate.mockResolvedValue({ id: 'cs_platform', url: 'https://checkout.test/platform' })
  mocks.paymentsInsert.mockResolvedValue({ error: null })
})

afterAll(() => {
  for (const [key, value] of Object.entries(originalEnv)) {
    if (value === undefined) delete process.env[key as keyof NodeJS.ProcessEnv]
    else process.env[key as keyof NodeJS.ProcessEnv] = value
  }
})

describe('POST /api/stripe/checkout — current authorization behavior', () => {
  it('creates a checkout for an anonymous request because the route performs no authentication', async () => {
    const response = await POST(request({ clientId: CLIENT_ID, planId: 'client_monthly' }))

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ url: 'https://checkout.test/platform' })
    expect(mocks.sessionsCreate).toHaveBeenCalledOnce()
  })

  it('uses a foreign clientId from the body as Stripe and payment authority', async () => {
    const response = await POST(request({
      clientId: FOREIGN_CLIENT_ID,
      planId: 'client_monthly',
      coachId: FOREIGN_COACH_ID,
    }))

    expect(response.status).toBe(200)
    expect(mocks.sessionsCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: expect.objectContaining({
          clientId: FOREIGN_CLIENT_ID,
          coachId: FOREIGN_COACH_ID,
        }),
      }),
      expect.objectContaining({ idempotencyKey: expect.stringContaining(FOREIGN_CLIENT_ID) }),
    )
    expect(mocks.paymentsInsert).toHaveBeenCalledWith(expect.objectContaining({
      client_id: FOREIGN_CLIENT_ID,
      coach_id: FOREIGN_COACH_ID,
    }))
  })

  it.each([
    ['client plan selected by a coach or wrong role', 'client_monthly'],
    ['coach plan selected by a client or wrong role', 'coach_monthly'],
  ])('does not verify the caller role for %s', async (_label, planId) => {
    const response = await POST(request({ clientId: CLIENT_ID, planId, coachId: COACH_ID }))

    expect(response.status).toBe(200)
    expect(mocks.sessionsCreate).toHaveBeenCalledWith(
      expect.objectContaining({ metadata: expect.objectContaining({ planId }) }),
      expect.any(Object),
    )
  })

  it('accepts a coachId without verifying coach ownership or a coach/client relation', async () => {
    const response = await POST(request({
      clientId: CLIENT_ID,
      planId: 'client_monthly',
      coachId: FOREIGN_COACH_ID,
    }))

    expect(response.status).toBe(200)
    expect(mocks.from).not.toHaveBeenCalledWith('coach_clients')
    expect(mocks.paymentsInsert).toHaveBeenCalledWith(expect.objectContaining({
      coach_id: FOREIGN_COACH_ID,
      client_id: CLIENT_ID,
    }))
  })

  it('rejects only a malformed clientId before Stripe or Supabase are called', async () => {
    const response = await POST(request({ clientId: 'foreign-not-a-uuid', planId: 'client_monthly' }))

    expect(response.status).toBe(400)
    expect(mocks.stripeConstructor).not.toHaveBeenCalled()
    expect(mocks.createClient).not.toHaveBeenCalled()
  })
})
