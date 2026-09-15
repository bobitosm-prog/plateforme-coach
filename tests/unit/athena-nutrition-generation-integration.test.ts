import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const route = readFileSync('app/api/generate-meal-plan/route.ts', 'utf8')
const onboarding = readFileSync('app/(application)/onboarding-photo/OnboardingPhotoContent.tsx', 'utf8')

describe('Athena nutrition generation integration', () => {
  it('injects the versioned scientific policy and validates every day', () => {
    expect(route).toContain('buildAthenaScientificPolicyPrompt()')
    expect(route).toContain('validateAthenaNutritionDay')
    expect(route.indexOf('canonicalizeAthenaNutritionDay(parsed')).toBeLessThan(route.indexOf('verifyDayPlan(canonical'))
  })
  it('does not derive nutrition from a body photo', () => {
    expect(route).not.toContain('ai_photo_analysis')
    expect(onboarding).not.toContain('params.ai_photo_analysis')
  })
  it('fails closed instead of returning empty successful days', () => {
    expect(route).not.toContain("plan[day] = { meals: [], totals:")
    expect(route).toContain("type: 'error'")
  })
  it('does not expose provider or internal error details', () => {
    expect(route).not.toContain('detail: message')
    expect(route).not.toContain('error: e.message')
  })
  it('retries one rejected day once, then fails closed', () => {
    expect(route).toContain('attempt <= 2')
    expect(route).toContain('attempt === 2')
    expect(route).toContain('generationFailureCode(error)')
    expect(route).toContain("type: 'error'")
  })
  it('reserves enough output tokens for four complete structured meals', () => {
    expect(route).toContain('max_tokens: 2500')
    expect(route).not.toContain('max_tokens: 1500')
  })
})
