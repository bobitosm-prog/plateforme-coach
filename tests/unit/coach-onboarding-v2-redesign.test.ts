import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { resolvePostAuthDestination } from '@/lib/auth/post-auth-routing'

const read = (file: string) => readFileSync(resolve(process.cwd(), file), 'utf8')
const source = read('app/(application)/onboarding-coach/OnboardingCoachContent.tsx')

describe('coach onboarding v2 redesign', () => {
  it('uses exactly four visible steps with persisted resume state', () => {
    expect(source).toContain('const TOTAL_STEPS = 4')
    expect(source).toContain('coach_onboarding_step')
    expect(source).toContain('Math.min(TOTAL_STEPS')
  })

  it('requires a successful save before advancing', () => {
    expect(source).toContain("if (!await saveCurrentStep())")
    expect(source).toContain("setError(t('redesign.errors.save'))")
  })

  it('keeps Stripe optional and a provider failure recoverable', () => {
    expect(source).toContain("if (step === 3) return update({}, resume)")
    expect(source).toContain('setStripeError')
    expect(source).toContain("t('redesign.stripe.skip')")
  })

  it('confirms final completion before redirecting', () => {
    const finalize = source.indexOf('async function finalize()')
    const completion = source.indexOf('coach_onboarding_complete: true', finalize)
    const reread = source.indexOf("select('role,coach_onboarding_complete')", completion)
    const redirect = source.indexOf("router.replace('/')", reread)
    expect(finalize).toBeGreaterThan(-1)
    expect(completion).toBeGreaterThan(finalize)
    expect(reread).toBeGreaterThan(completion)
    expect(redirect).toBeGreaterThan(reread)
  })

  it('cannot bypass completion through an invitation CTA', () => {
    expect(source).not.toContain("router.push('/coach')")
    expect(source).not.toContain('inviteTitle')
    expect(source).not.toContain("rpc('set_role'")
  })

  it('rejects clients and missing roles through the existing 6B guard', () => {
    expect(resolvePostAuthDestination({ authenticated: true, profileState: 'ready', profile: { role: 'client', onboarding_completed: false, created_at: '2026-08-01' } }).route).not.toBe('/onboarding-coach')
    expect(resolvePostAuthDestination({ authenticated: true, profileState: 'ready', profile: { role: null } }).destination).toBe('role_missing')
    expect(source).toContain("profile.role !== 'coach'")
  })

  it('preserves the completed coach guard and summary edit return', () => {
    expect(source).toContain('profile.coach_onboarding_complete')
    expect(source).toContain('editingFromSummary')
    expect(source).toContain('setStep(TOTAL_STEPS)')
  })

  it('provides FR/EN/DE copy and accessibility semantics', () => {
    for (const locale of ['fr', 'en', 'de']) {
      const messages = JSON.parse(read(`messages/${locale}.json`))
      expect(messages.auth.onboardingCoach.redesign.finish).toBeTruthy()
    }
    expect(source).toContain("aria-current={index + 1 === step ? 'step' : undefined}")
    expect(source).toContain('aria-live="assertive"')
    expect(source).toContain('htmlFor={id}')
    expect(source).toContain('aria-pressed={selected.includes(option)}')
  })
})
