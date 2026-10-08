import * as React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

vi.mock('next-intl/server', () => ({
  getTranslations: async ({ locale }: { locale: string }) =>
    (key: string) => `${locale}:${key}`,
}))

vi.mock('@/lib/beta-offer', () => ({
  getActiveBetaOffer: async () => null,
  trialDaysFor: () => 0,
}))


import LandingLayout from '@/app/(marketing)/[locale]/landing/layout'
import LandingPage, { generateMetadata } from '@/app/(marketing)/[locale]/landing/page'

vi.stubGlobal('React', React)

const locales = ['fr', 'en', 'de'] as const

async function renderLanding(locale: (typeof locales)[number]) {
  const page = await LandingPage({ params: Promise.resolve({ locale }) })
  return renderToStaticMarkup(LandingLayout({ children: page }))
}

function extractSchema(html: string) {
  const scripts = [...html.matchAll(/<script type="application\/ld\+json">(.+?)<\/script>/g)]
  expect(scripts).toHaveLength(1)
  return JSON.parse(scripts[0][1])
}

describe('Landing structured data graph', () => {
  it.each(locales)('renders exactly one valid JSON-LD graph for %s', async locale => {
    const schema = extractSchema(await renderLanding(locale))

    expect(schema['@context']).toBe('https://schema.org')
    expect(schema['@graph'].map((entity: { '@type': string }) => entity['@type'])).toEqual([
      'Organization',
      'WebSite',
      'WebApplication',
    ])
  })

  it('uses the same stable entity identifiers for every language', async () => {
    const ids = await Promise.all(locales.map(async locale => {
      const schema = extractSchema(await renderLanding(locale))
      return schema['@graph'].map((entity: { '@id': string }) => entity['@id'])
    }))

    expect(ids[0]).toEqual([
      'https://moovx.ch/#organization',
      'https://moovx.ch/#website',
      'https://moovx.ch/#software',
    ])
    expect(ids[1]).toEqual(ids[0])
    expect(ids[2]).toEqual(ids[0])
  })

  it('contains only the verified Organization contract', async () => {
    const schema = extractSchema(await renderLanding('fr'))

    expect(schema['@graph'][0]).toEqual({
      '@type': 'Organization',
      '@id': 'https://moovx.ch/#organization',
      name: 'MoovX',
      url: 'https://moovx.ch',
      logo: 'https://moovx.ch/logo-moovx-512.png',
      email: 'contact@moovx.ch',
    })
  })

  it('links the WebSite and WebApplication to the Organization', async () => {
    const schema = extractSchema(await renderLanding('fr'))
    const [, website, application] = schema['@graph']

    expect(website).toEqual({
      '@type': 'WebSite',
      '@id': 'https://moovx.ch/#website',
      url: 'https://moovx.ch',
      publisher: { '@id': 'https://moovx.ch/#organization' },
      inLanguage: ['fr', 'en', 'de'],
    })
    expect(application).toEqual({
      '@type': 'WebApplication',
      '@id': 'https://moovx.ch/#software',
      name: 'MoovX',
      url: 'https://moovx.ch',
      applicationCategory: 'HealthApplication',
      operatingSystem: 'Web',
      publisher: { '@id': 'https://moovx.ch/#organization' },
      provider: { '@id': 'https://moovx.ch/#organization' },
    })
  })

  it.each(locales)('excludes historical entities and claims for %s', async locale => {
    const serialized = JSON.stringify(extractSchema(await renderLanding(locale)))

    for (const forbidden of [
      'HealthAndBeautyBusiness',
      'LocalBusiness',
      'PostalAddress',
      'GeoCoordinates',
      'SoftwareApplication',
      'Offer',
      'Review',
      'AggregateRating',
      '163',
      '182',
      '24/7',
      'CHF',
      'MoovX SA',
      'hello@moovx.ch',
    ]) {
      expect(serialized).not.toContain(forbidden)
    }
  })

  it.each(locales)('keeps localized metadata and social metadata unchanged for %s', async locale => {
    const metadata = await generateMetadata({ params: Promise.resolve({ locale }) })

    expect(metadata.title).toBe(`${locale}:title`)
    expect(metadata.description).toBe(`${locale}:description`)
    expect(metadata.openGraph).toMatchObject({
      type: 'website',
      url: `https://moovx.ch/${locale}/landing`,
      title: `${locale}:ogTitle`,
      description: `${locale}:ogDescription`,
    })
    expect(metadata.twitter).toMatchObject({
      card: 'summary_large_image',
      title: `${locale}:twitterTitle`,
      description: `${locale}:twitterDescription`,
    })
  })

  it.each(locales)('keeps real navigation targets and registration available for %s', async locale => {
    const html = await renderLanding(locale)
    expect(html).toContain('href="https://app.moovx.ch/register-client"')
    expect(html).toContain('href="https://app.moovx.ch/login"')
    expect(html).toContain(`href="/${locale}/privacy"`)
    expect(html).toContain(`href="/${locale}/cgu"`)
    const targets = [...html.matchAll(/href="#([^"]+)"/g)].map(match => match[1])
    expect(targets.length).toBeGreaterThan(0)
    for (const target of targets) expect(html).toContain(`id="${target}"`)
  })
})
