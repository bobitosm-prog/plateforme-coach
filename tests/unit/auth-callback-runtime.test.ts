import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const m = vi.hoisted(() => ({ exchange: vi.fn(), signOut: vi.fn(), from: vi.fn(), get: vi.fn(), set: vi.fn() }))
vi.mock('next/headers', () => ({ cookies: async () => ({ getAll: () => [], get: m.get, set: m.set }) }))
vi.mock('@supabase/ssr', () => ({ createServerClient: () => ({
  auth: { exchangeCodeForSession: m.exchange, signOut: m.signOut }, from: m.from,
}) }))
import { GET } from '@/app/auth/callback/route'

const origin = 'https://moovx.invalid'
const request = (params: Record<string, string> = {}) => GET(new NextRequest(
  `${origin}/auth/callback?${new URLSearchParams(params)}`,
))
const location = (response: Response) => new URL(response.headers.get('location')!)

beforeEach(() => {
  vi.resetAllMocks()
  vi.stubEnv('NODE_ENV', 'production')
  m.exchange.mockResolvedValue({ data: { session: { user: { id: 'synthetic-user', user_metadata: {} } } }, error: null })
  m.signOut.mockResolvedValue({ error: null })
})
afterEach(() => vi.unstubAllEnvs())

describe('auth callback runtime redirects', () => {
  it('exchanges the code and preserves an internal invitation destination', async () => {
    const response = await request({ code: 'synthetic-code', next: '/join' })
    expect(response.status).toBe(307)
    expect(location(response).href).toBe(`${origin}/join`)
    expect(m.exchange).toHaveBeenCalledExactlyOnceWith('synthetic-code')
    expect(m.signOut).not.toHaveBeenCalled()
    expect(response.cookies.get('moovx_oauth_role_intent')?.value).toBe('')
  })

  it.each(['https://external.invalid', '//external.invalid', 'javascript:alert(1)', '/\\external.invalid', '/\t/external.invalid'])('never redirects to an external origin for next=%s', async next => {
    expect(location(await request({ code: 'synthetic-code', next })).origin).toBe(origin)
  })

  it('sets a short-lived protected marker only after successful recovery', async () => {
    const response = await request({ code: 'synthetic-code', type: 'recovery', next: '/join' })
    expect(location(response).pathname).toBe('/reset-password')
    expect(response.cookies.get('moovx_recovery_session')).toMatchObject({
      value: '1', httpOnly: true, secure: true, sameSite: 'lax', maxAge: 600, path: '/reset-password',
    })
    expect(m.signOut).not.toHaveBeenCalled()
  })

  it('requires a fresh login after signup while retaining the invitation', async () => {
    const response = await request({ code: 'synthetic-code', type: 'signup', next: '/join' })
    expect(location(response).pathname).toBe('/login')
    expect(location(response).searchParams.get('confirmed')).toBe('1')
    expect(location(response).searchParams.get('next')).toBe('/join')
    expect(m.signOut).toHaveBeenCalledOnce()
    expect(response.cookies.get('moovx_recovery_session')).toBeUndefined()
  })

  it.each([
    ['', 'callback_invalid'], ['recovery', 'recovery_error'], ['signup', 'confirmation_error'],
  ])('handles missing or rejected codes for type=%s', async (type, errorCode) => {
    const missing = await request({ type })
    expect(location(missing).searchParams.get('auth_error')).toBe(errorCode)
    expect(m.exchange).not.toHaveBeenCalled()
    m.exchange.mockResolvedValue({ data: { session: null }, error: new Error('synthetic expired code') })
    const rejected = await request({ code: 'synthetic-expired', type })
    expect(location(rejected).searchParams.get('auth_error')).toBe(errorCode)
    expect(rejected.cookies.get('moovx_recovery_session')).toBeUndefined()
    expect(m.from).not.toHaveBeenCalled()
  })

  it('handles provider cancellation without exposing its description or exchanging a code', async () => {
    const response = await request({ error: 'access_denied', error_description: 'synthetic-sensitive-detail', code: 'unused' })
    expect(location(response).href).toBe(`${origin}/login?auth_error=oauth_error`)
    expect(m.exchange).not.toHaveBeenCalled()
    expect(response.cookies.get('moovx_oauth_role_intent')?.value).toBe('')
  })
})
