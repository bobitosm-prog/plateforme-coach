import { existsSync, readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const page = readFileSync('app/page.tsx', 'utf8')
const clientPath = 'app/components/dashboard/DashboardClientIsland.tsx'
const client = existsSync(clientPath) ? readFileSync(clientPath, 'utf8') : page
const profileError = existsSync('app/components/dashboard/DashboardProfileError.tsx')
  ? readFileSync('app/components/dashboard/DashboardProfileError.tsx', 'utf8')
  : client
const coach = readFileSync('app/coach/components/CoachPageContent.tsx', 'utf8')
const dashboardData = readFileSync('lib/client-dashboard/use-client-dashboard-data.ts', 'utf8')

describe('root dashboard characterization', () => {
  it('preserves the initial loading and anonymous navigation states', () => {
    expect(client).toContain('!h.mounted || h.loading')
    expect(client).toContain("h.router.push('/login')")
    expect(client.indexOf('!h.mounted || h.loading')).toBeLessThan(client.indexOf("h.router.push('/login')"))
  })

  it('keeps profile failure distinct from confirmed absence', () => {
    expect(client).toContain("h.profileLoadStatus === 'error'")
    expect(profileError).toContain('data-testid="profile-load-error"')
    expect(client).toContain('onRetry={h.retryProfileLoad}')
    expect(client).toContain("h.profileLoadStatus === 'not_found'")
    expect(client.indexOf("h.profileLoadStatus === 'error'")).toBeLessThan(client.indexOf("h.profileLoadStatus === 'not_found'"))
  })

  it('routes coach and client rendering without changing the coach contract', () => {
    expect(client).toContain("h.userRole === 'coach'")
    expect(client).toContain('<CoachDashboard initialSession={h.session} />')
    expect(client).toContain('if (isDesktop && h.profile)')
    expect(coach).toContain('initialSession?: Session | null')
    expect(coach).toContain('useCoachDashboard(initialSession)')
  })

  it('retains owner-scoped, stale-safe profile loading in one client authority', () => {
    expect(client).toContain('useClientDashboard()')
    expect(dashboardData).toContain('sessionProfileLoader.begin(userId)')
    expect(dashboardData).toContain('profileLoad.isCurrent()')
    expect(dashboardData).toContain('sessionProfileLoader.mount()')
    expect(dashboardData).toContain('sessionProfileLoader.unmount()')
    expect(dashboardData).toContain('ownerUserId: userId')
  })

  it('does not grant authority from root page props or serialize credentials', () => {
    expect(page).not.toMatch(/export default function \w+\s*\([^)]*(userId|role|email|session)/)
    for (const source of [page, client]) {
      expect(source).not.toContain('access_token')
      expect(source).not.toContain('refresh_token')
      expect(source).not.toContain('service_role')
      expect(source).not.toContain("select('*')")
    }
  })
})
