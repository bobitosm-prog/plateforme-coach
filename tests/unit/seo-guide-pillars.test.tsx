import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const navigation = vi.hoisted(() => ({ notFound: vi.fn(() => { throw new Error('NEXT_NOT_FOUND') }) }))

vi.mock('next/navigation', () => ({ notFound: navigation.notFound }))

import GuidePage, {
  generateMetadata,
  generateStaticParams,
} from '../../app/(marketing)/[locale]/guides/[slug]/page'
import { getAllGuides, getGuide } from '../../content/guides/guides'
import sitemap from '../../app/sitemap'

beforeEach(() => {
  navigation.notFound.mockClear()
})

describe('French SEO pillar guides', () => {
  it('statically generates exactly the two French routes', () => {
    expect(generateStaticParams()).toEqual([
      { locale: 'fr', slug: 'musculation' },
      { locale: 'fr', slug: 'nutrition' },
    ])
  })

  it.each(['musculation', 'nutrition'])('renders the %s route with its structured content', async slug => {
    const page = await GuidePage({ params: Promise.resolve({ locale: 'fr', slug }) })
    const html = renderToStaticMarkup(page)
    const guide = getGuide(slug)

    expect(guide).toBeDefined()
    expect(html).toContain('<article')
    expect(html).toContain(`<h1`)
    expect(html).toContain(guide!.headline)
    expect(html).toContain('aria-label="Sommaire"')
    expect(html).toContain('type="application/ld+json"')
    expect(html).toContain('"@type":"Article"')
    expect(html).toContain(`"datePublished":"${guide!.datePublished}"`)
    expect(html).toContain(`"dateModified":"${guide!.dateModified}"`)
    expect(navigation.notFound).not.toHaveBeenCalled()
  })

  it.each(['musculation', 'nutrition'])('publishes complete metadata for %s', async slug => {
    const guide = getGuide(slug)!
    const canonical = `https://moovx.ch/fr/guides/${slug}`
    const metadata = await generateMetadata({
      params: Promise.resolve({ locale: 'fr', slug }),
    })

    expect(metadata.title).toBe(guide.title)
    expect(metadata.description).toBe(guide.description)
    expect(metadata.alternates?.canonical).toBe(canonical)
    expect(metadata.alternates?.languages).toEqual({ fr: canonical, 'x-default': canonical })
    expect(metadata.alternates?.languages).not.toHaveProperty('en')
    expect(metadata.alternates?.languages).not.toHaveProperty('de')
    expect(metadata.openGraph).toMatchObject({
      type: 'article',
      locale: 'fr_CH',
      url: canonical,
      images: [{
        url: 'https://moovx.ch/og-image.jpg',
        width: 1200,
        height: 630,
        type: 'image/jpeg',
        alt: guide.headline,
      }],
    })
    expect(metadata.twitter).toMatchObject({
      card: 'summary_large_image',
      images: [{ url: 'https://moovx.ch/og-image.jpg' }],
    })
    expect(JSON.stringify(metadata)).not.toContain('app.moovx.ch')
  })

  it.each(['en', 'de'])('keeps the untranslated %s route non-indexable and unavailable', async locale => {
    const metadata = await generateMetadata({
      params: Promise.resolve({ locale, slug: 'musculation' }),
    })

    expect(metadata.robots).toEqual({ index: false, follow: false })
    await expect(GuidePage({
      params: Promise.resolve({ locale, slug: 'musculation' }),
    })).rejects.toThrow('NEXT_NOT_FOUND')
  })

  it('keeps volatile claims isolated from rendered guide content', () => {
    for (const guide of getAllGuides()) {
      expect(guide.editorialReview.length).toBeGreaterThan(0)
      expect(guide.sections).toHaveLength(10)
    }
  })

  it('lists only the two French guides in the sitemap without duplicates', () => {
    const entries = sitemap()
    const guideEntries = entries.filter(entry => entry.url.includes('/guides/'))

    expect(guideEntries).toHaveLength(2)
    expect(guideEntries.map(entry => entry.url)).toEqual([
      'https://moovx.ch/fr/guides/musculation',
      'https://moovx.ch/fr/guides/nutrition',
    ])
    expect(new Set(entries.map(entry => entry.url)).size).toBe(entries.length)

    for (const entry of guideEntries) {
      expect(entry.alternates?.languages).toEqual({
        fr: entry.url,
        'x-default': entry.url,
      })
      expect(entry.url).not.toContain('/en/guides/')
      expect(entry.url).not.toContain('/de/guides/')
    }
  })
})
