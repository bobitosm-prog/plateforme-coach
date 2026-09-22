import { setTonnage } from '@/lib/training/load-volume'
import type { SupabaseClient } from '@supabase/supabase-js'

const ATHENA_OBSERVED_CONTEXT_VERSION = 1 as const
const DAY_MS = 86_400_000

export const ATHENA_OBSERVED_WINDOWS = {
  trainingDays: 28,
  nutritionDays: 14,
  weightDays: 28,
  wellbeingDays: 14,
} as const

type SourceName = 'training' | 'nutrition' | 'weight' | 'wellbeing'
const KNOWN_MOODS = new Set(['fatigue', 'normal', 'bien', 'top', 'energie'])

export interface ObservedWorkoutSessionRow {
  id?: unknown
  completed?: unknown
  created_at?: unknown
}

export interface ObservedWorkoutSetRow {
  load_mode?: unknown
  duration_seconds?: unknown
  session_id?: unknown
  completed?: unknown
  exercise_id?: unknown
  exercise_name?: unknown
  weight?: unknown
  reps?: unknown
  rir?: unknown
}

export interface ObservedFoodLogRow {
  date?: unknown
  calories?: unknown
  protein?: unknown
  carbs?: unknown
  fat?: unknown
}

export interface ObservedWeightLogRow {
  date?: unknown
  poids?: unknown
}

export interface ObservedCheckinRow {
  date?: unknown
  mood?: unknown
  sleep_hours?: unknown
}

export interface AthenaObservedContextInput {
  workoutSessions?: readonly ObservedWorkoutSessionRow[] | null
  workoutSets?: readonly ObservedWorkoutSetRow[] | null
  foodLogs?: readonly ObservedFoodLogRow[] | null
  weightLogs?: readonly ObservedWeightLogRow[] | null
  checkins?: readonly ObservedCheckinRow[] | null
  sourceErrors?: readonly SourceName[]
}

export interface AthenaObservedContext {
  version: typeof ATHENA_OBSERVED_CONTEXT_VERSION
  source: 'user_activity_logs'
  evidenceKind: 'user_recorded_behavior'
  generatedAt: string
  windows: typeof ATHENA_OBSERVED_WINDOWS
  training: {
    completedSessions: number
    completedSets: number
    activeDays: number
    distinctExercises: number
    lastCompletedAt: string | null
    daysSinceLastCompleted: number | null
    medianRir: number | null
    setsWithRir: number
    externalLoadVolumeKg: number | null
    setsWithLoadAndReps: number
  }
  nutrition: {
    loggedDays: number
    coverageDays: number
    coverageRatio: number
    lastLoggedDate: string | null
    averagesPerLoggedDay: {
      caloriesKcal: number | null
      proteinGrams: number | null
      carbsGrams: number | null
      fatGrams: number | null
    }
  }
  weight: {
    measurementCount: number
    firstKg: number | null
    latestKg: number | null
    changeKg: number | null
    firstDate: string | null
    latestDate: string | null
  }
  wellbeing: {
    loggedDays: number
    coverageDays: number
    coverageRatio: number
    latestMood: string | null
    latestDate: string | null
    averageSleepHoursPerLoggedNight: number | null
    nightsWithSleep: number
  }
  dataQuality: {
    warnings: string[]
    sourceErrors: SourceName[]
  }
}

function stringValue(value: unknown, maxLength = 120): string | null {
  if (typeof value !== 'string') return null
  const cleaned = value.trim().replace(/\s+/g, ' ')
  return cleaned ? cleaned.slice(0, maxLength) : null
}

function finiteNumber(value: unknown, minimum = 0): number | null {
  const parsed = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(parsed) && parsed >= minimum ? parsed : null
}

function dateTime(value: unknown): Date | null {
  const raw = stringValue(value)
  if (!raw) return null
  const parsed = new Date(raw)
  return Number.isFinite(parsed.getTime()) ? parsed : null
}

function dateKey(value: unknown): string | null {
  const raw = stringValue(value)
  if (!raw || !/^\d{4}-\d{2}-\d{2}$/.test(raw)) return null
  const parsed = new Date(`${raw}T00:00:00.000Z`)
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === raw ? raw : null
}

function windowStart(now: Date, days: number): Date {
  return new Date(now.getTime() - days * DAY_MS)
}

function withinDateTimeWindow(value: unknown, now: Date, days: number): Date | null {
  const parsed = dateTime(value)
  if (!parsed || parsed > now || parsed < windowStart(now, days)) return null
  return parsed
}

function withinDateWindow(value: unknown, now: Date, days: number): string | null {
  const key = dateKey(value)
  if (!key) return null
  const today = now.toISOString().slice(0, 10)
  const earliest = windowStart(new Date(`${today}T00:00:00.000Z`), days - 1).toISOString().slice(0, 10)
  return key >= earliest && key <= today ? key : null
}

function rounded(value: number, digits = 1): number {
  const factor = 10 ** digits
  return Math.round(value * factor) / factor
}

function average(values: number[]): number | null {
  return values.length ? rounded(values.reduce((sum, value) => sum + value, 0) / values.length) : null
}

function median(values: number[]): number | null {
  if (!values.length) return null
  const sorted = [...values].sort((left, right) => left - right)
  const middle = Math.floor(sorted.length / 2)
  return sorted.length % 2
    ? rounded(sorted[middle])
    : rounded((sorted[middle - 1] + sorted[middle]) / 2)
}

export function buildAthenaObservedContext(
  input: AthenaObservedContextInput,
  now = new Date(),
): AthenaObservedContext {
  const validNow = Number.isFinite(now.getTime()) ? now : new Date()
  const sessions = (input.workoutSessions ?? []).flatMap(row => {
    if (row.completed !== true) return []
    const id = stringValue(row.id)
    const recordedAt = withinDateTimeWindow(row.created_at, validNow, ATHENA_OBSERVED_WINDOWS.trainingDays)
    return id && recordedAt ? [{ id, recordedAt }] : []
  })
  const sessionIds = new Set(sessions.map(session => session.id))
  const sets = (input.workoutSets ?? []).filter(row => (
    row.completed === true && sessionIds.has(stringValue(row.session_id) ?? '')
  ))
  const exercises = new Set(sets.flatMap(row => {
    const id = stringValue(row.exercise_id)
    const name = stringValue(row.exercise_name)?.toLocaleLowerCase('fr')
    return id ? [`id:${id}`] : name ? [`name:${name}`] : []
  }))
  const rirValues = sets.flatMap(row => {
    const value = finiteNumber(row.rir)
    return value !== null && value <= 10 ? [value] : []
  })
  const loadEntries = sets.flatMap(row => {
    const weight = finiteNumber(row.weight)
    const reps = finiteNumber(row.reps)
    return weight !== null && reps !== null ? [setTonnage({...row, completed:row.completed === true})] : []
  })
  const sessionDates = sessions.map(session => session.recordedAt).sort((left, right) => left.getTime() - right.getTime())
  const lastSession = sessionDates.at(-1) ?? null

  const foodByDay = new Map<string, { calories: number; protein: number; carbs: number; fat: number; values: Set<string> }>()
  for (const row of input.foodLogs ?? []) {
    const date = withinDateWindow(row.date, validNow, ATHENA_OBSERVED_WINDOWS.nutritionDays)
    if (!date) continue
    const current = foodByDay.get(date) ?? { calories: 0, protein: 0, carbs: 0, fat: 0, values: new Set<string>() }
    for (const key of ['calories', 'protein', 'carbs', 'fat'] as const) {
      const value = finiteNumber(row[key])
      if (value !== null) {
        current[key] += value
        current.values.add(key)
      }
    }
    foodByDay.set(date, current)
  }
  const foodDays = [...foodByDay.entries()].sort(([left], [right]) => left.localeCompare(right))
  const nutrientAverage = (key: 'calories' | 'protein' | 'carbs' | 'fat') => {
    const values = foodDays.flatMap(([, day]) => day.values.has(key) ? [day[key]] : [])
    return average(values)
  }

  const weights = (input.weightLogs ?? []).flatMap(row => {
    const date = withinDateWindow(row.date, validNow, ATHENA_OBSERVED_WINDOWS.weightDays)
    const kg = finiteNumber(row.poids, 20)
    return date && kg !== null && kg <= 500 ? [{ date, kg }] : []
  }).sort((left, right) => left.date.localeCompare(right.date))
  const firstWeight = weights[0] ?? null
  const latestWeight = weights.at(-1) ?? null

  const checkins = (input.checkins ?? []).flatMap(row => {
    const date = withinDateWindow(row.date, validNow, ATHENA_OBSERVED_WINDOWS.wellbeingDays)
    if (!date) return []
    const sleep = finiteNumber(row.sleep_hours)
    const mood = stringValue(row.mood, 40)
    return [{ date, mood: mood && KNOWN_MOODS.has(mood) ? mood : null, sleep: sleep !== null && sleep <= 24 ? sleep : null }]
  }).sort((left, right) => left.date.localeCompare(right.date))
  const sleepValues = checkins.flatMap(checkin => checkin.sleep !== null ? [checkin.sleep] : [])
  const latestCheckin = checkins.at(-1) ?? null

  const sourceErrors = [...new Set(input.sourceErrors ?? [])]
  const warnings: string[] = []
  if (!sessions.length) warnings.push('no_completed_training_in_window')
  if (foodDays.length < 7) warnings.push('nutrition_coverage_below_7_of_14_days')
  if (weights.length < 2) warnings.push('weight_trend_requires_at_least_2_measurements')
  if (!checkins.length) warnings.push('no_wellbeing_checkin_in_window')
  if (sourceErrors.length) warnings.push('one_or_more_sources_unavailable')

  return {
    version: ATHENA_OBSERVED_CONTEXT_VERSION,
    source: 'user_activity_logs',
    evidenceKind: 'user_recorded_behavior',
    generatedAt: validNow.toISOString(),
    windows: ATHENA_OBSERVED_WINDOWS,
    training: {
      completedSessions: sessions.length,
      completedSets: sets.length,
      activeDays: new Set(sessionDates.map(date => date.toISOString().slice(0, 10))).size,
      distinctExercises: exercises.size,
      lastCompletedAt: lastSession?.toISOString() ?? null,
      daysSinceLastCompleted: lastSession ? Math.floor((validNow.getTime() - lastSession.getTime()) / DAY_MS) : null,
      medianRir: median(rirValues),
      setsWithRir: rirValues.length,
      externalLoadVolumeKg: loadEntries.length ? rounded(loadEntries.reduce((sum, value) => sum + value, 0)) : null,
      setsWithLoadAndReps: loadEntries.length,
    },
    nutrition: {
      loggedDays: foodDays.length,
      coverageDays: ATHENA_OBSERVED_WINDOWS.nutritionDays,
      coverageRatio: rounded(foodDays.length / ATHENA_OBSERVED_WINDOWS.nutritionDays, 2),
      lastLoggedDate: foodDays.at(-1)?.[0] ?? null,
      averagesPerLoggedDay: {
        caloriesKcal: nutrientAverage('calories'),
        proteinGrams: nutrientAverage('protein'),
        carbsGrams: nutrientAverage('carbs'),
        fatGrams: nutrientAverage('fat'),
      },
    },
    weight: {
      measurementCount: weights.length,
      firstKg: firstWeight?.kg ?? null,
      latestKg: latestWeight?.kg ?? null,
      changeKg: firstWeight && latestWeight ? rounded(latestWeight.kg - firstWeight.kg) : null,
      firstDate: firstWeight?.date ?? null,
      latestDate: latestWeight?.date ?? null,
    },
    wellbeing: {
      loggedDays: checkins.length,
      coverageDays: ATHENA_OBSERVED_WINDOWS.wellbeingDays,
      coverageRatio: rounded(checkins.length / ATHENA_OBSERVED_WINDOWS.wellbeingDays, 2),
      latestMood: latestCheckin?.mood ?? null,
      latestDate: latestCheckin?.date ?? null,
      averageSleepHoursPerLoggedNight: average(sleepValues),
      nightsWithSleep: sleepValues.length,
    },
    dataQuality: { warnings, sourceErrors },
  }
}

export async function loadAthenaObservedContext(
  supabase: SupabaseClient,
  userId: string,
  now = new Date(),
): Promise<AthenaObservedContext> {
  const dateTimeFloor = windowStart(now, ATHENA_OBSERVED_WINDOWS.trainingDays).toISOString()
  const nutritionFloor = windowStart(now, ATHENA_OBSERVED_WINDOWS.nutritionDays - 1).toISOString().slice(0, 10)
  const weightFloor = windowStart(now, ATHENA_OBSERVED_WINDOWS.weightDays - 1).toISOString().slice(0, 10)
  const wellbeingFloor = windowStart(now, ATHENA_OBSERVED_WINDOWS.wellbeingDays - 1).toISOString().slice(0, 10)

  const [sessionsResult, foodResult, weightResult, checkinResult] = await Promise.all([
    supabase.from('workout_sessions').select('id, completed, created_at').eq('user_id', userId).eq('completed', true).gte('created_at', dateTimeFloor),
    supabase.from('daily_food_logs').select('date, calories, protein, carbs, fat').eq('user_id', userId).gte('date', nutritionFloor),
    supabase.from('weight_logs').select('date, poids').eq('user_id', userId).gte('date', weightFloor),
    supabase.from('daily_checkins').select('date, mood, sleep_hours').eq('user_id', userId).gte('date', wellbeingFloor),
  ])

  const sessions = (sessionsResult.data ?? []) as ObservedWorkoutSessionRow[]
  const sessionIds = sessions.flatMap(row => stringValue(row.id) ?? []).filter(Boolean)
  const setsResult = sessionIds.length
    ? await supabase.from('workout_sets').select('session_id, completed, exercise_id, exercise_name, weight, reps, rir, load_mode, duration_seconds').eq('user_id', userId).eq('completed', true).in('session_id', sessionIds)
    : { data: [], error: null }

  const sourceErrors: SourceName[] = []
  if (sessionsResult.error || setsResult.error) sourceErrors.push('training')
  if (foodResult.error) sourceErrors.push('nutrition')
  if (weightResult.error) sourceErrors.push('weight')
  if (checkinResult.error) sourceErrors.push('wellbeing')

  return buildAthenaObservedContext({
    workoutSessions: sessionsResult.error ? [] : sessions,
    workoutSets: setsResult.error ? [] : setsResult.data as ObservedWorkoutSetRow[],
    foodLogs: foodResult.error ? [] : foodResult.data as ObservedFoodLogRow[],
    weightLogs: weightResult.error ? [] : weightResult.data as ObservedWeightLogRow[],
    checkins: checkinResult.error ? [] : checkinResult.data as ObservedCheckinRow[],
    sourceErrors,
  }, now)
}

export function formatAthenaObservedContextForPrompt(context: AthenaObservedContext): string {
  return `<athena_observed_context version="${context.version}" source="server-sourced" evidence-kind="user-recorded-behavior">
${JSON.stringify(context)}
</athena_observed_context>

Ce bloc décrit uniquement des données enregistrées par le client dans les fenêtres indiquées. Elles ne sont ni des mesures cliniques ni une preuve de causalité. Les moyennes nutritionnelles portent seulement sur les jours journalisés. N'extrapole pas aux jours manquants, n'assimile pas le volume externe à une mesure directe d'effort et mentionne les limites de couverture lorsqu'elles changent la fiabilité d'un conseil.`
}
