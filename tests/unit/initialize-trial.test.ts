import { describe, expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { initializeTrial } from '@/lib/entitlements/initialize-trial'

describe('initial onboarding trial', () => {
  it.each([
    [{ set: true }, true],
    [{ set: false, reason: 'trial_already_set' }, true],
    [{ set: false, reason: 'already_has_access' }, true],
    [{ set: false, reason: 'not_authenticated' }, false],
    [{ set: false, reason: 'profile_missing' }, false],
    [{ set: false, reason: 'not_eligible' }, false],
    [null, false],
    [{}, false],
  ])('handles RPC result %j', async (data, expected) => {
    const rpc = vi.fn().mockResolvedValue({ data, error: null })
    expect(await initializeTrial({ rpc })).toBe(expected)
    expect(rpc).toHaveBeenCalledWith('set_initial_trial')
  })
  it('fails closed on database and network errors', async () => {
    expect(await initializeTrial({ rpc: vi.fn().mockResolvedValue({ data: { set: true }, error: {} }) })).toBe(false)
    expect(await initializeTrial({ rpc: vi.fn().mockRejectedValue(new Error('offline')) })).toBe(false)
  })
  it('activates before solo completion and leaves the coach branch untouched', () => {
    const source = readFileSync('app/(application)/onboarding-v2/OnboardingV2Content.tsx', 'utf8')
    const solo = source.slice(source.indexOf('if(step===5&&macros)'))
    expect(solo.indexOf('if(!await initializeTrial(supabase))return false')).toBeLessThan(solo.indexOf('onboarding_completed:true'))
    expect(source.slice(source.indexOf("if(flow==='coachManaged')"), source.indexOf('if(step===1&&goal'))).not.toContain('initializeTrial')
  })
})
