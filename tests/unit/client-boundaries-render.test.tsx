import { createElement, type ComponentType } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import CoachStyles from '../../app/coach/components/CoachStyles'
import DashboardStyles from '../../app/components/dashboard/DashboardStyles'
import ClientDetailPageStyles from '../../app/client/[id]/components/page/ClientDetailPageStyles'

describe('server-rendered critical route styles', () => {
  it.each([
    ['dashboard', DashboardStyles, 'client-main-scroll'],
    ['coach', CoachStyles, 'bottom-nav-btn'],
    ['client detail', ClientDetailPageStyles, 'desktop-sidebar-client'],
  ] satisfies Array<[string, ComponentType, string]>)('renders %s styles without hydration', (_name, Component, marker) => {
    const html = renderToStaticMarkup(createElement(Component))
    expect(html).toContain('<style>')
    expect(html).toContain(marker)
  })
})
