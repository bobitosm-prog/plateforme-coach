import type { Json } from '@/lib/supabase/types'

import type { NutritionPlanEnvelopeV1 } from './types'

const FRENCH_DAYS = [
  'lundi',
  'mardi',
  'mercredi',
  'jeudi',
  'vendredi',
  'samedi',
  'dimanche',
] as const

export function isNutritionPlanDisplaySafe(envelope: NutritionPlanEnvelopeV1): boolean {
  return envelope.content.days.every(day => day.meals.every(meal => meal.items.every(item =>
    item.quantity.grams !== null &&
    item.nutrition.energyKcal !== null &&
    item.nutrition.proteinG !== null &&
    item.nutrition.carbsG !== null &&
    item.nutrition.fatG !== null)))
}

export function presentNutritionPlanForLegacyUi(envelope: NutritionPlanEnvelopeV1): Json | null {
  if (!isNutritionPlanDisplaySafe(envelope)) return null
  return Object.fromEntries(envelope.content.days.map((day, dayIndex) => [
    FRENCH_DAYS[dayIndex],
    {
      meals: day.meals.map(meal => ({
        type: meal.type,
        foods: meal.items.map(item => ({
          name: item.label,
          qty: item.quantity.grams,
          kcal: item.nutrition.energyKcal,
          prot: item.nutrition.proteinG,
          carb: item.nutrition.carbsG,
          fat: item.nutrition.fatG,
        })),
      })),
    },
  ])) as Json
}
