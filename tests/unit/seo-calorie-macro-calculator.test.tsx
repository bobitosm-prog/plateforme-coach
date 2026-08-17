import { readFileSync } from 'node:fs'
import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const navigation = vi.hoisted(() => ({ notFound: vi.fn(() => { throw new Error('NEXT_NOT_FOUND') }) }))

vi.mock('next/navigation', () => ({ notFound: navigation.notFound }))

import CalculatorPage, {
  generateMetadata,
  generateStaticParams,
} from '../../app/(marketing)/[locale]/outils/calculateur-calories-macros/page'
import sitemap from '../../app/sitemap'
import { calculateAutomaticCalorieMacroTargets } from '../../lib/nutrition/calorie-macro-targets'

const routeSource = readFileSync(
  'app/(marketing)/[locale]/outils/calculateur-calories-macros/page.tsx',
  'utf8',
)
const calculatorSource = readFileSync(
  'app/(marketing)/[locale]/outils/calculateur-calories-macros/CaloriesMacrosCalculator.tsx',
  'utf8',
)

beforeEach(() => {
  navigation.notFound.mockClear()
})

describe('French calorie and macro calculator SEO page', () => {
  it('statically generates only the French route', () => {
    expect(generateStaticParams()).toEqual([{ locale: 'fr' }])
  })

  it('renders the French route with its accessible form and content', async () => {
    const page = await CalculatorPage({ params: Promise.resolve({ locale: 'fr' }) })
    const html = renderToStaticMarkup(page)

    expect(html).toContain('<h1')
    expect(html).toContain('Calculateur de calories et macros')
    expect(html).toContain('<form')
    expect(html).toContain('Sexe utilisé par la formule')
    expect(html).toContain('Âge')
    expect(html).toContain('Taille (cm)')
    expect(html).toContain('Poids (kg)')
    expect(html).toContain('Niveau d’activité')
    expect(html).toContain('Objectif')
    expect(html).toContain('aria-live="polite"')
    expect(html).toContain('estimé')
    expect(html).toContain('href="/fr/guides/nutrition"')
    expect(html).toContain('href="/fr/guides/musculation"')
    expect(navigation.notFound).not.toHaveBeenCalled()
  })

  it('publishes the exact French-only metadata contract', async () => {
    const metadata = await generateMetadata({ params: Promise.resolve({ locale: 'fr' }) })
    const canonical = 'https://moovx.ch/fr/outils/calculateur-calories-macros'

    expect(metadata.title).toBe('Calculateur calories et macros gratuit | MoovX')
    expect(metadata.description).toBe('Estimez vos calories de maintien et vos macros selon votre poids, votre activité et votre objectif : perte de poids, maintien ou prise de muscle.')
    expect(metadata.alternates).toEqual({
      canonical,
      languages: { fr: canonical, 'x-default': canonical },
    })
    expect(metadata.alternates?.languages).not.toHaveProperty('en')
    expect(metadata.alternates?.languages).not.toHaveProperty('de')
    expect(metadata.openGraph).toMatchObject({
      type: 'website',
      url: canonical,
      locale: 'fr_CH',
      images: [{ url: 'https://moovx.ch/og-image.jpg', width: 1200, height: 630 }],
    })
    expect(metadata.twitter).toMatchObject({
      card: 'summary_large_image',
      images: [{ url: 'https://moovx.ch/og-image.jpg' }],
    })
    expect(JSON.stringify(metadata)).not.toContain('app.moovx.ch')
  })

  it('is discoverable once in the sitemap without invented translations or dates', () => {
    const canonical = 'https://moovx.ch/fr/outils/calculateur-calories-macros'
    const calculatorEntries = sitemap().filter(entry => entry.url.includes('/outils/calculateur-calories-macros'))

    expect(calculatorEntries).toEqual([{
      url: canonical,
      changeFrequency: 'monthly',
      priority: 0.9,
      alternates: {
        languages: { fr: canonical, 'x-default': canonical },
      },
    }])
  })

  it.each(['en', 'de'])('returns the untranslated %s route as unavailable', async locale => {
    const metadata = await generateMetadata({ params: Promise.resolve({ locale }) })

    expect(metadata.robots).toEqual({ index: false, follow: false })
    await expect(CalculatorPage({ params: Promise.resolve({ locale }) }))
      .rejects.toThrow('NEXT_NOT_FOUND')
  })

  it('uses the canonical calculator for both the form and the fictitious example', async () => {
    const expected = calculateAutomaticCalorieMacroTargets({
      gender: 'male',
      age: 32,
      height: 178,
      weight: 82,
      activityLevel: 'moderate',
      objective: 'maintain',
    })
    const page = await CalculatorPage({ params: Promise.resolve({ locale: 'fr' }) })
    const html = renderToStaticMarkup(page)

    expect(routeSource).toContain("from '@/lib/nutrition/calorie-macro-targets'")
    expect(calculatorSource).toContain("from '@/lib/nutrition/calorie-macro-targets'")
    expect(calculatorSource).toContain('calculateAutomaticCalorieMacroTargets({')
    expect(html).toContain(`${expected.tdee}`)
    expect(html).toContain(`${expected.protein}`)
    expect(html).toContain(`${expected.carbs}`)
    expect(html).toContain(`${expected.fat}`)
  })

  it('keeps the calculator local, private and free of a second formula', () => {
    expect(calculatorSource).not.toMatch(/fetch\(|axios|localStorage|sessionStorage|document\.cookie/)
    expect(calculatorSource).not.toMatch(/analytics|track\(/i)
    expect(calculatorSource).not.toMatch(/URLSearchParams|window\.location|history\.(pushState|replaceState)/)
    expect(calculatorSource).not.toMatch(/10\s*\*\s*weight|6\.25\s*\*\s*height/)
    expect(routeSource).not.toMatch(/FAQPage|AggregateRating|Review/)
  })

  it('publishes one restrained WebApplication schema', async () => {
    const page = await CalculatorPage({ params: Promise.resolve({ locale: 'fr' }) })
    const html = renderToStaticMarkup(page)

    expect(html.match(/type="application\/ld\+json"/g)).toHaveLength(1)
    expect(html).toContain('"@type":"WebApplication"')
    expect(html).toContain('"isAccessibleForFree":true')
    expect(html).not.toMatch(/FAQPage|AggregateRating|Review/)
  })
})
