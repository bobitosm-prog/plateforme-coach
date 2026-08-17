import { existsSync } from 'node:fs'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import BlogArticle from '../../app/(marketing)/[locale]/blog/[slug]/page'
import GuidePage from '../../app/(marketing)/[locale]/guides/[slug]/page'
import CalculatorPage from '../../app/(marketing)/[locale]/outils/calculateur-calories-macros/page'
import sitemap from '../../app/sitemap'

const criticalTargets = [
  '/fr/guides/musculation',
  '/fr/outils/calculateur-calories-macros',
  '/fr/nutrition/prise-de-masse',
  '/fr/coach-sportif-ia',
] as const

async function renderGuide(slug: 'nutrition' | 'musculation') {
  return renderToStaticMarkup(await GuidePage({
    params: Promise.resolve({ locale: 'fr', slug }),
  }))
}

async function renderArticle(locale: 'fr' | 'en' | 'de', slug: string) {
  return renderToStaticMarkup(await BlogArticle({
    params: Promise.resolve({ locale, slug }),
  }))
}

describe('priority SEO internal linking graph', () => {
  it('links the nutrition guide to the calculator and bulk-gain pillar', async () => {
    const html = await renderGuide('nutrition')

    expect(html).toContain('href="/fr/outils/calculateur-calories-macros"')
    expect(html).toContain('Estimer vos besoins caloriques')
    expect(html).toContain('href="/fr/nutrition/prise-de-masse"')
    expect(html).toContain('Construire un plan de prise de masse')
    expect(html).toContain('href="/register-client"')
  })

  it('links the strength guide to the AI coach pillar', async () => {
    const html = await renderGuide('musculation')

    expect(html).toContain('href="/fr/coach-sportif-ia"')
    expect(html).toContain('Découvrir un programme adapté à vos objectifs')
    expect(html).toContain('href="/register-client"')
  })

  it.each([
    [
      'combien-de-proteines-prise-de-muscle',
      [
        ['/fr/outils/calculateur-calories-macros', 'Calculer vos besoins en calories et macros'],
        ['/fr/nutrition/prise-de-masse', 'Planifier une prise de masse progressive'],
      ],
    ],
    [
      'combien-de-series-par-semaine-prise-de-muscle',
      [['/fr/coach-sportif-ia', 'Créer un programme selon votre volume d’entraînement']],
    ],
    [
      'frequence-entrainement-combien-de-fois-par-semaine',
      [['/fr/coach-sportif-ia', 'Adapter un programme à vos disponibilités']],
    ],
    [
      'creatine-musculation-dosage-science',
      [['/fr/guides/musculation', 'Consulter le guide complet de musculation']],
    ],
  ] as const)('renders the priority French links before the existing CTA for %s', async (slug, links) => {
    const html = await renderArticle('fr', slug)
    const ctaIndex = html.indexOf('href="/register-client"')

    expect(ctaIndex).toBeGreaterThan(-1)
    for (const [href, label] of links) {
      const linkIndex = html.indexOf(`href="${href}"`)
      expect(linkIndex).toBeGreaterThan(-1)
      expect(linkIndex).toBeLessThan(ctaIndex)
      expect(html).toContain(label)
    }
  })

  it.each(['en', 'de'] as const)('does not expose French-only acquisition links in %s articles', async locale => {
    for (const slug of [
      'combien-de-proteines-prise-de-muscle',
      'combien-de-series-par-semaine-prise-de-muscle',
      'frequence-entrainement-combien-de-fois-par-semaine',
      'creatine-musculation-dosage-science',
    ]) {
      const html = await renderArticle(locale, slug)

      for (const target of criticalTargets) {
        expect(html).not.toContain(`href="${target}"`)
      }
      expect(html).toContain('href="/register-client"')
    }
  })

  it('links the calculator explanation to the bulk-gain pillar without changing its CTA', async () => {
    const html = renderToStaticMarkup(await CalculatorPage({
      params: Promise.resolve({ locale: 'fr' }),
    }))

    expect(html).toContain('href="/fr/nutrition/prise-de-masse"')
    expect(html).toContain('préparer une alimentation de prise de masse')
    expect(html).toContain('href="/register-client"')
  })

  it('targets only existing indexed acquisitions and the existing conversion route', () => {
    const indexedUrls = new Set(sitemap().map(entry => entry.url))

    for (const target of criticalTargets) {
      expect(indexedUrls.has(`https://moovx.ch${target}`)).toBe(true)
    }
    expect(existsSync('app/(application)/register-client/page.tsx')).toBe(true)
  })

  it('keeps marketing links free from the application host', async () => {
    const html = [
      await renderGuide('nutrition'),
      await renderGuide('musculation'),
      await renderArticle('fr', 'combien-de-proteines-prise-de-muscle'),
      renderToStaticMarkup(await CalculatorPage({ params: Promise.resolve({ locale: 'fr' }) })),
    ].join('\n')

    expect(html).not.toContain('href="https://app.moovx.ch')
  })
})
