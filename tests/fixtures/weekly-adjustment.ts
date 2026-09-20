import { athenaNutritionRequestSchema } from '@/lib/athena/nutrition-input'
import { buildMealPlanParams } from '@/lib/meal-plan/build-generation-params'
import { createNutritionPlanContext } from '@/lib/nutrition/plan-context'
import { DAYS } from '@/lib/meal-plan'
import type { Profile } from '@/lib/profile-service'

export function weeklyFixture() {
  const profile = { id: 'audit', calorie_goal: 2200, protein_goal: 160, carbs_goal: 230, fat_goal: 71,
    current_weight: 80, tdee: 2600, objective: 'cut', dietary_type: 'omnivore', allergies: [], meal_preferences: {},
    onboarding_answers: { sessions_per_week: 6 } } as unknown as Profile
  const food = (aliment: string, quantite_g: number) => ({ aliment, quantite_g, kcal: 0, proteines: 0, glucides: 0, lipides: 0 })
  const day = { repas: {
    petit_dejeuner: [food("Flocons d'avoine secs", 100)],
    dejeuner: [food('Blanc de poulet cuit', 200), food('Riz basmati cuit', 300)],
    collation: [food('Banane', 200), food('Amandes', 50)],
    diner: [food('Lentilles cuites', 300), food("Huile d'olive", 10)],
  } }
  const plan = { ...Object.fromEntries(DAYS.map(key => [key, structuredClone(day)])),
    _nutrition_context: createNutritionPlanContext(athenaNutritionRequestSchema.parse(buildMealPlanParams(profile))) }
  const days = Array.from({ length: 7 }, (_, i) => ({ name: `Day ${i}`, is_rest: i > 2,
    exercises: i > 2 ? [] : [{ name: 'Band row', sets: 3, reps: 12, equipment: 'band', weight: 8 },
      { name: 'Planche', sets: 2, reps: 0, duration_seconds: 35, rest_seconds: 45 }] }))
  return { context: { profile: 'profile-v1', programId: 'program', program: 'v1', mealPlanId: 'meal', mealPlan: 'v1', coachRelation: 'none' },
    profile, program: { id: 'program', days, phases: null }, mealPlan: { id: 'meal', plan_data: plan }, coachManaged: false }
}
