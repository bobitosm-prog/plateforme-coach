import { readFileSync } from 'node:fs'
import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const navigation = vi.hoisted(() => ({
  notFound: vi.fn(() => { throw new Error('NEXT_NOT_FOUND') }),
}))

vi.mock('next/navigation', () => ({ notFound: navigation.notFound }))

import BulkGainPage, {
  generateMetadata,
  generateStaticParams,
} from '../../app/(marketing)/[locale]/nutrition/prise-de-masse/page'
import sitemap from '../../app/sitemap'
import { BULK_GAIN_PAGE } from '../../content/nutrition/bulk-gain'

const routeSource = readFileSync(
  'app/(marketing)/[locale]/nutrition/prise-de-masse/page.tsx',
  'utf8',
)
const editorialSource = readFileSync('content/nutrition/bulk-gain.ts', 'utf8')

beforeEach(() => {
  navigation.notFound.mockClear()
})

describe('French bulk-gain acquisition page', () => {
  it('statically generates only the French route', () => {
    expect(generateStaticParams()).toEqual([{ locale: 'fr' }])
  })

  it('renders every required editorial section and the nutrition warning', async () => {
    const page = await BulkGainPage({ params: Promise.resolve({ locale: 'fr' }) })
    const html = renderToStaticMarkup(page)

    expect(html).toContain(`<h1`)
    expect(html).toContain(BULK_GAIN_PAGE.headline)
    for (const section of BULK_GAIN_PAGE.sections) {
      expect(html).toContain(section.title.replaceAll("'", '&#x27;'))
    }
    expect(html).toContain('exemple est pédagogique uniquement')
    expect(html).toContain('ne constitue ni un diagnostic ni une prescription nutritionnelle')
    expect(html).toContain('<h2 id="sources-title"')
    expect(navigation.notFound).not.toHaveBeenCalled()
  })

  it('publishes the exact French-only metadata contract', async () => {
    const metadata = await generateMetadata({ params: Promise.resolve({ locale: 'fr' }) })
    const canonical = 'https://moovx.ch/fr/nutrition/prise-de-masse'

    expect(metadata.title).toBe('Prise de masse : alimentation, calories et macros | MoovX')
    expect(metadata.description).toBe('Comprenez le surplus calorique, les protéines et les repas pour une prise de masse progressive, puis estimez vos besoins avec le calculateur MoovX.')
    expect(metadata.alternates).toEqual({
      canonical,
      languages: { fr: canonical, 'x-default': canonical },
    })
    expect(metadata.alternates?.languages).not.toHaveProperty('en')
    expect(metadata.alternates?.languages).not.toHaveProperty('de')
    expect(metadata.openGraph).toMatchObject({
      type: 'website',
      url: canonical,
      locale: 'fr_CH',
      images: [{ url: 'https://moovx.ch/og-image.jpg', width: 1200, height: 630 }],
    })
    expect(metadata.twitter).toMatchObject({
      card: 'summary_large_image',
      images: [{ url: 'https://moovx.ch/og-image.jpg' }],
    })
    expect(JSON.stringify(metadata)).not.toContain('app.moovx.ch')
  })

  it('is discoverable once in the sitemap with its stable editorial date', () => {
    const canonical = 'https://moovx.ch/fr/nutrition/prise-de-masse'
    const entries = sitemap().filter(entry => entry.url.includes('/nutrition/prise-de-masse'))

    expect(entries).toEqual([{
      url: canonical,
      lastModified: '2026-08-17',
      changeFrequency: 'monthly',
      priority: 0.9,
      alternates: {
        languages: { fr: canonical, 'x-default': canonical },
      },
    }])
  })

  it.each(['en', 'de'])('marks %s metadata non-indexable and rejects the page', async locale => {
    const metadata = await generateMetadata({ params: Promise.resolve({ locale }) })

    expect(metadata.robots).toEqual({ index: false, follow: false })
    await expect(BulkGainPage({ params: Promise.resolve({ locale }) }))
      .rejects.toThrow('NEXT_NOT_FOUND')
  })

  it('links only to the requested existing acquisition paths', async () => {
    const page = await BulkGainPage({ params: Promise.resolve({ locale: 'fr' }) })
    const html = renderToStaticMarkup(page)
    const requiredLinks = [
      '/fr/outils/calculateur-calories-macros',
      '/fr/guides/nutrition',
      '/fr/guides/musculation',
      '/fr/blog/combien-de-proteines-prise-de-muscle',
      '/fr/blog/creatine-musculation-dosage-science',
    ]

    for (const href of requiredLinks) {
      expect(html).toContain(`href="${href}"`)
    }
    expect(html).not.toContain('/fr/nutrition/prise-de-masse/')
  })

  it('keeps editorial content separate and contains no calculator implementation', () => {
    expect(routeSource).toContain("from '@/content/nutrition/bulk-gain'")
    expect(routeSource).not.toContain('calculateAutomaticCalorieMacroTargets')
    expect(routeSource).not.toMatch(/calcMifflinStJeor|ACTIVITY_MULTIPLIERS/)
    expect(`${routeSource}\n${editorialSource}`).not.toMatch(/10\s*\*\s*weight|6\.25\s*\*\s*height/)
    expect(`${routeSource}\n${editorialSource}`).not.toMatch(/fetch\(|axios|localStorage|sessionStorage/)
  })

  it('avoids prohibited commercial and outcome claims', () => {
    expect(editorialSource).not.toMatch(/essai gratuit|jours offert|CHF|prix|utilisateurs/i)
    expect(editorialSource).not.toMatch(/résultat garanti|vitesse garantie|gain garanti/i)
    expect(editorialSource).not.toMatch(/AggregateRating|Review|FAQPage/)
  })

  it('publishes one restrained WebPage schema', async () => {
    const page = await BulkGainPage({ params: Promise.resolve({ locale: 'fr' }) })
    const html = renderToStaticMarkup(page)
    const scripts = [...html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/g)]

    expect(scripts).toHaveLength(1)
    const schema = JSON.parse(scripts[0][1])
    expect(schema).toMatchObject({
      '@type': 'WebPage',
      '@id': 'https://moovx.ch/fr/nutrition/prise-de-masse#webpage',
      url: 'https://moovx.ch/fr/nutrition/prise-de-masse',
      inLanguage: 'fr-CH',
    })
    expect(JSON.stringify(schema)).not.toMatch(/FAQPage|AggregateRating|Review/)
  })
})
