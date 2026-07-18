import { repositoryFailure, type RepositoryResult } from '@/lib/repositories/result'
import type { DatabaseClient, Tables } from '@/lib/supabase/types'

export const RECIPE_PROJECTION = 'id,user_id,title,description,category,prep_time_min,cook_time_min,servings,calories_per_serving,proteins_per_serving,carbs_per_serving,fat_per_serving,ingredients,instructions,tags,image_url,is_favorite,is_public,source,created_at' as const
export const SAVED_MEAL_PROJECTION = 'id,user_id,name,meal_type,foods,total_calories,total_protein,total_carbs,total_fat,created_at' as const

export type RecipeRow = Pick<Tables<'recipes'>,
  'id' | 'user_id' | 'title' | 'description' | 'category' | 'prep_time_min' | 'cook_time_min' | 'servings' |
  'calories_per_serving' | 'proteins_per_serving' | 'carbs_per_serving' | 'fat_per_serving' | 'ingredients' |
  'instructions' | 'tags' | 'image_url' | 'is_favorite' | 'is_public' | 'source' | 'created_at'>
export type SavedMealRow = Pick<Tables<'saved_meals'>,
  'id' | 'user_id' | 'name' | 'meal_type' | 'foods' | 'total_calories' | 'total_protein' | 'total_carbs' |
  'total_fat' | 'created_at'>

const DEFAULT_LIMIT = 50
const MAX_LIMIT = 200

function boundedLimit(limit: number | undefined): number {
  if (limit === undefined || !Number.isFinite(limit)) return DEFAULT_LIMIT
  return Math.max(1, Math.min(MAX_LIMIT, Math.trunc(limit)))
}

export function createNutritionRecipeRepository(client: DatabaseClient) {
  return {
    async listRecipesForOwner(ownerUserId: string, options: { limit?: number } = {}): Promise<RepositoryResult<RecipeRow[]>> {
      const { data, error } = await client.from('recipes').select(RECIPE_PROJECTION)
        .eq('user_id', ownerUserId).order('created_at', { ascending: false }).limit(boundedLimit(options.limit))
      return error ? repositoryFailure(error) : { ok: true, data: data ?? [] }
    },

    async listPublicRecipes(options: { limit?: number } = {}): Promise<RepositoryResult<RecipeRow[]>> {
      const { data, error } = await client.from('recipes').select(RECIPE_PROJECTION)
        .eq('is_public', true).order('created_at', { ascending: false }).limit(boundedLimit(options.limit))
      return error ? repositoryFailure(error) : { ok: true, data: data ?? [] }
    },

    async findRecipeByIdForOwner(recipeId: string, ownerUserId: string): Promise<RepositoryResult<RecipeRow>> {
      const { data, error } = await client.from('recipes').select(RECIPE_PROJECTION)
        .eq('id', recipeId).eq('user_id', ownerUserId).maybeSingle()
      if (error) return repositoryFailure(error)
      return data ? { ok: true, data } : { ok: false, kind: 'not_found' }
    },

    async listSavedMealsForOwner(ownerUserId: string, options: { limit?: number } = {}): Promise<RepositoryResult<SavedMealRow[]>> {
      const { data, error } = await client.from('saved_meals').select(SAVED_MEAL_PROJECTION)
        .eq('user_id', ownerUserId).order('created_at', { ascending: false }).limit(boundedLimit(options.limit))
      return error ? repositoryFailure(error) : { ok: true, data: data ?? [] }
    },

    async findSavedMealByIdForOwner(mealId: string, ownerUserId: string): Promise<RepositoryResult<SavedMealRow>> {
      const { data, error } = await client.from('saved_meals').select(SAVED_MEAL_PROJECTION)
        .eq('id', mealId).eq('user_id', ownerUserId).maybeSingle()
      if (error) return repositoryFailure(error)
      return data ? { ok: true, data } : { ok: false, kind: 'not_found' }
    },
  }
}

export type NutritionRecipeRepository = ReturnType<typeof createNutritionRecipeRepository>
