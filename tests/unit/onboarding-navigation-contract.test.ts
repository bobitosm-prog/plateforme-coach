import { describe, expect, it } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const read = (file: string) => fs.readFileSync(path.join(root, file), 'utf8')

describe('onboarding navigation contract', () => {
  const proxy = read('proxy.ts')
  const dashboard = read('app/hooks/useClientDashboard.ts')
  const v2 = read('app/(application)/onboarding-v2/OnboardingV2Content.tsx')
  const fitness = read('app/(application)/onboarding-fitness/OnboardingFitnessContent.tsx')
  const photo = read('app/(application)/onboarding-photo/OnboardingPhotoContent.tsx')
  const coach = read('app/(application)/onboarding-coach/OnboardingCoachContent.tsx')
  const login = read('app/(application)/login/LoginPageContent.tsx')
  const join = read('app/(application)/join/JoinPageContent.tsx')

  it('uses onboarding_completed as the authoritative client completion flag', () => {
    const completed = proxy.indexOf('if (prof.onboarding_completed)')
    const legacyFallback = proxy.indexOf('const V2_MIGRATION_DATE')
    expect(completed).toBeGreaterThan(-1)
    expect(completed).toBeLessThan(legacyFallback)
    expect(proxy.slice(completed, legacyFallback)).not.toContain('custom_programs')
  })

  it('does not classify a profile provider error as incomplete onboarding', () => {
    const errorGuard = dashboard.indexOf("profRes.error && profRes.error.code !== 'PGRST116'")
    const missingRedirect = dashboard.indexOf("if (!profRes.data) { router.replace('/onboarding-v2'); return }")
    expect(errorGuard).toBeGreaterThan(-1)
    expect(errorGuard).toBeLessThan(missingRedirect)
  })

  it('replaces historical onboarding entries instead of stacking a back loop', () => {
    expect(fitness).toContain("window.location.replace('/onboarding')")
    expect(photo.match(/window\.location\.replace\('\/'\)/g)).toHaveLength(2)
    expect(coach).toContain("window.location.replace('/')")
    expect(fitness).not.toContain("window.location.href = '/onboarding'")
    expect(photo).not.toContain("window.location.href = '/'")
  })

  it('keeps modern onboarding success and client/coach auth routing distinct', () => {
    expect(v2).toContain("router.replace('/')")
    expect(login).toContain("role === 'coach' && !profile?.coach_onboarding_complete ? '/onboarding-coach' : '/'")
    expect(join).toContain("router.replace(payload.data?.redirectTo || '/')")
    expect(coach).toContain('coach_onboarding_complete: true')
  })
})
