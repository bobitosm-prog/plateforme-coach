import { existsSync, readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const selected = [
  'app/coach/loading.tsx',
  'app/client/[id]/loading.tsx',
] as const
const sharedPath = 'app/components/loading/DashboardSegmentLoading.tsx'
const e2ePath = 'e2e/performance-segment-loading.spec.ts'
const sources = Object.fromEntries(
  [...selected, sharedPath].map(path => [path, readFileSync(path, 'utf8')]),
)

describe('segment loading architecture', () => {
  it('adds exactly one boundary to each selected important segment', () => {
    for (const path of selected) {
      expect(existsSync(path), path).toBe(true)
      expect(sources[path].match(/export default function/g), path).toHaveLength(1)
    }
    expect(existsSync('app/loading.tsx')).toBe(false)
  })

  it('keeps auth, onboarding, invitation and localized marketing segments excluded', () => {
    for (const path of [
      'app/login/loading.tsx',
      'app/join/loading.tsx',
      'app/register-client/loading.tsx',
      'app/onboarding/loading.tsx',
      'app/onboarding-coach/loading.tsx',
      'app/onboarding-fitness/loading.tsx',
      'app/onboarding-photo/loading.tsx',
      'app/onboarding-v2/loading.tsx',
      'app/[locale]/loading.tsx',
    ]) expect(existsSync(path), path).toBe(false)
  })

  it('keeps the view server-only and free of data or runtime authority', () => {
    const combined = Object.values(sources).join('\n')
    for (const forbidden of [
      "'use client'", 'useState', 'useEffect', 'useRouter', 'window.', 'document.',
      'localStorage', 'createClient', 'createBrowserClient', 'service_role',
      'supabase', 'repository', "select('*')", 'fetch(', 'DashboardServerFallback',
      'CoachPageContent', 'ClientDetailPageView',
    ]) expect(combined).not.toContain(forbidden)
  })

  it('keeps every loading boundary small and composition-only', () => {
    for (const [path, source] of Object.entries(sources)) {
      expect(source.split('\n').length, path).toBeLessThan(200)
    }
    expect(sources[selected[0]]).toContain('<DashboardSegmentLoading')
    expect(sources[selected[1]]).toContain('<DashboardSegmentLoading')
  })

  it('characterizes completion after navigation, back and unavailable detail', () => {
    const e2e = readFileSync(e2ePath, 'utf8')
    expect(e2e).toContain('page.goBack()')
    expect(e2e).toContain("toHaveCount(0)")
    expect(e2e).toContain('fixture.secondClient.id')
  })
})
