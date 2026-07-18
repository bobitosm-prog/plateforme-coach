'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'

import type { NutritionLoadState } from './useNutritionJournal'

export interface LegacyActiveMealPlan {
  id: string
  user_id: string
  plan_data: unknown
  is_active: boolean
  created_at: string
}

interface UseNutritionPlansParams {
  supabase: SupabaseClient
  userId: string | undefined
  date: string
}

export function useNutritionPlans({ supabase, userId, date }: UseNutritionPlansParams) {
  const [activePersonalPlan, setActivePersonalPlan] = useState<LegacyActiveMealPlan | null>(null)
  const [completedMeals, setCompletedMeals] = useState<Set<string>>(new Set())
  const [state, setState] = useState<NutritionLoadState>('idle')
  const requestId = useRef(0)

  const reload = useCallback(async () => {
    if (!userId) { setActivePersonalPlan(null); setCompletedMeals(new Set()); setState('idle'); return }
    const current = ++requestId.current
    setState('loading')
    const [plan, tracking] = await Promise.all([
      supabase.from('meal_plans').select('id,user_id,plan_data,is_active,created_at')
        .eq('user_id', userId).eq('is_active', true).order('created_at', { ascending: false }).limit(1).maybeSingle(),
      supabase.from('meal_tracking').select('meal_type').eq('user_id', userId).eq('date', date).eq('is_completed', true).limit(50),
    ])
    if (current !== requestId.current) return
    if (plan.error || tracking.error) { setState('error'); return }
    setActivePersonalPlan(plan.data as LegacyActiveMealPlan | null)
    setCompletedMeals(new Set((tracking.data ?? []).map(item => item.meal_type)))
    setState(plan.data ? 'ready' : 'empty')
  }, [date, supabase, userId])

  useEffect(() => { queueMicrotask(() => { void reload() }); return () => { requestId.current += 1 } }, [reload])

  const toggleMeal = useCallback(async (mealType: string, planId: string | null) => {
    if (!userId) return false
    const completed = !completedMeals.has(mealType)
    const next = new Set(completedMeals)
    if (completed) next.add(mealType); else next.delete(mealType)
    setCompletedMeals(next)
    const { error } = await supabase.from('meal_tracking').upsert({
      user_id: userId, meal_plan_id: planId, date, meal_type: mealType,
      is_completed: completed, completed_at: completed ? new Date().toISOString() : null,
    }, { onConflict: 'user_id,date,meal_type' })
    if (error) { setCompletedMeals(completedMeals); return false }
    return true
  }, [completedMeals, date, supabase, userId])

  return { activePersonalPlan, completedMeals, state, loading: state === 'loading', reload, retry: reload, toggleMeal }
}
