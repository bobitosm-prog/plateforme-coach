import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => {
  const getUser = vi.fn()
  const profileMaybeSingle = vi.fn()
  const profileEq = vi.fn(() => ({ maybeSingle: profileMaybeSingle }))
  const profileSelect = vi.fn(() => ({ eq: profileEq }))
  const authFrom = vi.fn(() => ({ select: profileSelect }))
  const createSupabaseRouteClient = vi.fn(async () => ({ auth: { getUser }, from: authFrom }))

  const limit = vi.fn()
  const order = vi.fn(() => ({ limit }))
  const gte = vi.fn(() => ({ order, limit }))
  const eq = vi.fn(() => ({ eq, gte, maybeSingle: vi.fn(), order, limit }))
  const select = vi.fn(() => ({ eq, gte, order, limit }))
  const single = vi.fn()
  const insertSelect = vi.fn(() => ({ single }))
  const insert = vi.fn(() => ({ select: insertSelect }))
  const updateEq = vi.fn()
  const update = vi.fn(() => ({ eq: updateEq }))
  const serviceFrom = vi.fn(() => ({ select, insert, update }))
  const createClient = vi.fn(() => ({ from: serviceFrom }))
  const sendEmail = vi.fn()
  const checkRateLimit = vi.fn()
  return {
    getUser, profileMaybeSingle, createSupabaseRouteClient, createClient,
    limit, gte, eq, select, single, insert, update, updateEq, sendEmail, checkRateLimit,
  }
})

vi.mock('@/lib/supabase/server', () => ({
  createSupabaseRouteClient: mocks.createSupabaseRouteClient,
}))
vi.mock('@supabase/supabase-js', () => ({ createClient: mocks.createClient }))
vi.mock('@/lib/email', () => ({ sendEmail: mocks.sendEmail }))
vi.mock('@/lib/rate-limit', () => ({ checkRateLimit: mocks.checkRateLimit }))

import { POST as createInvitation } from '../../app/api/coach/invitations/route'
import {
  createCoachInvitationToken,
  normalizeCoachInvitationEmail,
  renderCoachInvitationEmail,
} from '../../lib/coach-invitations/create'

function request(body: unknown) {
  return new Request('https://app.moovx.test/api/coach/invitations', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-forwarded-for': '198.51.100.8' },
    body: JSON.stringify(body),
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://supabase.test'
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-test'
  process.env.NEXT_PUBLIC_APP_URL = 'https://app.moovx.test'
  mocks.getUser.mockResolvedValue({ data: { user: { id: 'coach-1' } } })
  mocks.profileMaybeSingle.mockResolvedValue({ data: { role: 'coach', full_name: 'Coach <Pro>' }, error: null })
  mocks.checkRateLimit.mockReturnValue({ allowed: true, remaining: 9 })
  mocks.limit.mockResolvedValue({ data: [], count: 0, error: null })
  mocks.single.mockResolvedValue({ data: { id: 'invitation-1', expires_at: '2099-01-01T00:00:00.000Z' }, error: null })
  mocks.updateEq.mockResolvedValue({ error: null })
  mocks.sendEmail.mockResolvedValue({ success: true, method: 'sent' })
})

describe('coach invitation creation primitives', () => {
  it('normalizes NFKC email and generates 256-bit Base64URL tokens', () => {
    expect(normalizeCoachInvitationEmail('  ＵＳＥＲ@Example.COM ')).toBe('user@example.com')
    const token = createCoachInvitationToken()
    expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/)
    expect(Buffer.from(token, 'base64url')).toHaveLength(32)
  })

  it('renders only a tokenized escaped invitation link', () => {
    const token = Buffer.alloc(32, 7).toString('base64url')
    const html = renderCoachInvitationEmail({ coachName: 'Coach <Pro>', joinUrl: `https://app.moovx.test/join?token=${token}` })
    expect(html).toContain(`/join?token=${token}`)
    expect(html).toContain('Coach &lt;Pro&gt;')
    expect(html).not.toContain('/join?coach=')
  })
})

describe('POST /api/coach/invitations', () => {
  it('rejects anonymous users before persistence or email', async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null } })
    const response = await createInvitation(request({ recipientEmail: 'client@example.com' }))
    expect(response.status).toBe(401)
    expect(mocks.insert).not.toHaveBeenCalled()
    expect(mocks.sendEmail).not.toHaveBeenCalled()
  })

  it('rejects non-coaches and forged authority fields', async () => {
    mocks.profileMaybeSingle.mockResolvedValue({ data: { role: 'client' }, error: null })
    expect((await createInvitation(request({ recipientEmail: 'client@example.com' }))).status).toBe(403)
    mocks.profileMaybeSingle.mockResolvedValue({ data: { role: 'coach' }, error: null })
    expect((await createInvitation(request({ recipientEmail: 'client@example.com', coachId: 'forged' }))).status).toBe(400)
    expect(mocks.insert).not.toHaveBeenCalled()
  })

  it('creates, hashes and sends a minimal invitation without exposing the token', async () => {
    const response = await createInvitation(request({ recipientEmail: ' CLIENT@Example.COM ', locale: 'fr' }))
    const payload = await response.json()
    expect(response.status).toBe(201)
    expect(payload).toEqual({ success: true, data: { invitationId: 'invitation-1', expiresAt: '2099-01-01T00:00:00.000Z', deliveryStatus: 'sent' } })
    const row = (mocks.insert.mock.calls as unknown as Array<[Record<string, unknown>]>)[0][0]
    expect(row.coach_id).toBe('coach-1')
    expect(row.recipient_email).toBe('client@example.com')
    expect(row.token_hash).toMatch(/^\\x[0-9a-f]{64}$/)
    expect(JSON.stringify(row)).not.toContain('join?token=')
    const email = mocks.sendEmail.mock.calls[0][0]
    expect(email.html).toMatch(/\/join\?token=[A-Za-z0-9_-]{43}/)
    expect(email.html).not.toContain('/join?coach=')
    expect(JSON.stringify(payload)).not.toMatch(/token|hash/i)
  })

  it('returns 409 for a pending duplicate and 429 with Retry-After', async () => {
    mocks.limit.mockResolvedValueOnce({ data: [{ id: 'existing' }], count: 1, error: null })
    expect((await createInvitation(request({ recipientEmail: 'client@example.com' }))).status).toBe(409)
    mocks.limit.mockResolvedValue({ data: [], count: 0, error: null })
    mocks.checkRateLimit.mockReturnValue({ allowed: false, remaining: 0, retryAfter: 42 })
    const limited = await createInvitation(request({ recipientEmail: 'other@example.com' }))
    expect(limited.status).toBe(429)
    expect(limited.headers.get('Retry-After')).toBe('42')
  })

  it('keeps a pending invitation and returns 502 when SMTP fails', async () => {
    mocks.sendEmail.mockResolvedValue({ success: false, method: 'error', error: 'secret smtp detail' })
    const response = await createInvitation(request({ recipientEmail: 'client@example.com' }))
    expect(response.status).toBe(502)
    expect(mocks.update).toHaveBeenCalledWith(expect.objectContaining({ delivery_status: 'failed' }))
    expect(JSON.stringify(await response.json())).not.toContain('secret smtp detail')
  })
})
