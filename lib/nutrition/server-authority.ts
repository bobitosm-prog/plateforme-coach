import type { SupabaseClient } from '@supabase/supabase-js'
import type { AthenaNutritionRequest } from '@/lib/athena/nutrition-input'
import { athenaNutritionRequestSchema } from '@/lib/athena/nutrition-input'
import { SUPPORTED_NUTRITION_ALLERGENS } from '@/lib/athena/nutrition-output'

export async function applySavedNutritionAuthority(client: SupabaseClient, userId: string, input: AthenaNutritionRequest): Promise<
  { ok: true; params: AthenaNutritionRequest } | { ok: false; status: 409 | 422 | 503 }
> {
  const { data, error } = await client.from('profiles')
    .select('calorie_goal,protein_goal,carbs_goal,fat_goal,dietary_type,allergies,meal_preferences').eq('id', userId).single()
  if (error || !data) return { ok: false, status: 503 }
  if (input.persist_generated_plan && (['calorie_goal', 'protein_goal', 'carbs_goal', 'fat_goal'] as const)
    .some(key => data[key] !== input[key])) return { ok: false, status: 409 }
  if (data.allergies != null && (!Array.isArray(data.allergies) || data.allergies.some((item: unknown) => typeof item !== 'string'))) {
    return { ok: false, status: 422 }
  }
  // Request exclusions may ADD protection, never remove saved allergies.
  const allergies = [...new Set<string>([...(data.allergies ?? []), ...input.allergies].map(value => value.trim().toLowerCase()))]
  if (allergies.some(value => !SUPPORTED_NUTRITION_ALLERGENS.includes(value))) return { ok: false, status: 422 }
  const prefs = data.meal_preferences ?? {}
  if (typeof prefs !== 'object' || Array.isArray(prefs)) return { ok: false, status: 422 }
  const restriction = prefs.dietary_restrictions
  const disliked = prefs.disliked_foods
  if ((restriction != null && typeof restriction !== 'string') ||
    (disliked != null && (!Array.isArray(disliked) || disliked.some((value: unknown) => typeof value !== 'string')))) return { ok: false, status: 422 }
  const validated = athenaNutritionRequestSchema.safeParse({ ...input, allergies,
    dietary_type: data.dietary_type || input.dietary_type,
    dietary_restrictions: [...new Set([restriction, input.dietary_restrictions].filter(Boolean))].join('; '),
    disliked_foods: [...new Set<string>([...(disliked ?? []), ...input.disliked_foods])],
  })
  return validated.success ? { ok: true, params: validated.data } : { ok: false, status: 422 }
}
