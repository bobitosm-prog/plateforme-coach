import { existsSync, readFileSync } from 'node:fs'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

vi.mock('@/app/fonts', () => ({
  anton: { variable: 'font-anton' },
  barlowCondensed: { variable: 'font-barlow' },
  bebasNeue: { variable: 'font-bebas' },
  dmSans: { variable: 'font-dm-sans' },
  outfit: { variable: 'font-outfit' },
}))
vi.mock('sonner', () => ({ Toaster: () => null }))
vi.mock('@/components/AnalyticsGate', () => ({ default: () => null }))
vi.mock('@/app/web-vitals', () => ({ WebVitals: () => null }))
vi.mock('@/app/components/ui/AppErrorBoundary', () => ({
  default: ({ children }: { children: React.ReactNode }) => children,
}))

import RootDocument, { rootMetadata } from '../../app/components/layout/RootDocument'

const marketingLayout = readFileSync('app/(marketing)/[locale]/layout.tsx', 'utf8')
const applicationLayout = readFileSync('app/(application)/layout.tsx', 'utf8')

describe('localized root document language', () => {
  it.each(['fr', 'en', 'de'] as const)('renders raw server HTML with lang=%s', locale => {
    const html = renderToStaticMarkup(
      <RootDocument lang={locale}>
        <main>MoovX</main>
      </RootDocument>,
    )

    expect(html).toMatch(new RegExp(`^<html[^>]+lang="${locale}"`))
    expect(html).toContain('<main>MoovX</main>')
  })

  it('keeps the root metadata contract unchanged', () => {
    expect(rootMetadata).toEqual({
      title: 'MoovX',
      description: 'Coaching fitness Swiss Made · Swiss Quality',
    })
  })

  it('does not inject a competing global social image', () => {
    const html = renderToStaticMarkup(
      <RootDocument lang="fr">
        <main>MoovX</main>
      </RootDocument>,
    )

    expect(html).not.toContain('property="og:image"')
    expect(html).not.toContain('app.moovx.ch/logo-moovx.png')
  })

  it('binds the marketing root to the validated route locale without request headers', () => {
    expect(marketingLayout).toContain('<RootDocument lang={locale}>')
    expect(marketingLayout).toContain('setRequestLocale(locale)')
    expect(marketingLayout).toContain('hasLocale(routing.locales, locale)')
    expect(marketingLayout).not.toContain('headers()')
    expect(marketingLayout).not.toContain("'use client'")
  })

  it('keeps non-localized application routes French by default', () => {
    expect(applicationLayout).toContain('<RootDocument lang="fr">')
    expect(applicationLayout).not.toContain('headers()')
    expect(applicationLayout).not.toContain("'use client'")
  })

  it.each([
    'app/(marketing)/[locale]/landing/page.tsx',
    'app/(marketing)/[locale]/blog/page.tsx',
    'app/(marketing)/[locale]/blog/[slug]/page.tsx',
    'app/(marketing)/[locale]/guides/[slug]/page.tsx',
    'app/(application)/page.tsx',
    'app/(application)/login/page.tsx',
    'app/(application)/join/page.tsx',
    'app/(application)/coach/page.tsx',
    'app/(application)/client/[id]/page.tsx',
    'app/(application)/admin/page.tsx',
    'app/api/weekly-diagnostic/route.ts',
    'app/auth/callback/route.ts',
  ])('retains the route boundary at %s', path => {
    expect(existsSync(path)).toBe(true)
  })
})
