import { readFileSync } from 'node:fs'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import sitemap from '@/app/sitemap'
import GuidePage from '@/app/(marketing)/[locale]/guides/[slug]/page'
import MacrosPage, {
  dynamicParams,
  generateMetadata,
  generateStaticParams,
} from '@/app/(marketing)/[locale]/nutrition/macros/page'
import CalorieMacroCalculatorPage from '@/app/(marketing)/[locale]/outils/calculateur-calories-macros/page'
import { MACROS_CONTENT } from '@/content/nutrition/macros'
import { DAILY_PROTEIN_CONTENT } from '@/content/nutrition/daily-protein'
import { getGuide } from '@/content/guides/guides'

const canonical = 'https://moovx.ch/fr/nutrition/macros'

async function renderPage(locale: string) {
  const element = await MacrosPage({ params: Promise.resolve({ locale }) })
  return renderToStaticMarkup(element)
}

function normalizeParagraph(paragraph: string) {
  return paragraph.toLocaleLowerCase('fr').replace(/\s+/g, ' ').trim()
}

describe('French macros nutrition pillar', () => {
  it('pre-renders only the authorized French route', () => {
    expect(dynamicParams).toBe(false)
    expect(generateStaticParams()).toEqual([{ locale: 'fr' }])
  })

  it('renders the required educational sections without a second calculator', async () => {
    const html = await renderPage('fr')

    expect(html).toContain('<h1')
    for (const heading of [
      'Que sont les macronutriments ?',
      'Protéines : entretien et renouvellement des tissus',
      'Glucides : énergie disponible et adaptation au rythme de vie',
      'Lipides : énergie et fonctions physiologiques',
      'Combien de calories apporte chaque macro ?',
      'Comment répartir ses macros',
      'Macros selon l’objectif : maintien, perte de poids et prise de masse',
      'Comment utiliser le calculateur MoovX',
      'Comment ajuster selon le suivi réel',
      'Limites et situations nécessitant un professionnel',
    ]) {
      expect(html).toContain(heading)
    }
    expect(html).toContain('Environ 4 kcal')
    expect(html).toContain('Environ 9 kcal')
    expect(html).not.toContain('<form')
  })

  it.each(['en', 'de'])('rejects the unavailable %s locale', async locale => {
    await expect(MacrosPage({ params: Promise.resolve({ locale }) })).rejects.toThrow(/404/)
  })

  it('uses the expected FR-only metadata', async () => {
    const metadata = await generateMetadata({ params: Promise.resolve({ locale: 'fr' }) })

    expect(metadata.title).toBe('Macros : protéines, glucides et lipides | Guide MoovX')
    expect(metadata.description).toBe('Comprenez le rôle des protéines, glucides et lipides, leur apport calorique et comment répartir vos macros selon votre objectif.')
    expect(metadata.alternates?.canonical).toBe(canonical)
    expect(metadata.alternates?.languages).toEqual({ fr: canonical, 'x-default': canonical })
    expect(JSON.stringify(metadata.alternates)).not.toMatch(/\/(en|de)\/nutrition\/macros/)
  })

  it('emits only the authorized WebPage schema', async () => {
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
    for (const forbidden of ['FAQPage', 'Review', 'AggregateRating', 'Offer']) {
      expect(JSON.stringify(schema)).not.toContain(forbidden)
    }
  })

  it('links to every required existing page and conversion route', async () => {
    const html = await renderPage('fr')

    for (const href of [
      '/fr/outils/calculateur-calories-macros',
      '/fr/guides/nutrition',
      '/fr/nutrition/proteines-par-jour',
      '/fr/nutrition/prise-de-masse',
      '/fr/nutrition/perte-de-poids',
      'https://app.moovx.ch/register-client',
    ]) {
      expect(html).toContain(`href="${href}"`)
    }
  })

  it('receives two distinct crawlable contextual links', async () => {
    const guideHtml = renderToStaticMarkup(await GuidePage({
      params: Promise.resolve({ locale: 'fr', slug: 'nutrition' }),
    }))
    const calculatorHtml = renderToStaticMarkup(await CalorieMacroCalculatorPage({
      params: Promise.resolve({ locale: 'fr' }),
    }))

    expect(guideHtml).toContain('href="/fr/nutrition/macros"')
    expect(guideHtml).toContain('comprendre comment répartir protéines, glucides et lipides')
    expect(calculatorHtml).toContain('href="/fr/nutrition/macros"')
    expect(calculatorHtml).toContain('guide des protéines, glucides et lipides')
  })

  it('links contextually to the sports meals pillar', async () => {
    const html = await renderPage('fr')

    expect(html).toContain('href="/fr/nutrition/repas-sportifs"')
    expect(html).toContain('composer des repas sportifs à partir de ces repères')
  })

  it('keeps a distinct intent from the calculator, protein pillar and nutrition guide', async () => {
    const guide = getGuide('nutrition')
    expect(guide).toBeTruthy()
    if (!guide) return

    const calculatorHtml = renderToStaticMarkup(await CalorieMacroCalculatorPage({
      params: Promise.resolve({ locale: 'fr' }),
    }))
    const calculatorH1 = calculatorHtml.match(/<h1[^>]*>(.+?)<\/h1>/)?.[1]

    expect(MACROS_CONTENT.seoTitle).not.toBe(DAILY_PROTEIN_CONTENT.seoTitle)
    expect(MACROS_CONTENT.seoTitle).not.toBe(guide.seoTitle)
    expect(MACROS_CONTENT.title).not.toBe(DAILY_PROTEIN_CONTENT.title)
    expect(MACROS_CONTENT.title).not.toBe(guide.title)
    expect(MACROS_CONTENT.title).not.toBe(calculatorH1)

    const existingParagraphs = new Set([
      ...DAILY_PROTEIN_CONTENT.sections.flatMap(section => section.paragraphs),
      ...guide.sections.flatMap(section => section.paragraphs),
    ].map(normalizeParagraph))
    const macrosParagraphs = MACROS_CONTENT.sections
      .flatMap(section => section.paragraphs)
      .map(normalizeParagraph)

    expect(macrosParagraphs.filter(paragraph => existingParagraphs.has(paragraph))).toEqual([])
    expect(MACROS_CONTENT.introduction).toContain('Comprendre leur rôle')
    expect(DAILY_PROTEIN_CONTENT.introduction).toContain('quantité de protéines')
    expect(guide.introduction).toContain('repères essentiels')
    expect(calculatorHtml).toContain('aria-live="polite"')
  })

  it('contains no duplicated nutrition authority or forbidden claim', async () => {
    const source = [
      readFileSync('app/(marketing)/[locale]/nutrition/macros/page.tsx', 'utf8'),
      readFileSync('content/nutrition/macros.ts', 'utf8'),
    ].join('\n')
    const html = (await renderPage('fr')).toLocaleLowerCase('fr')

    expect(source).not.toMatch(/calculateAutomaticCalorieMacroTargets|calcMifflinStJeor|ACTIVITY_MULTIPLIERS/)
    expect(source).not.toMatch(/useState|useEffect|\bfetch\s*\(/)
    for (const forbidden of [
      'répartition parfaite',
      'résultat garanti',
      'perte de poids garantie',
      'prise de muscle garantie',
      'prescription médicale personnalisée',
    ]) {
      expect(html).not.toContain(forbidden)
    }
  })

  it('adds one unique French-only URL to the sitemap', () => {
    const entries = sitemap()
    const macrosEntries = entries.filter(entry => entry.url.includes('/nutrition/macros'))

    expect(entries).toHaveLength(39)
    expect(new Set(entries.map(entry => entry.url)).size).toBe(39)
    expect(macrosEntries).toHaveLength(1)
    expect(macrosEntries[0]).toMatchObject({
      url: canonical,
      alternates: { languages: { fr: canonical, 'x-default': canonical } },
    })
    expect(macrosEntries[0].lastModified).toBeUndefined()
    expect(JSON.stringify(macrosEntries)).not.toMatch(/\/(en|de)\/nutrition\/macros/)
  })
})
