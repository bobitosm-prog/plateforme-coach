'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { SetStateAction } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'

import {
  beginSavedMealsLibraryRead,
  createEmptySavedMealsLibrary,
  replaceSavedMealsLibraryMeals,
  settleSavedMealsLibraryRead,
  type SavedMealsLibraryStatus,
} from '@/lib/nutrition/saved-meals-library'

export interface SavedMealsLibraryEntry {
  id: string
  user_id?: string | null
  name?: string | null
  meal_type?: string | null
  foods?: unknown
  created_at?: string | null
}

export function useSavedMealsLibrary(input: {
  supabase: SupabaseClient
  userId: string | undefined
  active: boolean
}): {
  meals: SavedMealsLibraryEntry[]
  status: SavedMealsLibraryStatus
  setMeals: (replacement: SetStateAction<SavedMealsLibraryEntry[]>) => void
} {
  const { active, supabase, userId } = input
  const [library, setLibrary] = useState(
    createEmptySavedMealsLibrary<SavedMealsLibraryEntry>(),
  )
  const requestId = useRef(0)

  useEffect(() => {
    if (!active || !userId) return
    const request = ++requestId.current
    const load = async () => {
      try {
        const result = await supabase.from('saved_meals').select('*')
          .eq('user_id', userId).order('created_at', { ascending: false })
        setLibrary(previous => settleSavedMealsLibraryRead(
          previous,
          result as {
            data: readonly SavedMealsLibraryEntry[] | null
            error: unknown | null
          },
          userId,
          request === requestId.current,
        ))
      } catch {
        setLibrary(previous => settleSavedMealsLibraryRead(
          previous,
          { data: null, error: new Error('saved_meals_network_failure') },
          userId,
          request === requestId.current,
        ))
      }
    }
    queueMicrotask(() => {
      if (request !== requestId.current) return
      setLibrary(previous => beginSavedMealsLibraryRead(previous, userId))
      void load()
    })
    return () => { requestId.current += 1 }
  }, [active, supabase, userId])

  const setMeals = useCallback((
    replacement: SetStateAction<SavedMealsLibraryEntry[]>,
  ) => {
    setLibrary(previous => replaceSavedMealsLibraryMeals(previous, replacement))
  }, [])

  return {
    meals: library.ownerUserId === userId ? [...library.meals] : [],
    status: library.ownerUserId === userId ? library.status : 'loading',
    setMeals,
  }
}
