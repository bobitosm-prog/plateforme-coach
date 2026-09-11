'use client'

import { useEffect, useMemo, useState } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'

import {
  buildHomeViewModel,
  resolveHomeTrainingData,
  type HomeDashboardTrainingSource,
  type HomeDomain,
  type HomeViewModel,
  type HomeViewModelInput,
} from '../../lib/home/home-dashboard-model'
import {
  getHomeDayWindow,
  getHomeNutritionDayKey,
} from '../../lib/home/home-date'
import { normalizeNutritionMealType } from '../../lib/nutrition/nutrition-dashboard-model'

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
  nutritionHasData: boolean
  hasPersonalMealPlan: boolean
  coachDisplayName: string | null
  coachAvatar: string | null
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
  trainingSource?: Omit<HomeDashboardTrainingSource, 'day'>
  now?: Date
}

const emptySupplementalData: HomeSupplementalData = {
  xp: null,
  checkIn: null,
  trackedPlanNutrition: { calories: 0, protein: 0, carbs: 0, fat: 0 },
  nutritionHasData: false,
  hasPersonalMealPlan: false,
  coachDisplayName: null,
  coachAvatar: null,
  nextAppointment: null,
}

function nutritionFromTrackedMeals(
  planData: unknown,
  mealTypes: readonly string[],
  dayKey: string,
  loggedMealTypes: ReadonlySet<string>,
): { values: HomeSupplementalData['trackedPlanNutrition']; matchedMeals: number } {
  const total = { calories: 0, protein: 0, carbs: 0, fat: 0 }
  if (!planData || typeof planData !== 'object') return { values: total, matchedMeals: 0 }
  const day = Reflect.get(planData, dayKey)
  if (!day || typeof day !== 'object') return { values: total, matchedMeals: 0 }
  const meals = Reflect.get(day, 'repas')
  if (!meals || typeof meals !== 'object') return { values: total, matchedMeals: 0 }
  const completed = new Set(mealTypes.flatMap(mealType => {
    const normalized = normalizeNutritionMealType(mealType)
    return normalized ? [normalized] : []
  }))
  let matchedMeals = 0

  for (const [mealType, foods] of Object.entries(meals)) {
    const normalized = normalizeNutritionMealType(mealType)
    if (!normalized || !completed.has(normalized) || loggedMealTypes.has(normalized) || !Array.isArray(foods)) continue
    matchedMeals += 1
    for (const food of foods) {
      if (!food || typeof food !== 'object') continue
      total.calories += Number(Reflect.get(food, 'kcal')) || 0
      total.protein += Number(Reflect.get(food, 'protein')) || 0
      total.carbs += Number(Reflect.get(food, 'carbs')) || 0
      total.fat += Number(Reflect.get(food, 'fat')) || 0
    }
  }

  return { values: total, matchedMeals }
}

function nutritionFromFoodLogs(rows: readonly Record<string, unknown>[]): HomeSupplementalData['trackedPlanNutrition'] {
  return rows.reduce<HomeSupplementalData['trackedPlanNutrition']>((total, row) => ({
    calories: total.calories + (Number(row.calories) || 0),
    protein: total.protein + (Number(row.protein) || 0),
    carbs: total.carbs + (Number(row.carbs) || 0),
    fat: total.fat + (Number(row.fat) || 0),
  }), { calories: 0, protein: 0, carbs: 0, fat: 0 })
}

interface HomeNutritionReadResult<T> {
  data: T | null
  error: unknown | null
}

export function resolveHomeNutritionRead({
  tracking,
  plan,
  foodLogs,
  dayKey,
}: {
  tracking: HomeNutritionReadResult<readonly { meal_type?: unknown }[]>
  plan: HomeNutritionReadResult<{ plan?: unknown }>
  foodLogs: HomeNutritionReadResult<readonly Record<string, unknown>[]>
  dayKey: string
}): {
  state: 'ready' | 'empty' | 'error'
  values: HomeSupplementalData['trackedPlanNutrition']
  hasPersonalMealPlan: boolean
  errorCode?: 'HOME_NUTRITION_READ_FAILED'
} {
  if (foodLogs.error) {
    return {
      state: 'error',
      values: { calories: 0, protein: 0, carbs: 0, fat: 0 },
      hasPersonalMealPlan: false,
      errorCode: 'HOME_NUTRITION_READ_FAILED',
    }
  }

  const logRows = foodLogs.data ?? []
  const logged = nutritionFromFoodLogs(logRows)
  const hasCanonicalLogs = logRows.length > 0
  const auxiliaryReadFailed = Boolean(tracking.error || plan.error)

  if (auxiliaryReadFailed) {
    return hasCanonicalLogs
      ? { state: 'ready', values: logged, hasPersonalMealPlan: Boolean(plan.data?.plan) }
      : {
          state: 'error',
          values: logged,
          hasPersonalMealPlan: Boolean(plan.data?.plan),
          errorCode: 'HOME_NUTRITION_READ_FAILED',
        }
  }

  const mealTypes = (tracking.data ?? [])
    .map(row => row.meal_type)
    .filter((value): value is string => typeof value === 'string')
  const loggedMealTypes = new Set(logRows.flatMap(row => {
    const normalized = normalizeNutritionMealType(row.meal_type)
    return normalized ? [normalized] : []
  }))
  const tracked = nutritionFromTrackedMeals(plan.data?.plan ?? null, mealTypes, dayKey, loggedMealTypes)

  return {
    state: hasCanonicalLogs || tracked.matchedMeals > 0 ? 'ready' : 'empty',
    values: {
      calories: tracked.values.calories + logged.calories,
      protein: tracked.values.protein + logged.protein,
      carbs: tracked.values.carbs + logged.carbs,
      fat: tracked.values.fat + logged.fat,
    },
    hasPersonalMealPlan: Boolean(plan.data?.plan),
  }
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
  trainingSource,
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
      ? supabase.from('profiles').select('full_name,avatar_url').eq('id', coachId).maybeSingle()
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
        .select('plan')
        .eq('user_id', userId)
        .eq('active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase.from('daily_food_logs')
        .select('calories,protein,carbs,fat')
        .eq('user_id', userId)
        .eq('date', today.localDateKey)
        .limit(20),
      coachProfileRead,
      appointmentRead,
    ]).then(([xp, checkIn, tracking, plan, foodLogs, coachProfile, appointment]) => {
      if (!active) return
      const errors: Partial<Record<HomeDomain, string>> = {}
      if (xp.error) errors.identity = 'HOME_IDENTITY_READ_FAILED'
      if (checkIn.error) errors.checkIn = 'HOME_CHECKIN_READ_FAILED'
      const nutrition = resolveHomeNutritionRead({
        tracking,
        plan,
        foodLogs,
        dayKey: getHomeNutritionDayKey(today),
      })
      if (nutrition.errorCode) errors.nutrition = nutrition.errorCode
      if (coachProfile.error || appointment.error) errors.coach = 'HOME_COACH_READ_FAILED'
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
          trackedPlanNutrition: nutrition.values,
          nutritionHasData: nutrition.state === 'ready',
          hasPersonalMealPlan: nutrition.hasPersonalMealPlan,
          coachDisplayName: coachProfile.data?.full_name ?? null,
          coachAvatar: coachProfile.data?.avatar_url ?? null,
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
    const hasTrackedNutrition = Object.values(tracked).some(value => value > 0)
    const baseConsumed = base.nutrition.caloriesConsumed
    const baseMacros = base.nutrition.macrosConsumed ?? {}
    const nutritionLoading = supplementalLoading
      && base.nutrition.state !== 'error'
    const checkInLoading = supplementalLoading
      && !currentSupplemental.data.checkIn

    return buildHomeViewModel({
      ...base,
      today,
      training: trainingSource
        ? resolveHomeTrainingData({ ...trainingSource, day: today })
        : base.training,
      identity: {
        ...base.identity,
        xp: currentSupplemental.data.xp ?? base.identity.xp,
        state: supplementalLoading ? 'loading' : base.identity.state,
      },
      nutrition: {
        ...base.nutrition,
        state: nutritionLoading
          ? 'loading'
          : currentSupplemental.errors.nutrition
            ? 'error'
            : currentSupplemental.data.nutritionHasData ? 'ready' : 'empty',
        caloriesConsumed: baseConsumed == null
          ? (hasTrackedNutrition ? tracked.calories : null)
          : baseConsumed + tracked.calories,
        macrosConsumed: {
          protein: baseMacros.protein == null && !hasTrackedNutrition ? null : (baseMacros.protein ?? 0) + tracked.protein,
          carbs: baseMacros.carbs == null && !hasTrackedNutrition ? null : (baseMacros.carbs ?? 0) + tracked.carbs,
          fat: baseMacros.fat == null && !hasTrackedNutrition ? null : (baseMacros.fat ?? 0) + tracked.fat,
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
        coachAvatar: currentSupplemental.data.coachAvatar
          ?? base.coach.coachAvatar,
        nextAppointment: currentSupplemental.data.nextAppointment
          ?? base.coach.nextAppointment,
      },
      errors: { ...base.errors, ...currentSupplemental.errors },
    })
  }, [base, requestKey, supplemental, supplementalLoading, today, trainingSource])
}
