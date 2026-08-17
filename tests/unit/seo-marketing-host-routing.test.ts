import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn(() => ({
    auth: {
      getSession: vi.fn(async () => ({ data: { session: null } })),
    },
  })),
}))

import { getHostRedirect, isMarketingPath, proxy } from '@/proxy'

function request(host: string, path: string): NextRequest {
  return new NextRequest(`https://${host}${path}`, {
    headers: { host },
  })
}

function expectRedirect(response: Response | null, location: string) {
  expect(response?.status).toBe(308)
  expect(response?.headers.get('location')).toBe(location)
}

describe('marketing/application host boundary', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const multilingualBlogPaths = [
    '/fr/blog',
    '/fr/blog/article-test',
    '/en/blog',
    '/en/blog/article-test',
    '/de/blog',
    '/de/blog/article-test',
  ]

  const frenchAcquisitionPaths = [
    '/fr/guides/nutrition',
    '/fr/outils/calculateur-calories-macros',
    '/fr/nutrition/prise-de-masse',
    '/fr/coach-sportif-ia',
  ]

  it.each([...multilingualBlogPaths, ...frenchAcquisitionPaths])(
    'keeps %s on the marketing apex',
    async path => {
      const response = await proxy(request('moovx.ch', path))

      expect(response.status).toBe(200)
      expect(response.headers.get('location')).toBeNull()
    },
  )

  it.each([...multilingualBlogPaths, ...frenchAcquisitionPaths])(
    'redirects %s from the application host to the marketing apex',
    path => {
      expectRedirect(
        getHostRedirect(request('app.moovx.ch', path)),
        `https://moovx.ch${path}`,
      )
    },
  )

  it.each([
    '/en/guides/nutrition',
    '/de/guides/musculation',
    '/en/outils/calculateur-calories-macros',
    '/de/outils/calculateur-calories-macros',
    '/en/nutrition/prise-de-masse',
    '/de/nutrition/prise-de-masse',
    '/en/coach-sportif-ia',
    '/de/coach-sportif-ia',
  ])('does not classify the unavailable localized route %s as marketing', path => {
    expect(isMarketingPath(path)).toBe(false)
    expectRedirect(
      getHostRedirect(request('moovx.ch', path)),
      `https://app.moovx.ch${path}`,
    )
  })

  it.each(['/login', '/join', '/coach/team', '/client/example', '/admin/users'])(
    'keeps the application route %s on app.moovx.ch',
    async path => {
      expect(getHostRedirect(request('app.moovx.ch', path))).toBeNull()
      expectRedirect(
        getHostRedirect(request('moovx.ch', path)),
        `https://app.moovx.ch${path}`,
      )
    },
  )

  it('preserves query strings in both redirect directions', () => {
    expectRedirect(
      getHostRedirect(request('app.moovx.ch', '/fr/blog/article?source=google&page=2')),
      'https://moovx.ch/fr/blog/article?source=google&page=2',
    )
    expectRedirect(
      getHostRedirect(request('moovx.ch', '/login?next=%2Fcoach')),
      'https://app.moovx.ch/login?next=%2Fcoach',
    )
  })

  it('canonicalizes www marketing routes without creating a loop', () => {
    expectRedirect(
      getHostRedirect(request('www.moovx.ch', '/fr/blog?source=www')),
      'https://moovx.ch/fr/blog?source=www',
    )
    expect(getHostRedirect(request('moovx.ch', '/fr/blog?source=www'))).toBeNull()
    expectRedirect(
      getHostRedirect(request('www.moovx.ch', '/login')),
      'https://app.moovx.ch/login',
    )
  })

  it.each(['/fr/blogger', '/fr/landing-invalid'])(
    'uses exact segment boundaries for %s',
    path => {
      expect(isMarketingPath(path)).toBe(false)
      expectRedirect(
        getHostRedirect(request('moovx.ch', path)),
        `https://app.moovx.ch${path}`,
      )
    },
  )

  it('leaves the root host decision to the existing downstream logic', () => {
    expect(getHostRedirect(request('moovx.ch', '/'))).toBeNull()
    expect(getHostRedirect(request('www.moovx.ch', '/'))).toBeNull()
    expect(getHostRedirect(request('app.moovx.ch', '/'))).toBeNull()
  })

  it.each(['/sitemap.xml', '/robots.txt'])(
    'keeps %s authoritative on the marketing apex',
    path => {
      expect(getHostRedirect(request('moovx.ch', path))).toBeNull()
      expectRedirect(
        getHostRedirect(request('app.moovx.ch', path)),
        `https://moovx.ch${path}`,
      )
    },
  )

  it.each(['preview.vercel.app', 'localhost:3000'])(
    'does not apply production host redirects on %s',
    host => {
      expect(getHostRedirect(request(host, '/fr/blog'))).toBeNull()
      expect(getHostRedirect(request(host, '/login'))).toBeNull()
    },
  )

  it('keeps the WordPress ghost response ahead of host routing', async () => {
    const response = await proxy(request('moovx.ch', '/produit/ancien-produit'))

    expect(response.status).toBe(410)
    expect(response.statusText).toBe('Gone')
  })
})
