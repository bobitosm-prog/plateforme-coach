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

    expect(resolver).toContain("rpc('get_default_coach_id'")
    expect(resolver).toContain("from('coach_clients').upsert")
    expect(resolver).toContain('client_id: uid')
    expect(resolver).not.toContain('subscription_type')
    expect(resolver).not.toContain('subscription_status')
    expect(resolver).not.toContain('invited_by_coach')
  })
})
