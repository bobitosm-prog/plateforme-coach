import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'
import type { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => {
  const getUser = vi.fn()
  const createServerClient = vi.fn(() => ({ auth: { getUser } }))
  const getAll = vi.fn(() => [])
  const cookies = vi.fn(async () => ({ getAll }))

  const limit = vi.fn()
  const eq = vi.fn(() => ({ limit }))
  const select = vi.fn(() => ({ eq }))
  const deleteIn = vi.fn()
  const deleteRows = vi.fn(() => ({ in: deleteIn }))
  const from = vi.fn((table: string) => {
    if (table !== 'push_subscriptions') throw new Error(`Unexpected table: ${table}`)
    return { select, delete: deleteRows }
  })
  const createClient = vi.fn(() => ({ from }))

  const setVapidDetails = vi.fn()
  const sendNotification = vi.fn()

  return {
    getUser, createServerClient, cookies, createClient, from, select, eq, limit,
    deleteRows, deleteIn, setVapidDetails, sendNotification,
  }
})

vi.mock('@supabase/ssr', () => ({ createServerClient: mocks.createServerClient }))
vi.mock('@supabase/supabase-js', () => ({ createClient: mocks.createClient }))
vi.mock('next/headers', () => ({ cookies: mocks.cookies }))
vi.mock('server-only', () => ({}))
vi.mock('web-push', () => ({
  default: {
    setVapidDetails: mocks.setVapidDetails,
    sendNotification: mocks.sendNotification,
  },
}))

import { POST } from '../../app/api/send-notification/route'

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
    body: JSON.stringify({
      userId: TARGET_ID,
      title: 'Nouveau message',
      body: 'Contenu contrôlé par le navigateur',
      url: '/',
      tag: 'test',
      ...overrides,
    }),
  }) as NextRequest
}

function authenticate(id = CALLER_ID) {
  mocks.getUser.mockResolvedValue({ data: { user: { id } }, error: null })
}

function subscription(id = 'push-1') {
  return { id, subscription: { endpoint: `https://push.test/${id}`, keys: { auth: 'auth', p256dh: 'key' } } }
}

function expectNoPushLookupOrDelivery() {
  expect(mocks.from).not.toHaveBeenCalled()
  expect(mocks.sendNotification).not.toHaveBeenCalled()
}

beforeEach(() => {
  vi.clearAllMocks()
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://supabase.test'
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon-test'
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-test'
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = 'public-test'
  process.env.VAPID_PRIVATE_KEY = 'private-test'
  authenticate()
  mocks.limit.mockResolvedValue({ data: [subscription()], error: null })
  mocks.sendNotification.mockResolvedValue({ statusCode: 201 })
  mocks.deleteIn.mockResolvedValue({ error: null })
})

afterAll(() => {
  for (const [key, value] of Object.entries(originalEnv)) {
    if (value === undefined) delete process.env[key]
    else process.env[key] = value
  }
})

describe('POST /api/send-notification — current authorization boundaries', () => {
  it('safely rejects an anonymous call before reading subscriptions or sending push', async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null }, error: null })
    const response = await POST(request())
    expect(response.status).toBe(401)
    expectNoPushLookupOrDelivery()
  })

  it('allows an authenticated user to notify themselves', async () => {
    const response = await POST(request({ userId: CALLER_ID }))
    expect(response.status).toBe(200)
    expect(mocks.eq).toHaveBeenCalledWith('user_id', CALLER_ID)
    expect(mocks.sendNotification).toHaveBeenCalledOnce()
  })

  it.each([
    ['coach to active client', 'coach', TARGET_ID],
    ['coach to foreign client', 'coach', FOREIGN_ID],
    ['client to active coach', 'client', TARGET_ID],
    ['client to foreign coach', 'client', FOREIGN_ID],
    ['client to another client', 'client', FOREIGN_ID],
    ['coach to another coach', 'coach', FOREIGN_ID],
    ['incorrect invited role', 'invited', FOREIGN_ID],
  ])('vulnerably allows %s because role and relation are never queried', async (_label, _role, targetId) => {
    const response = await POST(request({ userId: targetId }))
    expect(response.status).toBe(200)
    expect(mocks.eq).toHaveBeenCalledWith('user_id', targetId)
    expect(mocks.from).toHaveBeenCalledTimes(1)
    expect(mocks.from).toHaveBeenCalledWith('push_subscriptions')
    expect(mocks.sendNotification).toHaveBeenCalledOnce()
  })

  it('vulnerably accepts an injected arbitrary recipient from the request body', async () => {
    const response = await POST(request({ userId: FOREIGN_ID }))
    expect(response.status).toBe(200)
    expect(mocks.eq).toHaveBeenCalledWith('user_id', FOREIGN_ID)
  })

  it('vulnerably behaves identically when a relation is nonexistent or inactive', async () => {
    const response = await POST(request({ userId: FOREIGN_ID }))
    expect(response.status).toBe(200)
    expect(mocks.from).not.toHaveBeenCalledWith('coach_clients')
    expect(mocks.sendNotification).toHaveBeenCalledOnce()
  })

  it('returns zero delivery when the recipient has no push subscription', async () => {
    mocks.limit.mockResolvedValue({ data: [], error: null })
    const response = await POST(request())
    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ sent: 0, failed: 0 })
    expect(mocks.sendNotification).not.toHaveBeenCalled()
  })

  it('reports a Web Push provider failure without making an external call in the test', async () => {
    mocks.sendNotification.mockRejectedValue({ statusCode: 500, message: 'provider unavailable' })
    const response = await POST(request())
    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ sent: 0, failed: 1 })
  })
})

describe('POST /api/send-notification — current URL passthrough', () => {
  it.each([
    ['/internal/path', 'internal path'],
    ['https://evil.example/phishing', 'external URL'],
    ['javascript:alert(1)', 'dangerous scheme'],
  ])('vulnerably forwards an %s unchanged in the signed push payload', async (url) => {
    const response = await POST(request({ url }))
    expect(response.status).toBe(200)
    const payload = mocks.sendNotification.mock.calls[0][1] as string
    expect(JSON.parse(payload)).toMatchObject({ url })
  })
})
