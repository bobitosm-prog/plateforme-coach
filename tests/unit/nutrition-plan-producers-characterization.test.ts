import { describe, expect, it } from 'vitest'

import {
  COACH_AI_PERSONAL_PLAN_PAYLOAD,
  COACH_ASSIGNED_PLAN_PAYLOAD,
  PERSONAL_DIAGNOSTIC_PLAN_PAYLOAD,
  PERSONAL_GENERATED_PLAN_PAYLOAD,
  SELF_ASSIGNED_PLAN_PAYLOAD,
  SEVEN_FRENCH_DAYS,
} from '../fixtures/nutrition-plan-producers'
import { computeDayTotals, parseMealPlan } from '../../lib/meal-plan'

describe('Nutrition plan producer payloads', () => {
  it('freezes the personal generation payload', () => {
    expect(PERSONAL_GENERATED_PLAN_PAYLOAD).toEqual({
      user_id: 'owner-id',
      plan_data: { lundi: { repas: {} } },
      is_active: true,
    })
  })

  it('keeps diagnostic and coach-AI declared totals separate from plan_data', () => {
    expect(PERSONAL_DIAGNOSTIC_PLAN_PAYLOAD.total_calories).toBe(500)
    expect(PERSONAL_DIAGNOSTIC_PLAN_PAYLOAD.plan_data.lundi.total_kcal).toBe(600)
    expect(COACH_AI_PERSONAL_PLAN_PAYLOAD).toMatchObject({
      user_id: 'client-id',
      created_by: 'coach-id',
      total_calories: 500,
      plan_data: { lundi: { total_kcal: 600 } },
      is_active: true,
    })
  })

  it('freezes coach assignment targets outside the plan JSON', () => {
    expect(COACH_ASSIGNED_PLAN_PAYLOAD).toEqual({
      coach_id: 'coach-id',
      client_id: 'client-id',
      week_start: '2026-07-20',
      calorie_target: 2_000,
      protein_target: 150,
      carb_target: 220,
      fat_target: 70,
      plan: { lundi: { meals: [] } },
      updated_at: '2026-07-24T00:00:00.000Z',
    })
  })

  it('freezes self-assigned generated plan payloads without invented coach authority', () => {
    expect(SELF_ASSIGNED_PLAN_PAYLOAD).toEqual({
      client_id: 'client-id',
      plan: { lundi: { repas: {} } },
      created_at: '2026-07-24T00:00:00.000Z',
    })
  })
})

describe('Nutrition plan consumer formats', () => {
  it('reads coach meals and AI repas without merging their persisted contracts', () => {
    const coach = parseMealPlan({
      lundi: { meals: [{ type: 'Déjeuner', foods: [{ name: 'Riz', qty: 100, kcal: 130, prot: 3, carb: 28, fat: 1 }] }] },
    })
    const ai = parseMealPlan({
      lundi: { repas: { dejeuner: [{ aliment: 'Riz', quantite_g: 100, kcal: 130, proteines: 3, glucides: 28, lipides: 1 }] } },
    })
    expect(coach.lundi?.meals[0].foods[0]).toEqual(ai.lundi?.meals[1].foods[0])
    expect(coach.lundi?.totals).toBeUndefined()
    expect(ai.lundi?.totals).toBeUndefined()
  })

  it('preserves an explicit zero total and distinguishes an absent total', () => {
    const explicitZero = parseMealPlan({
      lundi: { repas: {}, total_kcal: 0, total_protein: 0, total_carbs: 0, total_fat: 0 },
    }).lundi
    expect(explicitZero?.meals).toHaveLength(4)
    expect(explicitZero?.totals).toEqual({ kcal: 0, prot: 0, carb: 0, fat: 0 })
    const withMeal = {
      repas: { dejeuner: [{ aliment: 'Eau', quantite_g: 100, kcal: 0, proteines: 0, glucides: 0, lipides: 0 }] },
    }
    expect(parseMealPlan({ lundi: { ...withMeal, total_kcal: 0 } }).lundi?.totals)
      .toEqual({ kcal: 0, prot: 0, carb: 0, fat: 0 })
    expect(parseMealPlan({ lundi: withMeal }).lundi?.totals).toBeUndefined()
  })

  it('keeps declared divergent totals visible beside recalculated foods', () => {
    const plan = parseMealPlan({
      lundi: {
        repas: {
          dejeuner: [{ aliment: 'Synthétique', quantite_g: 100, kcal: 500, proteines: 20, glucides: 50, lipides: 20 }],
        },
        total_kcal: 600,
        total_protein: 20,
        total_carbs: 50,
        total_fat: 20,
      },
    })
    expect(plan.lundi?.totals?.kcal).toBe(600)
    expect(computeDayTotals(plan.lundi!)).toEqual({ kcal: 500, prot: 20, carb: 50, fat: 20 })
  })

  it('characterizes incomplete elements and silent legacy aliases', () => {
    const plan = parseMealPlan({
      lundi: {
        repas: {
          dejeuner: [
            { aliment: 'Singulier', calories: 100, protein: 4, fat: 2 },
            { aliment: 'Pluriel', calories: 100, proteins: 5, fats: 3 },
          ],
        },
      },
    })
    expect(computeDayTotals(plan.lundi!)).toEqual({ kcal: 200, prot: 9, carb: 0, fat: 5 })
  })

  it('accepts seven French days and omits empty days', () => {
    const raw = Object.fromEntries(SEVEN_FRENCH_DAYS.map(day => [
      day,
      { repas: { dejeuner: [{ aliment: day, quantite_g: 100, kcal: 1, proteines: 0, glucides: 0, lipides: 0 }] } },
    ]))
    expect(Object.keys(parseMealPlan(raw))).toEqual(SEVEN_FRENCH_DAYS)
    expect(parseMealPlan({ lundi: { meals: [] }, monday: { meals: [{ type: 'Déjeuner', foods: [] }] } }))
      .toEqual({})
  })
})
