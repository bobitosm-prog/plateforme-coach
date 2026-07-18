import { repositoryFailure, type RepositoryResult } from '@/lib/repositories/result'
import type { DatabaseClient, Tables } from '@/lib/supabase/types'

export const DAILY_FOOD_LOG_PROJECTION = 'id,user_id,date,meal_type,food_id,custom_name,quantity_g,calories,protein,carbs,fat,created_at' as const
export const LEGACY_MEAL_LOG_PROJECTION = 'id,user_id,logged_at,meal_type,food_name,quantity_g,calories,protein,carbs,fat,created_at' as const
export const MEAL_COMPLETION_PROJECTION = 'id,user_id,date,meal_type,completed,created_at' as const
export const WATER_INTAKE_PROJECTION = 'id,user_id,date,amount_ml,created_at' as const

export type DailyFoodLogRow = Pick<Tables<'daily_food_logs'>,
  'id' | 'user_id' | 'date' | 'meal_type' | 'food_id' | 'custom_name' | 'quantity_g' | 'calories' |
  'protein' | 'carbs' | 'fat' | 'created_at'>
export type LegacyMealLogRow = Pick<Tables<'meal_logs'>,
  'id' | 'user_id' | 'logged_at' | 'meal_type' | 'food_name' | 'quantity_g' | 'calories' | 'protein' |
  'carbs' | 'fat' | 'created_at'>
export type MealCompletionRow = Pick<Tables<'meal_tracking'>,
  'id' | 'user_id' | 'date' | 'meal_type' | 'completed' | 'created_at'>
export type WaterIntakeRow = Pick<Tables<'water_intake'>, 'id' | 'user_id' | 'date' | 'amount_ml' | 'created_at'>

const DEFAULT_LIMIT = 100
const MAX_LIMIT = 500

function boundedLimit(limit: number | undefined): number {
  if (limit === undefined || !Number.isFinite(limit)) return DEFAULT_LIMIT
  return Math.max(1, Math.min(MAX_LIMIT, Math.trunc(limit)))
}

export interface NutritionJournalRange {
  readonly fromDate?: string
  readonly toDate?: string
  readonly limit?: number
}

export function createNutritionJournalRepository(client: DatabaseClient) {
  return {
    async listDailyFoodLogsForOwner(ownerUserId: string, range: NutritionJournalRange = {}): Promise<RepositoryResult<DailyFoodLogRow[]>> {
      let query = client.from('daily_food_logs').select(DAILY_FOOD_LOG_PROJECTION)
        .eq('user_id', ownerUserId).order('date', { ascending: false }).order('created_at', { ascending: false })
      if (range.fromDate) query = query.gte('date', range.fromDate)
      if (range.toDate) query = query.lte('date', range.toDate)
      const { data, error } = await query.limit(boundedLimit(range.limit))
      return error ? repositoryFailure(error) : { ok: true, data: data ?? [] }
    },

    async listLegacyMealLogsForOwner(ownerUserId: string, options: { limit?: number } = {}): Promise<RepositoryResult<LegacyMealLogRow[]>> {
      const { data, error } = await client.from('meal_logs').select(LEGACY_MEAL_LOG_PROJECTION)
        .eq('user_id', ownerUserId).order('logged_at', { ascending: false }).limit(boundedLimit(options.limit))
      return error ? repositoryFailure(error) : { ok: true, data: data ?? [] }
    },

    async listMealCompletionsForOwner(ownerUserId: string, range: NutritionJournalRange = {}): Promise<RepositoryResult<MealCompletionRow[]>> {
      let query = client.from('meal_tracking').select(MEAL_COMPLETION_PROJECTION)
        .eq('user_id', ownerUserId).order('date', { ascending: false })
      if (range.fromDate) query = query.gte('date', range.fromDate)
      if (range.toDate) query = query.lte('date', range.toDate)
      const { data, error } = await query.limit(boundedLimit(range.limit))
      return error ? repositoryFailure(error) : { ok: true, data: data ?? [] }
    },

    async listWaterIntakeForOwner(ownerUserId: string, range: NutritionJournalRange = {}): Promise<RepositoryResult<WaterIntakeRow[]>> {
      let query = client.from('water_intake').select(WATER_INTAKE_PROJECTION)
        .eq('user_id', ownerUserId).order('date', { ascending: false }).order('created_at', { ascending: false })
      if (range.fromDate) query = query.gte('date', range.fromDate)
      if (range.toDate) query = query.lte('date', range.toDate)
      const { data, error } = await query.limit(boundedLimit(range.limit))
      return error ? repositoryFailure(error) : { ok: true, data: data ?? [] }
    },
  }
}

export type NutritionJournalRepository = ReturnType<typeof createNutritionJournalRepository>
