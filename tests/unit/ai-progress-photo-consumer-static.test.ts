import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const source = fs.readFileSync(path.join(process.cwd(), 'app/onboarding-photo/OnboardingPhotoContent.tsx'), 'utf8')

describe('progress photo onboarding consumer', () => {
  it('does not treat an HTTP error or missing analysis as a generated analysis', () => {
    expect(source).toContain("if (!res.ok || typeof data.analysis !== 'string' || !data.analysis.trim())")
    expect(source).not.toContain("data.analysis || t('results.analysisUnavailable')")
  })

  it('keeps the visible error state out of downstream meal-plan input', () => {
    expect(source).toContain('generateMealPlan(analysisFailed ? null : analysisText)')
  })
})
