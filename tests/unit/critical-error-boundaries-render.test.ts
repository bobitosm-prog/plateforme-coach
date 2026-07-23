import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import DomainErrorView from '../../app/components/errors/DomainErrorView'

const BASE_PROPS = {
  description: 'Cette page n’a pas pu être affichée.',
  navigationLabel: 'RETOUR',
  onNavigate: vi.fn(),
  onRetry: vi.fn(),
  resetFailed: false,
  retryLabel: 'RÉESSAYER',
  retrying: false,
  title: 'PAGE INDISPONIBLE',
}

describe('critical domain error presentation', () => {
  it('renders an accessible, responsive and motion-safe public error', () => {
    const html = renderToStaticMarkup(createElement(DomainErrorView, BASE_PROPS))

    expect(html).toContain('role="alert"')
    expect(html).toContain('aria-live="assertive"')
    expect(html).toContain('PAGE INDISPONIBLE')
    expect(html).toContain('RÉESSAYER')
    expect(html).toContain('min-height:100dvh')
    expect(html).toContain('prefers-reduced-motion: reduce')
    expect(html).toContain(':focus-visible')
    expect(BASE_PROPS.onRetry).not.toHaveBeenCalled()
    expect(BASE_PROPS.onNavigate).not.toHaveBeenCalled()
  })

  it('disables retry while reset is locked', () => {
    const html = renderToStaticMarkup(createElement(DomainErrorView, {
      ...BASE_PROPS,
      retrying: true,
    }))

    expect(html).toContain('disabled=""')
    expect(html).toContain('NOUVEL ESSAI…')
  })

  it('shows only a stable public explanation after reset failure', () => {
    const html = renderToStaticMarkup(createElement(DomainErrorView, {
      ...BASE_PROPS,
      resetFailed: true,
    }))

    expect(html).toContain('Le nouvel essai n’a pas abouti.')
    for (const forbidden of ['SQL', 'Supabase', 'stack', 'digest', 'localhost', 'http://', 'UUID']) {
      expect(html).not.toContain(forbidden)
    }
  })
})
