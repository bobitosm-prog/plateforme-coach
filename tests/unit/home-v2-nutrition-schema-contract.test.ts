import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

import { buildHomeViewModel } from '@/lib/home/home-dashboard-model'
import { getHomeDayWindow } from '@/lib/home/home-date'

const hook = readFileSync('app/hooks/useHomeDashboardModel.ts', 'utf8')

describe('Home V2 nutrition schema contract', () => {
  it('uses the canonical meal tracking and personal plan columns', () => {
    expect(hook).toContain(".from('meal_tracking')")
    expect(hook).toContain(".eq('completed', true)")
    expect(hook).not.toContain(".eq('is_completed', true)")

    expect(hook).toContain(".from('meal_plans')")
    expect(hook).toContain(".select('plan')")
    expect(hook).toContain(".eq('active', true)")
    expect(hook).toContain('plan.data?.plan')
    expect(hook).not.toContain(".select('plan_data')")
    expect(hook).not.toContain(".eq('is_active', true)")
    expect(hook).not.toContain('plan.data?.plan_data')
  })

  it('keeps consumed nutrition separate from targets', () => {
    const model = buildHomeViewModel({
      today: getHomeDayWindow(new Date('2026-08-24T12:00:00.000Z')),
      identity: { firstName: 'Test', xp: 0, streak: 0 },
      training: { state: 'empty' },
      nutrition: {
        state: 'ready',
        caloriesConsumed: 840,
        caloriesTarget: 2_200,
        macrosConsumed: { protein: 64, carbs: 92, fat: 25 },
        macrosTarget: { protein: 160, carbs: 240, fat: 72 },
        hasPlan: true,
      },
      coach: { relationStatus: 'not_found' },
      capabilities: { ai: true, training: true, nutrition: true, coachManaged: false },
    })

    expect(model.nutrition.caloriesConsumed).toBe(840)
    expect(model.nutrition.caloriesTarget).toBe(2_200)
    expect(model.nutrition.macrosConsumed.protein).toBe(64)
    expect(model.nutrition.macrosTarget.protein).toBe(160)
  })

  it('does not represent a nutrition read error as zero consumption', () => {
    const model = buildHomeViewModel({
      today: getHomeDayWindow(new Date('2026-08-24T12:00:00.000Z')),
      identity: { firstName: 'Test', xp: 0, streak: 0 },
      training: { state: 'empty' },
      nutrition: {
        caloriesConsumed: 0,
        caloriesTarget: 2_200,
        hasPlan: true,
      },
      coach: { relationStatus: 'not_found' },
      capabilities: { ai: true, training: true, nutrition: true, coachManaged: false },
      errors: { nutrition: 'HOME_NUTRITION_READ_FAILED' },
    })

    expect(model.nutrition.state).toBe('error')
    expect(model.nutrition.caloriesConsumed).toBeNull()
  })
})
