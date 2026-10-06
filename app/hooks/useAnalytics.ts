'use client'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'
import { readAnalyticsPages } from '../../lib/progression/analytics-daily-read'
import { getProgressionDateKey, progressionPeriodStart, getProgressionWeekKey } from '../../lib/progression/progression-date'
import { setTonnage } from '../../lib/training/load-volume'
import type {
  ProgressionPeriod,
  ProgressionRecordRow,
  ProgressionWorkoutSession,
} from '../../lib/progression/progression-dashboard-model'

export interface ProgressionWellbeingEntry {
  date: string
  mood: string | null
  sleep_hours: number | null
  note: string | null
}

interface UseAnalyticsParams {
  supabase: SupabaseClient
  period?: ProgressionPeriod
  enabled: boolean
  userId: string | null | undefined
  workoutSessions: readonly ProgressionWorkoutSession[]
  weightHistory: readonly { date: string; poids: number }[]
}

export interface AnalyticsSourceStates {
  records: 'loading' | 'ready' | 'error'
  nutrition: 'loading' | 'ready' | 'error'
  hydration: 'loading' | 'ready' | 'error'
  wellbeing: 'loading' | 'ready' | 'error'
}

const INITIAL_SOURCE_STATES: AnalyticsSourceStates = {
  records: 'loading',
  nutrition: 'loading',
  hydration: 'loading',
  wellbeing: 'loading',
}

interface ExerciseMuscleMetadata {
  name?: string | null
  muscle_group?: string | null
}

export function getDistinctRecordExerciseNames(records: readonly ProgressionRecordRow[]): string[] {
  return Array.from(new Set(records.flatMap(record => {
    const name = record.exercise_name?.trim()
    return name ? [name] : []
  }))).sort((a, b) => a.localeCompare(b))
}

export function enrichRecordsWithMuscleMetadata(
  records: readonly ProgressionRecordRow[],
  metadata: readonly ExerciseMuscleMetadata[],
): ProgressionRecordRow[] {
  const muscleByExercise = new Map(metadata.flatMap(item => {
    const name = item.name?.trim()
    const muscleGroup = item.muscle_group?.trim()
    return name && muscleGroup ? [[name, muscleGroup] as const] : []
  }))
  return records.map(record => ({
    ...record,
    muscle_group: muscleByExercise.get(record.exercise_name?.trim() ?? '') ?? null,
  }))
}

export default function useAnalytics({
  supabase,
  enabled,
  period = '30d',
  userId,
  workoutSessions,
  weightHistory,
}: UseAnalyticsParams) {
  const [personalRecords, setPersonalRecords] = useState<ProgressionRecordRow[]>([])
  const [weeklyCalories, setWeeklyCalories] = useState<{ date: string; calories: number; protein: number; carbs: number; fat: number }[]>([])
  const [weeklyWater, setWeeklyWater] = useState<{ date: string; ml: number }[]>([])
  const [wellbeingEntries, setWellbeingEntries] = useState<ProgressionWellbeingEntry[]>([])
  const [sourceStates, setSourceStates] = useState<AnalyticsSourceStates>(INITIAL_SOURCE_STATES)
  const [dailyTruncated, setDailyTruncated] = useState(false)
  const [loadedKey, setLoadedKey] = useState('')
  const requestVersion = useRef(0)
  const ownerRef = useRef(userId)
  useEffect(() => { ownerRef.current = userId }, [userId])
  const todayKey = getProgressionDateKey(new Date())!
  const requestKey = `${userId}:${period}:${todayKey}`
  const loadedUserRef = useRef<string | null>(null)
  const recordMuscleMetadataRef = useRef<ExerciseMuscleMetadata[]>([])

  const weightHistoryFull = useMemo(
    () => [...weightHistory].sort((a, b) => a.date.localeCompare(b.date)),
    [weightHistory],
  )

  // Progression volume is derived from the workout sets already loaded by the
  // dashboard. This replaces the former second read of up to 500 workout_sets.
  const weeklyVolume = useMemo(() => {
    const volumeByWeek = new Map<string, number>()
    for (const session of workoutSessions) {
      if (session.completed === false) continue
      for (const set of session.workout_sets ?? []) {
        if (set.completed === false) continue
        const weekKey = getProgressionWeekKey(set.created_at ?? session.created_at ?? '')
        if (!weekKey) continue
        const volume = setTonnage(set)
        volumeByWeek.set(weekKey, (volumeByWeek.get(weekKey) ?? 0) + volume)
      }
    }
    return Array.from(volumeByWeek.entries())
      .map(([week, volume]) => ({ week, volume: Math.round(volume) }))
      .sort((a, b) => a.week.localeCompare(b.week))
      .slice(-4)
  }, [workoutSessions])

  const fetchAnalyticsData = useCallback(async (uid: string) => {
    const version = ++requestVersion.current
    const end = todayKey
    const start = period === 'all' ? null : progressionPeriodStart(new Date(`${end}T12:00:00Z`), Number(period.slice(0, -1)))
    setSourceStates(INITIAL_SOURCE_STATES)
    // Stable (date,id) order avoids skipped entries where many foods share a day.
    const journalQuery = (table: string, columns: string) => {
      let query = supabase.from(table).select(columns).eq('user_id', uid).lte('date', end)
      if (start) query = query.gte('date', start)
      return query.order('date', { ascending: false }).order('id').returns<Record<string, unknown>[]>()
    }
    const [prRes, calsRes, waterRes, wellbeingRes] = await Promise.all([
      supabase.from('personal_records').select('*').eq('user_id', uid).order('achieved_at', { ascending: false }).limit(50),
      readAnalyticsPages<{ date: string; calories: number; protein: number; carbs: number; fat: number }>((from, to) => journalQuery('daily_food_logs', 'date,calories,protein,carbs,fat').range(from, to).returns<{ date: string; calories: number; protein: number; carbs: number; fat: number }[]>()),
      readAnalyticsPages<{ date: string; amount_ml: number }>((from, to) => journalQuery('water_intake', 'date,amount_ml').range(from, to).returns<{ date: string; amount_ml: number }[]>()),
      readAnalyticsPages<ProgressionWellbeingEntry>((from, to) => journalQuery('daily_checkins', 'date,mood,sleep_hours,note').range(from, to).returns<ProgressionWellbeingEntry[]>()),
    ])
    if (version !== requestVersion.current || ownerRef.current !== uid) return

    const recordRows = (prRes.data || []) as ProgressionRecordRow[]
    const recordExerciseNames = getDistinctRecordExerciseNames(recordRows)
    let muscleMetadata: ExerciseMuscleMetadata[] = []
    if (!prRes.error && recordExerciseNames.length) {
      const { data } = await supabase
        .from('exercises_db')
        .select('name, muscle_group')
        .in('name', recordExerciseNames)
        .limit(recordExerciseNames.length)
      muscleMetadata = data || []
    }
    if (version !== requestVersion.current || ownerRef.current !== uid) return
    setDailyTruncated(calsRes.truncated || waterRes.truncated || wellbeingRes.truncated)
    setLoadedKey(`${uid}:${period}:${todayKey}`)
    recordMuscleMetadataRef.current = muscleMetadata
    setPersonalRecords(enrichRecordsWithMuscleMetadata(recordRows, muscleMetadata))
    setWellbeingEntries(wellbeingRes.data || [])
    setSourceStates({
      records: prRes.error ? 'error' : 'ready',
      nutrition: calsRes.error ? 'error' : 'ready',
      hydration: waterRes.error ? 'error' : 'ready',
      wellbeing: wellbeingRes.error ? 'error' : 'ready',
    })

    // Aggregate calories by day
    const calsByDay: Record<string, { calories: number; protein: number; carbs: number; fat: number }> = {}
    for (const m of (calsRes.data || [])) {
      if (!calsByDay[m.date]) calsByDay[m.date] = { calories: 0, protein: 0, carbs: 0, fat: 0 }
      calsByDay[m.date].calories += m.calories || 0
      calsByDay[m.date].protein += m.protein || 0
      calsByDay[m.date].carbs += m.carbs || 0
      calsByDay[m.date].fat += m.fat || 0
    }
    const calArr = Object.entries(calsByDay).map(([date, v]) => ({ date, ...v })).sort((a, b) => a.date.localeCompare(b.date))
    setWeeklyCalories(calArr)

    // Aggregate water by day
    const waterByDay: Record<string, number> = {}
    for (const w of (waterRes.data || [])) {
      waterByDay[w.date] = (waterByDay[w.date] || 0) + (w.amount_ml || 0)
    }
    setWeeklyWater(Object.entries(waterByDay).map(([date, ml]) => ({ date, ml })).sort((a, b) => a.date.localeCompare(b.date)))
    loadedUserRef.current = `${uid}:${period}:${todayKey}`
  }, [period, supabase, todayKey])

  // Home needs only the latest PR snapshot. The full analytics payload remains
  // lazy and is requested only after opening Progression.
  useEffect(() => {
    if (!userId || enabled) return
    let active = true
    supabase.from('personal_records')
      .select('*')
      .eq('user_id', userId)
      .order('achieved_at', { ascending: false })
      .limit(1)
      .then(({ data, error }) => {
        if (!active) return
        setPersonalRecords(data || [])
        setSourceStates(previous => ({ ...previous, records: error ? 'error' : 'ready' }))
      })
    return () => { active = false }
  }, [enabled, supabase, userId])

  useEffect(() => {
    if (!enabled || !userId || loadedUserRef.current === requestKey) return
    let active = true
    queueMicrotask(() => { if (active) void fetchAnalyticsData(userId) })
    return () => { active = false; requestVersion.current += 1; loadedUserRef.current = null }
  }, [enabled, fetchAnalyticsData, requestKey, userId])

  // PR detection -- called after finishing a workout set
  async function checkForPR(uid: string, exerciseName: string, weight: number, reps: number, loadMode = 'legacy'): Promise<{ newPR: boolean; exercise?: string; value?: number; previous?: number }> {
    if (!uid || !weight || !reps || (loadMode === 'band' || loadMode === 'unquantified')) return { newPR: false }

    const estimated1RM = weight * (1 + reps / 30) // Epley formula
    const { data: currentRecord, error: recordError } = await supabase
      .from('personal_records')
      .select('value')
      .eq('user_id', uid)
      .eq('exercise_name', exerciseName)
      .eq('record_type', '1rm')
      .eq('load_mode', loadMode)
      .maybeSingle()
    if (recordError) throw recordError

    if (!currentRecord || estimated1RM > (currentRecord.value || 0)) {
      const {error: saveRecordError} = await supabase.from('personal_records').upsert({
        user_id: uid,
        exercise_name: exerciseName,
        record_type: '1rm',
        load_mode: loadMode,
        value: Math.round(estimated1RM * 10) / 10,
        unit: 'kg',
        previous_value: currentRecord?.value || null,
        achieved_at: new Date().toISOString().split('T')[0],
      }, { onConflict: 'user_id, exercise_name, record_type, load_mode' })
      if (saveRecordError) throw saveRecordError

      const {error: saveWeightError} = await supabase.from('personal_records').upsert({
        user_id: uid,
        exercise_name: exerciseName,
        record_type: 'max_weight',
        load_mode: loadMode,
        value: weight,
        unit: 'kg',
        achieved_at: new Date().toISOString().split('T')[0],
      }, { onConflict: 'user_id, exercise_name, record_type, load_mode' })
      if (saveWeightError) throw saveWeightError

      const { data: prs } = await supabase.from('personal_records').select('*').eq('user_id', uid).order('achieved_at', { ascending: false }).limit(enabled ? 50 : 1)
      setPersonalRecords(enrichRecordsWithMuscleMetadata(prs || [], recordMuscleMetadataRef.current))

      return { newPR: true, exercise: exerciseName, value: Math.round(estimated1RM * 10) / 10, previous: currentRecord?.value }
    }
    return { newPR: false }
  }

  return {
    personalRecords, weeklyCalories, weeklyWater, weeklyVolume, weightHistoryFull,
    wellbeingEntries, dailyTruncated, sourceStates: enabled && loadedKey !== requestKey ? INITIAL_SOURCE_STATES : sourceStates, fetchAnalyticsData, checkForPR,
  }
}
