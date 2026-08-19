import { readFileSync } from 'node:fs'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import sitemap from '@/app/sitemap'
import ThreeDayProgramPage, {
  dynamicParams,
  generateMetadata,
  generateStaticParams,
} from '@/app/(marketing)/[locale]/programmes/musculation/3-jours/page'
import BeginnerProgramPage from '@/app/(marketing)/[locale]/programmes/musculation/debutant/page'
import GuidePage from '@/app/(marketing)/[locale]/guides/[slug]/page'
import { BEGINNER_PROGRAM_CONTENT } from '@/content/training/beginner-program'
import { THREE_DAY_PROGRAM_CONTENT } from '@/content/training/three-day-program'
import { getGuide } from '@/content/guides/guides'
import { isMarketingPath } from '@/proxy'

const canonical = 'https://moovx.ch/fr/programmes/musculation/3-jours'

async function renderPage(locale: string) {
  const element = await ThreeDayProgramPage({ params: Promise.resolve({ locale }) })
  return renderToStaticMarkup(element)
}

function normalizedParagraphs(paragraphs: readonly string[]) {
  return paragraphs.map(paragraph => paragraph.toLocaleLowerCase('fr').replace(/\s+/g, ' ').trim())
}

describe('French three-day training program pillar', () => {
  it('pre-renders only the authorized French route', () => {
    expect(dynamicParams).toBe(false)
    expect(generateStaticParams()).toEqual([{ locale: 'fr' }])
  })

  it('renders the required weekly-organization sections and editorial example', async () => {
    const html = await renderPage('fr')

    expect(html).toContain('<h1')
    for (const heading of [
      'Pourquoi s’entraîner 3 jours par semaine',
      'Comment répartir les séances',
      'Full body ou split sur 3 jours',
      'Exemple pédagogique de programme 3 jours',
      'Séries, répétitions et repos',
      'Organisation de la semaine et récupération',
      'Comment progresser',
      'Adapter selon le matériel et le niveau',
      'Comment MoovX personnalise le programme',
    ]) {
      expect(html).toContain(heading)
    }
    for (const session of ['Jour 1 — Haut du corps', 'Jour 2 — Bas du corps', 'Jour 3 — Corps entier']) {
      expect(html).toContain(session)
    }
  })

  it.each(['en', 'de'])('rejects the unavailable %s locale', async locale => {
    await expect(ThreeDayProgramPage({ params: Promise.resolve({ locale }) })).rejects.toThrow(/404/)
  })

  it('uses the expected FR-only metadata', async () => {
    const metadata = await generateMetadata({ params: Promise.resolve({ locale: 'fr' }) })

    expect(metadata.title).toBe('Programme musculation 3 jours : exemple et organisation | MoovX')
    expect(metadata.description).toBe('Découvrez comment organiser un programme de musculation sur 3 jours, répartir vos séances et adapter exercices, séries et récupération à votre niveau.')
    expect(metadata.alternates?.canonical).toBe(canonical)
    expect(metadata.alternates?.languages).toEqual({ fr: canonical, 'x-default': canonical })
    expect(JSON.stringify(metadata.alternates)).not.toMatch(/\/(en|de)\/programmes\//)
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

  it('links to all required existing pages and the conversion host', async () => {
    const html = await renderPage('fr')

    for (const href of [
      '/fr/programmes/musculation/debutant',
      '/fr/guides/musculation',
      '/fr/coach-sportif-ia',
      '/fr/blog/combien-de-series-par-semaine-prise-de-muscle',
      '/fr/blog/frequence-entrainement-combien-de-fois-par-semaine',
      'https://app.moovx.ch/register-client',
    ]) {
      expect(html).toContain(`href="${href}"`)
    }
  })

  it('receives crawlable contextual links from the guide and beginner pillar', async () => {
    const guideHtml = renderToStaticMarkup(await GuidePage({
      params: Promise.resolve({ locale: 'fr', slug: 'musculation' }),
    }))
    const beginnerHtml = renderToStaticMarkup(await BeginnerProgramPage({
      params: Promise.resolve({ locale: 'fr' }),
    }))

    expect(guideHtml).toContain('href="/fr/programmes/musculation/3-jours"')
    expect(guideHtml).toContain('organiser un programme de musculation sur trois jours')
    expect(beginnerHtml).toContain('href="/fr/programmes/musculation/3-jours"')
    expect(beginnerHtml).toContain('Voir comment organiser précisément trois séances par semaine')
  })

  it('keeps a distinct intent from the beginner pillar and general guide', () => {
    const guide = getGuide('musculation')
    expect(guide).toBeTruthy()
    if (!guide) return

    expect(THREE_DAY_PROGRAM_CONTENT.title).not.toBe(BEGINNER_PROGRAM_CONTENT.title)
    expect(THREE_DAY_PROGRAM_CONTENT.seoTitle).not.toBe(BEGINNER_PROGRAM_CONTENT.seoTitle)
    expect(THREE_DAY_PROGRAM_CONTENT.title).not.toBe(guide.title)
    expect(THREE_DAY_PROGRAM_CONTENT.seoTitle).not.toBe(guide.seoTitle)

    const threeDayParagraphs = normalizedParagraphs(
      THREE_DAY_PROGRAM_CONTENT.sections.flatMap(section => section.paragraphs),
    )
    const existingParagraphs = new Set(normalizedParagraphs([
      ...BEGINNER_PROGRAM_CONTENT.sections.flatMap(section => section.paragraphs),
      ...guide.sections.flatMap(section => section.paragraphs),
    ]))
    expect(threeDayParagraphs.filter(paragraph => existingParagraphs.has(paragraph))).toEqual([])
    expect(THREE_DAY_PROGRAM_CONTENT.introduction).toContain('Trois séances par semaine')
    expect(BEGINNER_PROGRAM_CONTENT.introduction).toContain('programme débutant')
    expect(guide.introduction).toContain('stimulus, la récupération et la progression')
  })

  it('contains no generator duplication or forbidden claim', async () => {
    const pageSource = readFileSync('app/(marketing)/[locale]/programmes/musculation/3-jours/page.tsx', 'utf8')
    const contentSource = readFileSync('content/training/three-day-program.ts', 'utf8')
    const source = `${pageSource}\n${contentSource}`
    const html = (await renderPage('fr')).toLowerCase()

    expect(source).not.toMatch(/generateCustomProgram|getProgramStructure|PROGRAM_GENERATION_PROMPT/)
    for (const forbidden of [
      'progression garantie',
      'prévention garantie des blessures',
      'programme universellement adapté',
      'remplace un coach humain',
    ]) {
      expect(html).not.toContain(forbidden)
    }
  })

  it('is already covered by the bounded French marketing-host pattern', () => {
    expect(isMarketingPath('/fr/programmes/musculation/3-jours')).toBe(true)
    expect(isMarketingPath('/en/programmes/musculation/3-jours')).toBe(false)
    expect(isMarketingPath('/de/programmes/musculation/3-jours')).toBe(false)
    expect(isMarketingPath('/fr/programmesfoo')).toBe(false)
  })

  it('adds one unique French-only URL to the sitemap', () => {
    const entries = sitemap()
    const programEntries = entries.filter(entry => entry.url.includes('/programmes/musculation/3-jours'))

    expect(entries).toHaveLength(37)
    expect(new Set(entries.map(entry => entry.url)).size).toBe(37)
    expect(programEntries).toHaveLength(1)
    expect(programEntries[0]).toMatchObject({
      url: canonical,
      alternates: { languages: { fr: canonical, 'x-default': canonical } },
    })
    expect(programEntries[0].lastModified).toBeUndefined()
    expect(JSON.stringify(programEntries)).not.toMatch(/\/(en|de)\/programmes\//)
  })
})
