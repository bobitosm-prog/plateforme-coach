import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'
import type { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => {
  const accountsCreate = vi.fn()
  const accountLinksCreate = vi.fn()
  const stripeConstructor = vi.fn(function StripeMock() {
    return {
      accounts: { create: accountsCreate },
      accountLinks: { create: accountLinksCreate },
    }
  })

  const profileSingle = vi.fn()
  const profileMaybeSingle = vi.fn()
  const profileSelectAfterUpdate = vi.fn(() => ({ maybeSingle: profileMaybeSingle }))
  const profileIs = vi.fn(() => ({ select: profileSelectAfterUpdate }))
  const profileEqAfterUpdate = vi.fn(() => ({ is: profileIs }))
  const profileUpdate = vi.fn(() => ({ eq: profileEqAfterUpdate }))
  const profileEqAfterSelect = vi.fn(() => ({ single: profileSingle }))
  const profileSelect = vi.fn(() => ({ eq: profileEqAfterSelect }))
  const profileFrom = vi.fn(() => ({ select: profileSelect, update: profileUpdate }))
  const createClient = vi.fn(() => ({ from: profileFrom }))

  return {
    accountsCreate,
    accountLinksCreate,
    stripeConstructor,
    profileSingle,
    profileMaybeSingle,
    profileSelectAfterUpdate,
    profileIs,
    profileEqAfterUpdate,
    profileUpdate,
    profileEqAfterSelect,
    profileSelect,
    profileFrom,
    createClient,
  }
})

vi.mock('stripe', () => ({ default: mocks.stripeConstructor }))
vi.mock('@supabase/supabase-js', () => ({ createClient: mocks.createClient }))

import { POST } from '../../app/api/stripe/connect/route'

const originalEnv = {
  STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
}

type CallerCase = {
  label: string
  headers?: Record<string, string>
}

const callerCases: CallerCase[] = [
  { label: 'anonymous user' },
  { label: 'authenticated standard user', headers: { cookie: 'sb-session=standard' } },
  { label: 'owner coach', headers: { cookie: 'sb-session=owner-coach' } },
  { label: 'non-owner coach', headers: { cookie: 'sb-session=other-coach' } },
  { label: 'administrator', headers: { authorization: 'Bearer admin-token' } },
  { label: 'lifetime account', headers: { cookie: 'sb-session=lifetime' } },
  { label: 'invited user', headers: { cookie: 'sb-session=invited' } },
]

function request(
  body: Record<string, unknown>,
  headers: Record<string, string> = {},
): NextRequest {
  return new Request('http://localhost/api/stripe/connect', {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: JSON.stringify(body),
  }) as NextRequest
}

beforeEach(() => {
  vi.clearAllMocks()
  process.env.STRIPE_SECRET_KEY = 'sk_test_characterization_only'
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'service_role_characterization_only'
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://supabase.test'
  process.env.NEXT_PUBLIC_APP_URL = 'http://app.test'

  mocks.accountsCreate.mockResolvedValue({ id: 'acct_created' })
  mocks.accountLinksCreate.mockResolvedValue({ url: 'https://connect.test/onboarding' })
  mocks.profileSingle.mockResolvedValue({ data: { stripe_account_id: null } })
  mocks.profileMaybeSingle.mockResolvedValue({
    data: { stripe_account_id: 'acct_created' },
  })
})

afterAll(() => {
  for (const [key, value] of Object.entries(originalEnv)) {
    if (value === undefined) delete process.env[key as keyof NodeJS.ProcessEnv]
    else process.env[key as keyof NodeJS.ProcessEnv] = value
  }
})

describe('POST /api/stripe/connect — current authorization behavior', () => {
  it.each(callerCases)(
    'does not distinguish $label and creates an onboarding link for a client-supplied account ID',
    async ({ headers }) => {
      const response = await POST(request({
        coachId: '00000000-0000-4000-8000-000000000001',
        email: 'caller@example.test',
        existingAccountId: 'acct_client_supplied',
      }, headers))

      expect(response.status).toBe(200)
      await expect(response.json()).resolves.toEqual({
        url: 'https://connect.test/onboarding',
        accountId: 'acct_client_supplied',
      })
      expect(mocks.accountLinksCreate).toHaveBeenCalledWith({
        account: 'acct_client_supplied',
        refresh_url: 'http://app.test/?stripe=refresh',
        return_url: 'http://app.test/?stripe=success&account=acct_client_supplied',
        type: 'account_onboarding',
      })
      expect(mocks.accountsCreate).not.toHaveBeenCalled()
      expect(mocks.createClient).toHaveBeenCalledWith(
        'http://supabase.test',
        'service_role_characterization_only',
      )
    },
  )

  it('allows an anonymous request to create a Stripe account and update the supplied profile ID', async () => {
    const coachId = '00000000-0000-4000-8000-000000000099'
    const response = await POST(request({ coachId, email: 'anonymous@example.test' }))

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({
      url: 'https://connect.test/onboarding',
      accountId: 'acct_created',
    })
    expect(mocks.accountsCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'express',
        email: 'anonymous@example.test',
        metadata: { coachId },
      }),
      { idempotencyKey: `connect-account-${coachId}` },
    )
    expect(mocks.profileUpdate).toHaveBeenCalledWith({ stripe_account_id: 'acct_created' })
    expect(mocks.profileEqAfterUpdate).toHaveBeenCalledWith('id', coachId)
  })

  it('rejects a request without coachId only after constructing the Stripe client', async () => {
    const response = await POST(request({ email: 'missing-id@example.test' }))

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({ error: 'coachId required' })
    expect(mocks.stripeConstructor).toHaveBeenCalledOnce()
    expect(mocks.createClient).not.toHaveBeenCalled()
    expect(mocks.accountLinksCreate).not.toHaveBeenCalled()
  })

  it('returns 500 before parsing authorization or input when Stripe is not configured', async () => {
    delete process.env.STRIPE_SECRET_KEY

    const response = await POST(request({
      coachId: '00000000-0000-4000-8000-000000000001',
    }))

    expect(response.status).toBe(500)
    await expect(response.json()).resolves.toEqual({ error: 'Stripe non configuré' })
    expect(mocks.stripeConstructor).not.toHaveBeenCalled()
    expect(mocks.createClient).not.toHaveBeenCalled()
  })
})
