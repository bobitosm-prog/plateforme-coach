'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'

import type { UserCapabilities } from '../../lib/entitlements/capabilities'
import type { ActiveCoachResolutionState } from '../../lib/coach-relations/repository'
import {
  buildNutritionViewModel,
  type CoachNutritionPlan,
  type HydrationRow,
  type MealTrackingRow,
  type NutritionDataSource,
  type NutritionLogRow,
  type PersonalNutritionPlan,
} from '../../lib/nutrition/nutrition-dashboard-model'
import {
  addNutritionDays,
  getNutritionDayWindow,
  getNutritionWeekWindow,
} from '../../lib/nutrition/nutrition-date'

interface UseNutritionDashboardModelInput {
  supabase: SupabaseClient
  userId: string
  profile: Record<string, unknown> | null
  capabilities: UserCapabilities
  coachRelation: ActiveCoachResolutionState
}

interface NutritionSnapshot {
  dailyLogs: NutritionLogRow[]
  tracking: MealTrackingRow[]
  personalPlan: PersonalNutritionPlan | null
  coachPlan: CoachNutritionPlan | null
  hydration: HydrationRow[]
  errors: Partial<Record<NutritionDataSource, string>>
  loadedAt: string | null
}

const EMPTY_SNAPSHOT: NutritionSnapshot = {
  dailyLogs: [],
  tracking: [],
  personalPlan: null,
  coachPlan: null,
  hydration: [],
  errors: {},
  loadedAt: null,
}

export default function useNutritionDashboardModel({
  supabase,
  userId,
  profile,
  capabilities,
  coachRelation,
}: UseNutritionDashboardModelInput) {
  const day = useMemo(() => getNutritionDayWindow(), [])
  const week = useMemo(() => getNutritionWeekWindow(day.date), [day])
  const [selectedDate, setSelectedDate] = useState(day.localDateKey)
  const [snapshot, setSnapshot] = useState<NutritionSnapshot>(EMPTY_SNAPSHOT)
  const [loading, setLoading] = useState(true)
  const historyStart = useMemo(() => addNutritionDays(day.localDateKey, -30), [day.localDateKey])

  const refresh = useCallback(async () => {
    if (!userId) return
    setLoading(true)
    // Clear relation-bound data before the request so an ended or ambiguous
    // relation can never expose a stale coach plan.
    setSnapshot(current => ({ ...current, coachPlan: null, errors: {} }))

    const coachPlanRead = coachRelation.status === 'active' && coachRelation.coachId
      ? supabase
        .from('client_meal_plans')
        .select('id,client_id,coach_id,plan,created_at,updated_at')
        .eq('client_id', userId)
        .eq('coach_id', coachRelation.coachId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      : Promise.resolve({ data: null, error: null })

    const [logs, tracking, personalPlan, coachPlan, hydration] = await Promise.all([
      supabase
        .from('daily_food_logs')
        .select('id,user_id,date,meal_type,food_id,custom_name,quantity_g,calories,protein,carbs,fat,created_at')
        .eq('user_id', userId)
        .gte('date', historyStart)
        .lte('date', day.localDateKey)
        .order('created_at', { ascending: true })
        .limit(1000),
      supabase
        .from('meal_tracking')
        .select('date,meal_type,completed')
        .eq('user_id', userId)
        .gte('date', historyStart)
        .lte('date', day.localDateKey)
        .limit(200),
      supabase
        .from('meal_plans')
        .select('id,user_id,plan,active,created_at')
        .eq('user_id', userId)
        .eq('active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
      coachPlanRead,
      supabase
        .from('water_intake')
        .select('date,amount_ml')
        .eq('user_id', userId)
        .gte('date', historyStart)
        .lte('date', day.localDateKey)
        .limit(500),
    ])

    const errors: Partial<Record<NutritionDataSource, string>> = {}
    if (logs.error) errors.dailyLogs = 'NUTRITION_DAILY_LOGS_READ_FAILED'
    if (tracking.error) errors.tracking = 'NUTRITION_TRACKING_READ_FAILED'
    if (personalPlan.error) errors.personalPlan = 'NUTRITION_PERSONAL_PLAN_READ_FAILED'
    if (coachPlan.error) errors.coachPlan = 'NUTRITION_COACH_PLAN_READ_FAILED'
    if (hydration.error) errors.hydration = 'NUTRITION_HYDRATION_READ_FAILED'

    setSnapshot({
      dailyLogs: (logs.data ?? []) as NutritionLogRow[],
      tracking: (tracking.data ?? []) as MealTrackingRow[],
      personalPlan: (personalPlan.data ?? null) as PersonalNutritionPlan | null,
      coachPlan: (coachPlan.data ?? null) as CoachNutritionPlan | null,
      hydration: (hydration.data ?? []) as HydrationRow[],
      errors,
      loadedAt: new Date().toISOString(),
    })
    setLoading(false)
  }, [coachRelation.coachId, coachRelation.status, day.localDateKey, historyStart, supabase, userId])

  useEffect(() => {
    let active = true
    const timer = window.setTimeout(() => {
      refresh().catch(() => {
        if (!active) return
        setSnapshot(current => ({
          ...current,
          coachPlan: null,
          errors: {
            dailyLogs: 'NUTRITION_DAILY_LOGS_READ_FAILED',
            tracking: 'NUTRITION_TRACKING_READ_FAILED',
            personalPlan: 'NUTRITION_PERSONAL_PLAN_READ_FAILED',
            coachPlan: 'NUTRITION_COACH_PLAN_READ_FAILED',
            hydration: 'NUTRITION_HYDRATION_READ_FAILED',
          },
        }))
        setLoading(false)
      })
    }, 0)
    return () => {
      active = false
      window.clearTimeout(timer)
    }
  }, [refresh])

  const model = useMemo(() => buildNutritionViewModel({
    day,
    week,
    selectedDate,
    profile,
    capabilities,
    coachRelation,
    dailyLogs: snapshot.dailyLogs,
    tracking: snapshot.tracking,
    personalPlan: snapshot.personalPlan,
    coachPlan: snapshot.coachPlan,
    hydration: snapshot.hydration,
    loading,
    errors: snapshot.errors,
    loadedAt: snapshot.loadedAt,
  }), [capabilities, coachRelation, day, loading, profile, selectedDate, snapshot, week])

  return {
    model,
    selectedDate,
    setSelectedDate,
    dailyLogs: snapshot.dailyLogs.filter(row => row.date === selectedDate),
    daysWithMeals: new Set(snapshot.dailyLogs.map(row => row.date)),
    personalPlan: snapshot.personalPlan,
    coachPlan: snapshot.coachPlan,
    refresh,
  }
}
