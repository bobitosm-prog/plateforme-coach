import { readFileSync } from 'node:fs'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import sitemap from '@/app/sitemap'
import BulkGainPage, {
  dynamicParams,
  generateMetadata,
  generateStaticParams,
} from '@/app/(marketing)/[locale]/nutrition/prise-de-masse/page'

const canonical = 'https://moovx.ch/fr/nutrition/prise-de-masse'

async function renderPage(locale: string) {
  const element = await BulkGainPage({ params: Promise.resolve({ locale }) })
  return renderToStaticMarkup(element)
}

describe('French bulk gain pillar page', () => {
  it('pre-renders only the authorized French route', () => {
    expect(dynamicParams).toBe(false)
    expect(generateStaticParams()).toEqual([{ locale: 'fr' }])
  })

  it('renders the French page and all required sections', async () => {
    const html = await renderPage('fr')

    expect(html).toContain('<h1')
    for (const heading of [
      'Qu’est-ce qu’une prise de masse ?',
      'Calories de maintien et surplus progressif',
      'Protéines, glucides et lipides',
      'Exemple pédagogique d’une journée alimentaire',
      'Associer alimentation et entraînement',
      'Suivre poids, performances et récupération',
      'Erreurs fréquentes',
      'Personnalisation avec MoovX',
    ]) {
      expect(html).toContain(heading)
    }
  })

  it.each(['en', 'de'])('rejects the unavailable %s locale', async locale => {
    await expect(BulkGainPage({ params: Promise.resolve({ locale }) })).rejects.toThrow(/404/)
  })

  it('uses the expected FR-only metadata', async () => {
    const metadata = await generateMetadata({ params: Promise.resolve({ locale: 'fr' }) })

    expect(metadata.title).toBe('Prise de masse : alimentation, calories et macros | MoovX')
    expect(metadata.description).toBe('Comprenez le surplus calorique, les protéines et les repas pour une prise de masse progressive, puis estimez vos besoins avec le calculateur MoovX.')
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

  it('links only to the required existing routes and conversion host', async () => {
    const html = await renderPage('fr')
    for (const href of [
      '/fr/outils/calculateur-calories-macros',
      '/fr/guides/nutrition',
      '/fr/guides/musculation',
      '/fr/blog/combien-de-proteines-prise-de-muscle',
      '/fr/blog/creatine-musculation-dosage-science',
      'https://app.moovx.ch/register-client',
    ]) {
      expect(html).toContain(`href="${href}"`)
    }
  })

  it('contains no local nutrition calculation or forbidden claims', async () => {
    const pageSource = readFileSync('app/(marketing)/[locale]/nutrition/prise-de-masse/page.tsx', 'utf8')
    const contentSource = readFileSync('content/nutrition/bulk-gain.ts', 'utf8')
    const source = `${pageSource}\n${contentSource}`
    const html = (await renderPage('fr')).toLowerCase()

    expect(source).not.toContain('calculateAutomaticCalorieMacroTargets')
    expect(source).not.toMatch(/calcMifflin|ACTIVITY_MULTIPLIERS|proteinGrams|targetCalories/)
    for (const forbidden of [
      'résultats garantis',
      'surplus optimal',
      'vitesse garantie',
      'essai gratuit',
      'chiffres utilisateurs',
    ]) {
      expect(html).not.toContain(forbidden)
    }
  })

  it('adds one French-only URL to the sitemap', () => {
    const entries = sitemap()
    const bulkEntries = entries.filter(entry => entry.url.includes('/nutrition/prise-de-masse'))

    expect(entries).toHaveLength(34)
    expect(bulkEntries).toHaveLength(1)
    expect(bulkEntries[0]).toMatchObject({
      url: canonical,
      alternates: { languages: { fr: canonical, 'x-default': canonical } },
    })
    expect(bulkEntries[0].lastModified).toBeUndefined()
    expect(JSON.stringify(bulkEntries)).not.toMatch(/\/(en|de)\/nutrition\//)
  })
})
