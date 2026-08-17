import { existsSync } from 'node:fs'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import BlogArticle from '@/app/(marketing)/[locale]/blog/[slug]/page'

const proteinSlug = 'combien-de-proteines-prise-de-muscle'
const creatineSlug = 'creatine-musculation-dosage-science'
const trainingSlugs = [
  'combien-de-series-par-semaine-prise-de-muscle',
  'frequence-entrainement-combien-de-fois-par-semaine',
]
const targetedSlugs = [proteinSlug, creatineSlug, ...trainingSlugs]
const frenchOnlyTargets = [
  '/fr/outils/calculateur-calories-macros',
  '/fr/nutrition/prise-de-masse',
  '/fr/guides/musculation',
  '/fr/coach-sportif-ia',
]

async function renderArticle(locale: string, slug: string) {
  const element = await BlogArticle({ params: Promise.resolve({ locale, slug }) })
  return renderToStaticMarkup(element)
}

describe('Blog internal authority flow', () => {
  it('links the French protein article to the calculator and bulk-gain pillar', async () => {
    const html = await renderArticle('fr', proteinSlug)

    expect(html).toContain('href="/fr/outils/calculateur-calories-macros"')
    expect(html).toContain('calculer vos besoins en calories et en macros')
    expect(html).toContain('href="/fr/nutrition/prise-de-masse"')
    expect(html).toContain('planifier une prise de masse progressive')
  })

  it('links the French creatine article to the training guide', async () => {
    const html = await renderArticle('fr', creatineSlug)

    expect(html).toContain('href="/fr/guides/musculation"')
    expect(html).toContain('guide complet de musculation')
  })

  it.each(trainingSlugs)('links the French %s article to the AI coach pillar', async slug => {
    const html = await renderArticle('fr', slug)

    expect(html).toContain('href="/fr/coach-sportif-ia"')
    expect(html).toContain('créer un programme adapté à vos objectifs')
  })

  it.each(['en', 'de'])('keeps French-only links out of every targeted %s article', async locale => {
    for (const slug of targetedSlugs) {
      const html = await renderArticle(locale, slug)

      for (const target of frenchOnlyTargets) {
        expect(html).not.toContain(`href="${target}"`)
      }
    }
  })

  it('points only to existing App Router destinations', () => {
    const routeFiles: Record<string, string> = {
      '/fr/outils/calculateur-calories-macros': 'app/(marketing)/[locale]/outils/calculateur-calories-macros/page.tsx',
      '/fr/nutrition/prise-de-masse': 'app/(marketing)/[locale]/nutrition/prise-de-masse/page.tsx',
      '/fr/guides/musculation': 'app/(marketing)/[locale]/guides/[slug]/page.tsx',
      '/fr/coach-sportif-ia': 'app/(marketing)/[locale]/coach-sportif-ia/page.tsx',
    }

    expect(Object.keys(routeFiles)).toEqual(frenchOnlyTargets)
    for (const routeFile of Object.values(routeFiles)) {
      expect(existsSync(routeFile)).toBe(true)
    }
  })

  it.each(['fr', 'en', 'de'])('keeps the existing conversion CTA on every %s article', async locale => {
    for (const slug of targetedSlugs) {
      const html = await renderArticle(locale, slug)
      expect(html).toContain('href="/register-client"')
    }
  })
})
