import { readFileSync } from 'node:fs'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import sitemap from '@/app/sitemap'
import CalorieMacroCalculatorPage, {
  dynamicParams,
  generateMetadata,
  generateStaticParams,
} from '@/app/(marketing)/[locale]/outils/calculateur-calories-macros/page'
import CaloriesMacrosCalculator from '@/app/(marketing)/[locale]/outils/calculateur-calories-macros/CaloriesMacrosCalculator'
import { calculateAutomaticCalorieMacroTargets } from '@/lib/nutrition/calorie-macro-targets'

const canonical = 'https://moovx.ch/fr/outils/calculateur-calories-macros'

async function renderPage(locale: string) {
  const element = await CalorieMacroCalculatorPage({ params: Promise.resolve({ locale }) })
  return renderToStaticMarkup(element)
}

describe('SEO calorie and macro calculator', () => {
  it('pre-renders only the authorized French route', () => {
    expect(dynamicParams).toBe(false)
    expect(generateStaticParams()).toEqual([{ locale: 'fr' }])
  })

  it('renders the French calculator route', async () => {
    const html = await renderPage('fr')

    expect(html).toContain('<h1')
    expect(html).toContain('Calculateur de calories et macros')
    expect(html).toContain('aria-live="polite"')
  })

  it.each(['en', 'de'])('rejects the unavailable %s locale', async locale => {
    await expect(CalorieMacroCalculatorPage({
      params: Promise.resolve({ locale }),
    })).rejects.toThrow(/404/)
  })

  it('uses FR-only canonical metadata', async () => {
    const metadata = await generateMetadata({ params: Promise.resolve({ locale: 'fr' }) })

    expect(metadata.title).toBe('Calculateur calories et macros gratuit | MoovX')
    expect(metadata.alternates?.canonical).toBe(canonical)
    expect(metadata.alternates?.languages).toEqual({
      fr: canonical,
      'x-default': canonical,
    })
    expect(JSON.stringify(metadata.alternates)).not.toMatch(/\/(en|de)\/outils\//)
  })

  it('emits only the authorized WebApplication schema', async () => {
    const html = await renderPage('fr')
    const script = html.match(/<script type="application\/ld\+json">(.+?)<\/script>/)?.[1]
    const schema = JSON.parse(script || '{}')

    expect(schema).toMatchObject({
      '@type': 'WebApplication',
      name: 'Calculateur de calories et macros MoovX',
      url: canonical,
      applicationCategory: 'HealthApplication',
      operatingSystem: 'Web',
      inLanguage: 'fr',
    })
    for (const forbidden of ['FAQPage', 'Review', 'AggregateRating', 'Offer']) {
      expect(JSON.stringify(schema)).not.toContain(forbidden)
    }
  })

  it('renders an accessible local-only form and uses the canonical authority', () => {
    const html = renderToStaticMarkup(createElement(CaloriesMacrosCalculator))
    const expected = calculateAutomaticCalorieMacroTargets({
      gender: 'male',
      age: 30,
      heightCm: 180,
      weightKg: 80,
      activityLevel: 'moderate',
      objective: 'cut',
      calorieAdjustment: -400,
    })

    expect(html).toContain('<form')
    expect(html).not.toContain(' action=')
    expect(html).not.toContain(' method=')
    expect(html).toContain('aria-label="Âge"')
    expect(html).toContain('aria-label="Taille en centimètres"')
    expect(html).toContain('aria-label="Poids en kilogrammes"')
    expect(html).toContain('aria-live="polite"')
    expect(expected).toEqual({
      bmr: 1780,
      tdee: 2759,
      targetCalories: 2359,
      proteinGrams: 192,
      carbsGrams: 249,
      fatGrams: 66,
    })
  })

  it('contains no persistence, network or body-data analytics integration', () => {
    const source = readFileSync(
      'app/(marketing)/[locale]/outils/calculateur-calories-macros/CaloriesMacrosCalculator.tsx',
      'utf8',
    )

    expect(source).toContain('calculateAutomaticCalorieMacroTargets')
    expect(source).toContain('Number.isFinite')
    expect(source.match(/calculateAutomaticCalorieMacroTargets/g)).toHaveLength(2)
    expect(source).not.toMatch(/\bfetch\s*\(/)
    expect(source).not.toMatch(/localStorage|sessionStorage|document\.cookie/)
    expect(source).not.toMatch(/analytics|posthog|gtag|dataLayer|capture\s*\(|track\s*\(/i)
  })

  it('adds one French-only calculator URL to the sitemap', () => {
    const entries = sitemap()
    const calculatorEntries = entries.filter(entry => entry.url.includes('/outils/'))

    expect(entries).toHaveLength(33)
    expect(calculatorEntries).toHaveLength(1)
    expect(calculatorEntries[0]).toMatchObject({
      url: canonical,
      alternates: {
        languages: {
          fr: canonical,
          'x-default': canonical,
        },
      },
    })
    expect(calculatorEntries[0].lastModified).toBeUndefined()
    expect(JSON.stringify(calculatorEntries)).not.toMatch(/\/(en|de)\/outils\//)
  })
})
