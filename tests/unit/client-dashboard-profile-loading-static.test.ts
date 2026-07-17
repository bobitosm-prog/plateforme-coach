import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const root = process.cwd()
const hook = fs.readFileSync(path.join(root, 'app/hooks/useClientDashboard.ts'), 'utf8')
const page = fs.readFileSync(path.join(root, 'app/page.tsx'), 'utf8')

describe('useClientDashboard profile loading boundary', () => {
  it('delegates identity, cache ownership, and profile absence to the extracted loader', () => {
    expect(hook).toContain('createSessionProfileLoader({')
    expect(hook).toContain('identityRepository,')
    expect(hook).toContain('profileRepository,')
    expect(hook).toContain('profileLoad.load({')
    expect(hook).not.toContain('profileRepository.findById(uid)')
    expect(hook).not.toContain('isDashboardCacheOwnedBy(')
    expect(hook).not.toMatch(/if \(!profRes\.data\)\s*\{\s*router\.replace\('\/onboarding-v2'\)/)
  })

  it('guards stale, concurrent, and unmounted requests', () => {
    expect(hook).toContain('sessionProfileLoader.begin(uid)')
    expect(hook).toContain('profileLoad.isCurrent()')
    expect(hook).toContain('sessionProfileLoader.mount()')
    expect(hook).toContain('sessionProfileLoader.unmount()')
    expect(hook.indexOf('sessionProfileLoader.mount()')).toBeLessThan(hook.indexOf('supabase.auth.getSession()'))
  })

  it('exposes a full-screen retry boundary before dashboard content', () => {
    expect(page).toContain('data-testid="profile-load-error"')
    expect(page).toContain('onClick={h.retryProfileLoad}')
    expect(page).toContain("h.profileLoadStatus === 'not_found'")
    expect(page.indexOf("h.profileLoadStatus === 'error'")).toBeLessThan(page.indexOf('Coach role → render coach dashboard'))
  })
})
