import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
const m = vi.hoisted(() => ({ verify: vi.fn(), signOut: vi.fn(), rate: vi.fn() }))
vi.mock('@supabase/supabase-js', () => ({ createClient: () => ({ auth: { verifyOtp: m.verify, signOut: m.signOut } }) }))
vi.mock('@/lib/rate-limit', () => ({ checkRateLimit: m.rate }))
import { GET, POST } from '@/app/auth/confirm/route'
const origin = 'https://app.moovx.ch'
const token = 'a'.repeat(64)
const post = (body = { token_hash: token, next: '' }, requestOrigin = origin) => POST(new NextRequest(`${origin}/auth/confirm`, {
  method: 'POST', headers: { origin: requestOrigin, 'content-type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams(body),
}))
beforeEach(() => {
  vi.resetAllMocks()
  m.rate.mockReturnValue({ allowed: true })
  m.verify.mockResolvedValue({ error: null })
  m.signOut.mockResolvedValue({ error: null })
})
describe('cross-browser signup confirmation', () => {
  it('does not consume a token on GET (including mail scanners)', async () => {
    const response = GET(new NextRequest(`${origin}/auth/confirm?token_hash=${token}`))
    expect(response.status).toBe(200)
    expect(await response.text()).toContain('method="post"')
    expect(response.headers.get('referrer-policy')).toBe('no-referrer')
    expect(response.headers.get('cache-control')).toContain('no-store')
    expect(m.verify).not.toHaveBeenCalled()
  })
  it('confirms without PKCE cookies and leaves browser sessions untouched', async () => {
    const response = await post()
    expect(m.verify).toHaveBeenCalledWith({ token_hash: token, type: 'email' })
    expect(m.signOut).toHaveBeenCalledWith({ scope: 'local' })
    expect(response.headers.get('location')).toBe(`${origin}/login?confirmed=1`)
    expect(response.headers.get('set-cookie')).toBeNull()
  })
  it('returns an app-origin signup to the native handoff page without tokens', async () => {
    const destination = encodeURIComponent(`${origin}/auth/callback?type=signup&next=%2Fjoin&source=ios`)
    const page = await GET(new NextRequest(`${origin}/auth/confirm?token_hash=${token}&next=${destination}`)).text()
    expect(page).toContain('name="source" value="ios"')
    expect(page).toContain('name="next" value="/join"')
    const response = await POST(new NextRequest(`${origin}/auth/confirm`, { method: 'POST', headers: { origin, 'content-type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ token_hash: token, source: 'ios' }) }))
    expect(response.headers.get('location')).toBe(`${origin}/auth/confirmed`)
    expect(response.headers.get('location')).not.toContain(token)
  })

  it('rejects expired or already used tokens without a success message', async () => {
    m.verify.mockResolvedValue({ error: { code: 'otp_expired' } })
    expect((await post()).headers.get('location')).toBe(`${origin}/login?auth_error=confirmation_error`)
    expect(m.signOut).not.toHaveBeenCalled()
  })
  it('requires same-origin submission and limits repeated attempts', async () => {
    expect((await post(undefined, 'https://evil.invalid')).status).toBe(403)
    m.rate.mockReturnValue({ allowed: false, retryAfter: 30 })
    expect((await post()).status).toBe(429)
    expect(m.verify).not.toHaveBeenCalled()
  })
  it('validates tokens and never reflects arbitrary HTML or redirects', async () => {
    expect(GET(new NextRequest(`${origin}/auth/confirm?token_hash=%22%3E%3Cscript%3E`)).status).toBe(303)
    expect((await post({ token_hash: token, next: '//evil.invalid' })).headers.get('location')).toBe(`${origin}/login?confirmed=1`)
  })
  it('preserves only the supported invitation destination', async () => {
    const next = encodeURIComponent(`${origin}/auth/callback?type=signup&next=%2Fjoin`)
    expect(await GET(new NextRequest(`${origin}/auth/confirm?token_hash=${token}&next=${next}`)).text()).toContain('name="next" value="/join"')
    expect((await post({ token_hash: token, next: '/join' })).headers.get('location')).toBe(`${origin}/login?confirmed=1&next=%2Fjoin`)
  })
})
