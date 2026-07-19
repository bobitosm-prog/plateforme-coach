import type { Json, Tables, Views } from '@/lib/supabase/types'

export const CLIENT_DETAIL_PROFILE_PROJECTION =
  'id,full_name,email,current_weight,start_weight,calorie_goal,created_at,phone,birth_date,gender,height,target_weight,body_fat_pct,objective,status,dietary_type,allergies,liked_foods,meal_preferences,activity_level,tdee,protein_goal,carbs_goal,fat_goal' as const

export type ClientDetailProfile = Pick<Views<'active_related_profiles'>,
  'id' | 'full_name' | 'email' | 'current_weight' | 'start_weight' | 'calorie_goal' | 'created_at' |
  'phone' | 'birth_date' | 'gender' | 'height' | 'target_weight' | 'body_fat_pct' | 'objective' | 'status' |
  'dietary_type' | 'allergies' | 'liked_foods' | 'meal_preferences' | 'activity_level' | 'tdee' |
  'protein_goal' | 'carbs_goal' | 'fat_goal'> & { id: string; created_at: string }

export type ClientDetailWorkoutSession = Pick<Tables<'workout_sessions'>,
  'id' | 'created_at' | 'name' | 'completed' | 'duration_minutes' | 'notes' | 'muscles_worked'> & { created_at: string }
export type ClientDetailWeightLog = Pick<Tables<'weight_logs'>, 'id' | 'poids' | 'date'>
export type ClientDetailMeasurement = Pick<Tables<'body_measurements'>,
  'id' | 'date' | 'chest' | 'waist' | 'hips' | 'biceps' | 'thighs' | 'calves' | 'created_at'>
export type ClientDetailPhoto = Pick<Tables<'progress_photos'>,
  'id' | 'date' | 'photo_url' | 'view_type' | 'created_at' | 'adjustments' | 'ai_analysis' | 'ai_analyzed_at'> & { signedUrl: string | null }

export interface ClientDetailScope {
  readonly coachUserId: string
  readonly clientUserId: string
}

export type ClientDetailLoadFailure =
  | { readonly status: 'anonymous' | 'forbidden' | 'not_found' }
  | { readonly status: 'unavailable'; readonly source: 'identity' | 'relation' | 'profile' | 'training' | 'nutrition' | 'progression' }

export type ClientDetailLoadResult<T> = { readonly status: 'success'; readonly data: T } | ClientDetailLoadFailure
export type ClientDetailMutationResult<T = undefined> =
  | { readonly status: 'success'; readonly data: T }
  | { readonly status: 'failure'; readonly stage: string }

export interface LegacyAssignedMealPlan {
  readonly id: string
  readonly calorie_target?: number | null
  readonly protein_target?: number | null
  readonly carb_target?: number | null
  readonly fat_target?: number | null
  readonly plan: Json
}
