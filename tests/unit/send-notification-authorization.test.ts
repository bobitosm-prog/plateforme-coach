import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'
import type { NextRequest } from 'next/server'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const mocks = vi.hoisted(() => {
  const getUser = vi.fn()
  const createServerClient = vi.fn(() => ({ auth: { getUser } }))
  const getAll = vi.fn(() => [])
  const cookies = vi.fn(async () => ({ getAll }))

  const profileMaybeSingle = vi.fn()
  const profileEq = vi.fn(() => ({ maybeSingle: profileMaybeSingle }))
  const profileSelect = vi.fn(() => ({ eq: profileEq }))

  const relationMaybeSingle = vi.fn()
  const relationStatusEq = vi.fn(() => ({ maybeSingle: relationMaybeSingle }))
  const relationClientEq = vi.fn(() => ({ eq: relationStatusEq }))
  const relationCoachEq = vi.fn(() => ({ eq: relationClientEq }))
  const relationSelect = vi.fn(() => ({ eq: relationCoachEq }))

  const pushLimit = vi.fn()
  const pushEq = vi.fn(() => ({ limit: pushLimit }))
  const pushSelect = vi.fn(() => ({ eq: pushEq }))
  const deleteIn = vi.fn()
  const deleteRows = vi.fn(() => ({ in: deleteIn }))

  const from = vi.fn((table: string) => {
    if (table === 'profiles') return { select: profileSelect }
    if (table === 'coach_clients') return { select: relationSelect }
    if (table === 'push_subscriptions') return { select: pushSelect, delete: deleteRows }
    throw new Error(`Unexpected table: ${table}`)
  })
  const createClient = vi.fn(() => ({ from }))
  const setVapidDetails = vi.fn()
  const sendNotification = vi.fn()

  return {
    getUser, createServerClient, cookies, createClient, from,
    profileMaybeSingle, profileEq, relationMaybeSingle, relationCoachEq, relationClientEq, relationStatusEq,
    pushEq, pushLimit, deleteIn, setVapidDetails, sendNotification,
  }
})

vi.mock('@supabase/ssr', () => ({ createServerClient: mocks.createServerClient }))
vi.mock('@supabase/supabase-js', () => ({ createClient: mocks.createClient }))
vi.mock('next/headers', () => ({ cookies: mocks.cookies }))
vi.mock('server-only', () => ({}))
vi.mock('web-push', () => ({
  default: { setVapidDetails: mocks.setVapidDetails, sendNotification: mocks.sendNotification },
}))

import { POST } from '../../app/api/send-notification/route'
import { sendPushToUser } from '../../lib/push-server'

const CALLER_ID = '00000000-0000-4000-8000-000000000001'
const TARGET_ID = '00000000-0000-4000-8000-000000000002'
const FOREIGN_ID = '00000000-0000-4000-8000-000000000003'

const originalEnv = {
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  NEXT_PUBLIC_VAPID_PUBLIC_KEY: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
  VAPID_PRIVATE_KEY: process.env.VAPID_PRIVATE_KEY,
}

function request(overrides: Record<string, unknown> = {}): NextRequest {
  return new Request('http://localhost/api/send-notification', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId: TARGET_ID, title: 'Nouveau message', body: 'Contenu', url: '/', tag: 'test', ...overrides }),
  }) as NextRequest
}

function roles(caller: string, recipient: string | null = 'client') {
  mocks.profileMaybeSingle.mockReset()
  mocks.profileMaybeSingle
    .mockResolvedValueOnce({ data: { role: caller }, error: null })
    .mockResolvedValueOnce({ data: recipient ? { role: recipient } : null, error: null })
}

function subscription() {
  return { id: 'push-1', subscription: { endpoint: 'https://push.test/1', keys: { auth: 'auth', p256dh: 'key' } } }
}

function expectNoSubscriptionOrDelivery() {
  expect(mocks.from).not.toHaveBeenCalledWith('push_subscriptions')
  expect(mocks.sendNotification).not.toHaveBeenCalled()
}

beforeEach(() => {
  vi.clearAllMocks()
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://supabase.test'
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon-test'
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-test'
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = 'public-test'
  process.env.VAPID_PRIVATE_KEY = 'private-test'
  mocks.getUser.mockResolvedValue({ data: { user: { id: CALLER_ID } }, error: null })
  roles('coach', 'client')
  mocks.relationMaybeSingle.mockResolvedValue({ data: { id: 'relation-1' }, error: null })
  mocks.pushLimit.mockResolvedValue({ data: [subscription()], error: null })
  mocks.sendNotification.mockResolvedValue({ statusCode: 201 })
  mocks.deleteIn.mockResolvedValue({ error: null })
})

afterAll(() => {
  for (const [key, value] of Object.entries(originalEnv)) {
    if (value === undefined) delete process.env[key]
    else process.env[key] = value
  }
})

describe('POST /api/send-notification — secured authorization', () => {
  it('returns 401 anonymously before any privileged lookup or delivery', async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null }, error: null })
    const response = await POST(request())
    expect(response.status).toBe(401)
    expect(mocks.from).not.toHaveBeenCalled()
    expectNoSubscriptionOrDelivery()
  })

  it('returns 403 for self-notification because no browser producer requires it', async () => {
    const response = await POST(request({ userId: CALLER_ID }))
    expect(response.status).toBe(403)
    expect(mocks.profileMaybeSingle).not.toHaveBeenCalled()
    expectNoSubscriptionOrDelivery()
  })

  it('allows a coach to notify an active client', async () => {
    const response = await POST(request())
    expect(response.status).toBe(200)
    expect(mocks.relationCoachEq).toHaveBeenCalledWith('coach_id', CALLER_ID)
    expect(mocks.relationClientEq).toHaveBeenCalledWith('client_id', TARGET_ID)
    expect(mocks.relationStatusEq).toHaveBeenCalledWith('status', 'active')
    expect(mocks.pushEq).toHaveBeenCalledWith('user_id', TARGET_ID)
    expect(mocks.sendNotification).toHaveBeenCalledOnce()
  })

  it('allows a client to notify their active coach', async () => {
    vi.clearAllMocks()
    mocks.getUser.mockResolvedValue({ data: { user: { id: CALLER_ID } }, error: null })
    roles('client', 'coach')
    mocks.relationMaybeSingle.mockResolvedValue({ data: { id: 'relation-1' }, error: null })
    mocks.pushLimit.mockResolvedValue({ data: [subscription()], error: null })
    mocks.sendNotification.mockResolvedValue({ statusCode: 201 })
    const response = await POST(request())
    expect(response.status).toBe(200)
    expect(mocks.relationCoachEq).toHaveBeenCalledWith('coach_id', TARGET_ID)
    expect(mocks.relationClientEq).toHaveBeenCalledWith('client_id', CALLER_ID)
    expect(mocks.sendNotification).toHaveBeenCalledOnce()
  })

  it.each([
    ['coach to foreign client', 'coach', 'client'],
    ['coach to inactive client', 'coach', 'client'],
    ['client to foreign coach', 'client', 'coach'],
  ])('returns 403 for %s before subscriptions or Web Push', async (_label, callerRole, recipientRole) => {
    vi.clearAllMocks()
    mocks.getUser.mockResolvedValue({ data: { user: { id: CALLER_ID } }, error: null })
    roles(callerRole, recipientRole)
    mocks.relationMaybeSingle.mockResolvedValue({ data: null, error: null })
    const response = await POST(request({ userId: FOREIGN_ID }))
    expect(response.status).toBe(403)
    expectNoSubscriptionOrDelivery()
  })

  it.each([
    ['client to another client', 'client', 'client'],
    ['coach to another coach', 'coach', 'coach'],
    ['invited caller', 'invited', 'client'],
    ['incorrect admin caller', 'admin', 'client'],
  ])('returns 403 for %s before relation and delivery', async (_label, callerRole, recipientRole) => {
    vi.clearAllMocks()
    mocks.getUser.mockResolvedValue({ data: { user: { id: CALLER_ID } }, error: null })
    roles(callerRole, recipientRole)
    const response = await POST(request({ userId: FOREIGN_ID }))
    expect(response.status).toBe(403)
    expect(mocks.from).not.toHaveBeenCalledWith('coach_clients')
    expectNoSubscriptionOrDelivery()
  })

  it('returns 403 for an injected recipient without an active relation', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    mocks.relationMaybeSingle.mockResolvedValue({ data: null, error: null })
    const response = await POST(request({ userId: FOREIGN_ID }))
    expect(response.status).toBe(403)
    expect(response.headers.get('x-request-id')).toMatch(/^[0-9a-f-]{36}$/)
    expect(JSON.parse(String(warn.mock.calls[0][0])).reason).toBe('RELATION_FORBIDDEN')
    expectNoSubscriptionOrDelivery()
  })

  it('returns 403 without revealing that a recipient does not exist', async () => {
    mocks.profileMaybeSingle.mockReset()
    roles('coach', null)
    const response = await POST(request({ userId: FOREIGN_ID }))
    expect(response.status).toBe(403)
    expectNoSubscriptionOrDelivery()
  })

  it.each([
    [{ userId: 'not-a-uuid' }, 'invalid recipient'],
    [{ title: '' }, 'empty title'],
    [{ body: '' }, 'empty body'],
    [{ url: undefined }, 'missing URL'],
    [{ url: { pathname: '/coach' } }, 'non-text URL'],
    [{ unexpected: true }, 'unknown property'],
  ])('returns 400 for %s before privileged lookups', async (payload, label) => {
    expect(label).toBeTruthy()
    const response = await POST(request(payload))
    expect(response.status).toBe(400)
    expect(mocks.from).not.toHaveBeenCalled()
    expectNoSubscriptionOrDelivery()
  })

  it('returns zero delivery when the authorized recipient has no subscription', async () => {
    mocks.pushLimit.mockResolvedValue({ data: [], error: null })
    const response = await POST(request())
    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ sent: 0, failed: 0 })
    expect(mocks.sendNotification).not.toHaveBeenCalled()
  })

  it('reports a mocked Web Push provider failure after authorization', async () => {
    mocks.sendNotification.mockRejectedValue({ statusCode: 500, message: 'provider unavailable' })
    const response = await POST(request())
    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ sent: 0, failed: 1 })
  })
})

describe('POST /api/send-notification — internal URL policy and producer compatibility', () => {
  it.each(['/internal/path', '/coach?tab=messages#latest'])(
    'forwards legitimate internal URL %s', async url => {
      const response = await POST(request({ url }))
      expect(response.status).toBe(200)
      expect(JSON.parse(mocks.sendNotification.mock.calls[0][1] as string)).toMatchObject({ url })
    }
  )

  it.each([
    'https://evil.example', 'http://evil.example', '//evil.example',
    'javascript:alert(1)', 'data:text/html,evil', 'file:///tmp/evil',
    '/safe\\evil', '/safe\nexternal', ' /safe', '/safe ',
    '/%2F%2Fevil.example', '/%252F%252Fevil.example',
  ])('returns 400 for hostile URL %s before subscriptions or delivery', async url => {
    const response = await POST(request({ url }))
    expect(response.status).toBe(400)
    expect(mocks.from).not.toHaveBeenCalled()
    expectNoSubscriptionOrDelivery()
  })

  it('rejects a hostile destination in the shared server transport before reading subscriptions', async () => {
    const admin = { from: mocks.from }
    await expect(sendPushToUser(
      admin as unknown as Parameters<typeof sendPushToUser>[0],
      TARGET_ID,
      { title: 'Server push', body: 'Body', url: 'https://evil.example' }
    )).rejects.toThrow('Invalid notification destination')
    expect(mocks.from).not.toHaveBeenCalled()
    expect(mocks.sendNotification).not.toHaveBeenCalled()
  })

  it('keeps all four browser producers compatible with the secured request contract', () => {
    const sources = [
      'app/client/[id]/hooks/useClientDetail.ts',
      'app/hooks/useMessages.ts',
      'app/coach/hooks/useCoachDashboard.ts',
    ].map(file => readFileSync(resolve(process.cwd(), file), 'utf8')).join('\n')
    expect(sources.match(/fetch\('\/api\/send-notification'/g)).toHaveLength(4)
    expect(sources).toContain('JSON.stringify({ userId: id,')
    expect(sources).toContain('JSON.stringify({ userId: coachId,')
    expect(sources).toContain('JSON.stringify({ userId: nsClientId,')
    expect(sources).toContain('JSON.stringify({ userId: selectedClient.client_id,')
  })

  it('keeps the weekly diagnostic and streak reminder on validated internal destinations', () => {
    const diagnostic = readFileSync(resolve(process.cwd(), 'lib/weekly-diagnostic/generator.ts'), 'utf8')
    const streak = readFileSync(resolve(process.cwd(), 'app/api/streak-reminder/cron/route.ts'), 'utf8')
    expect(diagnostic).toContain('url: `/weekly-diagnostic/${diagnosticId}`')
    expect(streak).toContain("url: '/'")
    expect(streak).toContain('sendPushToUser(supabaseAdmin, uid,')
  })
})
