import type { DayPlan } from '@/lib/meal-plan'
import type { AiCancellationSignal, AiProvider } from '@/lib/ai/provider'
import type { AiRecordedTokens } from '@/lib/ai/usage'

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

export interface MealGenerationDayInvocation {
  maxTokens: 1500
  system: string
  user: string
}

export interface MealGenerationRuntime {
  provider: AiProvider
  correlationId: string
  cancellation?: AiCancellationSignal
}

export interface MealGenerationUsage {
  attemptCount: number
  providerModel?: string
  tokens?: AiRecordedTokens
  tokenCompleteness: 'complete' | 'partial' | 'unavailable'
}

export interface MealGenerationResult {
  ok: true
  plan: Record<string, DayPlan>
  partial: boolean
  failedDays: number
  usage: MealGenerationUsage
}
