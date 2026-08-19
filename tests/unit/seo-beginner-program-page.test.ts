import { readFileSync } from 'node:fs'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import sitemap from '@/app/sitemap'
import BeginnerProgramPage, {
  dynamicParams,
  generateMetadata,
  generateStaticParams,
} from '@/app/(marketing)/[locale]/programmes/musculation/debutant/page'

const canonical = 'https://moovx.ch/fr/programmes/musculation/debutant'

async function renderPage(locale: string) {
  const element = await BeginnerProgramPage({ params: Promise.resolve({ locale }) })
  return renderToStaticMarkup(element)
}

describe('French beginner training program pillar page', () => {
  it('pre-renders only the authorized French route', () => {
    expect(dynamicParams).toBe(false)
    expect(generateStaticParams()).toEqual([{ locale: 'fr' }])
  })

  it('renders the French page and the complete pedagogical structure', async () => {
    const html = await renderPage('fr')

    expect(html).toContain('<h1')
    for (const heading of [
      'Comment commencer la musculation',
      'Combien de séances par semaine ?',
      'Structure d’un programme débutant',
      'Exemple pédagogique de programme 3 jours',
      'Séries, répétitions et repos',
      'Comment progresser',
      'Erreurs fréquentes',
      'Comment MoovX personnalise un programme',
    ]) {
      expect(html).toContain(heading)
    }
    for (const session of ['Séance A', 'Séance B', 'Séance C']) {
      expect(html).toContain(session)
    }
  })

  it.each(['en', 'de'])('rejects the unavailable %s locale', async locale => {
    await expect(BeginnerProgramPage({ params: Promise.resolve({ locale }) })).rejects.toThrow(/404/)
  })

  it('uses the required FR-only metadata', async () => {
    const metadata = await generateMetadata({ params: Promise.resolve({ locale: 'fr' }) })

    expect(metadata.title).toBe('Programme musculation débutant : plan complet | MoovX')
    expect(metadata.description).toBe('Découvrez comment structurer un programme de musculation débutant, organiser vos séances et progresser selon votre niveau, votre matériel et vos disponibilités.')
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
      name: 'Programme musculation débutant : construire des bases solides',
      inLanguage: 'fr',
      isPartOf: { '@id': 'https://moovx.ch/#website' },
    })
    for (const forbidden of ['FAQPage', 'Review', 'AggregateRating', 'Offer']) {
      expect(JSON.stringify(schema)).not.toContain(forbidden)
    }
  })

  it('integrates all required contextual and conversion links', async () => {
    const html = await renderPage('fr')
    for (const href of [
      '/fr/guides/musculation',
      '/fr/coach-sportif-ia',
      '/fr/blog/combien-de-series-par-semaine-prise-de-muscle',
      '/fr/blog/frequence-entrainement-combien-de-fois-par-semaine',
      'https://app.moovx.ch/register-client',
    ]) {
      expect(html).toContain(`href="${href}"`)
    }
  })

  it('contains no duplicated training logic or forbidden claims', async () => {
    const pageSource = readFileSync('app/(marketing)/[locale]/programmes/musculation/debutant/page.tsx', 'utf8')
    const contentSource = readFileSync('content/training/beginner-program.ts', 'utf8')
    const source = `${pageSource}\n${contentSource}`
    const html = (await renderPage('fr')).toLowerCase()

    expect(source).not.toMatch(/generateProgram|generate-custom-program|adapt-workout|fetch\s*\(|createClient|supabase/)
    for (const forbidden of [
      'progression garantie',
      'transformation garantie',
      'prévention garantie des blessures',
      'programme médicalement sûr pour tous',
      'adaptation autonome permanente',
      'remplacement d’un coach humain',
    ]) {
      expect(html).not.toContain(forbidden)
    }
  })

  it('adds one French-only URL without an artificial lastModified', () => {
    const entries = sitemap()
    const programEntries = entries.filter(entry => entry.url.includes('/programmes/musculation/debutant'))

    expect(entries).toHaveLength(36)
    expect(new Set(entries.map(entry => entry.url)).size).toBe(36)
    expect(programEntries).toHaveLength(1)
    expect(programEntries[0]).toMatchObject({
      url: canonical,
      alternates: { languages: { fr: canonical, 'x-default': canonical } },
    })
    expect(programEntries[0].lastModified).toBeUndefined()
    expect(JSON.stringify(programEntries)).not.toMatch(/\/(en|de)\/programmes\//)
  })
})
