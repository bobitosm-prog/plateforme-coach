import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => {
  const getSession = vi.fn()
  const createServerClient = vi.fn(() => ({
    auth: { getSession },
  }))

  return { createServerClient, getSession }
})

vi.mock('@supabase/ssr', () => ({
  createServerClient: mocks.createServerClient,
}))

import { proxy } from '../../proxy'

function request(host: string, pathname: string) {
  return new NextRequest(`https://${host}${pathname}`, {
    headers: { host },
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.getSession.mockResolvedValue({ data: { session: null } })
})

describe('SEO Blog host routing', () => {
  it.each(['fr', 'en', 'de'])('keeps the %s Blog index on the marketing host', async locale => {
    const response = await proxy(request('moovx.ch', `/${locale}/blog`))

    expect(response.status).toBe(200)
    expect(response.headers.get('location')).toBeNull()
    expect(response.headers.get('x-middleware-next')).toBe('1')
  })

  it.each(['fr', 'en', 'de'])('keeps %s Blog articles on the marketing host', async locale => {
    const response = await proxy(request(
      'moovx.ch',
      `/${locale}/blog/combien-de-proteines-prise-de-muscle`,
    ))

    expect(response.status).toBe(200)
    expect(response.headers.get('location')).toBeNull()
    expect(response.headers.get('x-middleware-next')).toBe('1')
  })

  it('redirects Blog routes from the app host to the marketing host and preserves the query', async () => {
    const response = await proxy(request(
      'app.moovx.ch',
      '/fr/blog/combien-de-proteines-prise-de-muscle?source=app&preview=1',
    ))

    expect(response.status).toBe(308)
    expect(response.headers.get('location')).toBe(
      'https://moovx.ch/fr/blog/combien-de-proteines-prise-de-muscle?source=app&preview=1',
    )
    expect(mocks.createServerClient).not.toHaveBeenCalled()
  })

  it('keeps login and the unauthenticated app root on the application host', async () => {
    const loginResponse = await proxy(request('app.moovx.ch', '/login'))
    const rootResponse = await proxy(request('app.moovx.ch', '/'))

    expect(loginResponse.status).toBe(200)
    expect(loginResponse.headers.get('location')).toBeNull()
    expect(rootResponse.status).toBe(308)
    expect(rootResponse.headers.get('location')).toBe('https://app.moovx.ch/login')
  })

  it.each(['/coach/programs', '/client/client-id'])(
    'keeps the private route %s on the application host',
    async pathname => {
      const marketingResponse = await proxy(request('moovx.ch', pathname))
      const appResponse = await proxy(request('app.moovx.ch', pathname))

      expect(marketingResponse.status).toBe(308)
      expect(marketingResponse.headers.get('location')).toBe(`https://app.moovx.ch${pathname}`)
      expect(appResponse.status).toBe(307)
      expect(appResponse.headers.get('location')).toBe('https://app.moovx.ch/')
    },
  )
})
