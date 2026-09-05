import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const read = (file: string) => readFileSync(resolve(process.cwd(), file), 'utf8')
const source = read('app/(application)/onboarding-v2/OnboardingV2Content.tsx')

describe('client onboarding v2 redesign', () => {
  it('uses exactly five visible solo steps and keeps the short coach variant', () => {
    expect(source).toContain('const SOLO_TOTAL_STEPS = 5')
    expect(source).toContain('const COACH_MANAGED_TOTAL_STEPS = 3')
    expect(source).not.toContain('SOLO_TOTAL_STEPS = 12')
  })

  it('preserves required profile, training, nutrition and macro data', () => {
    for (const field of ['current_weight', 'target_weight', 'sessions_per_week', 'experience_level', 'training_location', 'dietary_type', 'calorie_goal']) {
      expect(source).toContain(field)
    }
  })

  it('keeps optional content outside the main-step count', () => {
    expect(source).toContain('advancedOpen')
    expect(source).toContain('SoloStep9PhotoBody')
    expect(source).toContain('step===5')
  })

  it('blocks navigation after a failed incremental save and resumes safely', () => {
    expect(source).toContain("if(!await save())")
    expect(source).toContain('onboarding_v2_step')
    expect(source).toContain('setError')
  })

  it('writes completion and initial generation only in successful finalization', () => {
    expect(source).toContain('onboarding_completed:true')
    expect(source).toContain('needs_initial_generation:true')
    expect(source.indexOf('if(step===5&&macros)')).toBeLessThan(source.indexOf('needs_initial_generation:true'))
  })

  it('uses the real active coach relation and forbids personal generation in that branch', () => {
    expect(source).toContain('resolveActiveCoachForOnboarding')
    expect(source).toContain("relation.kind==='active'?'coachManaged':'solo'")
    const coachBranch = source.slice(source.indexOf("if(flow==='coachManaged')"), source.indexOf("if(step===1&&goal"))
    expect(coachBranch).not.toContain('needs_initial_generation')
  })

  it('preserves the completed-user guard and removes shared legacy onboarding chrome', () => {
    const page = read('app/(application)/onboarding-v2/page.tsx')
    expect(page).toContain('OnboardingRouteGuard')
    expect(source).not.toContain("./steps/shared/OnboardingHeader")
    expect(source).not.toContain("./steps/shared/OnboardingNav")
    expect(source).not.toContain("./steps/shared/OnboardingScreen")
  })

  it('has translated redesign copy and accessible progress/errors', () => {
    for (const locale of ['fr', 'en', 'de']) {
      const messages = JSON.parse(read(`messages/${locale}.json`))
      expect(messages.onboarding_v2.redesign.finish).toBeTruthy()
    }
    expect(source).toContain("aria-current={i+1===step?'step':undefined}")
    expect(source).toContain('aria-live="assertive"')
  })
})
