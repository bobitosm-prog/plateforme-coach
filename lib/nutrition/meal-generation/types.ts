import type { DayPlan } from '@/lib/meal-plan'

export interface MealGenerationParams {
  calorie_goal: number
  protein_goal: number
  carbs_goal: number
  fat_goal: number
  dietary_type?: string
  allergies?: string[]
  disliked_foods?: string[]
  objective_mode?: string
  caloric_adjustment?: number
  tdee?: number
  activity_level?: string
  ai_photo_analysis?: string
  available_foods?: Array<{ nom: string; kcal: number; p: number; g: number; l: number }>
  scanned_foods?: Array<{ name: string; brand?: string; calories?: number; proteins?: number; carbs?: number; fat?: number }>
  meal_food_names?: Partial<Record<'morning' | 'lunch' | 'snack' | 'dinner', string[]>>
}

export interface MealGenerationProviderRequest {
  model: 'claude-opus-4-8'
  maxTokens: 1500
  system: string
  user: string
}

export type MealGenerationProviderResult =
  | { ok: true; text: string }
  | { ok: false; reason: 'PROVIDER_RATE_LIMITED' | 'PROVIDER_TIMEOUT' | 'PROVIDER_UNAVAILABLE' | 'PROVIDER_INVALID_RESPONSE' }

export interface MealGenerationProvider {
  generate(request: MealGenerationProviderRequest): Promise<MealGenerationProviderResult>
}

export interface MealGenerationResult {
  ok: true
  plan: Record<string, DayPlan>
  partial: boolean
  failedDays: number
}
