'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { createNutritionRecipeRepository, type NutritionRecipeRepository, type RecipeRow, type SavedMealRow } from '@/lib/repositories/nutrition'
import type { DatabaseClient } from '@/lib/supabase/types'
import type { NutritionLoadState } from './useNutritionJournal'

interface UseNutritionRecipesParams {
  client: DatabaseClient
  userId: string | undefined
  includeSavedMeals?: boolean
}

export function mergeNutritionRecipeRows(privateRows: RecipeRow[], publicRows: RecipeRow[]): RecipeRow[] {
  return [...privateRows, ...publicRows]
    .filter((recipe, index, rows) => rows.findIndex(candidate => candidate.id === recipe.id) === index)
    .sort((left, right) => String(right.created_at ?? '').localeCompare(String(left.created_at ?? '')))
}

export function useNutritionRecipes({ client, userId, includeSavedMeals = false }: UseNutritionRecipesParams) {
  const repository = useMemo<NutritionRecipeRepository>(() => createNutritionRecipeRepository(client), [client])
  const [privateRecipes, setPrivateRecipes] = useState<RecipeRow[]>([])
  const [publicRecipes, setPublicRecipes] = useState<RecipeRow[]>([])
  const [savedMeals, setSavedMeals] = useState<SavedMealRow[]>([])
  const [state, setState] = useState<NutritionLoadState>('idle')
  const requestId = useRef(0)

  const reload = useCallback(async () => {
    if (!userId) { setPrivateRecipes([]); setPublicRecipes([]); setSavedMeals([]); setState('idle'); return }
    const current = ++requestId.current
    setState('loading')
    const [owned, shared, meals] = await Promise.all([
      repository.listRecipesForOwner(userId, { limit: 50 }),
      repository.listPublicRecipes({ limit: 50 }),
      includeSavedMeals ? repository.listSavedMealsForOwner(userId, { limit: 200 }) : Promise.resolve({ ok: true as const, data: [] }),
    ])
    if (current !== requestId.current) return
    if (!owned.ok || !shared.ok || !meals.ok) { setState('error'); return }
    setPrivateRecipes(owned.data); setPublicRecipes(shared.data); setSavedMeals(meals.data)
    setState(owned.data.length || shared.data.length || meals.data.length ? 'ready' : 'empty')
  }, [includeSavedMeals, repository, userId])

  useEffect(() => { queueMicrotask(() => { void reload() }); return () => { requestId.current += 1 } }, [reload])

  return { privateRecipes, publicRecipes, savedMeals, state, reload, retry: reload }
}
