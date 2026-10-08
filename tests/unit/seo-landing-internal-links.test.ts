import * as React from 'react'
import { existsSync } from 'node:fs'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import LandingV2 from '@/app/(marketing)/[locale]/landing/components/LandingV2'
vi.stubGlobal('React', React)
const render = (locale: 'fr'|'en'|'de') => renderToStaticMarkup(React.createElement(LandingV2, {locale, trialDays:14}))
describe('Active landing resource links', () => {
  it('renders all protected SEO destinations in the actual French page', () => {
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

    const html = render('fr')
    for (const [target, file] of Object.entries(routeFiles)) {
      expect(html).toContain(`href="${target}"`)
      expect(existsSync(file)).toBe(true)
    }
    expect(html).toContain('href="/fr/programmes/musculation/3-jours"')
  })
  it.each(['en','de'] as const)('does not expose French-only nutrition resources in %s', locale => {
    const html = render(locale)
    for (const path of ['proteines-par-jour','prise-de-masse','perte-de-poids']) {
      expect(html).not.toContain(`href="/fr/nutrition/${path}"`)
    }
    expect(html).not.toContain('id="landing-resources-title"')
  })
  it.each(['fr','en','de'] as const)('preserves commercial links and real navigation targets in %s', locale => {
    const html = render(locale)
    expect(html).toContain('href="https://app.moovx.ch/register-client"')
    for (const match of html.matchAll(/href="#([^"]+)"/g)) expect(html).toContain(`id="${match[1]}"`)
  })
})
