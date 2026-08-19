import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import GuidePage, {
  generateMetadata,
} from '@/app/(marketing)/[locale]/guides/[slug]/page'

async function renderGuide(locale: string, slug: string) {
  const element = await GuidePage({ params: Promise.resolve({ locale, slug }) })
  return renderToStaticMarkup(element)
}

function extractSchema(html: string) {
  const script = html.match(/<script type="application\/ld\+json">(.+?)<\/script>/)?.[1]
  expect(script).toBeTruthy()
  return JSON.parse(script || '{}')
}

describe('Guide internal authority flow', () => {
  it('links the French nutrition guide to the calculator and nutrition pillars', async () => {
    const html = await renderGuide('fr', 'nutrition')

    expect(html).toContain('href="/fr/outils/calculateur-calories-macros"')
    expect(html).toContain('calculer vos calories et vos macros')
    expect(html).toContain('href="/fr/nutrition/proteines-par-jour"')
    expect(html).toContain('estimer combien de protéines consommer par jour')
    expect(html).toContain('href="/fr/nutrition/macros"')
    expect(html).toContain('comprendre comment répartir protéines, glucides et lipides')
    expect(html).toContain('href="/fr/nutrition/repas-sportifs"')
    expect(html).toContain('composer des repas sportifs avant et après l’entraînement')
    expect(html).toContain('href="/fr/nutrition/prise-de-masse"')
    expect(html).toContain('construire une prise de masse progressive')
    expect(html).toContain('href="/fr/nutrition/perte-de-poids"')
    expect(html).toContain('adapter votre alimentation pour une perte de poids progressive')
    expect(html).not.toContain('href="/fr/coach-sportif-ia"')
  })

  it('links the French training guide to the beginner program and AI coach pillars', async () => {
    const html = await renderGuide('fr', 'musculation')

    expect(html).toContain('href="/fr/coach-sportif-ia"')
    expect(html).toContain('découvrir le coach sportif IA MoovX')
    expect(html).toContain('href="/fr/programmes/musculation/debutant"')
    expect(html).toContain('commencer avec un programme de musculation débutant')
    expect(html).toContain('href="/fr/programmes/musculation/3-jours"')
    expect(html).toContain('organiser un programme de musculation sur trois jours')
    expect(html).not.toContain('href="/fr/outils/calculateur-calories-macros"')
    expect(html).not.toContain('href="/fr/nutrition/prise-de-masse"')
    expect(html).not.toContain('href="/fr/nutrition/perte-de-poids"')
  })

  it.each(['en', 'de'])('keeps French-only links out of the unavailable %s guides', async locale => {
    for (const slug of ['nutrition', 'musculation']) {
      await expect(GuidePage({
        params: Promise.resolve({ locale, slug }),
      })).rejects.toThrow(/404/)
    }
  })

  it.each(['nutrition', 'musculation'])('keeps %s metadata unchanged', async slug => {
    const metadata = await generateMetadata({
      params: Promise.resolve({ locale: 'fr', slug }),
    })
    const canonical = `https://moovx.ch/fr/guides/${slug}`

    expect(metadata.alternates).toEqual({
      canonical,
      languages: { fr: canonical, 'x-default': canonical },
    })
    expect(metadata.openGraph).toMatchObject({
      type: 'article',
      url: canonical,
      locale: 'fr_CH',
      siteName: 'MoovX',
    })
  })

  it.each(['nutrition', 'musculation'])('keeps the %s TechArticle schema unchanged', async slug => {
    const schema = extractSchema(await renderGuide('fr', slug))
    const canonical = `https://moovx.ch/fr/guides/${slug}`

    expect(schema).toMatchObject({
      '@context': 'https://schema.org',
      '@type': 'TechArticle',
      '@id': `${canonical}#article`,
      url: canonical,
      mainEntityOfPage: canonical,
      inLanguage: 'fr',
      author: {
        '@type': 'Organization',
        name: 'MoovX',
        url: 'https://moovx.ch',
      },
    })
    expect(JSON.stringify(schema)).not.toContain('/fr/outils/')
    expect(JSON.stringify(schema)).not.toContain('/fr/nutrition/')
    expect(JSON.stringify(schema)).not.toContain('/fr/coach-sportif-ia')
  })
})
