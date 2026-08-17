import { describe, expect, it, vi } from 'vitest'

import deMessages from '../../messages/de.json'
import enMessages from '../../messages/en.json'
import frMessages from '../../messages/fr.json'
import { buildLandingSchemaGraph } from '../../lib/structured-data'

const localizedMessages = { fr: frMessages, en: enMessages, de: deMessages }

vi.mock('next-intl/server', () => ({
  getTranslations: async ({ locale, namespace }: { locale: keyof typeof localizedMessages; namespace: 'metadata' }) => {
    const messages = localizedMessages[locale][namespace]
    return (key: keyof typeof messages) => messages[key]
  },
}))

vi.mock('@/lib/beta-offer', () => ({
  getActiveBetaOffer: vi.fn(),
  trialDaysFor: vi.fn(),
}))

vi.mock('@/i18n/routing', () => ({
  Link: () => null,
  usePathname: () => '/landing',
}))

import { generateMetadata } from '../../app/(marketing)/[locale]/landing/page'

describe('landing search metadata', () => {
  it('uses the CTR-oriented French title and description', async () => {
    const metadata = await generateMetadata({ params: Promise.resolve({ locale: 'fr' }) })

    expect(metadata.title).toBe('MoovX | Coach sportif IA et programme fitness personnalisé')
    expect(metadata.description).toBe(
      'Créez un programme d’entraînement personnalisé, estimez vos besoins nutritionnels et suivez votre progression avec l’application fitness suisse MoovX.',
    )
  })

  it('uses the CTR-oriented English title and description', async () => {
    const metadata = await generateMetadata({ params: Promise.resolve({ locale: 'en' }) })

    expect(metadata.title).toBe('MoovX | AI Fitness Coach & Personalized Workout Plans')
    expect(metadata.description).toBe(
      'Build a personalized workout plan, manage nutrition and track your progress with MoovX, the Swiss AI-powered fitness coaching platform.',
    )
  })

  it.each([
    ['fr', 'https://moovx.ch/fr/landing', 'fr_CH', ['en_US', 'de_CH']],
    ['en', 'https://moovx.ch/en/landing', 'en_US', ['fr_CH', 'de_CH']],
  ] as const)('keeps canonical, hreflang, Open Graph and Twitter unchanged for %s', async (locale, canonical, ogLocale, alternateLocale) => {
    const metadata = await generateMetadata({ params: Promise.resolve({ locale }) })
    const messages = localizedMessages[locale].metadata

    expect(metadata.alternates).toEqual({
      canonical,
      languages: {
        fr: 'https://moovx.ch/fr/landing',
        en: 'https://moovx.ch/en/landing',
        de: 'https://moovx.ch/de/landing',
        'x-default': 'https://moovx.ch/fr/landing',
      },
    })
    expect(metadata.openGraph).toMatchObject({
      title: messages.ogTitle,
      description: messages.ogDescription,
      url: canonical,
      locale: ogLocale,
      alternateLocale,
    })
    expect(metadata.twitter).toMatchObject({
      title: messages.twitterTitle,
      description: messages.twitterDescription,
    })
  })

  it('leaves the landing structured-data entity graph unchanged', () => {
    const graph = buildLandingSchemaGraph()['@graph']

    expect(graph.map(entity => entity['@type'])).toEqual(['Organization', 'WebSite', 'WebApplication'])
    expect(graph.map(entity => entity['@id'])).toEqual([
      'https://moovx.ch/#organization',
      'https://moovx.ch/#website',
      'https://moovx.ch/#software',
    ])
  })
})
