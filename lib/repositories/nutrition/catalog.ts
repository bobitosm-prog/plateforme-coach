import { repositoryFailure, type RepositoryResult } from '@/lib/repositories/result'
import type { DatabaseClient, Tables } from '@/lib/supabase/types'

export const GLOBAL_FOOD_PROJECTION = 'id,name,brand,source,barcode,calories,protein,carbs,fat,serving_size_g,created_at' as const
export const COMMUNITY_FOOD_PROJECTION = 'id,name,brand,barcode,calories_per_100g,protein_per_100g,carbs_per_100g,fat_per_100g,fiber_per_100g,serving_size_g,serving_name,created_by,verified,uses_count,created_at' as const
export const CUSTOM_FOOD_PROJECTION = 'id,user_id,name,barcode,calories,proteins,carbs,fat,image_url,scanned_at,scan_count,created_at' as const

export type GlobalFoodRow = Pick<Tables<'food_items'>,
  'id' | 'name' | 'brand' | 'source' | 'barcode' | 'calories' | 'protein' | 'carbs' | 'fat' | 'serving_size_g' | 'created_at'>
export type CommunityFoodRow = Pick<Tables<'community_foods'>,
  'id' | 'name' | 'brand' | 'barcode' | 'calories_per_100g' | 'protein_per_100g' | 'carbs_per_100g' |
  'fat_per_100g' | 'fiber_per_100g' | 'serving_size_g' | 'serving_name' | 'created_by' | 'verified' |
  'uses_count' | 'created_at'>
export type CustomFoodRow = Pick<Tables<'custom_foods'>,
  'id' | 'user_id' | 'name' | 'barcode' | 'calories' | 'proteins' | 'carbs' | 'fat' | 'image_url' |
  'scanned_at' | 'scan_count' | 'created_at'>

const DEFAULT_LIMIT = 100
const MAX_LIMIT = 500

function boundedLimit(limit: number | undefined): number {
  if (limit === undefined || !Number.isFinite(limit)) return DEFAULT_LIMIT
  return Math.max(1, Math.min(MAX_LIMIT, Math.trunc(limit)))
}

function escapedSearch(search: string | undefined): string | null {
  const value = search?.trim()
  return value ? value.replaceAll('%', '\\%').replaceAll('_', '\\_') : null
}

export function createNutritionCatalogRepository(client: DatabaseClient) {
  return {
    async listGlobalFoods(options: { search?: string; limit?: number } = {}): Promise<RepositoryResult<GlobalFoodRow[]>> {
      let query = client.from('food_items').select(GLOBAL_FOOD_PROJECTION).order('name').limit(boundedLimit(options.limit))
      const search = escapedSearch(options.search)
      if (search) query = query.ilike('name', `%${search}%`)
      const { data, error } = await query
      return error ? repositoryFailure(error) : { ok: true, data: data ?? [] }
    },

    async listCommunityFoods(options: { search?: string; limit?: number } = {}): Promise<RepositoryResult<CommunityFoodRow[]>> {
      let query = client.from('community_foods').select(COMMUNITY_FOOD_PROJECTION)
        .order('uses_count', { ascending: false }).limit(boundedLimit(options.limit))
      const search = escapedSearch(options.search)
      if (search) query = query.ilike('name', `%${search}%`)
      const { data, error } = await query
      return error ? repositoryFailure(error) : { ok: true, data: data ?? [] }
    },

    async findCommunityFoodById(foodId: string): Promise<RepositoryResult<CommunityFoodRow>> {
      const { data, error } = await client.from('community_foods').select(COMMUNITY_FOOD_PROJECTION)
        .eq('id', foodId).maybeSingle()
      if (error) return repositoryFailure(error)
      return data ? { ok: true, data } : { ok: false, kind: 'not_found' }
    },

    async listCustomFoodsForOwner(ownerUserId: string, options: { limit?: number } = {}): Promise<RepositoryResult<CustomFoodRow[]>> {
      const { data, error } = await client.from('custom_foods').select(CUSTOM_FOOD_PROJECTION)
        .eq('user_id', ownerUserId).order('created_at', { ascending: false }).limit(boundedLimit(options.limit))
      return error ? repositoryFailure(error) : { ok: true, data: data ?? [] }
    },

    async findCustomFoodByIdForOwner(foodId: string, ownerUserId: string): Promise<RepositoryResult<CustomFoodRow>> {
      const { data, error } = await client.from('custom_foods').select(CUSTOM_FOOD_PROJECTION)
        .eq('id', foodId).eq('user_id', ownerUserId).maybeSingle()
      if (error) return repositoryFailure(error)
      return data ? { ok: true, data } : { ok: false, kind: 'not_found' }
    },
  }
}

export type NutritionCatalogRepository = ReturnType<typeof createNutritionCatalogRepository>
