import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const root = path.resolve(__dirname, '../..')
const read = (file: string) => fs.readFileSync(path.join(root, file), 'utf8')

function sourceInventory(): string {
  const files: string[] = []
  const visit = (directory: string) => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const target = path.join(directory, entry.name)
      if (entry.isDirectory()) visit(target)
      else if (/\.(?:ts|tsx|js)$/.test(entry.name)) files.push(target)
    }
  }
  for (const directory of ['app', 'lib', 'public']) visit(path.join(root, directory))
  return files.map((file) => fs.readFileSync(file, 'utf8')).join('\n')
}

const count = (source: string, pattern: RegExp) => source.match(pattern)?.length ?? 0

describe('current cache inventory guard', () => {
  it('measures the current storage and cache directive baseline', () => {
    const source = sourceInventory()
    expect(count(source, /sessionStorage/g)).toBe(12)
    expect(count(source, /localStorage/g)).toBe(28)
    expect(count(source, /\bcache\.(?:get|set|remove|clearAll)\(/g)).toBe(18)
    expect(count(source, /\bcaches\./g)).toBe(2)
    expect(
      count(
        source,
        /cache:\s*['"]no-store|revalidate\s*=\s*0|dynamic\s*=|Cache-Control.*no-cache|httpEquiv=['"]Cache-Control/g,
      ),
    ).toBe(19)
  })

  it('keeps the client dashboard envelope symmetric and user-checked', () => {
    const dashboard = read('app/hooks/useClientDashboard.ts')
    const dashboardData = read('lib/client-dashboard/use-client-dashboard-data.ts')
    const dashboardSource = `${dashboard}\n${dashboardData}`
    const sessionProfileLoader = read('lib/client-dashboard/session-profile-loader.ts')
    for (const field of [
      'profileData',
      'weightsData',
      'sessData',
      'measureData',
      'photosData',
      'coachProgData',
      'coachMealData',
      'customProgData',
      'sessionDatesData',
      'hasTrainedBeforeVal',
    ]) {
      expect(dashboardSource).toContain(field)
    }
    expect(dashboardData).toContain('ownerUserId: userId')
    expect(sessionProfileLoader).toContain('isDashboardCacheOwnedBy')
    expect(sessionProfileLoader).toContain('identityRepository.getCurrent()')
    expect(dashboardData).toContain('5 * 60 * 1000')
  })

  it('records current gaps without normalizing them into the target contract', () => {
    const join = read('app/join/JoinPageContent.tsx')
    expect(join).toContain("const STORAGE_KEY = 'moovx_coach_invitation'")
    expect(join).toContain('sessionStorage.setItem(STORAGE_KEY, urlToken)')

    const workout = read('app/components/WorkoutSession.tsx')
    expect(workout).toContain("'moovx_workout_draft'")
    expect(read('app/hooks/useClientDashboard.ts')).toContain("'moovx_active_workout'")

    const serviceWorker = read('public/sw.js')
    expect(serviceWorker).toContain('caches.keys()')
    expect(serviceWorker).not.toContain("addEventListener('fetch'")
    expect(serviceWorker).not.toContain('addEventListener("fetch"')
  })

  it('keeps the legacy cache helper session-only with a five-minute default', () => {
    const cache = read('lib/cache.ts')
    expect(cache).toContain("const CACHE_PREFIX = 'moovx_'")
    expect(cache).toContain('ttl: number = 5 * 60 * 1000')
    expect(cache).toContain('sessionStorage')
    expect(cache).not.toContain('ownerUserId')
    expect(cache).not.toContain('keyVersion')
  })
})
