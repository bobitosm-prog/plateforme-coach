import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => {
  const getUser = vi.fn()
  const profileMaybeSingle = vi.fn()
  const profileEq = vi.fn(() => ({ maybeSingle: profileMaybeSingle }))
  const profileSelect = vi.fn(() => ({ eq: profileEq }))
  const authFrom = vi.fn(() => ({ select: profileSelect }))
  const createSupabaseRouteClient = vi.fn(async () => ({ auth: { getUser }, from: authFrom }))

  const limit = vi.fn()
  const gte = vi.fn(() => ({ limit }))
  const eq = vi.fn(() => ({ eq, gte, limit }))
  const select = vi.fn(() => ({ eq, gte, limit }))
  const single = vi.fn()
  const insertSelect = vi.fn(() => ({ single }))
  const insert = vi.fn(() => ({ select: insertSelect }))
  const updateEq = vi.fn()
  const update = vi.fn(() => ({ eq: updateEq }))
  const adminFrom = vi.fn(() => ({ select, insert, update }))
  const sendEmail = vi.fn()
  const checkRateLimit = vi.fn()
  return {
    getUser, profileMaybeSingle, createSupabaseRouteClient, adminFrom,
    limit, single, insert, update, updateEq, sendEmail, checkRateLimit,
  }
})

vi.mock('server-only', () => ({}))
vi.mock('@/lib/supabase/server', () => ({
  createSupabaseRouteClient: mocks.createSupabaseRouteClient,
}))
vi.mock('@/lib/supabase/admin', () => ({ supabaseAdmin: { from: mocks.adminFrom } }))
vi.mock('@/lib/email', () => ({ sendEmail: mocks.sendEmail }))
vi.mock('@/lib/rate-limit', () => ({ checkRateLimit: mocks.checkRateLimit }))

import { POST as createInvitation } from '@/app/api/coach/invitations/route'
import {
  COACH_INVITATION_EXPIRATION_MS,
  createCoachInvitationToken,
  normalizeCoachInvitationEmail,
  renderCoachInvitationEmail,
} from '@/lib/coach-invitations/create'

function request(body: unknown) {
  return new Request('https://app.moovx.test/api/coach/invitations', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-forwarded-for': '198.51.100.8' },
    body: JSON.stringify(body),
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  process.env.NEXT_PUBLIC_APP_URL = 'https://app.moovx.test'
  mocks.getUser.mockResolvedValue({ data: { user: { id: 'coach-1' } } })
  mocks.profileMaybeSingle.mockResolvedValue({
    data: { role: 'coach', full_name: 'Coach <Pro>' },
    error: null,
  })
  mocks.checkRateLimit.mockReturnValue({ allowed: true, remaining: 9 })
  mocks.limit.mockResolvedValue({ data: [], count: 0, error: null })
  mocks.single.mockResolvedValue({
    data: { id: 'invitation-1', expires_at: '2099-01-01T00:00:00.000Z' },
    error: null,
  })
  mocks.updateEq.mockResolvedValue({ error: null })
  mocks.sendEmail.mockResolvedValue({ success: true, method: 'sent' })
})

describe('Invitation V2 creation primitives', () => {
  it('uses trim/lowercase only and generates a 256-bit URL-safe token', () => {
    expect(normalizeCoachInvitationEmail('  User+Tag@Example.COM ')).toBe('user+tag@example.com')
    const token = createCoachInvitationToken()
    expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/)
    expect(Buffer.from(token, 'base64url')).toHaveLength(32)
  })

  it('escapes email HTML and includes only an opaque token link', () => {
    const token = Buffer.alloc(32, 7).toString('base64url')
    const html = renderCoachInvitationEmail({
      coachName: 'Coach <img src=x onerror=alert(1)>',
      joinUrl: `https://app.moovx.test/join?token=${token}`,
    })
    expect(html).toContain(`/join?token=${token}`)
    expect(html).toContain('Coach &lt;img src=x onerror=alert(1)&gt;')
    expect(html).not.toContain('/join?coach=')
  })
})

describe('POST /api/coach/invitations', () => {
  it('rejects anonymous, wrong-role and forged-authority requests', async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null } })
    expect((await createInvitation(request({ recipientEmail: 'client@example.com' }))).status).toBe(401)

    mocks.getUser.mockResolvedValue({ data: { user: { id: 'coach-1' } } })
    mocks.profileMaybeSingle.mockResolvedValue({ data: { role: 'client' }, error: null })
    expect((await createInvitation(request({ recipientEmail: 'client@example.com' }))).status).toBe(403)

    mocks.profileMaybeSingle.mockResolvedValue({ data: { role: 'coach' }, error: null })
    expect((await createInvitation(request({
      recipientEmail: 'client@example.com',
      coachId: 'forged',
    }))).status).toBe(400)
    expect(mocks.insert).not.toHaveBeenCalled()
  })

  it('persists only a SHA-256 hash and returns no token', async () => {
    const response = await createInvitation(request({
      recipientEmail: ' CLIENT@Example.COM ',
      locale: 'fr',
    }))
    const payload = await response.json()
    const row = (mocks.insert.mock.calls as unknown as Array<[Record<string, unknown>]>)[0][0]
    const createdAt = Date.parse(String(row.created_at))
    const expiresAt = Date.parse(String(row.expires_at))

    expect(response.status).toBe(201)
    expect(row.coach_id).toBe('coach-1')
    expect(row.recipient_email).toBe('client@example.com')
    expect(row.token_hash).toMatch(/^\\x[0-9a-f]{64}$/)
    expect(expiresAt - createdAt).toBe(COACH_INVITATION_EXPIRATION_MS)
    expect(JSON.stringify(row)).not.toContain('join?token=')
    expect(mocks.sendEmail.mock.calls[0][0].html).toMatch(/\/join\?token=[A-Za-z0-9_-]{43}/)
    expect(JSON.stringify(payload)).not.toMatch(/token|hash/i)
  })

  it('enforces coach and IP limits', async () => {
    mocks.checkRateLimit
      .mockReturnValueOnce({ allowed: true, remaining: 9 })
      .mockReturnValueOnce({ allowed: false, remaining: 0, retryAfter: 42 })

    const response = await createInvitation(request({ recipientEmail: 'client@example.com' }))

    expect(response.status).toBe(429)
    expect(response.headers.get('Retry-After')).toBe('42')
    expect(mocks.insert).not.toHaveBeenCalled()
  })
})
