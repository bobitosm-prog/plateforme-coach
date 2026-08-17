import { readFileSync } from 'node:fs'
import { createElement, type ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

vi.mock('next/font/google', () => ({
  Bebas_Neue: () => ({ variable: '--font-display' }),
  Barlow_Condensed: () => ({ variable: '--font-alt' }),
  Outfit: () => ({ variable: '--font-body' }),
  DM_Sans: () => ({ variable: '--font-dm-sans' }),
  Anton: () => ({ variable: '--font-impact' }),
}))

vi.mock('@/components/AnalyticsGate', () => ({ default: () => null }))
vi.mock('@/app/web-vitals', () => ({ WebVitals: () => null }))
vi.mock('@/app/components/ui/AppErrorBoundary', () => ({
  default: ({ children }: { children: ReactNode }) => children,
}))
vi.mock('sonner', () => ({ Toaster: () => null }))

import RootDocument, { rootMetadata } from '@/app/components/layout/RootDocument'

describe('localized root documents', () => {
  it.each(['fr', 'en', 'de'] as const)('renders the initial HTML language for /%s/*', lang => {
    const html = renderToStaticMarkup(RootDocument({
      lang,
      children: createElement('main', null, 'MoovX'),
    }))

    expect(html).toContain(`<html lang="${lang}"`)
    expect(html.match(/<html/g)).toHaveLength(1)
    expect(html.match(/<body/g)).toHaveLength(1)
  })

  it('keeps the production metadata contract unchanged', () => {
    expect(rootMetadata).toEqual({
      title: 'MoovX',
      description: 'Coaching fitness Swiss Made · Swiss Quality',
    })
  })

  it('keeps production fonts and providers centralized exactly once', () => {
    const source = readFileSync('app/components/layout/RootDocument.tsx', 'utf8')

    expect(source).toContain('from "next/font/google"')
    expect(source).not.toContain('@/app/fonts')
    for (const provider of ['<AppErrorBoundary>', '<Toaster ', '<AnalyticsGate />', '<WebVitals />']) {
      expect(source.split(provider)).toHaveLength(2)
    }
  })

  it('binds the marketing locale to RootDocument and keeps application routes French', () => {
    const marketing = readFileSync('app/(marketing)/[locale]/layout.tsx', 'utf8')
    const application = readFileSync('app/(application)/layout.tsx', 'utf8')

    expect(marketing).toContain('<RootDocument lang={locale}>')
    expect(marketing).toContain('hasLocale(routing.locales, locale)')
    expect(marketing).toContain('setRequestLocale(locale)')
    expect(marketing).toContain('<NextIntlClientProvider>')
    expect(marketing).toContain('<CookieConsent />')
    expect(application).toContain('<RootDocument lang="fr">')
  })
})
