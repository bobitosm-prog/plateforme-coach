import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import sitemap from '@/app/sitemap'
import GuidePage, {
  dynamicParams,
  generateMetadata,
  generateStaticParams,
} from '@/app/(marketing)/[locale]/guides/[slug]/page'

async function renderGuide(locale: string, slug: string) {
  const element = await GuidePage({ params: Promise.resolve({ locale, slug }) })
  return renderToStaticMarkup(element)
}

describe('French guide pillars', () => {
  it('pre-renders exactly the two authorized French routes', () => {
    expect(dynamicParams).toBe(false)
    expect(generateStaticParams()).toEqual([
      { locale: 'fr', slug: 'nutrition' },
      { locale: 'fr', slug: 'musculation' },
    ])
  })

  it.each(['nutrition', 'musculation'])('renders the French %s guide', async slug => {
    const html = await renderGuide('fr', slug)

    expect(html).toContain('<h1')
    expect(html).toContain('Sommaire')
    expect(html).toContain('application/ld+json')
  })

  it.each(['en', 'de'])('rejects the unavailable %s guide locale', async locale => {
    await expect(GuidePage({
      params: Promise.resolve({ locale, slug: 'nutrition' }),
    })).rejects.toThrow(/404/)
  })

  it('rejects an unknown guide slug', async () => {
    await expect(GuidePage({
      params: Promise.resolve({ locale: 'fr', slug: 'inconnu' }),
    })).rejects.toThrow(/404/)
  })

  it.each(['nutrition', 'musculation'])('uses FR-only metadata for %s', async slug => {
    const canonical = `https://moovx.ch/fr/guides/${slug}`
    const metadata = await generateMetadata({
      params: Promise.resolve({ locale: 'fr', slug }),
    })

    expect(metadata.alternates?.canonical).toBe(canonical)
    expect(metadata.alternates?.languages).toEqual({
      fr: canonical,
      'x-default': canonical,
    })
    expect(JSON.stringify(metadata.alternates)).not.toContain('/en/guides/')
    expect(JSON.stringify(metadata.alternates)).not.toContain('/de/guides/')
  })

  it.each(['nutrition', 'musculation'])('emits a minimal verifiable schema for %s', async slug => {
    const html = await renderGuide('fr', slug)
    const script = html.match(/<script type="application\/ld\+json">(.+?)<\/script>/)?.[1]
    expect(script).toBeTruthy()

    const schema = JSON.parse(script || '{}')
    expect(schema['@type']).toBe('TechArticle')
    expect(schema.url).toBe(`https://moovx.ch/fr/guides/${slug}`)
    expect(schema.inLanguage).toBe('fr')
    expect(schema.headline).toBeTruthy()
    expect(schema.description).toBeTruthy()

    const serialized = JSON.stringify(schema)
    for (const forbidden of ['LocalBusiness', 'Review', 'AggregateRating', 'Offer']) {
      expect(serialized).not.toContain(forbidden)
    }
  })

  it('adds only the two French guides to the sitemap', () => {
    const guideEntries = sitemap().filter(entry => entry.url.includes('/guides/'))

    expect(guideEntries.map(entry => entry.url)).toEqual([
      'https://moovx.ch/fr/guides/nutrition',
      'https://moovx.ch/fr/guides/musculation',
    ])
    for (const entry of guideEntries) {
      expect(entry.alternates?.languages).toEqual({
        fr: entry.url,
        'x-default': entry.url,
      })
      expect(entry.url).not.toMatch(/\/(en|de)\/guides\//)
    }
  })

  it('does not reintroduce unvalidated commercial or AI claims', async () => {
    const html = `${await renderGuide('fr', 'nutrition')} ${await renderGuide('fr', 'musculation')}`

    for (const forbidden of ['CHF 10', '10 jours gratuits', '3970 aliments', '85-90%', 'game changer']) {
      expect(html).not.toContain(forbidden)
    }
  })
})
