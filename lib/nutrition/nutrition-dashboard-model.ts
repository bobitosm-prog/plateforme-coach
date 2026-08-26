import type { UserCapabilities } from '../entitlements/capabilities'
import { getMealByKey, parseMealPlan, type Day, type MealKey } from '../meal-plan'
import type { ActiveCoachResolutionState } from '../coach-relations/repository'
import { getNutritionDayKey, type NutritionDayWindow, type NutritionWeekWindow } from './nutrition-date'
import type { NutritionMealType } from './nutrition-plan-generation'

export type NutritionDomainState = 'loading' | 'ready' | 'partial' | 'empty' | 'error'
export type NutritionMealStatus = 'empty' | 'planned' | 'partially_logged' | 'logged' | 'completed'
export type NutritionPlanSource = 'coach' | 'personal' | 'none'

export interface NutritionValues {
  calories: number
  protein: number
  carbs: number
  fat: number
}

export interface NutritionDomain<T> {
  state: NutritionDomainState
  data: T | null
  errorCode?: string
}

export interface PersonalNutritionPlan {
  id: string
  plan: unknown
  active: boolean
  created_at?: string | null
}

export interface CoachNutritionPlan {
  id: string
  coach_id: string
  plan: unknown
  created_at?: string | null
  updated_at?: string | null
}

export interface ActiveNutritionPlan {
  state: NutritionDomainState
  source: NutritionPlanSource
  id: string | null
  plan: unknown | null
  coachId: string | null
  errorCode?: string
}

export interface NutritionLogRow {
  id: string
  user_id?: string
  date: string
  meal_type: string
  food_id?: string | null
  custom_name?: string | null
  food_name?: string | null
  quantity_g?: number | null
  calories?: number | null
  protein?: number | null
  carbs?: number | null
  fat?: number | null
  created_at?: string | null
}

export interface MealTrackingRow {
  date: string
  meal_type: string
  completed: boolean
}

export interface HydrationRow {
  date: string
  amount_ml: number
}

export interface NutritionMealModel {
  type: NutritionMealType
  planned: unknown[]
  logged: NutritionLogRow[]
  completed: boolean
  status: NutritionMealStatus
}

export interface NutritionTools {
  state: NutritionDomainState
  foodSearch: boolean
  photoAnalysis: boolean
  barcode: boolean
  savedMeals: boolean
  recipes: boolean
  errorCode?: string
}

export interface NutritionWeekSummary {
  daysLogged: number
  consumed: NutritionValues
}

export interface NutritionViewModel {
  day: NutritionDayWindow
  summary: NutritionDomain<NutritionValues>
  targets: NutritionDomain<NutritionValues>
  consumed: NutritionDomain<NutritionValues>
  macros: NutritionDomain<Omit<NutritionValues, 'calories'>>
  meals: NutritionDomain<NutritionMealModel[]>
  activePlan: ActiveNutritionPlan
  hydration: NutritionDomain<{ consumedMl: number; targetMl: number | null }>
  tools: NutritionTools
  weekSummary: NutritionDomain<NutritionWeekSummary>
  capabilities: UserCapabilities
  coachRelation: ActiveCoachResolutionState
  loading: boolean
  errors: Partial<Record<NutritionDataSource, string>>
  freshness: { loadedAt: string | null; dataDate: string }
}

export type NutritionDataSource = 'dailyLogs' | 'tracking' | 'personalPlan' | 'coachPlan' | 'hydration'

export interface NutritionViewModelInput {
  day: NutritionDayWindow
  week: NutritionWeekWindow
  selectedDate: string
  profile: Record<string, unknown> | null
  capabilities: UserCapabilities
  coachRelation: ActiveCoachResolutionState
  dailyLogs: NutritionLogRow[]
  tracking: MealTrackingRow[]
  personalPlan: PersonalNutritionPlan | null
  coachPlan: CoachNutritionPlan | null
  hydration: HydrationRow[]
  loading?: boolean
  errors?: Partial<Record<NutritionDataSource, string>>
  loadedAt?: string | null
}

const EMPTY_VALUES: NutritionValues = { calories: 0, protein: 0, carbs: 0, fat: 0 }
const MEAL_TYPES: NutritionMealType[] = ['breakfast', 'lunch', 'snack', 'dinner']
const PLAN_KEYS: Record<NutritionMealType, MealKey> = {
  breakfast: 'petit_dejeuner',
  lunch: 'dejeuner',
  snack: 'collation',
  dinner: 'diner',
}

export function normalizeNutritionMealType(value: unknown): NutritionMealType | null {
  if (typeof value !== 'string') return null
  const normalized = value.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  if (['breakfast', 'morning', 'petit_dejeuner', 'petit-dejeuner'].includes(normalized)) return 'breakfast'
  if (['lunch', 'dejeuner'].includes(normalized)) return 'lunch'
  if (['snack', 'collation'].includes(normalized)) return 'snack'
  if (['dinner', 'evening', 'diner'].includes(normalized)) return 'dinner'
  return null
}

function isPlanPayload(value: unknown): boolean {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function resolveActiveNutritionPlan({
  coachRelationStatus,
  coachId,
  coachMealPlan,
  personalMealPlan,
}: {
  coachRelationStatus: ActiveCoachResolutionState['status']
  coachId: string | null
  coachMealPlan: CoachNutritionPlan | null
  personalMealPlan: PersonalNutritionPlan | null
}): ActiveNutritionPlan {
  if (
    coachRelationStatus === 'active'
    && coachId
    && coachMealPlan?.coach_id === coachId
    && isPlanPayload(coachMealPlan.plan)
  ) {
    return { state: 'ready', source: 'coach', id: coachMealPlan.id, plan: coachMealPlan.plan, coachId }
  }

  if (personalMealPlan?.active && isPlanPayload(personalMealPlan.plan)) {
    return { state: 'ready', source: 'personal', id: personalMealPlan.id, plan: personalMealPlan.plan, coachId: null }
  }

  return { state: 'empty', source: 'none', id: null, plan: null, coachId: null }
}

function sumLogs(rows: NutritionLogRow[]): NutritionValues {
  return rows.reduce<NutritionValues>((total, row) => ({
    calories: total.calories + (Number(row.calories) || 0),
    protein: total.protein + (Number(row.protein) || 0),
    carbs: total.carbs + (Number(row.carbs) || 0),
    fat: total.fat + (Number(row.fat) || 0),
  }), { ...EMPTY_VALUES })
}

function numericTarget(profile: Record<string, unknown> | null, key: string): number | null {
  const value = profile?.[key]
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function buildTargets(profile: Record<string, unknown> | null): NutritionDomain<NutritionValues> {
  const values = [
    numericTarget(profile, 'calorie_goal'),
    numericTarget(profile, 'protein_goal'),
    numericTarget(profile, 'carbs_goal'),
    numericTarget(profile, 'fat_goal'),
  ]
  if (values.every(value => value === null)) return { state: 'empty', data: null }
  const data = {
    calories: values[0] ?? 0,
    protein: values[1] ?? 0,
    carbs: values[2] ?? 0,
    fat: values[3] ?? 0,
  }
  return { state: values.some(value => value === null) ? 'partial' : 'ready', data }
}

function plannedFoods(plan: unknown, dayKey: string, type: NutritionMealType): unknown[] {
  if (!plan) return []
  const parsed = parseMealPlan(plan)
  const day = parsed[dayKey as Day]
  return day ? getMealByKey(day, PLAN_KEYS[type]) : []
}

export function buildNutritionViewModel(input: NutritionViewModelInput): NutritionViewModel {
  const errors = input.errors ?? {}
  let activePlan = resolveActiveNutritionPlan({
    coachRelationStatus: input.coachRelation.status,
    coachId: input.coachRelation.coachId,
    coachMealPlan: input.coachPlan,
    personalMealPlan: input.personalPlan,
  })
  if (input.loading) {
    activePlan = { state: 'loading', source: 'none', id: null, plan: null, coachId: null }
  } else if (
    (input.coachRelation.status === 'active' && errors.coachPlan)
    || (activePlan.source === 'none' && errors.personalPlan)
  ) {
    activePlan = {
      state: 'error',
      source: 'none',
      id: null,
      plan: null,
      coachId: null,
      errorCode: errors.coachPlan ?? errors.personalPlan,
    }
  }
  const selectedLogs = input.dailyLogs.filter(row => row.date === input.selectedDate)
  const selectedTracking = input.tracking.filter(row => row.date === input.selectedDate)
  const consumedData = errors.dailyLogs ? null : sumLogs(selectedLogs)
  const consumed: NutritionDomain<NutritionValues> = input.loading
    ? { state: 'loading', data: null }
    : errors.dailyLogs
      ? { state: 'error', data: null, errorCode: errors.dailyLogs }
      : { state: selectedLogs.length ? 'ready' : 'empty', data: consumedData }
  const targets = buildTargets(input.profile)
  const mealsData = MEAL_TYPES.map(type => {
    const logged = selectedLogs.filter(row => normalizeNutritionMealType(row.meal_type) === type)
    const completed = selectedTracking.some(row => row.completed && normalizeNutritionMealType(row.meal_type) === type)
    const planned = plannedFoods(activePlan.plan, getNutritionDayKey(input.selectedDate), type)
    let status: NutritionMealStatus = 'empty'
    if (completed) status = 'completed'
    else if (planned.length && logged.length) status = 'partially_logged'
    else if (logged.length) status = 'logged'
    else if (planned.length) status = 'planned'
    return { type, planned, logged, completed, status }
  })
  const mealsError = errors.dailyLogs ?? errors.tracking
  const meals: NutritionDomain<NutritionMealModel[]> = input.loading
    ? { state: 'loading', data: null }
    : mealsError
      ? { state: 'error', data: null, errorCode: mealsError }
      : { state: mealsData.some(meal => meal.status !== 'empty') ? 'ready' : 'empty', data: mealsData }
  const hydrationRows = input.hydration.filter(row => row.date === input.selectedDate)
  const waterTarget = numericTarget(input.profile, 'water_goal')
  const hydration: NutritionDomain<{ consumedMl: number; targetMl: number | null }> = input.loading
    ? { state: 'loading', data: null }
    : errors.hydration
      ? { state: 'error', data: null, errorCode: errors.hydration }
      : {
        state: hydrationRows.length ? 'ready' : 'empty',
        data: { consumedMl: hydrationRows.reduce((sum, row) => sum + (Number(row.amount_ml) || 0), 0), targetMl: waterTarget },
      }
  const weekLogs = input.dailyLogs.filter(row => row.date >= input.week.weekStartKey && row.date <= input.week.weekEndKey)
  const weekSummary: NutritionDomain<NutritionWeekSummary> = input.loading
    ? { state: 'loading', data: null }
    : errors.dailyLogs
      ? { state: 'error', data: null, errorCode: errors.dailyLogs }
      : {
        state: weekLogs.length ? 'ready' : 'empty',
        data: { daysLogged: new Set(weekLogs.map(row => row.date)).size, consumed: sumLogs(weekLogs) },
      }
  const summaryState: NutritionDomainState = consumed.state === 'error'
    ? 'error'
    : consumed.state === 'loading'
      ? 'loading'
      : targets.state === 'partial' || targets.state === 'empty'
        ? 'partial'
        : consumed.state

  return {
    day: input.day,
    summary: { state: summaryState, data: consumed.data, errorCode: consumed.errorCode },
    targets,
    consumed,
    macros: consumed.data
      ? { state: consumed.state, data: { protein: consumed.data.protein, carbs: consumed.data.carbs, fat: consumed.data.fat } }
      : { state: consumed.state, data: null, errorCode: consumed.errorCode },
    meals,
    activePlan,
    hydration,
    tools: {
      state: 'ready',
      foodSearch: true,
      photoAnalysis: input.capabilities.ai,
      barcode: true,
      savedMeals: true,
      recipes: input.capabilities.nutrition,
    },
    weekSummary,
    capabilities: input.capabilities,
    coachRelation: input.coachRelation,
    loading: Boolean(input.loading),
    errors,
    freshness: { loadedAt: input.loadedAt ?? null, dataDate: input.selectedDate },
  }
}
