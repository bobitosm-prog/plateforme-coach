import { readFileSync } from 'node:fs'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import sitemap from '@/app/sitemap'
import GuidePage from '@/app/(marketing)/[locale]/guides/[slug]/page'
import MacrosPage from '@/app/(marketing)/[locale]/nutrition/macros/page'
import SportsMealsPage, {
  dynamicParams,
  generateMetadata,
  generateStaticParams,
} from '@/app/(marketing)/[locale]/nutrition/repas-sportifs/page'
import { SPORTS_MEALS_CONTENT } from '@/content/nutrition/sports-meals'
import { MACROS_CONTENT } from '@/content/nutrition/macros'
import { DAILY_PROTEIN_CONTENT } from '@/content/nutrition/daily-protein'
import { BULK_GAIN_CONTENT } from '@/content/nutrition/bulk-gain'
import { WEIGHT_LOSS_CONTENT } from '@/content/nutrition/weight-loss'
import { getGuide } from '@/content/guides/guides'

const canonical = 'https://moovx.ch/fr/nutrition/repas-sportifs'

async function renderPage(locale: string) {
  const element = await SportsMealsPage({ params: Promise.resolve({ locale }) })
  return renderToStaticMarkup(element)
}

function normalizeParagraph(paragraph: string) {
  return paragraph.toLocaleLowerCase('fr').replace(/\s+/g, ' ').trim()
}

describe('French sports meals pillar page', () => {
  it('pre-renders only the authorized French route', () => {
    expect(dynamicParams).toBe(false)
    expect(generateStaticParams()).toEqual([{ locale: 'fr' }])
  })

  it.each(['en', 'de'])('rejects the unavailable %s locale', async locale => {
    await expect(SportsMealsPage({ params: Promise.resolve({ locale }) })).rejects.toThrow(/404/)
  })

  it('renders the complete practical meal structure and educational examples', async () => {
    const html = await renderPage('fr')

    expect(html).toContain(`<h1`)
    for (const heading of [
      'Qu’est-ce qu’un repas sportif équilibré ?',
      'Comment associer protéines, glucides et lipides',
      'Repas avant entraînement',
      'Repas après entraînement',
      'Petit-déjeuner sportif',
      'Déjeuner et dîner',
      'Collations et shakes',
      'Exemples de repas selon différents objectifs',
      'Adapter les portions aux calories et macros',
      'Comment MoovX peut aider à organiser les repas',
      'Limites et situations nécessitant un professionnel',
    ]) {
      expect(html).toContain(heading)
    }
    for (const example of ['Œufs', 'Pain', 'Cottage cheese', 'Flocons d’avoine', 'Repas principal']) {
      expect(html).toContain(example)
    }
    expect(html).toContain('Les exemples proposés ici illustrent des structures à adapter')
  })

  it('uses the expected FR-only metadata', async () => {
    const metadata = await generateMetadata({ params: Promise.resolve({ locale: 'fr' }) })

    expect(metadata.title).toBe('Repas sportifs : idées et composition pour vos objectifs | MoovX')
    expect(metadata.description).toBe('Découvrez comment composer des repas sportifs équilibrés, organiser protéines, glucides et lipides et adapter vos repas à vos calories et objectifs.')
    expect(metadata.alternates?.canonical).toBe(canonical)
    expect(metadata.alternates?.languages).toEqual({ fr: canonical, 'x-default': canonical })
    expect(JSON.stringify(metadata.alternates)).not.toMatch(/\/(en|de)\/nutrition\/repas-sportifs/)
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
    for (const forbidden of ['FAQPage', 'Recipe', 'Review', 'AggregateRating', 'Offer']) {
      expect(JSON.stringify(schema)).not.toContain(forbidden)
    }
  })

  it('receives two distinct contextual HTML links', async () => {
    const guideHtml = renderToStaticMarkup(await GuidePage({
      params: Promise.resolve({ locale: 'fr', slug: 'nutrition' }),
    }))
    const macrosHtml = renderToStaticMarkup(await MacrosPage({
      params: Promise.resolve({ locale: 'fr' }),
    }))

    expect(guideHtml).toContain('href="/fr/nutrition/repas-sportifs"')
    expect(guideHtml).toContain('composer des repas sportifs avant et après l’entraînement')
    expect(macrosHtml).toContain('href="/fr/nutrition/repas-sportifs"')
    expect(macrosHtml).toContain('composer des repas sportifs à partir de ces repères')
  })

  it('links to every required existing page and conversion route', async () => {
    const html = await renderPage('fr')

    for (const href of [
      '/fr/nutrition/macros',
      '/fr/nutrition/proteines-par-jour',
      '/fr/outils/calculateur-calories-macros',
      '/fr/guides/nutrition',
      '/fr/nutrition/prise-de-masse',
      '/fr/nutrition/perte-de-poids',
      'https://app.moovx.ch/register-client',
    ]) {
      expect(html).toContain(`href="${href}"`)
    }
  })

  it('describes only the authenticated meal-plan capability and avoids forbidden claims', async () => {
    const source = [
      readFileSync('app/(marketing)/[locale]/nutrition/repas-sportifs/page.tsx', 'utf8'),
      readFileSync('content/nutrition/sports-meals.ts', 'utf8'),
    ].join('\n')
    const html = (await renderPage('fr')).toLocaleLowerCase('fr')

    expect(html).toContain('après connexion')
    expect(html).toContain('plans couvrent plusieurs jours')
    expect(source).not.toMatch(/calculateAutomaticCalorieMacroTargets|calcMifflin|ACTIVITY_MULTIPLIERS|proteinGrams|targetCalories/)
    expect(source).not.toMatch(/useState|useEffect|\bfetch\s*\(/)
    for (const forbidden of [
      'générateur gratuit sans compte',
      'génération illimitée',
      'allergènes garantis',
      'résultat garanti',
      'transformation garantie',
      'plan médical personnalisé',
      'quantités universelles',
    ]) {
      expect(html).not.toContain(forbidden)
    }
  })

  it('keeps a distinct intent and paragraphs from existing nutrition pillars', () => {
    const guide = getGuide('nutrition')
    expect(guide).toBeTruthy()
    if (!guide) return

    const existingTitles = [
      guide.title,
      MACROS_CONTENT.title,
      DAILY_PROTEIN_CONTENT.title,
      BULK_GAIN_CONTENT.title,
      WEIGHT_LOSS_CONTENT.title,
    ]
    const existingSeoTitles = [
      guide.seoTitle,
      MACROS_CONTENT.seoTitle,
      DAILY_PROTEIN_CONTENT.seoTitle,
      BULK_GAIN_CONTENT.seoTitle,
      WEIGHT_LOSS_CONTENT.seoTitle,
    ]
    const existingParagraphs = new Set([
      ...guide.sections.flatMap(section => section.paragraphs),
      ...MACROS_CONTENT.sections.flatMap(section => section.paragraphs),
      ...DAILY_PROTEIN_CONTENT.sections.flatMap(section => section.paragraphs),
      ...BULK_GAIN_CONTENT.sections.flatMap(section => section.paragraphs),
      ...WEIGHT_LOSS_CONTENT.sections.flatMap(section => section.paragraphs),
    ].map(normalizeParagraph))
    const sportsMealsParagraphs = SPORTS_MEALS_CONTENT.sections
      .flatMap(section => section.paragraphs)
      .map(normalizeParagraph)

    expect(existingTitles).not.toContain(SPORTS_MEALS_CONTENT.title)
    expect(existingSeoTitles).not.toContain(SPORTS_MEALS_CONTENT.seoTitle)
    expect(sportsMealsParagraphs.filter(paragraph => existingParagraphs.has(paragraph))).toEqual([])
    expect(SPORTS_MEALS_CONTENT.introduction).toContain('repas organisé')
    expect(MACROS_CONTENT.introduction).toContain('macronutriments')
    expect(DAILY_PROTEIN_CONTENT.introduction).toContain('quantité de protéines')
    expect(BULK_GAIN_CONTENT.introduction).toContain('prise de masse')
    expect(WEIGHT_LOSS_CONTENT.introduction).toContain('perte de poids')
  })

  it('adds one unique French-only URL to the sitemap', () => {
    const entries = sitemap()
    const sportsMealsEntries = entries.filter(entry => entry.url.includes('/nutrition/repas-sportifs'))

    expect(entries).toHaveLength(38)
    expect(new Set(entries.map(entry => entry.url)).size).toBe(38)
    expect(sportsMealsEntries).toHaveLength(1)
    expect(sportsMealsEntries[0]).toMatchObject({
      url: canonical,
      alternates: { languages: { fr: canonical, 'x-default': canonical } },
    })
    expect(sportsMealsEntries[0].lastModified).toBeUndefined()
    expect(JSON.stringify(sportsMealsEntries)).not.toMatch(/\/(en|de)\/nutrition\/repas-sportifs/)
  })
})
