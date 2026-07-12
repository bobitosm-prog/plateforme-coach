import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => {
  const maybeSingle = vi.fn()
  const eq = vi.fn(() => ({ maybeSingle }))
  const select = vi.fn(() => ({ eq }))
  const from = vi.fn(() => ({ select }))
  const createClient = vi.fn(() => ({ from }))
  const getUser = vi.fn()
  const rpc = vi.fn()
  const createSupabaseRouteClient = vi.fn(async () => ({ auth: { getUser }, rpc }))
  return { maybeSingle, eq, select, from, createClient, getUser, rpc, createSupabaseRouteClient }
})

vi.mock('@supabase/supabase-js', () => ({ createClient: mocks.createClient }))
vi.mock('@/lib/supabase/server', () => ({
  createSupabaseRouteClient: mocks.createSupabaseRouteClient,
}))

import { POST as validate } from '../../app/api/coach/invitations/validate/route'
import { POST as consume } from '../../app/api/coach/invitations/consume/route'

const TOKEN = Buffer.alloc(32, 0x31).toString('base64url')
const expectedHash = `\\x${'8a83665f3798727f14f92ad0e6c99fdab08ee731d6cd644c131223fd2f4fed2a'}`
const originalEnv = {
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
}

function request(body: unknown) {
  return new Request('http://localhost/api/coach/invitations', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://supabase.test'
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'service_role_test'
  mocks.getUser.mockResolvedValue({ data: { user: { id: 'user-id' } } })
  mocks.maybeSingle.mockResolvedValue({
    data: { status: 'pending', expires_at: '2099-01-01T00:00:00.000Z' },
    error: null,
  })
  mocks.rpc.mockResolvedValue({ data: { success: true, coachId: 'server-coach' }, error: null })
})

afterAll(() => {
  for (const [key, value] of Object.entries(originalEnv)) {
    if (value === undefined) delete process.env[key]
    else process.env[key] = value
  }
})

describe('coach invitation validation route', () => {
  it.each([null, {}, { token: 'short' }, { token: `${TOKEN}!` }])(
    'returns 400 for malformed input %#',
    async (body) => {
      const response = await validate(request(body))
      expect(response.status).toBe(400)
      expect(mocks.createClient).not.toHaveBeenCalled()
    },
  )

  it('hashes a valid token and returns only the minimal public projection', async () => {
    const response = await validate(request({ token: TOKEN }))
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(mocks.eq).toHaveBeenCalledWith('token_hash', expectedHash)
    expect(payload).toEqual({
      success: true,
      data: { valid: true, expiresAt: '2099-01-01T00:00:00.000Z' },
    })
    expect(JSON.stringify(payload)).not.toMatch(/token|email|coachId|status/i)
  })

  it.each([
    [{ data: null, error: null }, 'unknown'],
    [{ data: { status: 'revoked', expires_at: '2099-01-01T00:00:00.000Z' }, error: null }, 'revoked'],
    [{ data: { status: 'consumed', expires_at: '2099-01-01T00:00:00.000Z' }, error: null }, 'consumed'],
    [{ data: { status: 'pending', expires_at: '2020-01-01T00:00:00.000Z' }, error: null }, 'expired'],
  ])('returns one generic response for an %s invitation', async (result, _label) => {
    void _label
    mocks.maybeSingle.mockResolvedValue(result)
    const response = await validate(request({ token: TOKEN }))
    expect(response.status).toBe(404)
    await expect(response.json()).resolves.toEqual({
      success: false,
      error: { code: 'INVITATION_INVALID', message: 'Invitation unavailable' },
    })
  })
})

describe('coach invitation consumption route', () => {
  it('rejects anonymous users before parsing or calling the RPC', async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null } })
    const response = await consume(request({ token: TOKEN }))
    expect(response.status).toBe(401)
    expect(mocks.rpc).not.toHaveBeenCalled()
  })

  it.each(['coachId', 'clientId', 'autoAssign', 'subscription_type', 'subscription_status'])(
    'strictly rejects forged authority field %s',
    async (key) => {
      const response = await consume(request({ token: TOKEN, [key]: 'forged' }))
      expect(response.status).toBe(400)
      expect(mocks.rpc).not.toHaveBeenCalled()
    },
  )

  it('calls the authenticated RPC with only the server-computed hash', async () => {
    const response = await consume(request({ token: TOKEN }))
    expect(response.status).toBe(200)
    expect(mocks.rpc).toHaveBeenCalledWith('consume_coach_invitation', {
      p_token_hash: expectedHash,
    })
    await expect(response.json()).resolves.toEqual({
      success: true,
      data: { redirectTo: '/' },
    })
  })

  it.each([
    ['INVITATION_EMAIL_MISMATCH', 403],
    ['INVITATION_EMAIL_UNVERIFIED', 403],
    ['INVITATION_EXPIRED', 410],
    ['INVITATION_REVOKED', 410],
    ['INVITATION_ALREADY_USED', 409],
    ['INVITATION_ALREADY_LINKED', 409],
    ['INVITATION_RECIPIENT_INELIGIBLE', 409],
    ['INVITATION_INVALID', 404],
  ])('maps %s to HTTP %i without returning SQL errors', async (code, status) => {
    mocks.rpc.mockResolvedValue({ data: { success: false, code }, error: null })
    const response = await consume(request({ token: TOKEN }))
    expect(response.status).toBe(status)
    await expect(response.json()).resolves.toEqual({
      success: false,
      error: { code, message: 'Invitation unavailable' },
    })
  })

  it('returns a generic 500 for an RPC failure', async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: { message: `SQL leaked ${TOKEN}` } })
    const response = await consume(request({ token: TOKEN }))
    expect(response.status).toBe(500)
    expect(JSON.stringify(await response.json())).not.toContain(TOKEN)
  })
})
