import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import ClientDetailLoading from '../../app/client/[id]/loading'
import CoachLoading from '../../app/coach/loading'

describe('important segment loading states', () => {
  it.each([
    ['coach', CoachLoading, 'Chargement de l’espace coach'],
    ['client-detail', ClientDetailLoading, 'Chargement du suivi client'],
  ] as const)('renders the %s boundary as an accessible server-safe shell', (segment, Loading, label) => {
    const html = renderToStaticMarkup(createElement(Loading))

    expect(html).toContain('role="status"')
    expect(html).toContain('aria-busy="true"')
    expect(html).toContain(`aria-label="${label}"`)
    expect(html).toContain(`data-dashboard-segment-loading="${segment}"`)
    expect(html).toContain('min-height: 100dvh')
    expect(html).toContain('@media (min-width: 1024px)')
    expect(html).not.toContain('animation:')
  })

  it('does not render user identity or invented business values', () => {
    const html = `${renderToStaticMarkup(createElement(CoachLoading))}${renderToStaticMarkup(createElement(ClientDetailLoading))}`
    const visibleMarkup = html.replace(/<style>[\s\S]*?<\/style>/g, '')
    for (const forbidden of ['@', 'kcal', 'kg', 'CHF', 'Bonjour', 'Prénom', 'example.com']) {
      expect(visibleMarkup).not.toContain(forbidden)
    }
  })
})
