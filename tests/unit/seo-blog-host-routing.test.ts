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
  it.each([
    ['moovx.ch', '/index-vitrine.html'],
    ['moovx.ch', '/vitrine.html'],
    ['app.moovx.ch', '/index-vitrine.html'],
    ['app.moovx.ch', '/vitrine.html'],
  ])('redirects the legacy showcase %s%s permanently to the French landing', async (host, pathname) => {
    const response = await proxy(request(host, pathname))

    expect(response.status).toBe(308)
    expect(response.headers.get('location')).toBe('https://moovx.ch/fr/landing')
    expect(mocks.createServerClient).not.toHaveBeenCalled()
  })

  it('preserves the query when redirecting a legacy showcase', async () => {
    const response = await proxy(request(
      'moovx.ch',
      '/vitrine.html?utm_source=legacy&utm_campaign=showcase',
    ))

    expect(response.status).toBe(308)
    expect(response.headers.get('location')).toBe(
      'https://moovx.ch/fr/landing?utm_source=legacy&utm_campaign=showcase',
    )
  })

  it.each(['/vitrine.html-old', '/index-vitrine.html/extra'])(
    'does not treat the neighboring route %s as a legacy showcase',
    async pathname => {
      const response = await proxy(request('moovx.ch', pathname))

      expect(response.status).toBe(308)
      expect(response.headers.get('location')).toBe(`https://app.moovx.ch${pathname}`)
    },
  )

  it.each([
    ['guide-musculation.html', 'musculation'],
    ['guide-nutrition.html', 'nutrition'],
  ])('redirects the legacy %s permanently to the French pillar guide', async (legacyFile, slug) => {
    for (const host of ['moovx.ch', 'app.moovx.ch']) {
      const response = await proxy(request(host, `/${legacyFile}`))

      expect(response.status).toBe(308)
      expect(response.headers.get('location')).toBe(`https://moovx.ch/fr/guides/${slug}`)
    }
    expect(mocks.createServerClient).not.toHaveBeenCalled()
  })

  it('preserves the query when redirecting a legacy guide', async () => {
    const response = await proxy(request(
      'app.moovx.ch',
      '/guide-nutrition.html?utm_source=legacy&utm_campaign=guide',
    ))

    expect(response.status).toBe(308)
    expect(response.headers.get('location')).toBe(
      'https://moovx.ch/fr/guides/nutrition?utm_source=legacy&utm_campaign=guide',
    )
  })

  it.each(['/guide-musculation.html-old', '/guide-nutrition.html/extra'])(
    'does not treat the neighboring route %s as a legacy guide',
    async pathname => {
      const response = await proxy(request('moovx.ch', pathname))

      expect(response.status).toBe(308)
      expect(response.headers.get('location')).toBe(`https://app.moovx.ch${pathname}`)
    },
  )

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

  it.each(['musculation', 'nutrition'])('keeps the French %s guide on the marketing host', async slug => {
    const marketingResponse = await proxy(request('moovx.ch', `/fr/guides/${slug}`))
    const appResponse = await proxy(request('app.moovx.ch', `/fr/guides/${slug}`))

    expect(marketingResponse.status).toBe(200)
    expect(marketingResponse.headers.get('location')).toBeNull()
    expect(appResponse.status).toBe(308)
    expect(appResponse.headers.get('location')).toBe(`https://moovx.ch/fr/guides/${slug}`)
  })

  it.each(['en', 'de'])('does not expose an untranslated %s guide on the marketing host', async locale => {
    const response = await proxy(request('moovx.ch', `/${locale}/guides/musculation`))

    expect(response.status).toBe(308)
    expect(response.headers.get('location')).toBe(
      `https://app.moovx.ch/${locale}/guides/musculation`,
    )
  })

  it('keeps the French calculator on marketing and redirects it from the app host', async () => {
    const pathname = '/fr/outils/calculateur-calories-macros'
    const marketingResponse = await proxy(request('moovx.ch', pathname))
    const appResponse = await proxy(request('app.moovx.ch', pathname))

    expect(marketingResponse.status).toBe(200)
    expect(marketingResponse.headers.get('location')).toBeNull()
    expect(appResponse.status).toBe(308)
    expect(appResponse.headers.get('location')).toBe(`https://moovx.ch${pathname}`)
  })

  it.each(['en', 'de'])('returns 404 for the untranslated %s calculator on every host', async locale => {
    const pathname = `/${locale}/outils/calculateur-calories-macros`
    for (const host of ['moovx.ch', 'app.moovx.ch', 'localhost:3000']) {
      const response = await proxy(request(host, pathname))

      expect(response.status).toBe(404)
      expect(response.headers.get('location')).toBeNull()
    }
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
