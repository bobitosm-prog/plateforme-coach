import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import CoachIaSection from '../../app/(marketing)/[locale]/landing/components/CoachIaSection'
import Hero from '../../app/(marketing)/[locale]/landing/components/Hero'
import NutritionSection from '../../app/(marketing)/[locale]/landing/components/NutritionSection'
import TrainingSection from '../../app/(marketing)/[locale]/landing/components/TrainingSection'
import sitemap from '../../app/sitemap'

let activeLocale = 'fr'

vi.mock('next-intl', () => ({
  useLocale: () => activeLocale,
  useTranslations: () => (key: string) => key,
}))

vi.mock('next-intl/server', () => ({
  getTranslations: async () => (key: string, values?: { days?: number }) =>
    values?.days ? `${key}-${values.days}` : key,
}))

vi.mock('@/lib/beta-offer', () => ({
  getActiveBetaOffer: async () => null,
  trialDaysFor: () => 14,
}))

vi.mock('gsap', () => ({
  default: { registerPlugin: vi.fn() },
}))

vi.mock('gsap/ScrollTrigger', () => ({
  ScrollTrigger: {},
}))

const frenchOnlyLinks = [
  ['/fr/outils/calculateur-calories-macros', 'Estimer vos calories et vos macros'],
  ['/fr/guides/nutrition', 'Guide nutrition sportive'],
  ['/fr/nutrition/prise-de-masse', 'Construire une prise de masse progressive'],
  ['/fr/guides/musculation', 'Guide musculation'],
  ['/fr/coach-sportif-ia', 'Découvrir comment fonctionne notre coach sportif IA'],
] as const

function renderLandingAuthoritySections() {
  return [
    renderToStaticMarkup(<NutritionSection />),
    renderToStaticMarkup(<TrainingSection />),
    renderToStaticMarkup(<CoachIaSection />),
  ].join('\n')
}

describe('landing internal authority links', () => {
  beforeEach(() => {
    activeLocale = 'fr'
  })

  it('routes the hero discovery CTA to the first real feature section', async () => {
    const heroHtml = renderToStaticMarkup(await Hero())
    const nutritionHtml = renderToStaticMarkup(<NutritionSection />)

    expect(heroHtml).toContain('href="#nutrition"')
    expect(heroHtml).not.toContain('href="#features"')
    expect(nutritionHtml).toContain('id="nutrition"')
  })

  it('renders all priority links only on the French landing', () => {
    const html = renderLandingAuthoritySections()

    for (const [href, label] of frenchOnlyLinks) {
      expect(html).toContain(`href="${href}"`)
      expect(html).toContain(label)
    }
  })

  it.each(['en', 'de'])('does not expose French-only links on the %s landing', locale => {
    activeLocale = locale
    const html = renderLandingAuthoritySections()

    for (const [href] of frenchOnlyLinks) {
      expect(html).not.toContain(`href="${href}"`)
    }
  })

  it('preserves the existing commercial CTAs and keeps marketing links off the app host', async () => {
    const html = `${renderToStaticMarkup(await Hero())}\n${renderLandingAuthoritySections()}`

    expect(html).toContain('href="/register-client"')
    expect(html.match(/href="#pricing"/g)).toHaveLength(3)
    expect(html).not.toContain('href="https://app.moovx.ch')
  })

  it('targets existing indexed routes', () => {
    const indexedUrls = new Set(sitemap().map(entry => entry.url))

    for (const [href] of frenchOnlyLinks) {
      expect(indexedUrls.has(`https://moovx.ch${href}`)).toBe(true)
    }
  })
})
