import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const root = process.cwd()
const hook = fs.readFileSync(path.join(root, 'app/hooks/useClientDashboard.ts'), 'utf8')
const page = fs.readFileSync(path.join(root, 'app/page.tsx'), 'utf8')

describe('useClientDashboard profile loading boundary', () => {
  it('uses the profile repository as the only absence decision', () => {
    expect(hook).toContain('profileRepository.findById(uid)')
    expect(hook).toContain("decision.redirectToOnboarding")
    expect(hook).not.toMatch(/if \(!profRes\.data\)\s*\{\s*router\.replace\('\/onboarding-v2'\)/)
  })

  it('guards stale, concurrent, and unmounted requests', () => {
    expect(hook).toContain('profileLoadCoordinator.begin(uid)')
    expect(hook).toContain('profileLoadCoordinator.isCurrent(request)')
    expect(hook).toContain('profileLoadCoordinator.unmount()')
  })

  it('exposes a full-screen retry boundary before dashboard content', () => {
    expect(page).toContain('data-testid="profile-load-error"')
    expect(page).toContain('onClick={h.retryProfileLoad}')
    expect(page).toContain("h.profileLoadStatus === 'not_found'")
    expect(page.indexOf("h.profileLoadStatus === 'error'")).toBeLessThan(page.indexOf('Coach role → render coach dashboard'))
  })
})
