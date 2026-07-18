import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const root = process.cwd()
const hook = fs.readFileSync(path.join(root, 'app/hooks/useClientDashboard.ts'), 'utf8')
const dataHook = fs.readFileSync(path.join(root, 'lib/client-dashboard/use-client-dashboard-data.ts'), 'utf8')
const loadingBoundary = `${hook}\n${dataHook}`
const page = fs.readFileSync(path.join(root, 'app/page.tsx'), 'utf8')

describe('useClientDashboard profile loading boundary', () => {
  it('delegates identity, cache ownership, and profile absence to the extracted loader', () => {
    expect(hook).toContain('createSessionProfileLoader({')
    expect(hook).toContain('identityRepository:')
    expect(hook).toContain('profileRepository:')
    expect(dataHook).toContain('profileLoad.load({')
    expect(loadingBoundary).not.toContain('profileRepository.findById(uid)')
    expect(loadingBoundary).not.toContain('isDashboardCacheOwnedBy(')
  })

  it('guards stale, concurrent, and unmounted requests', () => {
    expect(dataHook).toContain('sessionProfileLoader.begin(userId)')
    expect(dataHook).toContain('profileLoad.isCurrent()')
    expect(dataHook).toContain('sessionProfileLoader.mount()')
    expect(dataHook).toContain('sessionProfileLoader.unmount()')
    expect(dataHook.indexOf('sessionProfileLoader.mount()')).toBeLessThan(dataHook.indexOf('supabase.auth.getSession()'))
  })

  it('exposes a full-screen retry boundary before dashboard content', () => {
    expect(page).toContain('data-testid="profile-load-error"')
    expect(page).toContain('onClick={h.retryProfileLoad}')
    expect(page).toContain("h.profileLoadStatus === 'not_found'")
    expect(page.indexOf("h.profileLoadStatus === 'error'")).toBeLessThan(page.indexOf('Coach role → render coach dashboard'))
  })
})
