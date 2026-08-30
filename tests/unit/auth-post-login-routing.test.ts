import { describe, expect, it } from 'vitest'
import {
  classifyProfileResult,
  resolvePostAuthDestination,
  type PostAuthProfile,
} from '@/lib/auth/post-auth-routing'

const profile = (overrides: Partial<PostAuthProfile>): PostAuthProfile => ({
  role: 'client',
  onboarding_completed: false,
  created_at: '2026-08-01T00:00:00.000Z',
  ...overrides,
})

describe('post-auth routing contract', () => {
  it('routes completed and incomplete clients from the authoritative completion flag', () => {
    expect(resolvePostAuthDestination({ authenticated: true, profileState: 'ready', profile: profile({ onboarding_completed: true }) })).toMatchObject({ destination: 'client_app', route: '/' })
    expect(resolvePostAuthDestination({ authenticated: true, profileState: 'ready', profile: profile({}) })).toMatchObject({ destination: 'client_onboarding_v2', route: '/onboarding-v2' })
  })

  it('keeps coach completion separate from client completion', () => {
    expect(resolvePostAuthDestination({ authenticated: true, profileState: 'ready', profile: profile({ role: 'coach', coach_onboarding_complete: true, onboarding_completed: false }) })).toMatchObject({ destination: 'coach_app', route: '/' })
    expect(resolvePostAuthDestination({ authenticated: true, profileState: 'ready', profile: profile({ role: 'coach', coach_onboarding_complete: false, onboarding_completed: true }) })).toMatchObject({ destination: 'coach_onboarding', route: '/onboarding-coach' })
  })

  it('distinguishes missing, provider error and null role', () => {
    expect(classifyProfileResult({ data: null, error: { code: 'PGRST116' } }).state).toBe('missing')
    expect(classifyProfileResult({ data: null, error: { code: 'DB_TIMEOUT' } }).state).toBe('error')
    expect(resolvePostAuthDestination({ authenticated: true, profileState: 'missing' }).destination).toBe('profile_missing')
    expect(resolvePostAuthDestination({ authenticated: true, profileState: 'error' }).destination).toBe('profile_error')
    expect(resolvePostAuthDestination({ authenticated: true, profileState: 'ready', profile: profile({ role: null }) }).destination).toBe('role_missing')
  })

  it('gives a validated join intent priority over onboarding/app routing', () => {
    expect(resolvePostAuthDestination({ authenticated: true, profileState: 'error', joinIntent: true })).toEqual({ destination: 'join', route: '/join' })
  })

  it('keeps the legacy photo cutoff aligned in one resolver', () => {
    const base = { role: 'client', onboarding_completed: false, onboarding_completed_at: '2026-04-01', objective: 'mass', full_name: 'Alex' }
    expect(resolvePostAuthDestination({ authenticated: true, profileState: 'ready', profile: profile({ ...base, created_at: '2026-04-02T00:00:00Z' }) }).route).toBe('/')
    expect(resolvePostAuthDestination({ authenticated: true, profileState: 'ready', profile: profile({ ...base, created_at: '2026-04-04T00:00:00Z' }) }).route).toBe('/onboarding-photo')
  })
})
