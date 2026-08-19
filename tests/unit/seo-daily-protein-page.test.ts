import { readFileSync } from 'node:fs'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import sitemap from '@/app/sitemap'

const intl = vi.hoisted(() => ({ locale: 'fr' }))

vi.mock('next-intl', () => ({
  useLocale: () => intl.locale,
}))

import DailyProteinPage, {
  dynamicParams,
  generateMetadata,
  generateStaticParams,
} from '@/app/(marketing)/[locale]/nutrition/proteines-par-jour/page'
import GuidePage from '@/app/(marketing)/[locale]/guides/[slug]/page'
import LandingContextualLinks from '@/app/(marketing)/[locale]/landing/components/LandingContextualLinks'

const canonical = 'https://moovx.ch/fr/nutrition/proteines-par-jour'

async function renderPage(locale: string) {
  const element = await DailyProteinPage({ params: Promise.resolve({ locale }) })
  return renderToStaticMarkup(element)
}

describe('French daily protein pillar page', () => {
  it('pre-renders only the authorized French route', () => {
    expect(dynamicParams).toBe(false)
    expect(generateStaticParams()).toEqual([{ locale: 'fr' }])
  })

  it('renders the broad daily-protein intent without duplicating the muscle-gain article', async () => {
    const html = await renderPage('fr')

    expect(html).toContain('<h1')
    for (const heading of [
      'Combien de protéines par jour ?',
      'Pourquoi les besoins varient',
      'Selon l’objectif : maintien, perte de poids ou prise de masse',
      'Comment répartir les protéines dans la journée',
      'Exemples d’aliments riches en protéines',
      'Protéines et calories totales',
      'Comment utiliser le calculateur MoovX',
      'Limites et situations nécessitant un professionnel',
    ]) {
      expect(html).toContain(heading)
    }
  })

  it.each(['en', 'de'])('rejects the unavailable %s locale', async locale => {
    await expect(DailyProteinPage({ params: Promise.resolve({ locale }) })).rejects.toThrow(/404/)
  })

  it('uses the expected FR-only metadata', async () => {
    const metadata = await generateMetadata({ params: Promise.resolve({ locale: 'fr' }) })

    expect(metadata.title).toBe('Combien de protéines par jour ? Guide et calcul | MoovX')
    expect(metadata.description).toBe('Découvrez combien de protéines consommer par jour selon votre objectif, comment les répartir et comment les intégrer à vos calories et macros.')
    expect(metadata.alternates?.canonical).toBe(canonical)
    expect(metadata.alternates?.languages).toEqual({ fr: canonical, 'x-default': canonical })
    expect(JSON.stringify(metadata.alternates)).not.toMatch(/\/(en|de)\/nutrition\//)
  })

  it('emits only the authorized WebPage schema', async () => {
    const html = await renderPage('fr')
    const script = html.match(/<script type="application\/ld\+json">(.+?)<\/script>/)?.[1]
    const schema = JSON.parse(script || '{}')

    expect(schema).toMatchObject({
      '@type': 'WebPage',
      '@id': `${canonical}#webpage`,
      url: canonical,
      inLanguage: 'fr',
      isPartOf: { '@id': 'https://moovx.ch/#website' },
    })
    for (const forbidden of ['FAQPage', 'Review', 'AggregateRating', 'Offer']) {
      expect(JSON.stringify(schema)).not.toContain(forbidden)
    }
  })

  it('links contextually to the required pages and conversion host', async () => {
    const html = await renderPage('fr')

    for (const href of [
      '/fr/outils/calculateur-calories-macros',
      '/fr/guides/nutrition',
      '/fr/nutrition/prise-de-masse',
      '/fr/nutrition/perte-de-poids',
      '/fr/blog/combien-de-proteines-prise-de-muscle',
      'https://app.moovx.ch/register-client',
    ]) {
      expect(html).toContain(`href="${href}"`)
    }
  })

  it('receives crawlable links from the French landing and nutrition guide only', async () => {
    intl.locale = 'fr'
    const landingFr = renderToStaticMarkup(createElement(LandingContextualLinks, { group: 'nutrition' }))
    const guideFr = renderToStaticMarkup(await GuidePage({
      params: Promise.resolve({ locale: 'fr', slug: 'nutrition' }),
    }))

    expect(landingFr).toContain('href="/fr/nutrition/proteines-par-jour"')
    expect(guideFr).toContain('href="/fr/nutrition/proteines-par-jour"')

    for (const locale of ['en', 'de']) {
      intl.locale = locale
      const landing = renderToStaticMarkup(createElement(LandingContextualLinks, { group: 'nutrition' }))
      expect(landing).not.toContain('/fr/nutrition/proteines-par-jour')
    }
  })

  it('contains no parallel nutrition calculation or forbidden promise', async () => {
    const pageSource = readFileSync('app/(marketing)/[locale]/nutrition/proteines-par-jour/page.tsx', 'utf8')
    const contentSource = readFileSync('content/nutrition/daily-protein.ts', 'utf8')
    const source = `${pageSource}\n${contentSource}`
    const html = (await renderPage('fr')).toLowerCase()

    expect(source).not.toContain('calculateAutomaticCalorieMacroTargets')
    expect(source).not.toMatch(/calcMifflin|ACTIVITY_MULTIPLIERS|proteinGrams|targetCalories/)
    for (const forbidden of [
      'résultats garantis',
      'recommandation universelle exacte',
      'prescription thérapeutique',
      'diagnostic médical',
    ]) {
      expect(html).not.toContain(forbidden)
    }
  })

  it('adds one unique French-only URL to the sitemap', () => {
    const entries = sitemap()
    const proteinEntries = entries.filter(entry => entry.url.includes('/nutrition/proteines-par-jour'))

    expect(entries).toHaveLength(35)
    expect(new Set(entries.map(entry => entry.url)).size).toBe(35)
    expect(proteinEntries).toHaveLength(1)
    expect(proteinEntries[0]).toMatchObject({
      url: canonical,
      alternates: { languages: { fr: canonical, 'x-default': canonical } },
    })
    expect(proteinEntries[0].lastModified).toBeUndefined()
    expect(JSON.stringify(proteinEntries)).not.toMatch(/\/(en|de)\/nutrition\//)
  })
})
