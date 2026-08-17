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

vi.mock('@/app/(marketing)/[locale]/landing/components/Cursor', () => ({ default: () => 'Cursor' }))
vi.mock('@/app/(marketing)/[locale]/landing/components/ScrollBar', () => ({ default: () => 'ScrollBar' }))
vi.mock('@/app/(marketing)/[locale]/landing/components/Navbar', () => ({ default: () => 'Navbar' }))
vi.mock('@/app/(marketing)/[locale]/landing/components/Hero', () => ({ default: () => 'Hero' }))
vi.mock('@/app/(marketing)/[locale]/landing/components/MarqueeSection', () => ({ default: () => 'MarqueeSection' }))
vi.mock('@/app/(marketing)/[locale]/landing/components/Results', () => ({ default: () => 'Results' }))
vi.mock('@/app/(marketing)/[locale]/landing/components/NutritionSection', () => ({ default: () => 'NutritionSection' }))
vi.mock('@/app/(marketing)/[locale]/landing/components/TrainingSection', () => ({ default: () => 'TrainingSection' }))
vi.mock('@/app/(marketing)/[locale]/landing/components/TrackingSection', () => ({ default: () => 'TrackingSection' }))
vi.mock('@/app/(marketing)/[locale]/landing/components/CoachIaSection', () => ({ default: () => 'CoachIaSection' }))
vi.mock('@/app/(marketing)/[locale]/landing/components/CoachingPro', () => ({ default: () => 'CoachingPro' }))
vi.mock('@/app/(marketing)/[locale]/landing/components/Steps', () => ({ default: () => 'Steps' }))
vi.mock('@/app/(marketing)/[locale]/landing/components/PwaSection', () => ({ default: () => 'PWASection' }))
vi.mock('@/app/(marketing)/[locale]/landing/components/PricingSection', () => ({ default: () => 'PricingSection' }))
vi.mock('@/app/(marketing)/[locale]/landing/components/FaqSection', () => ({ default: () => 'FaqSection' }))
vi.mock('@/app/(marketing)/[locale]/landing/components/GenevaSection', () => ({ default: () => 'GenevaSection' }))
vi.mock('@/app/(marketing)/[locale]/landing/components/CtaSection', () => ({ default: () => 'CtaSection' }))
vi.mock('@/app/(marketing)/[locale]/landing/components/FooterSection', () => ({ default: () => 'FooterSection' }))

import LandingLayout from '@/app/(marketing)/[locale]/landing/layout'
import LandingPage, { generateMetadata } from '@/app/(marketing)/[locale]/landing/page'

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

  it('keeps every existing Landing content section mounted', async () => {
    const html = await renderLanding('fr')

    for (const section of [
      'Navbar',
      'Hero',
      'MarqueeSection',
      'Results',
      'NutritionSection',
      'TrainingSection',
      'TrackingSection',
      'CoachIaSection',
      'CoachingPro',
      'Steps',
      'PWASection',
      'PricingSection',
      'FaqSection',
      'GenevaSection',
      'CtaSection',
      'FooterSection',
    ]) {
      expect(html).toContain(section)
    }
  })
})
