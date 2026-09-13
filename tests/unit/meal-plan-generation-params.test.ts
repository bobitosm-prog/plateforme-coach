import { describe, expect, it } from 'vitest'
import { buildMealPlanParams } from '@/lib/meal-plan/build-generation-params'
import type { Profile } from '@/lib/profile-service'

function profile(overrides: Partial<Profile> = {}): Profile {
  return {
    id: 'user-a',
    objective: 'maintain',
    calorie_goal: 2200,
    protein_goal: 150,
    carbs_goal: 250,
    fat_goal: 70,
    tdee: 2200,
    ...overrides,
  }
}

describe('meal plan generation parameters', () => {
  it('maps the canonical mass objective to bulk', () => {
    const params = buildMealPlanParams(profile({ objective: 'mass', calorie_goal: 2500 }))

    expect(params.objective_mode).toBe('bulk')
    expect(params.caloric_adjustment).toBe(300)
  })

  it('passes dietary pattern and declared restrictions separately', () => {
    const params = buildMealPlanParams(profile({
      dietary_type: 'vegetarian',
      allergies: ['peanut'],
      meal_preferences: {
        dietary_restrictions: 'Sans lactose',
        disliked_foods: ['champignons'],
      },
    }))

    expect(params.dietary_type).toBe('vegetarian')
    expect(params.allergies).toEqual(['peanut'])
    expect(params.dietary_restrictions).toBe('Sans lactose')
    expect(params.disliked_foods).toEqual(['champignons'])
  })

  it('bounds free-text restrictions before sending them to generation', () => {
    const params = buildMealPlanParams(profile({
      meal_preferences: { dietary_restrictions: `  ${'x'.repeat(600)}  ` },
    }))

    expect(params.dietary_restrictions).toHaveLength(500)
  })
})
