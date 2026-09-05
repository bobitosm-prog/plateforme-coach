import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => {
  const getUser = vi.fn()
  const rpc = vi.fn()
  const createSupabaseRouteClient = vi.fn(async () => ({ auth: { getUser }, rpc }))
  const maybeSingle = vi.fn()
  const eq = vi.fn(() => ({ maybeSingle }))
  const select = vi.fn(() => ({ eq }))
  const from = vi.fn(() => ({ select }))
  return { getUser, rpc, createSupabaseRouteClient, maybeSingle, eq, from }
})

vi.mock('server-only', () => ({}))
vi.mock('@/lib/supabase/server', () => ({
  createSupabaseRouteClient: mocks.createSupabaseRouteClient,
}))
vi.mock('@/lib/supabase/admin', () => ({ supabaseAdmin: { from: mocks.from } }))

import { POST as consume } from '@/app/api/coach/invitations/consume/route'
import { POST as revoke } from '@/app/api/coach/invitations/revoke/route'
import { POST as validate } from '@/app/api/coach/invitations/validate/route'

const TOKEN = Buffer.alloc(32, 0x31).toString('base64url')
const HASH = '\\x8a83665f3798727f14f92ad0e6c99fdab08ee731d6cd644c131223fd2f4fed2a'

function request(body: unknown) {
  return new Request('https://app.moovx.test/api/coach/invitations', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.getUser.mockResolvedValue({ data: { user: { id: 'client-1' } } })
  mocks.maybeSingle.mockResolvedValue({
    data: { status: 'pending', expires_at: '2099-01-01T00:00:00.000Z', recipient_email: 'client@example.com' },
    error: null,
  })
  mocks.rpc.mockResolvedValue({
    data: { success: true, relationOutcome: 'created' },
    error: null,
  })
})

describe('Invitation V2 validation and consumption routes', () => {
  it.each([null, {}, { token: 'short' }, { token: TOKEN, coachId: 'forged' }])(
    'rejects malformed or authority-bearing payload %#',
    async (body) => {
      expect((await consume(request(body))).status).toBe(body && 'coachId' in body ? 400 : body && 'token' in body ? 400 : 400)
    },
  )

  it('validates with a server-computed hash and no identity projection', async () => {
    const response = await validate(request({ token: TOKEN }))
    expect(response.status).toBe(200)
    expect(mocks.eq).toHaveBeenCalledWith('token_hash', HASH)
    await expect(response.json()).resolves.toEqual({
      success: true,
      data: { valid: true, expiresAt: '2099-01-01T00:00:00.000Z', maskedEmail: 'cl****@example.com' },
    })
  })

  it.each([
    ['revoked', 'INVITATION_REVOKED', 410],
    ['consumed', 'INVITATION_ALREADY_USED', 409],
  ])('preserves the public %s terminal state', async (status, code, expectedStatus) => {
    mocks.maybeSingle.mockResolvedValueOnce({
      data: { status, expires_at: '2099-01-01T00:00:00.000Z', recipient_email: 'client@example.com' },
      error: null,
    })
    const response = await validate(request({ token: TOKEN }))
    expect(response.status).toBe(expectedStatus)
    await expect(response.json()).resolves.toMatchObject({ error: { code } })
  })

  it('requires authentication and passes only the token hash to atomic consumption', async () => {
    mocks.getUser.mockResolvedValueOnce({ data: { user: null } })
    expect((await consume(request({ token: TOKEN }))).status).toBe(401)
    expect(mocks.rpc).not.toHaveBeenCalled()

    mocks.getUser.mockResolvedValue({ data: { user: { id: 'client-1' } } })
    const response = await consume(request({ token: TOKEN }))
    expect(response.status).toBe(200)
    expect(mocks.rpc).toHaveBeenCalledWith('consume_coach_invitation_v2', {
      p_token_hash: HASH,
    })
    expect(mocks.rpc.mock.calls[0][1]).not.toHaveProperty('coachId')
    expect(mocks.rpc.mock.calls[0][1]).not.toHaveProperty('clientId')
  })

  it.each([
    ['INVITATION_EMAIL_MISMATCH', 403],
    ['INVITATION_EMAIL_UNVERIFIED', 403],
    ['INVITATION_EXPIRED', 410],
    ['INVITATION_REVOKED', 410],
    ['INVITATION_ALREADY_USED', 409],
    ['INVITATION_ACTIVE_COACH_CONFLICT', 409],
    ['INVITATION_INVALID', 404],
  ])('maps %s to HTTP %i', async (code, status) => {
    mocks.rpc.mockResolvedValue({ data: { success: false, code }, error: null })
    expect((await consume(request({ token: TOKEN }))).status).toBe(status)
  })
})

describe('Invitation V2 revocation route', () => {
  it('requires auth and rejects forged fields', async () => {
    mocks.getUser.mockResolvedValueOnce({ data: { user: null } })
    expect((await revoke(request({ invitationId: crypto.randomUUID() }))).status).toBe(401)
    mocks.getUser.mockResolvedValue({ data: { user: { id: 'coach-1' } } })
    expect((await revoke(request({ invitationId: crypto.randomUUID(), coachId: 'forged' }))).status).toBe(400)
  })

  it('delegates owner authorization and terminal-state checks to the atomic RPC', async () => {
    const invitationId = crypto.randomUUID()
    mocks.rpc.mockResolvedValue({ data: { success: true, invitationId }, error: null })
    const response = await revoke(request({ invitationId }))
    expect(response.status).toBe(200)
    expect(mocks.rpc).toHaveBeenCalledWith('revoke_coach_invitation_v2', {
      p_invitation_id: invitationId,
    })

    mocks.rpc.mockResolvedValue({ data: { success: false, code: 'INVITATION_NOT_FOUND' }, error: null })
    expect((await revoke(request({ invitationId }))).status).toBe(404)
    mocks.rpc.mockResolvedValue({ data: { success: false, code: 'INVITATION_TERMINAL' }, error: null })
    expect((await revoke(request({ invitationId }))).status).toBe(409)
  })
})
