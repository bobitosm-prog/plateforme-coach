import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import DashboardProfileError from '../../app/components/dashboard/DashboardProfileError'
import DashboardServerFallback from '../../app/components/dashboard/DashboardServerFallback'

describe('dashboard shell server-safe states', () => {
  it('renders the initial server fallback', () => {
    const html = renderToStaticMarkup(<DashboardServerFallback />)
    expect(html).toContain('role="status"')
    expect(html).toContain('Chargement de MoovX')
    expect(html).toContain('/logo-moovx-96.png')
  })

  it('renders the recoverable profile error without invoking its callback', () => {
    let retries = 0
    const html = renderToStaticMarkup(<DashboardProfileError onRetry={() => { retries += 1 }} />)
    expect(html).toContain('data-testid="profile-load-error"')
    expect(html).toContain('PROFIL INDISPONIBLE')
    expect(html).toContain('RÉESSAYER')
    expect(retries).toBe(0)
  })
})
