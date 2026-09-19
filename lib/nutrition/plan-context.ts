import { z } from 'zod'
import type { AthenaNutritionRequest } from '@/lib/athena/nutrition-input'
import { normalizeNutritionObjective } from './calorie-macro-targets'

// Optional sibling of the seven day keys. Existing day parsers ignore it.
// Records the request used by the server, not inferred nutrients from the menu.
export const NUTRITION_PLAN_CONTEXT_KEY = '_nutrition_context'
const text = z.string().trim().max(500)
const contextSchema = z.object({
  version: z.literal(1),
  calorie_goal: z.number().finite().positive(), protein_goal: z.number().finite().nonnegative(),
  carbs_goal: z.number().finite().nonnegative(), fat_goal: z.number().finite().nonnegative(),
  dietary_type: text, objective_mode: z.enum(['seche', 'maintien', 'bulk']),
  allergies: z.array(text).max(40), dietary_restrictions: text, disliked_foods: z.array(text).max(40),
})
type PlanContext = z.infer<typeof contextSchema>
function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}
}
const fold = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase()
function canonical(context: PlanContext): PlanContext {
  const diet = fold(context.dietary_type)
  const aliases: Record<string, string> = { vegetarien: 'vegetarian', mediterraneen: 'mediterranean', sans_gluten: 'gluten_free', sans_lactose: 'lactose_free' }
  const sorted = (values: string[]) => [...new Set(values.map(fold).filter(Boolean))].sort()
  return { ...context, dietary_type: aliases[diet] ?? diet, allergies: sorted(context.allergies),
    dietary_restrictions: fold(context.dietary_restrictions), disliked_foods: sorted(context.disliked_foods) }
}

export function createNutritionPlanContext(request: AthenaNutritionRequest): PlanContext {
  // Pick fields explicitly: never persist names, body data, prompts or keys.
  return canonical(contextSchema.parse({ version: 1,
    calorie_goal: request.calorie_goal, protein_goal: request.protein_goal,
    carbs_goal: request.carbs_goal, fat_goal: request.fat_goal,
    dietary_type: request.dietary_type, objective_mode: request.objective_mode,
    allergies: request.allergies, dietary_restrictions: request.dietary_restrictions,
    disliked_foods: request.disliked_foods,
  }))
}

export type NutritionPlanConsistency = 'aligned' | 'outdated' | 'unknown'
/** Informational consistency only; not a safety certification or transaction. */
export function getNutritionPlanConsistency(plan: unknown, profile: unknown): NutritionPlanConsistency {
  const saved = contextSchema.safeParse(record(plan)[NUTRITION_PLAN_CONTEXT_KEY])
  if (!saved.success || !profile) return 'unknown'
  const current = record(profile)
  const preferences = record(current.meal_preferences)
  const objective = normalizeNutritionObjective(typeof current.objective === 'string' ? current.objective : null)
  const parsed = contextSchema.safeParse({ version: 1,
    calorie_goal: current.calorie_goal, protein_goal: current.protein_goal,
    carbs_goal: current.carbs_goal, fat_goal: current.fat_goal,
    dietary_type: current.dietary_type ?? 'omnivore',
    objective_mode: objective === 'cut' ? 'seche' : objective === 'mass' ? 'bulk' : 'maintien',
    allergies: current.allergies ?? [], dietary_restrictions: preferences.dietary_restrictions ?? '',
    disliked_foods: preferences.disliked_foods ?? [],
  })
  if (!parsed.success) return 'unknown'
  return JSON.stringify(canonical(saved.data)) === JSON.stringify(canonical(parsed.data)) ? 'aligned' : 'outdated'
}
