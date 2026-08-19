import { readFileSync } from 'node:fs'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import sitemap from '@/app/sitemap'
import AiCoachPage, {
  dynamicParams,
  generateMetadata,
  generateStaticParams,
} from '@/app/(marketing)/[locale]/coach-sportif-ia/page'

const canonical = 'https://moovx.ch/fr/coach-sportif-ia'

async function renderPage(locale: string) {
  const element = await AiCoachPage({ params: Promise.resolve({ locale }) })
  return renderToStaticMarkup(element)
}

describe('French AI coach pillar page', () => {
  it('pre-renders only the authorized French route', () => {
    expect(dynamicParams).toBe(false)
    expect(generateStaticParams()).toEqual([{ locale: 'fr' }])
  })

  it('renders the French page and all required sections', async () => {
    const html = await renderPage('fr')

    expect(html).toContain('<h1')
    for (const heading of [
      'Qu’est-ce qu’un coach sportif IA ?',
      'Informations utilisées par MoovX',
      'Création d’un entraînement adapté',
      'Suivi, diagnostic et ajustements contrôlés',
      'Nutrition associée',
      'Différence avec un programme générique',
      'Limites de l’IA',
      'Créer un plan MoovX',
    ]) {
      expect(html).toContain(heading)
    }
  })

  it.each(['en', 'de'])('rejects the unavailable %s locale', async locale => {
    await expect(AiCoachPage({ params: Promise.resolve({ locale }) })).rejects.toThrow(/404/)
  })

  it('uses the expected FR-only metadata', async () => {
    const metadata = await generateMetadata({ params: Promise.resolve({ locale: 'fr' }) })

    expect(metadata.title).toBe('Coach sportif IA : programme fitness personnalisé | MoovX')
    expect(metadata.description).toBe('Découvrez comment MoovX utilise l’IA pour créer un programme de fitness selon votre objectif, votre niveau, votre matériel et vos disponibilités.')
    expect(metadata.alternates?.canonical).toBe(canonical)
    expect(metadata.alternates?.languages).toEqual({ fr: canonical, 'x-default': canonical })
    expect(JSON.stringify(metadata.alternates)).not.toMatch(/\/(en|de)\/coach-sportif-ia/)
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
    expect(schema).not.toHaveProperty('about')
    for (const forbidden of ['FAQPage', 'Review', 'AggregateRating', 'Offer']) {
      expect(JSON.stringify(schema)).not.toContain(forbidden)
    }
  })

  it('links to the required existing routes and conversion host', async () => {
    const html = await renderPage('fr')
    for (const href of [
      '/fr/guides/musculation',
      '/fr/guides/nutrition',
      '/fr/outils/calculateur-calories-macros',
      '/fr/nutrition/prise-de-masse',
      'https://app.moovx.ch/register-client',
    ]) {
      expect(html).toContain(`href="${href}"`)
    }
  })

  it('contains no forbidden claims or duplicated AI logic', async () => {
    const pageSource = readFileSync('app/(marketing)/[locale]/coach-sportif-ia/page.tsx', 'utf8')
    const contentSource = readFileSync('content/ai/ai-coach.ts', 'utf8')
    const source = `${pageSource}\n${contentSource}`
    const normalized = source.toLowerCase()

    for (const forbidden of [
      'apprend de vous',
      'comprend tout',
      '24/7',
      'remplace un coach',
      'résultats garantis',
      'évite les blessures',
    ]) {
      expect(normalized).not.toContain(forbidden)
    }
    expect(source).not.toMatch(/@anthropic-ai|generateProgram|generate-custom-program|chat-ai|adapt-workout/)
    expect(source).not.toMatch(/fetch\s*\(|createClient|supabase/)
  })

  it('adds one French-only URL to the sitemap', () => {
    const entries = sitemap()
    const aiCoachEntries = entries.filter(entry => entry.url.includes('/coach-sportif-ia'))

    expect(entries).toHaveLength(38)
    expect(aiCoachEntries).toHaveLength(1)
    expect(aiCoachEntries[0]).toMatchObject({
      url: canonical,
      alternates: { languages: { fr: canonical, 'x-default': canonical } },
    })
    expect(aiCoachEntries[0].lastModified).toBeUndefined()
    expect(JSON.stringify(aiCoachEntries)).not.toMatch(/\/(en|de)\/coach-sportif-ia/)
  })
})
