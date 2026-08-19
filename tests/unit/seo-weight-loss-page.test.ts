import { readFileSync } from 'node:fs'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import sitemap from '@/app/sitemap'
import WeightLossPage, {
  dynamicParams,
  generateMetadata,
  generateStaticParams,
} from '@/app/(marketing)/[locale]/nutrition/perte-de-poids/page'

const canonical = 'https://moovx.ch/fr/nutrition/perte-de-poids'

async function renderPage(locale: string) {
  const element = await WeightLossPage({ params: Promise.resolve({ locale }) })
  return renderToStaticMarkup(element)
}

describe('French weight loss pillar page', () => {
  it('pre-renders only the authorized French route', () => {
    expect(dynamicParams).toBe(false)
    expect(generateStaticParams()).toEqual([{ locale: 'fr' }])
  })

  it('renders the French page and all required sections', async () => {
    const html = await renderPage('fr')

    expect(html).toContain('<h1')
    for (const heading of [
      'Comprendre le déficit énergétique',
      'Estimer ses calories et ses macros',
      'Organiser une alimentation adaptée',
      'Protéines et satiété',
      'Suivre sa progression avec plusieurs indicateurs',
      'Personnaliser ses repères avec MoovX',
    ]) {
      expect(html).toContain(heading)
    }
  })

  it.each(['en', 'de'])('rejects the unavailable %s locale', async locale => {
    await expect(WeightLossPage({ params: Promise.resolve({ locale }) })).rejects.toThrow(/404/)
  })

  it('uses the expected FR-only metadata', async () => {
    const metadata = await generateMetadata({ params: Promise.resolve({ locale: 'fr' }) })

    expect(metadata.title).toBe('Perte de poids : calories, alimentation et suivi | MoovX')
    expect(metadata.description).toBe('Comprenez le déficit énergétique, estimez vos calories et organisez votre alimentation pour suivre une perte de poids progressive avec MoovX.')
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

  it('links to the required existing routes and conversion host', async () => {
    const html = await renderPage('fr')
    for (const href of [
      '/fr/outils/calculateur-calories-macros',
      '/fr/guides/nutrition',
      '/fr/nutrition/prise-de-masse',
      'https://app.moovx.ch/register-client',
    ]) {
      expect(html).toContain(`href="${href}"`)
    }
  })

  it('contains no duplicated calculation or forbidden claims', async () => {
    const pageSource = readFileSync('app/(marketing)/[locale]/nutrition/perte-de-poids/page.tsx', 'utf8')
    const contentSource = readFileSync('content/nutrition/weight-loss.ts', 'utf8')
    const source = `${pageSource}\n${contentSource}`
    const html = (await renderPage('fr')).toLowerCase()

    expect(source).not.toContain('calculateAutomaticCalorieMacroTargets')
    expect(source).not.toMatch(/calcMifflin|ACTIVITY_MULTIPLIERS|proteinGrams|targetCalories/)
    for (const forbidden of [
      'résultats garantis',
      'kilos garantis',
      'perte rapide garantie',
      'diagnostic médical',
      'prescription',
    ]) {
      expect(html).not.toContain(forbidden)
    }
  })

  it('adds one French-only URL to the sitemap', () => {
    const entries = sitemap()
    const weightLossEntries = entries.filter(entry => entry.url.includes('/nutrition/perte-de-poids'))

    expect(entries).toHaveLength(37)
    expect(new Set(entries.map(entry => entry.url)).size).toBe(37)
    expect(weightLossEntries).toHaveLength(1)
    expect(weightLossEntries[0]).toMatchObject({
      url: canonical,
      alternates: { languages: { fr: canonical, 'x-default': canonical } },
    })
    expect(weightLossEntries[0].lastModified).toBeUndefined()
    expect(JSON.stringify(weightLossEntries)).not.toMatch(/\/(en|de)\/nutrition\//)
  })
})
