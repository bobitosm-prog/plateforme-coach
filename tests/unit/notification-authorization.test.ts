import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  createServerClient: vi.fn(),
  createClient: vi.fn(),
  checkRateLimit: vi.fn(),
  sendPushToUser: vi.fn(),
}))

vi.mock('@supabase/ssr', () => ({
  createServerClient: mocks.createServerClient,
}))
vi.mock('@supabase/supabase-js', () => ({
  createClient: mocks.createClient,
}))
vi.mock('next/headers', () => ({
  cookies: vi.fn(async () => ({ getAll: () => [] })),
}))
vi.mock('@/lib/rate-limit', () => ({
  checkRateLimit: mocks.checkRateLimit,
}))
vi.mock('@/lib/push-server', () => ({
  sendPushToUser: mocks.sendPushToUser,
}))

import { POST } from '@/app/api/send-notification/route'

const COACH_ID = '11111111-1111-4111-8111-111111111111'
const CLIENT_ID = '22222222-2222-4222-8222-222222222222'
const OTHER_ID = '33333333-3333-4333-8333-333333333333'

type Role = 'client' | 'coach' | 'super_admin' | 'unknown'

function createSessionClient({
  userId = COACH_ID,
  role = 'coach',
  linked = true,
}: {
  userId?: string | null
  role?: Role
  linked?: boolean
} = {}) {
  const profileSingle = vi.fn().mockResolvedValue({
    data: userId ? { role } : null,
    error: null,
  })
  const profileEq = vi.fn().mockReturnValue({ single: profileSingle })

  const relationSingle = vi.fn().mockResolvedValue({
    data: linked ? { coach_id: COACH_ID, client_id: CLIENT_ID } : null,
    error: null,
  })
  const relationLimit = vi.fn().mockReturnValue({ maybeSingle: relationSingle })
  const relationEqSecond = vi.fn().mockReturnValue({ limit: relationLimit })
  const relationEqFirst = vi.fn().mockReturnValue({ eq: relationEqSecond })

  const from = vi.fn((table: string) => {
    if (table === 'profiles') {
      return { select: vi.fn().mockReturnValue({ eq: profileEq }) }
    }
    if (table === 'coach_clients') {
      return { select: vi.fn().mockReturnValue({ eq: relationEqFirst }) }
    }
    throw new Error(`Unexpected table: ${table}`)
  })

  return {
    client: {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: userId ? { id: userId } : null },
        }),
      },
      from,
    },
    from,
    relationEqFirst,
    relationEqSecond,
  }
}

function request(body: unknown, headers?: Record<string, string>) {
  return new Request('http://localhost/api/send-notification', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
  })
}

function validPayload(userId = CLIENT_ID) {
  return {
    userId,
    title: 'Nouveau message',
    body: 'Vous avez reçu un message.',
    url: '/coach',
    tag: 'message',
  }
}

describe('notification authorization', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://project.supabase.co')
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'anon-test-key')
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'service-role-test-key')
    mocks.checkRateLimit.mockReturnValue({ allowed: true, remaining: 9 })
    mocks.createClient.mockReturnValue({ kind: 'admin-client' })
    mocks.sendPushToUser.mockResolvedValue({ sent: 1, failed: 0 })
  })

  it('rejects unauthenticated requests before validation or privileged access', async () => {
    const session = createSessionClient({ userId: null })
    mocks.createServerClient.mockReturnValue(session.client)

    const response = await POST(request(validPayload()) as never)

    expect(response.status).toBe(401)
    expect(session.from).not.toHaveBeenCalled()
    expect(mocks.createClient).not.toHaveBeenCalled()
    expect(mocks.sendPushToUser).not.toHaveBeenCalled()
  })

  it.each([
    { body: { ...validPayload(), userId: 'not-a-uuid' }, label: 'invalid UUID' },
    { body: { ...validPayload(), unexpected: true }, label: 'unknown field' },
    { body: { ...validPayload(), url: 'https://evil.example' }, label: 'external URL' },
    { body: { ...validPayload(), url: 'javascript:alert(1)' }, label: 'javascript URL' },
    { body: { ...validPayload(), url: '//evil.example' }, label: 'protocol-relative URL' },
  ])('rejects invalid payloads: $label', async ({ body }) => {
    const session = createSessionClient()
    mocks.createServerClient.mockReturnValue(session.client)

    const response = await POST(request(body) as never)

    expect(response.status).toBe(400)
    expect(session.from).not.toHaveBeenCalled()
    expect(mocks.createClient).not.toHaveBeenCalled()
    expect(mocks.sendPushToUser).not.toHaveBeenCalled()
  })

  it('allows a coach to notify a linked client', async () => {
    const session = createSessionClient({ userId: COACH_ID, role: 'coach', linked: true })
    mocks.createServerClient.mockReturnValue(session.client)

    const response = await POST(request(validPayload(CLIENT_ID)) as never)

    expect(response.status).toBe(200)
    expect(session.relationEqFirst).toHaveBeenCalledWith('coach_id', COACH_ID)
    expect(session.relationEqSecond).toHaveBeenCalledWith('client_id', CLIENT_ID)
    expect(mocks.sendPushToUser).toHaveBeenCalledWith(
      { kind: 'admin-client' },
      CLIENT_ID,
      {
        title: 'Nouveau message',
        body: 'Vous avez reçu un message.',
        url: '/coach',
        tag: 'message',
      },
    )
  })

  it('rejects a coach targeting an unrelated client', async () => {
    const session = createSessionClient({ userId: COACH_ID, role: 'coach', linked: false })
    mocks.createServerClient.mockReturnValue(session.client)

    const response = await POST(request(validPayload(OTHER_ID)) as never)

    expect(response.status).toBe(403)
    expect(mocks.createClient).not.toHaveBeenCalled()
    expect(mocks.sendPushToUser).not.toHaveBeenCalled()
  })

  it('allows a client to notify their linked coach', async () => {
    const session = createSessionClient({ userId: CLIENT_ID, role: 'client', linked: true })
    mocks.createServerClient.mockReturnValue(session.client)

    const response = await POST(request(validPayload(COACH_ID)) as never)

    expect(response.status).toBe(200)
    expect(session.relationEqFirst).toHaveBeenCalledWith('client_id', CLIENT_ID)
    expect(session.relationEqSecond).toHaveBeenCalledWith('coach_id', COACH_ID)
    expect(mocks.sendPushToUser).toHaveBeenCalledOnce()
  })

  it('rejects a client targeting an unrelated coach', async () => {
    const session = createSessionClient({ userId: CLIENT_ID, role: 'client', linked: false })
    mocks.createServerClient.mockReturnValue(session.client)

    const response = await POST(request(validPayload(OTHER_ID)) as never)

    expect(response.status).toBe(403)
    expect(mocks.createClient).not.toHaveBeenCalled()
    expect(mocks.sendPushToUser).not.toHaveBeenCalled()
  })

  it('rejects unsupported sender roles', async () => {
    const session = createSessionClient({ userId: COACH_ID, role: 'unknown' })
    mocks.createServerClient.mockReturnValue(session.client)

    const response = await POST(request(validPayload(CLIENT_ID)) as never)

    expect(response.status).toBe(403)
    expect(mocks.createClient).not.toHaveBeenCalled()
    expect(mocks.sendPushToUser).not.toHaveBeenCalled()
  })

  it('rate-limits an authenticated sender before authorization and push access', async () => {
    const session = createSessionClient()
    mocks.createServerClient.mockReturnValue(session.client)
    mocks.checkRateLimit
      .mockReturnValueOnce({ allowed: false, remaining: 0, retryAfter: 42 })
      .mockReturnValueOnce({ allowed: true, remaining: 29 })

    const response = await POST(request(validPayload(), {
      'x-forwarded-for': '203.0.113.10',
    }) as never)

    expect(response.status).toBe(429)
    expect(response.headers.get('Retry-After')).toBe('42')
    expect(mocks.checkRateLimit).toHaveBeenNthCalledWith(
      1,
      `notification:user:${COACH_ID}`,
      10,
      60_000,
    )
    expect(mocks.checkRateLimit).toHaveBeenNthCalledWith(
      2,
      'notification:ip:203.0.113.10',
      30,
      60_000,
    )
    expect(session.from).not.toHaveBeenCalled()
    expect(mocks.createClient).not.toHaveBeenCalled()
    expect(mocks.sendPushToUser).not.toHaveBeenCalled()
  })
})
