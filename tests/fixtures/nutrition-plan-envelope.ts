import {
  NUTRITION_PLAN_DAY_KEYS,
  type NutritionPlanEnvelopeV1,
  type NutritionPlanTargetValue,
} from '../../lib/nutrition/plan-envelope'

const UNKNOWN_TARGET: NutritionPlanTargetValue = {
  status: 'unknown',
  value: null,
  provenance: 'legacy_unknown',
}

export function createNutritionPlanEnvelope(
  overrides: Partial<NutritionPlanEnvelopeV1> = {},
): NutritionPlanEnvelopeV1 {
  return {
    schemaVersion: 1,
    documentType: 'nutrition_plan',
    planVersion: 1,
    timezone: 'Europe/Zurich',
    content: {
      days: NUTRITION_PLAN_DAY_KEYS.map(day => ({
        day,
        sourceStatus: 'observed',
        meals: [],
        declaredTotals: null,
      })),
      rules: [],
      alternatives: [],
    },
    targets: {
      energyKcal: { status: 'known', value: 2_000, provenance: 'declared' },
      proteinG: { status: 'known', value: 150, provenance: 'declared' },
      carbsG: UNKNOWN_TARGET,
      fatG: UNKNOWN_TARGET,
      fiberG: UNKNOWN_TARGET,
    },
    totals: {
      declared: { energyKcal: 500, proteinG: 30, carbsG: 50, fatG: 15, fiberG: null },
      calculated: { energyKcal: 490, proteinG: 30, carbsG: 50, fatG: 15, fiberG: null },
      calculationStatus: 'partial',
      calculationVersion: 'nutrition-invariants-v1',
      calculatedAt: '2026-07-24T12:00:00.000Z',
    },
    provenance: {
      source: 'coach',
      sourceVersion: 'manual-v1',
      legacyFormat: null,
      generatedAt: null,
    },
    warnings: [],
    ...overrides,
  }
}

export const LEGACY_AI_WEEK = Object.freeze({
  lundi: {
    repas: {
      dejeuner: [{
        aliment: 'Riz',
        quantite_g: 100,
        kcal: 130,
        proteines: 3,
        glucides: 28,
        lipides: 1,
      }],
    },
    total_kcal: 130,
    total_protein: 3,
    total_carbs: 28,
    total_fat: 1,
  },
  mardi: { repas: {} },
  mercredi: { repas: {} },
  jeudi: { repas: {} },
  vendredi: { repas: {} },
  samedi: { repas: {} },
  dimanche: { repas: {} },
})

export const LEGACY_COACH_WEEK = Object.freeze({
  lundi: {
    meals: [{
      type: 'Déjeuner',
      foods: [{
        name: 'Riz',
        qty: 100,
        kcal: 130,
        prot: 3,
        carb: 28,
        fat: 1,
      }],
    }],
  },
  mardi: { meals: [] },
  mercredi: { meals: [] },
  jeudi: { meals: [] },
  vendredi: { meals: [] },
  samedi: { meals: [] },
  dimanche: { meals: [] },
})
