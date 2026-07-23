import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import DeferredContentFallback from '@/app/components/loading/DeferredContentFallback'
import { hasOpenClientDetailOverlay } from '@/app/client/[id]/components/page/client-detail-overlay-state'

const closed = {
  editOpen: false,
  showExDbModal: false,
  showAiModal: false,
  toast: null,
}

describe('lazy secondary UI boundaries', () => {
  it('renders a compact accessible content fallback', () => {
    const html = renderToStaticMarkup(<DeferredContentFallback />)
    expect(html).toContain('role="status"')
    expect(html).toContain('aria-live="polite"')
    expect(html).toContain('data-deferred-content-fallback')
    expect(html).toContain('Chargement')
  })

  it('renders a geometrically stable overlay fallback', () => {
    const html = renderToStaticMarkup(
      <DeferredContentFallback label="Ouverture…" overlay />,
    )
    expect(html).toContain('position:fixed')
    expect(html).toContain('min-height:100dvh')
    expect(html).toContain('Ouverture')
  })

  it('keeps the detail overlay absent while every trigger is closed', () => {
    expect(hasOpenClientDetailOverlay(closed, null)).toBe(false)
  })

  it.each([
    [{ ...closed, editOpen: true }, null],
    [{ ...closed, showExDbModal: true }, null],
    [{ ...closed, showAiModal: true }, null],
    [{ ...closed, toast: 'Enregistré' }, null],
    [closed, { id: 'template', name: 'Template', program: {} }],
  ] as const)('opens for a real overlay trigger', (state, template) => {
    expect(hasOpenClientDetailOverlay(state, template)).toBe(true)
  })

  it('is deterministic and does not mutate overlay inputs', () => {
    const state = Object.freeze({ ...closed, editOpen: true })
    const before = JSON.stringify(state)
    expect(hasOpenClientDetailOverlay(state, null)).toBe(true)
    expect(JSON.stringify(state)).toBe(before)
  })
})
