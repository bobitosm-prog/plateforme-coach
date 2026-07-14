import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = process.cwd()
const read = (path: string) => readFileSync(resolve(root, path), 'utf8')

describe('legacy assign-coach removal', () => {
  it('removes the legacy route that accepted browser coach authority', () => {
    expect(existsSync(resolve(root, 'app/api/assign-coach/route.ts'))).toBe(false)
  })

  it('keeps verified invitations token-only', () => {
    const join = read('app/join/JoinPageContent.tsx')
    expect(join).toContain("params.get('token')")
    expect(join).toContain("fetch('/api/coach/invitations/consume'")
    expect(join).not.toContain('/api/assign-coach')
  })

  it('keeps default-coach assignment independent from invitations and subscriptions', () => {
    const dashboard = read('app/hooks/useClientDashboard.ts')
    const resolver = dashboard.slice(
      dashboard.indexOf('async function resolveCoachLink'),
      dashboard.indexOf('/* ── Handlers ── */'),
    )

    expect(resolver).toContain("fetch('/api/coach/default-assignment', { method: 'POST' })")
    expect(resolver).not.toContain("rpc('get_default_coach_id'")
    expect(resolver).not.toMatch(/from\('coach_clients'\)\.(?:insert|upsert|update|delete)/)
    expect(resolver).not.toContain('client_id: uid')
    expect(resolver).not.toContain('subscription_type')
    expect(resolver).not.toContain('subscription_status')
    expect(resolver).not.toContain('invited_by_coach')
  })

  it('keeps browser authority out of the default assignment route', () => {
    const route = read('app/api/coach/default-assignment/route.ts')
    expect(route).toContain('auth.auth.getUser()')
    expect(route).toContain('process.env.DEFAULT_COACH_EMAIL')
    expect(route).not.toContain('NEXT_PUBLIC_COACH_EMAIL')
    expect(route).not.toContain('clientId =')
  })

  it('contains no direct browser mutation of coach_clients', () => {
    const dashboard = read('app/hooks/useClientDashboard.ts')
    const coachSection = read('app/components/tabs/profile/CoachSection.tsx')
    expect(`${dashboard}\n${coachSection}`).not.toMatch(/from\('coach_clients'\)\.(?:insert|upsert|update|delete)/)
    expect(coachSection).toContain("fetch('/api/coach/disconnect', { method: 'POST' })")
  })
})
