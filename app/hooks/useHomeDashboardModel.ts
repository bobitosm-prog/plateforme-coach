'use client'

import { useEffect, useMemo, useState } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'

import {
  buildHomeViewModel,
  type HomeDomain,
  type HomeViewModel,
  type HomeViewModelInput,
} from '../../lib/home/home-dashboard-model'
import {
  getHomeDayWindow,
  getHomeNutritionDayKey,
} from '../../lib/home/home-date'

interface HomeSupplementalData {
  xp: number | null
  checkIn: {
    mood: string | null
    sleep: number | null
    note: string | null
  } | null
  trackedPlanNutrition: {
    calories: number
    protein: number
    carbs: number
    fat: number
  }
  hasPersonalMealPlan: boolean
  coachDisplayName: string | null
  nextAppointment: unknown | null
}

interface HomeSupplementalState {
  requestKey: string | null
  data: HomeSupplementalData
  errors: Partial<Record<HomeDomain, string>>
}

export interface UseHomeDashboardModelInput {
  enabled?: boolean
  supabase: SupabaseClient
  userId: string | null | undefined
  base: Omit<HomeViewModelInput, 'today'>
  now?: Date
}

const emptySupplementalData: HomeSupplementalData = {
  xp: null,
  checkIn: null,
  trackedPlanNutrition: { calories: 0, protein: 0, carbs: 0, fat: 0 },
  hasPersonalMealPlan: false,
  coachDisplayName: null,
  nextAppointment: null,
}

function nutritionFromTrackedMeals(
  planData: unknown,
  mealTypes: readonly string[],
  dayKey: string,
): HomeSupplementalData['trackedPlanNutrition'] {
  const total = { calories: 0, protein: 0, carbs: 0, fat: 0 }
  if (!planData || typeof planData !== 'object') return total
  const day = Reflect.get(planData, dayKey)
  if (!day || typeof day !== 'object') return total
  const meals = Reflect.get(day, 'repas')
  if (!meals || typeof meals !== 'object') return total
  const completed = new Set(mealTypes)

  for (const [mealType, foods] of Object.entries(meals)) {
    if (!completed.has(mealType) || !Array.isArray(foods)) continue
    for (const food of foods) {
      if (!food || typeof food !== 'object') continue
      total.calories += Number(Reflect.get(food, 'kcal')) || 0
      total.protein += Number(Reflect.get(food, 'protein')) || 0
      total.carbs += Number(Reflect.get(food, 'carbs')) || 0
      total.fat += Number(Reflect.get(food, 'fat')) || 0
    }
  }

  return total
}

/**
 * Home-only read adapter. It consumes the dashboard's existing data through
 * `base` and loads only data that the parent does not already expose.
 * It intentionally contains no schedule repair or persistence operation.
 */
export default function useHomeDashboardModel({
  enabled = true,
  supabase,
  userId,
  base,
  now,
}: UseHomeDashboardModelInput): HomeViewModel {
  const [clock, setClock] = useState(() => now ?? new Date())
  const effectiveNow = now ?? clock
  const today = useMemo(() => getHomeDayWindow(effectiveNow), [effectiveNow])
  const [supplemental, setSupplemental] = useState<HomeSupplementalState>({
    requestKey: null,
    data: emptySupplementalData,
    errors: {},
  })
  const requestKey = enabled && userId
    ? `${userId}:${today.localDateKey}:${base.coach.relationStatus}:${base.coach.coachId ?? ''}`
    : null
  const supplementalLoading = requestKey !== null
    && supplemental.requestKey !== requestKey

  useEffect(() => {
    if (now) return
    const delay = Math.max(1_000, today.todayEnd.getTime() - Date.now() + 100)
    const timer = window.setTimeout(() => setClock(new Date()), delay)
    return () => window.clearTimeout(timer)
  }, [now, today.todayEnd])

  useEffect(() => {
    if (!enabled || !userId || !requestKey) return

    let active = true
    const hasActiveCoach = base.coach.relationStatus === 'active'
      && Boolean(base.coach.coachId)
    const coachId = hasActiveCoach ? base.coach.coachId : null

    const coachProfileRead = coachId
      ? supabase.from('profiles').select('full_name').eq('id', coachId).maybeSingle()
      : Promise.resolve({ data: null, error: null })
    const appointmentRead = coachId
      ? supabase.from('coach_appointments')
        .select('id,coach_id,scheduled_at,location,status')
        .eq('client_id', userId)
        .eq('coach_id', coachId)
        .gte('scheduled_at', today.date.toISOString())
        .order('scheduled_at', { ascending: true })
        .limit(1)
        .maybeSingle()
      : Promise.resolve({ data: null, error: null })

    Promise.all([
      supabase.from('user_xp').select('total_xp').eq('user_id', userId).maybeSingle(),
      supabase.from('daily_checkins')
        .select('mood,sleep_hours,note')
        .eq('user_id', userId)
        .eq('date', today.localDateKey)
        .maybeSingle(),
      supabase.from('meal_tracking')
        .select('meal_type')
        .eq('user_id', userId)
        .eq('date', today.localDateKey)
        .eq('is_completed', true)
        .limit(20),
      supabase.from('meal_plans')
        .select('plan_data')
        .eq('user_id', userId)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
      coachProfileRead,
      appointmentRead,
    ]).then(([xp, checkIn, tracking, plan, coachProfile, appointment]) => {
      if (!active) return
      const errors: Partial<Record<HomeDomain, string>> = {}
      if (xp.error) errors.identity = 'HOME_IDENTITY_READ_FAILED'
      if (checkIn.error) errors.checkIn = 'HOME_CHECKIN_READ_FAILED'
      if (tracking.error || plan.error) errors.nutrition = 'HOME_NUTRITION_READ_FAILED'
      if (coachProfile.error || appointment.error) errors.coach = 'HOME_COACH_READ_FAILED'

      const mealTypes = (tracking.data ?? [])
        .map((row: { meal_type?: unknown }) => row.meal_type)
        .filter((value: unknown): value is string => typeof value === 'string')
      const planData = plan.data?.plan_data ?? null
      setSupplemental({
        requestKey,
        errors,
        data: {
          xp: typeof xp.data?.total_xp === 'number' ? xp.data.total_xp : null,
          checkIn: checkIn.data
            ? {
              mood: checkIn.data.mood ?? null,
              sleep: checkIn.data.sleep_hours ?? null,
              note: checkIn.data.note ?? null,
            }
            : null,
          trackedPlanNutrition: nutritionFromTrackedMeals(
            planData,
            mealTypes,
            getHomeNutritionDayKey(today),
          ),
          hasPersonalMealPlan: Boolean(planData),
          coachDisplayName: coachProfile.data?.full_name ?? null,
          nextAppointment: appointment.data ?? null,
        },
      })
    }).catch(() => {
      if (!active) return
      setSupplemental({
        requestKey,
        data: emptySupplementalData,
        errors: {
          identity: 'HOME_IDENTITY_READ_FAILED',
          nutrition: 'HOME_NUTRITION_READ_FAILED',
          checkIn: 'HOME_CHECKIN_READ_FAILED',
          coach: 'HOME_COACH_READ_FAILED',
        },
      })
    })

    return () => { active = false }
  }, [
    base.coach.coachId,
    base.coach.relationStatus,
    enabled,
    requestKey,
    supabase,
    today,
    userId,
  ])

  return useMemo(() => {
    const currentSupplemental = requestKey === null
      ? { requestKey: null, data: emptySupplementalData, errors: {} }
      : supplemental
    const tracked = currentSupplemental.data.trackedPlanNutrition
    const baseConsumed = base.nutrition.caloriesConsumed
    const baseMacros = base.nutrition.macrosConsumed ?? {}
    const nutritionLoading = supplementalLoading
      && base.nutrition.state !== 'error'
    const checkInLoading = supplementalLoading
      && !currentSupplemental.data.checkIn

    return buildHomeViewModel({
      ...base,
      today,
      identity: {
        ...base.identity,
        xp: currentSupplemental.data.xp ?? base.identity.xp,
        state: supplementalLoading ? 'loading' : base.identity.state,
      },
      nutrition: {
        ...base.nutrition,
        state: nutritionLoading ? 'loading' : base.nutrition.state,
        caloriesConsumed: baseConsumed == null
          ? (tracked.calories > 0 ? tracked.calories : null)
          : baseConsumed + tracked.calories,
        macrosConsumed: {
          protein: (baseMacros.protein ?? 0) + tracked.protein,
          carbs: (baseMacros.carbs ?? 0) + tracked.carbs,
          fat: (baseMacros.fat ?? 0) + tracked.fat,
        },
        hasPlan: base.nutrition.hasPlan || supplemental.data.hasPersonalMealPlan,
      },
      checkIn: {
        state: checkInLoading
          ? 'loading'
          : currentSupplemental.data.checkIn ? 'ready' : 'empty',
        ...currentSupplemental.data.checkIn,
      },
      coach: {
        ...base.coach,
        state: supplementalLoading && base.coach.relationStatus === 'active'
          ? 'loading'
          : base.coach.state,
        coachDisplayName: currentSupplemental.data.coachDisplayName
          ?? base.coach.coachDisplayName,
        nextAppointment: currentSupplemental.data.nextAppointment
          ?? base.coach.nextAppointment,
      },
      errors: { ...base.errors, ...currentSupplemental.errors },
    })
  }, [base, requestKey, supplemental, supplementalLoading, today])
}
