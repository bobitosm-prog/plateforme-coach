import { readFileSync } from 'node:fs'
import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const navigation = vi.hoisted(() => ({
  notFound: vi.fn(() => { throw new Error('NEXT_NOT_FOUND') }),
}))

vi.mock('next/navigation', () => ({ notFound: navigation.notFound }))

import AiCoachPage, {
  generateMetadata,
  generateStaticParams,
} from '../../app/(marketing)/[locale]/coach-sportif-ia/page'
import sitemap from '../../app/sitemap'
import { AI_COACH_PAGE } from '../../content/ai/ai-coach'

const routeSource = readFileSync(
  'app/(marketing)/[locale]/coach-sportif-ia/page.tsx',
  'utf8',
)
const editorialSource = readFileSync('content/ai/ai-coach.ts', 'utf8')

beforeEach(() => {
  navigation.notFound.mockClear()
})

describe('French AI coach acquisition page', () => {
  it('statically generates only the French route', () => {
    expect(generateStaticParams()).toEqual([{ locale: 'fr' }])
  })

  it('renders the required commercial and educational content', async () => {
    const page = await AiCoachPage({ params: Promise.resolve({ locale: 'fr' }) })
    const html = renderToStaticMarkup(page)

    expect(html).toContain('<h1')
    expect(html).toContain(AI_COACH_PAGE.headline)
    for (const section of AI_COACH_PAGE.sections) {
      expect(html).toContain(section.title.replaceAll("'", '&#x27;'))
    }
    expect(html).toContain('Adaptation ponctuelle')
    expect(html).toContain('diagnostic hebdomadaire')
    expect(html).toContain('Régénération après application explicite')
    expect(html).toContain('Renouvellement périodique')
    expect(html).toContain('ne constituent pas une prescription')
    expect(navigation.notFound).not.toHaveBeenCalled()
  })

  it('publishes the exact French-only metadata contract', async () => {
    const metadata = await generateMetadata({ params: Promise.resolve({ locale: 'fr' }) })
    const canonical = 'https://moovx.ch/fr/coach-sportif-ia'

    expect(metadata.title).toBe('Coach sportif IA : programme fitness personnalisé | MoovX')
    expect(metadata.description).toBe('Découvrez comment MoovX utilise l’IA pour créer un programme de fitness selon votre objectif, votre niveau, votre matériel et vos disponibilités.')
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

  it.each(['en', 'de'])('marks %s metadata non-indexable and rejects the page', async locale => {
    const metadata = await generateMetadata({ params: Promise.resolve({ locale }) })

    expect(metadata.robots).toEqual({ index: false, follow: false })
    await expect(AiCoachPage({ params: Promise.resolve({ locale }) }))
      .rejects.toThrow('NEXT_NOT_FOUND')
  })

  it('publishes one restrained WebPage schema about the existing software entity', async () => {
    const page = await AiCoachPage({ params: Promise.resolve({ locale: 'fr' }) })
    const html = renderToStaticMarkup(page)
    const scripts = [...html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/g)]

    expect(scripts).toHaveLength(1)
    const schema = JSON.parse(scripts[0][1])
    expect(schema).toMatchObject({
      '@type': 'WebPage',
      '@id': 'https://moovx.ch/fr/coach-sportif-ia#webpage',
      url: 'https://moovx.ch/fr/coach-sportif-ia',
      inLanguage: 'fr-CH',
      about: { '@id': 'https://moovx.ch/#software' },
    })
    expect(JSON.stringify(schema)).not.toMatch(/FAQPage|AggregateRating|Review/)
  })

  it('links to every requested existing acquisition path', async () => {
    const page = await AiCoachPage({ params: Promise.resolve({ locale: 'fr' }) })
    const html = renderToStaticMarkup(page)
    const requiredLinks = [
      '/fr/guides/musculation',
      '/fr/guides/nutrition',
      '/fr/outils/calculateur-calories-macros',
      '/fr/nutrition/prise-de-masse',
      '/register-client',
    ]

    for (const href of requiredLinks) {
      expect(html).toContain(`href="${href}"`)
    }
  })

  it('keeps editorial content separate and introduces no AI runtime behavior', () => {
    expect(routeSource).toContain("from '@/content/ai/ai-coach'")
    expect(`${routeSource}\n${editorialSource}`).not.toMatch(/fetch\(|axios|localStorage|sessionStorage/)
    expect(`${routeSource}\n${editorialSource}`).not.toMatch(/ANTHROPIC|generateProgram|buildAthenaInvocation/)
  })

  it('contains none of the prohibited claims or unsupported schema types', () => {
    expect(editorialSource).not.toMatch(/résultats? garantis?|transformation garantie|coach humain virtuel|remplace un professionnel|apprend automatiquement|évite les blessures/i)
    expect(editorialSource).not.toMatch(/comprend tout|adaptation automatique permanente/i)
    expect(editorialSource).not.toMatch(/FAQPage|AggregateRating|Review/)
  })

  it('is discoverable once in the sitemap as a French-only page', () => {
    const canonical = 'https://moovx.ch/fr/coach-sportif-ia'
    const entries = sitemap().filter(entry => entry.url.includes('/coach-sportif-ia'))

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
})
