import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { ClientDetailLoadingView, ClientDetailUnavailableView } from '../../app/client/[id]/components/page/ClientDetailPageStates'

describe('client detail page states', () => {
  it('renders the existing loading skeleton', () => {
    const html = renderToStaticMarkup(<ClientDetailLoadingView />)
    expect(html.match(/class="skeleton"/g)).toHaveLength(6)
  })

  it('renders the unavailable message and wires the back callback', () => {
    const onBack = vi.fn()
    const element = ClientDetailUnavailableView({ message: 'Client introuvable', onBack })
    const html = renderToStaticMarkup(element)
    expect(html).toContain('Client introuvable')
    expect(html).toContain('Retour')
    element.props.children[1].props.onClick()
    expect(onBack).toHaveBeenCalledOnce()
  })
})
