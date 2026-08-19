import { existsSync, readFileSync } from 'node:fs'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

const intl = vi.hoisted(() => ({ locale: 'fr' }))

vi.mock('next-intl', () => ({
  useLocale: () => intl.locale,
}))

import LandingContextualLinks, {
  type LandingContextualLinkGroup,
} from '@/app/(marketing)/[locale]/landing/components/LandingContextualLinks'

const groups: LandingContextualLinkGroup[] = ['nutrition', 'training', 'coach']
const expectedTargets = [
  '/fr/outils/calculateur-calories-macros',
  '/fr/guides/nutrition',
  '/fr/nutrition/proteines-par-jour',
  '/fr/nutrition/prise-de-masse',
  '/fr/nutrition/perte-de-poids',
  '/fr/guides/musculation',
  '/fr/programmes/musculation/debutant',
  '/fr/coach-sportif-ia',
]

function renderLinks(locale: string) {
  intl.locale = locale
  return groups
    .map(group => renderToStaticMarkup(createElement(LandingContextualLinks, { group })))
    .join('')
}

describe('Landing internal authority links', () => {
  it('renders the eight contextual SEO links on the French landing', () => {
    const html = renderLinks('fr')

    expect(html.match(/href=/g)).toHaveLength(8)
    for (const target of expectedTargets) {
      expect(html).toContain(`href="${target}"`)
    }
    for (const anchor of [
      'Estimer vos calories et vos macros',
      'Consulter le guide de la nutrition sportive',
      'Comprendre combien de protéines consommer par jour',
      'Construire une prise de masse progressive',
      'Adapter son alimentation pour une perte de poids progressive',
      'Consulter le guide de musculation',
      'Commencer avec un programme de musculation débutant',
      'Découvrir comment fonctionne le coach sportif IA',
    ]) {
      expect(html).toContain(anchor)
    }
  })

  it.each(['en', 'de'])('does not expose French-only links on the %s landing', locale => {
    const html = renderLinks(locale)

    expect(html).toBe('')
    for (const target of expectedTargets) {
      expect(html).not.toContain(target)
    }
  })

  it('mounts each link group in its relevant existing section', () => {
    const sections = {
      NutritionSection: 'nutrition',
      TrainingSection: 'training',
      CoachIaSection: 'coach',
    } as const

    for (const [component, group] of Object.entries(sections)) {
      const source = readFileSync(
        `app/(marketing)/[locale]/landing/components/${component}.tsx`,
        'utf8',
      )
      expect(source).toContain(`<LandingContextualLinks group="${group}" />`)
    }
  })

  it('points only to routes that exist in the App Router', () => {
    const routeFiles: Record<string, string> = {
      '/fr/outils/calculateur-calories-macros': 'app/(marketing)/[locale]/outils/calculateur-calories-macros/page.tsx',
      '/fr/guides/nutrition': 'app/(marketing)/[locale]/guides/[slug]/page.tsx',
      '/fr/nutrition/proteines-par-jour': 'app/(marketing)/[locale]/nutrition/proteines-par-jour/page.tsx',
      '/fr/nutrition/prise-de-masse': 'app/(marketing)/[locale]/nutrition/prise-de-masse/page.tsx',
      '/fr/nutrition/perte-de-poids': 'app/(marketing)/[locale]/nutrition/perte-de-poids/page.tsx',
      '/fr/guides/musculation': 'app/(marketing)/[locale]/guides/[slug]/page.tsx',
      '/fr/programmes/musculation/debutant': 'app/(marketing)/[locale]/programmes/musculation/debutant/page.tsx',
      '/fr/coach-sportif-ia': 'app/(marketing)/[locale]/coach-sportif-ia/page.tsx',
    }

    expect(Object.keys(routeFiles)).toEqual(expectedTargets)
    for (const routeFile of Object.values(routeFiles)) {
      expect(existsSync(routeFile)).toBe(true)
    }
  })

  it('keeps the commercial CTAs and gives the Hero features link a real target', () => {
    const hero = readFileSync('app/(marketing)/[locale]/landing/components/Hero.tsx', 'utf8')
    const landing = readFileSync('app/(marketing)/[locale]/landing/page.tsx', 'utf8')

    expect(hero).toContain('href="/register-client"')
    expect(hero).toContain('href="#features"')
    expect(landing).toContain('id="features"')

    for (const component of ['NutritionSection', 'TrainingSection', 'CoachIaSection']) {
      const source = readFileSync(
        `app/(marketing)/[locale]/landing/components/${component}.tsx`,
        'utf8',
      )
      expect(source).toContain('href="#pricing"')
    }
  })
})
