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

  it('repairs stale macros when a calorie target was edited independently', () => {
    const params = buildMealPlanParams(profile({
      objective: 'mass',
      current_weight: 80,
      calorie_goal: 3000,
      protein_goal: 150,
      carbs_goal: 250,
      fat_goal: 70,
    }))

    expect(params).toMatchObject({
      calorie_goal: 3000,
      protein_goal: 144,
      carbs_goal: 426,
      fat_goal: 80,
    })
  })

  it('repairs a carbohydrate target that contradicts the keto pattern', () => {
    const params = buildMealPlanParams(profile({
      current_weight: 80,
      calorie_goal: 2400,
      protein_goal: 160,
      carbs_goal: 265,
      fat_goal: 78,
      dietary_type: 'keto',
    }))

    expect(params.carbs_goal).toBeLessThanOrEqual(50)
    expect(Math.abs(params.protein_goal * 4 + params.carbs_goal * 4 + params.fat_goal * 9 - params.calorie_goal)).toBeLessThanOrEqual(4)
  })
})
