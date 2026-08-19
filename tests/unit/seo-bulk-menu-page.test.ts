import { readFileSync } from 'node:fs'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import sitemap from '@/app/sitemap'
import BulkGainPage from '@/app/(marketing)/[locale]/nutrition/prise-de-masse/page'
import SportsMealsPage from '@/app/(marketing)/[locale]/nutrition/repas-sportifs/page'
import BulkMenuPage, {
  dynamicParams,
  generateMetadata,
  generateStaticParams,
} from '@/app/(marketing)/[locale]/nutrition/menu-prise-de-masse/page'
import { BULK_MENU_CONTENT } from '@/content/nutrition/bulk-menu'
import { BULK_GAIN_CONTENT } from '@/content/nutrition/bulk-gain'
import { SPORTS_MEALS_CONTENT } from '@/content/nutrition/sports-meals'
import { MACROS_CONTENT } from '@/content/nutrition/macros'
import { DAILY_PROTEIN_CONTENT } from '@/content/nutrition/daily-protein'

const canonical = 'https://moovx.ch/fr/nutrition/menu-prise-de-masse'

async function renderPage(locale: string) {
  const element = await BulkMenuPage({ params: Promise.resolve({ locale }) })
  return renderToStaticMarkup(element)
}

function normalizeParagraph(paragraph: string) {
  return paragraph.toLocaleLowerCase('fr').replace(/\s+/g, ' ').trim()
}

describe('French bulk menu pillar page', () => {
  it('pre-renders only the authorized French route', () => {
    expect(dynamicParams).toBe(false)
    expect(generateStaticParams()).toEqual([{ locale: 'fr' }])
  })

  it.each(['en', 'de'])('rejects the unavailable %s locale', async locale => {
    await expect(BulkMenuPage({ params: Promise.resolve({ locale }) })).rejects.toThrow(/404/)
  })

  it('renders every requested section and the complete educational day', async () => {
    const html = await renderPage('fr')

    for (const heading of [
      'Comment construire un menu de prise de masse',
      'Répartir calories et protéines sur la journée',
      'Petit-déjeuner prise de masse',
      'Déjeuner',
      'Collation ou shake',
      'Dîner',
      'Exemple pédagogique de journée complète',
      'Variantes selon les préférences alimentaires',
      'Adapter les portions sans changer la structure',
      'Utiliser MoovX pour personnaliser ses repas',
      'Limites et situations nécessitant un professionnel',
    ]) {
      expect(html).toContain(heading)
    }
    for (const example of [
      'Option à mâcher',
      'Option liquide',
      'Structure de déjeuner',
      'Collation simple',
      'Shake sans whey',
      'Structure de dîner',
    ]) {
      expect(html).toContain(example)
    }
  })

  it('uses the expected FR-only metadata', async () => {
    const metadata = await generateMetadata({ params: Promise.resolve({ locale: 'fr' }) })

    expect(metadata.title).toBe('Menu prise de masse : exemple de journée et repas | MoovX')
    expect(metadata.description).toBe('Découvrez comment organiser un menu de prise de masse avec des exemples de repas, collations et alternatives à adapter à vos calories et préférences.')
    expect(metadata.alternates?.canonical).toBe(canonical)
    expect(metadata.alternates?.languages).toEqual({ fr: canonical, 'x-default': canonical })
    expect(JSON.stringify(metadata.alternates)).not.toMatch(/\/(en|de)\/nutrition\/menu-prise-de-masse/)
  })

  it('emits exactly one authorized WebPage schema', async () => {
    const html = await renderPage('fr')
    const scripts = [...html.matchAll(/<script type="application\/ld\+json">(.+?)<\/script>/g)]
    const schema = JSON.parse(scripts[0]?.[1] || '{}')

    expect(scripts).toHaveLength(1)
    expect(schema).toMatchObject({
      '@type': 'WebPage',
      '@id': `${canonical}#webpage`,
      url: canonical,
      inLanguage: 'fr',
      isPartOf: { '@id': 'https://moovx.ch/#website' },
    })
    for (const forbidden of ['FAQPage', 'Recipe', 'HowTo', 'Review', 'AggregateRating', 'Offer']) {
      expect(JSON.stringify(schema)).not.toContain(forbidden)
    }
  })

  it('receives two distinct contextual HTML links', async () => {
    const bulkGainHtml = renderToStaticMarkup(await BulkGainPage({ params: Promise.resolve({ locale: 'fr' }) }))
    const sportsMealsHtml = renderToStaticMarkup(await SportsMealsPage({ params: Promise.resolve({ locale: 'fr' }) }))

    expect(bulkGainHtml).toContain('href="/fr/nutrition/menu-prise-de-masse"')
    expect(bulkGainHtml).toContain('construire un menu de prise de masse sur une journée complète')
    expect(sportsMealsHtml).toContain('href="/fr/nutrition/menu-prise-de-masse"')
    expect(sportsMealsHtml).toContain('organiser un exemple de menu pour la prise de masse')
  })

  it('links to every required existing page and conversion route', async () => {
    const html = await renderPage('fr')

    for (const href of [
      '/fr/nutrition/prise-de-masse',
      '/fr/nutrition/repas-sportifs',
      '/fr/nutrition/proteines-par-jour',
      '/fr/nutrition/macros',
      '/fr/outils/calculateur-calories-macros',
      '/fr/guides/nutrition',
      'https://app.moovx.ch/register-client',
    ]) {
      expect(html).toContain(`href="${href}"`)
    }
  })

  it('keeps examples descriptive and product claims within authenticated capabilities', async () => {
    const source = [
      readFileSync('app/(marketing)/[locale]/nutrition/menu-prise-de-masse/page.tsx', 'utf8'),
      readFileSync('content/nutrition/bulk-menu.ts', 'utf8'),
    ].join('\n')
    const html = (await renderPage('fr')).toLocaleLowerCase('fr')

    expect(html).toContain('après connexion')
    expect(html).toContain('plans couvrent plusieurs jours')
    expect(html).toContain('restent des suggestions')
    expect(html).toContain('sans whey')
    expect(html).toContain('sans produits laitiers')
    expect(html).toContain('faible appétit')
    expect(source).not.toMatch(/calculateAutomaticCalorieMacroTargets|calcMifflin|ACTIVITY_MULTIPLIERS|proteinGrams|targetCalories/)
    expect(source).not.toMatch(/useState|useEffect|\bfetch\s*\(/)
    expect(html).not.toMatch(/\b\d+(?:[,.]\d+)?\s*(?:g|kcal)\b/)
    for (const forbidden of [
      'menu automatique gratuit sans compte',
      'génération illimitée',
      'résultat de prise de masse garanti',
      'prise de poids garantie',
      'conformité allergène garantie',
      'convient à tout le monde',
      'plan médical personnalisé',
    ]) {
      expect(html).not.toContain(forbidden)
    }
  })

  it('keeps a distinct intent and paragraphs from adjacent nutrition pillars', () => {
    const existingContents = [
      BULK_GAIN_CONTENT,
      SPORTS_MEALS_CONTENT,
      MACROS_CONTENT,
      DAILY_PROTEIN_CONTENT,
    ]
    const existingParagraphs = new Set(existingContents
      .flatMap(content => content.sections.flatMap(section => section.paragraphs))
      .map(normalizeParagraph))
    const menuParagraphs = BULK_MENU_CONTENT.sections
      .flatMap(section => section.paragraphs)
      .map(normalizeParagraph)

    expect(existingContents.map(content => content.title)).not.toContain(BULK_MENU_CONTENT.title)
    expect(existingContents.map(content => content.seoTitle)).not.toContain(BULK_MENU_CONTENT.seoTitle)
    expect(menuParagraphs.filter(paragraph => existingParagraphs.has(paragraph))).toEqual([])
    expect(BULK_MENU_CONTENT.introduction).toContain('repas concrets')
    expect(BULK_GAIN_CONTENT.introduction).toContain('entraînement structuré')
    expect(SPORTS_MEALS_CONTENT.introduction).toContain('repas organisé')
  })

  it('adds one unique French-only URL to the sitemap', () => {
    const entries = sitemap()
    const bulkMenuEntries = entries.filter(entry => entry.url.includes('/nutrition/menu-prise-de-masse'))

    expect(entries).toHaveLength(39)
    expect(new Set(entries.map(entry => entry.url)).size).toBe(39)
    expect(bulkMenuEntries).toHaveLength(1)
    expect(bulkMenuEntries[0]).toMatchObject({
      url: canonical,
      alternates: { languages: { fr: canonical, 'x-default': canonical } },
    })
    expect(bulkMenuEntries[0].lastModified).toBeUndefined()
    expect(JSON.stringify(bulkMenuEntries)).not.toMatch(/\/(en|de)\/nutrition\/menu-prise-de-masse/)
  })
})
