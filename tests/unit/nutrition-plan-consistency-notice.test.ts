// @vitest-environment jsdom
import * as React from 'react'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { athenaNutritionRequestSchema } from '@/lib/athena/nutrition-input'
import { createNutritionPlanContext } from '@/lib/nutrition/plan-context'
vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }))
import NutritionPlanConsistencyNotice from '@/app/components/nutrition-v2/NutritionPlanConsistencyNotice'
afterEach(() => { cleanup(); vi.unstubAllGlobals() })
const profile = { calorie_goal: 2200, protein_goal: 150, carbs_goal: 250, fat_goal: 70 }
const plan = { _nutrition_context: createNutritionPlanContext(athenaNutritionRequestSchema.parse(profile)) }
describe('plan consistency notice', () => {
  it('changes from aligned to outdated when profile targets change without replacing the plan', () => {
    vi.stubGlobal('React', React)
    const view = render(React.createElement(NutritionPlanConsistencyNotice, { plan, profile, source: 'personal' }))
    expect(screen.queryByRole('status')).toBeNull()
    view.rerender(React.createElement(NutritionPlanConsistencyNotice, { plan, profile: { ...profile, calorie_goal: 2400 }, source: 'personal' }))
    expect(screen.getByRole('status').textContent).toBe('outdated')
  })
  it('shows an explicit unknown state for an older personal plan', () => {
    vi.stubGlobal('React', React)
    render(React.createElement(NutritionPlanConsistencyNotice, { plan: { lundi: {} }, profile, source: 'personal' }))
    expect(screen.getByRole('status').textContent).toBe('unknown')
  })
  it('does not assess a coach plan using personal profile targets', () => {
    vi.stubGlobal('React', React)
    render(React.createElement(NutritionPlanConsistencyNotice, { plan, profile: { ...profile, calorie_goal: 2400 }, source: 'coach' }))
    expect(screen.queryByRole('status')).toBeNull()
  })
})
