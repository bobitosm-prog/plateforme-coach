import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { resolvePostAuthDestination } from '@/lib/auth/post-auth-routing'

const read = (file: string) => readFileSync(resolve(process.cwd(), file), 'utf8')

describe('direct onboarding route guards', () => {
  const routes = [
    ['onboarding-v2', '/onboarding-v2'],
    ['onboarding-fitness', '/onboarding-fitness'],
    ['onboarding', '/onboarding'],
    ['onboarding-photo', '/onboarding-photo'],
    ['onboarding-coach', '/onboarding-coach'],
  ] as const

  it.each(routes)('wraps /%s with the shared route guard', (folder, route) => {
    const page = read(`app/(application)/${folder}/page.tsx`)
    expect(page).toContain('OnboardingRouteGuard')
    expect(page).toContain(`route="${route}"`)
  })

  it('refuses completed clients and coaches from every onboarding family', () => {
    const client = resolvePostAuthDestination({ authenticated: true, profileState: 'ready', profile: { role: 'client', onboarding_completed: true } })
    const coach = resolvePostAuthDestination({ authenticated: true, profileState: 'ready', profile: { role: 'coach', coach_onboarding_complete: true } })
    expect(client.route).toBe('/')
    expect(coach.route).toBe('/')
    expect(client.route).not.toBe('/onboarding-coach')
    expect(coach.route).not.toMatch(/^\/onboarding(?:-v2|-fitness|-photo)?$/)
  })

  it('never allows a provider error or missing profile to render onboarding', () => {
    const guard = read('components/auth/OnboardingRouteGuard.tsx')
    expect(guard).toContain("result.profileState === 'error'")
    expect(guard).toContain("result.profileState === 'missing'")
    expect(guard.indexOf("setState('error')")).toBeLessThan(guard.indexOf("setState('allowed')"))
  })
})
