import { readFileSync } from 'node:fs'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import sitemap from '@/app/sitemap'
import WeightLossPage from '@/app/(marketing)/[locale]/nutrition/perte-de-poids/page'
import SportsMealsPage from '@/app/(marketing)/[locale]/nutrition/repas-sportifs/page'
import WeightLossMenuPage, {
  dynamicParams,
  generateMetadata,
  generateStaticParams,
} from '@/app/(marketing)/[locale]/nutrition/menu-perte-de-poids/page'
import { WEIGHT_LOSS_MENU_CONTENT } from '@/content/nutrition/weight-loss-menu'
import { WEIGHT_LOSS_CONTENT } from '@/content/nutrition/weight-loss'
import { SPORTS_MEALS_CONTENT } from '@/content/nutrition/sports-meals'
import { BULK_MENU_CONTENT } from '@/content/nutrition/bulk-menu'
import { MACROS_CONTENT } from '@/content/nutrition/macros'
import { DAILY_PROTEIN_CONTENT } from '@/content/nutrition/daily-protein'

const canonical = 'https://moovx.ch/fr/nutrition/menu-perte-de-poids'

async function renderPage(locale: string) {
  const element = await WeightLossMenuPage({ params: Promise.resolve({ locale }) })
  return renderToStaticMarkup(element)
}

function normalizeParagraph(paragraph: string) {
  return paragraph.toLocaleLowerCase('fr').replace(/[^\p{L}\p{N}\s]/gu, ' ').replace(/\s+/g, ' ').trim()
}

function wordBigrams(paragraph: string) {
  const words = normalizeParagraph(paragraph).split(' ').filter(Boolean)
  return new Set(words.slice(0, -1).map((word, index) => `${word} ${words[index + 1]}`))
}

function diceSimilarity(first: string, second: string) {
  const a = wordBigrams(first)
  const b = wordBigrams(second)
  if (a.size === 0 || b.size === 0) return 0
  const shared = [...a].filter(pair => b.has(pair)).length
  return (2 * shared) / (a.size + b.size)
}

describe('French weight loss menu pillar page', () => {
  it('pre-renders only the authorized French route', () => {
    expect(dynamicParams).toBe(false)
    expect(generateStaticParams()).toEqual([{ locale: 'fr' }])
  })

  it.each(['en', 'de'])('rejects the unavailable %s locale', async locale => {
    await expect(WeightLossMenuPage({ params: Promise.resolve({ locale }) })).rejects.toThrow(/404/)
  })

  it('renders the practical day, meal variants and limits', async () => {
    const html = await renderPage('fr')

    for (const heading of [
      'Organiser une journée rassasiante et flexible',
      'Petit-déjeuner : solide, léger ou rapide',
      'Déjeuner : construire une assiette complète',
      'Collation facultative et option sans whey',
      'Dîner : rester simple et rassasiant',
      'Exemple pédagogique d’une journée complète',
      'Variantes pratiques selon les préférences',
      'Ajuster le menu à partir du suivi réel',
      'Personnaliser ses repas avec MoovX',
      'Limites et accompagnement professionnel',
    ]) {
      expect(html).toContain(heading)
    }
    for (const example of ['Option solide', 'Option plus légère', 'Petit-déjeuner rapide', 'Structure de déjeuner rassasiante', 'Collation sans whey', 'Structure de dîner']) {
      expect(html).toContain(example)
    }
  })

  it('uses the expected FR-only metadata', async () => {
    const metadata = await generateMetadata({ params: Promise.resolve({ locale: 'fr' }) })

    expect(metadata.title).toBe('Menu perte de poids : exemple de journée et repas | MoovX')
    expect(metadata.description).toBe('Découvrez comment organiser un menu de perte de poids avec des repas rassasiants, des variantes pratiques et des portions à ajuster selon vos besoins.')
    expect(metadata.alternates?.canonical).toBe(canonical)
    expect(metadata.alternates?.languages).toEqual({ fr: canonical, 'x-default': canonical })
    expect(JSON.stringify(metadata.alternates)).not.toMatch(/\/(en|de)\/nutrition\/menu-perte-de-poids/)
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
    const weightLossHtml = renderToStaticMarkup(await WeightLossPage({ params: Promise.resolve({ locale: 'fr' }) }))
    const sportsMealsHtml = renderToStaticMarkup(await SportsMealsPage({ params: Promise.resolve({ locale: 'fr' }) }))

    expect(weightLossHtml).toContain('href="/fr/nutrition/menu-perte-de-poids"')
    expect(weightLossHtml).toContain('organiser un menu de perte de poids sur une journée')
    expect(sportsMealsHtml).toContain('href="/fr/nutrition/menu-perte-de-poids"')
    expect(sportsMealsHtml).toContain('construire un exemple de menu pour une perte de poids progressive')
  })

  it('links to every required existing page and conversion route', async () => {
    const html = await renderPage('fr')

    for (const href of [
      '/fr/nutrition/perte-de-poids',
      '/fr/nutrition/repas-sportifs',
      '/fr/nutrition/macros',
      '/fr/nutrition/proteines-par-jour',
      '/fr/outils/calculateur-calories-macros',
      '/fr/guides/nutrition',
      'https://app.moovx.ch/register-client',
    ]) {
      expect(html).toContain(`href="${href}"`)
    }
  })

  it('keeps examples descriptive and product claims within authenticated capabilities', async () => {
    const source = [
      readFileSync('app/(marketing)/[locale]/nutrition/menu-perte-de-poids/page.tsx', 'utf8'),
      readFileSync('content/nutrition/weight-loss-menu.ts', 'utf8'),
    ].join('\n')
    const html = (await renderPage('fr')).toLocaleLowerCase('fr')

    expect(html).toContain('après connexion')
    expect(html).toContain('sur plusieurs jours')
    expect(html).toContain('restent des suggestions')
    expect(html).toContain('sans whey')
    expect(html).toContain('sans produits laitiers')
    expect(html).toContain('faim importante')
    expect(source).not.toMatch(/calculateAutomaticCalorieMacroTargets|calcMifflin|ACTIVITY_MULTIPLIERS|proteinGrams|targetCalories/)
    expect(source).not.toMatch(/useState|useEffect|\bfetch\s*\(/)
    expect(html).not.toMatch(/\b\d+(?:[,.]\d+)?\s*(?:g|kcal)\b/)
    for (const forbidden of [
      'perte de poids garantie',
      'perte rapide garantie',
      'génération publique anonyme',
      'génération illimitée',
      'conformité allergène garantie',
      'adapté à tout le monde',
      'prescription médicale personnalisée',
      'compense automatiquement',
    ]) {
      expect(html).not.toContain(forbidden)
    }
  })

  it('keeps a distinct intent and editorial wording from adjacent nutrition pillars', () => {
    const existingContents = [
      WEIGHT_LOSS_CONTENT,
      SPORTS_MEALS_CONTENT,
      BULK_MENU_CONTENT,
      MACROS_CONTENT,
      DAILY_PROTEIN_CONTENT,
    ]
    const existingParagraphs = existingContents.flatMap(content => content.sections.flatMap(section => section.paragraphs))
    const menuParagraphs = WEIGHT_LOSS_MENU_CONTENT.sections.flatMap(section => section.paragraphs)
    const normalizedExisting = new Set(existingParagraphs.map(normalizeParagraph))
    const maximumSimilarity = Math.max(...menuParagraphs.flatMap(paragraph => existingParagraphs.map(existing => diceSimilarity(paragraph, existing))))

    expect(existingContents.map(content => content.title)).not.toContain(WEIGHT_LOSS_MENU_CONTENT.title)
    expect(existingContents.map(content => content.seoTitle)).not.toContain(WEIGHT_LOSS_MENU_CONTENT.seoTitle)
    expect(menuParagraphs.map(normalizeParagraph).filter(paragraph => normalizedExisting.has(paragraph))).toEqual([])
    expect(maximumSimilarity).toBeLessThan(0.6)
    expect(WEIGHT_LOSS_MENU_CONTENT.introduction).toContain('repas rassasiants')
    expect(WEIGHT_LOSS_CONTENT.introduction).toContain('équilibre énergétique')
    expect(SPORTS_MEALS_CONTENT.introduction).toContain('repas organisé')
  })

  it('adds one unique French-only URL to the sitemap', () => {
    const entries = sitemap()
    const menuEntries = entries.filter(entry => entry.url.includes('/nutrition/menu-perte-de-poids'))

    expect(entries).toHaveLength(40)
    expect(new Set(entries.map(entry => entry.url)).size).toBe(40)
    expect(menuEntries).toHaveLength(1)
    expect(menuEntries[0]).toMatchObject({
      url: canonical,
      alternates: { languages: { fr: canonical, 'x-default': canonical } },
    })
    expect(menuEntries[0].lastModified).toBeUndefined()
    expect(JSON.stringify(menuEntries)).not.toMatch(/\/(en|de)\/nutrition\/menu-perte-de-poids/)
  })
})
