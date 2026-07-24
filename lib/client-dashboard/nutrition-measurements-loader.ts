import { repositoryFailure, type RepositoryErrorKind, type RepositoryResult } from '@/lib/repositories/result'
import type { DatabaseClient, Tables } from '@/lib/supabase/types'
import {
  readLatestCoachMealPlan,
  type CoachMealPlanReadErrorCode,
} from '@/lib/client-dashboard/coach-meal-plan-reader'

export const WEIGHT_HISTORY_PROJECTION = 'date,poids' as const
export const BODY_MEASUREMENTS_PROJECTION = 'id,user_id,date,chest,waist,hips,created_at' as const
export const PROGRESS_PHOTOS_PROJECTION = 'id,user_id,photo_url,view_type,date,adjustments,ai_analysis,ai_analyzed_at,created_at' as const
export const COACH_MEAL_PLAN_PROJECTION = 'plan' as const

export type WeightHistoryRow = Pick<Tables<'weight_logs'>, 'date' | 'poids'>
export type BodyMeasurementRow = Pick<Tables<'body_measurements'>,
  'id' | 'user_id' | 'date' | 'chest' | 'waist' | 'hips' | 'created_at'>
export type ProgressPhotoRow = Tables<'progress_photos'>
export type CoachMealPlanRow = Pick<Tables<'client_meal_plans'>, 'plan'>

type NutritionMeasurementsSource =
  | 'weight_history'
  | 'body_measurements'
  | 'progress_photos'
  | 'coach_meal_plan'

export interface NutritionMeasurementsReaders {
  listWeightHistory(clientUserId: string): Promise<RepositoryResult<WeightHistoryRow[]>>
  listBodyMeasurements(clientUserId: string): Promise<RepositoryResult<BodyMeasurementRow[]>>
  listProgressPhotos(clientUserId: string): Promise<RepositoryResult<ProgressPhotoRow[]>>
  findLatestCoachMealPlan(clientUserId: string): Promise<RepositoryResult<CoachMealPlanRow>>
}

export interface NutritionMeasurementsData {
  weightHistory: WeightHistoryRow[]
  measurements: BodyMeasurementRow[]
  progressPhotos: ProgressPhotoRow[]
  coachMealPlan: CoachMealPlanRow['plan'] | null
}

export type NutritionMeasurementsLoadResult =
  | { ok: true; data: NutritionMeasurementsData }
  | {
    ok: false
    error: {
      kind: RepositoryErrorKind
      sources: NutritionMeasurementsSource[]
      planReason?: CoachMealPlanReadErrorCode
    }
  }

export function createNutritionMeasurementsReaders(client: DatabaseClient): NutritionMeasurementsReaders {
  return {
    async listWeightHistory(clientUserId) {
      const { data, error } = await client.from('weight_logs').select(WEIGHT_HISTORY_PROJECTION)
        .eq('user_id', clientUserId).order('date', { ascending: true }).limit(30)
      return error ? repositoryFailure(error) : { ok: true, data: data ?? [] }
    },

    async listBodyMeasurements(clientUserId) {
      const { data, error } = await client.from('body_measurements').select(BODY_MEASUREMENTS_PROJECTION)
        .eq('user_id', clientUserId).order('date', { ascending: false }).limit(10)
      return error ? repositoryFailure(error) : { ok: true, data: data ?? [] }
    },

    async listProgressPhotos(clientUserId) {
      const { data, error } = await client.from('progress_photos').select(PROGRESS_PHOTOS_PROJECTION)
        .eq('user_id', clientUserId).order('date', { ascending: false }).limit(20)
      return error ? repositoryFailure(error) : { ok: true, data: data ?? [] }
    },

    async findLatestCoachMealPlan(clientUserId) {
      const { data, error } = await client.from('client_meal_plans').select(COACH_MEAL_PLAN_PROJECTION)
        .eq('client_id', clientUserId).order('created_at', { ascending: false }).limit(1).maybeSingle()
      if (error) return repositoryFailure(error)
      return data ? { ok: true, data } : { ok: false, kind: 'not_found' }
    },
  }
}

export function createNutritionMeasurementsLoader(readers: NutritionMeasurementsReaders) {
  return {
    async load(verifiedClientUserId: string): Promise<NutritionMeasurementsLoadResult> {
      const [weights, measurements, photos, mealPlan] = await Promise.all([
        readers.listWeightHistory(verifiedClientUserId),
        readers.listBodyMeasurements(verifiedClientUserId),
        readers.listProgressPhotos(verifiedClientUserId),
        readers.findLatestCoachMealPlan(verifiedClientUserId),
      ])

      const results = [
        ['weight_history', weights],
        ['body_measurements', measurements],
        ['progress_photos', photos],
        ['coach_meal_plan', mealPlan],
      ] as const
      const failures = results.filter((entry): entry is typeof entry & readonly [NutritionMeasurementsSource, { ok: false; kind: 'failure'; error: { kind: RepositoryErrorKind } }] =>
        !entry[1].ok && entry[1].kind === 'failure')
      if (failures.length > 0) {
        return {
          ok: false,
          error: {
            kind: failures.some(([, result]) => result.error.kind === 'unavailable')
              ? 'unavailable'
              : failures[0][1].error.kind,
            sources: failures.map(([source]) => source),
          },
        }
      }

      const coachMealPlan = readLatestCoachMealPlan(mealPlan)
      if (coachMealPlan.status !== 'ready' && coachMealPlan.status !== 'absent') {
        return {
          ok: false,
          error: {
            kind: coachMealPlan.status === 'conflict'
              ? 'conflict'
              : coachMealPlan.status === 'failure'
                ? coachMealPlan.error.repositoryKind ?? 'unexpected'
                : 'unexpected',
            sources: ['coach_meal_plan'],
            planReason: coachMealPlan.error.code,
          },
        }
      }

      return {
        ok: true,
        data: {
          weightHistory: weights.ok ? weights.data : [],
          measurements: measurements.ok ? measurements.data : [],
          progressPhotos: photos.ok ? photos.data : [],
          coachMealPlan: coachMealPlan.status === 'ready' ? coachMealPlan.plan : null,
        },
      }
    },
  }
}

export type NutritionMeasurementsLoader = ReturnType<typeof createNutritionMeasurementsLoader>
