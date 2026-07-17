import type { DatabaseClient, Tables } from '@/lib/supabase/types'
import { repositoryFailure, type RepositoryResult } from '@/lib/repositories/result'

export const CATALOG_EXERCISE_PROJECTION = 'id,name,name_en,name_de,muscle_group,equipment,variant_group,description,instructions,tips,video_url,gif_url,created_at' as const
export const CUSTOM_EXERCISE_PROJECTION = 'id,user_id,name,description,muscle_group,equipment,sets,reps,rest_seconds,image_url,is_private,created_at' as const

export type CatalogExerciseRow = Pick<Tables<'exercises_db'>,
  'id' | 'name' | 'name_en' | 'name_de' | 'muscle_group' | 'equipment' | 'variant_group' | 'description' |
  'instructions' | 'tips' | 'video_url' | 'gif_url' | 'created_at'>
export type CustomExerciseRow = Pick<Tables<'custom_exercises'>,
  'id' | 'user_id' | 'name' | 'description' | 'muscle_group' | 'equipment' | 'sets' | 'reps' |
  'rest_seconds' | 'image_url' | 'is_private' | 'created_at'>

const DEFAULT_CATALOG_LIMIT = 200
const MAX_CATALOG_LIMIT = 500

function boundedLimit(limit: number | undefined): number {
  if (limit === undefined) return DEFAULT_CATALOG_LIMIT
  return Math.max(1, Math.min(MAX_CATALOG_LIMIT, Math.trunc(limit)))
}

export function createTrainingExerciseRepository(client: DatabaseClient) {
  return {
    async listCatalogExercises(options: { search?: string; limit?: number } = {}): Promise<RepositoryResult<CatalogExerciseRow[]>> {
      let query = client.from('exercises_db').select(CATALOG_EXERCISE_PROJECTION).order('name').limit(boundedLimit(options.limit))
      const search = options.search?.trim()
      if (search) query = query.ilike('name', `%${search.replaceAll('%', '\\%').replaceAll('_', '\\_')}%`)
      const { data, error } = await query
      return error ? repositoryFailure(error) : { ok: true, data: data ?? [] }
    },

    async findExerciseById(exerciseId: string): Promise<RepositoryResult<CatalogExerciseRow>> {
      const { data, error } = await client.from('exercises_db').select(CATALOG_EXERCISE_PROJECTION)
        .eq('id', exerciseId).maybeSingle()
      if (error) return repositoryFailure(error)
      return data ? { ok: true, data } : { ok: false, kind: 'not_found' }
    },

    async listCustomExercisesForOwner(ownerUserId: string): Promise<RepositoryResult<CustomExerciseRow[]>> {
      const { data, error } = await client.from('custom_exercises').select(CUSTOM_EXERCISE_PROJECTION)
        .eq('user_id', ownerUserId).order('name')
      return error ? repositoryFailure(error) : { ok: true, data: data ?? [] }
    },
  }
}

export type TrainingExerciseRepository = ReturnType<typeof createTrainingExerciseRepository>
