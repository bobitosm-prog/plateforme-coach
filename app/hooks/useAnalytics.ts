'use client'
import { useRef, useState } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'
import { createAnalyticsReadModel, LatestAnalyticsReadCoordinator, type AnalyticsReadPort } from '../../lib/progression'
import { createNutritionJournalRepository } from '../../lib/repositories/nutrition'
import type { DatabaseClient } from '../../lib/supabase/types'

interface UseAnalyticsParams {
  supabase: SupabaseClient
}

export default function useAnalytics({ supabase }: UseAnalyticsParams) {
  const [personalRecords, setPersonalRecords] = useState<any[]>([])
  const [weeklyCalories, setWeeklyCalories] = useState<{ date: string; calories: number; protein: number; carbs: number; fat: number }[]>([])
  const [weeklyWater, setWeeklyWater] = useState<{ date: string; ml: number }[]>([])
  const [weeklyVolume, setWeeklyVolume] = useState<{ week: string; volume: number }[]>([])
  const [weightHistoryFull, setWeightHistoryFull] = useState<{ date: string; poids: number }[]>([])
  const requestCoordinator = useRef(new LatestAnalyticsReadCoordinator())

  async function fetchAnalyticsData(uid: string) {
    const request = requestCoordinator.current.begin(uid)
    const now = new Date()
    const [result, legacyWeeklyVolume] = await Promise.all([
      createAnalyticsReadModel(createAnalyticsPort(supabase)).load({
        ownerUserId: uid,
        clock: { now: () => now },
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      }),
      loadLegacyWeeklyVolume(supabase, uid, now),
    ])
    if (!requestCoordinator.current.isCurrent(request)) return
    if (!result.data) {
      setPersonalRecords([])
      setWeeklyCalories([])
      setWeeklyWater([])
      setWeightHistoryFull([])
      return
    }
    setPersonalRecords([...result.data.personalRecords])
    setWeeklyCalories([...result.data.weeklyCalories])
    setWeeklyWater([...result.data.weeklyWater])
    if (legacyWeeklyVolume) setWeeklyVolume(legacyWeeklyVolume)
    setWeightHistoryFull(result.data.weightHistoryFull.map(item => ({ date: item.date, poids: item.weight })))
  }

  // PR detection -- called after finishing a workout set
  async function checkForPR(uid: string, exerciseName: string, weight: number, reps: number): Promise<{ newPR: boolean; exercise?: string; value?: number; previous?: number }> {
    if (!uid || !weight || !reps) return { newPR: false }

    const estimated1RM = weight * (1 + reps / 30) // Epley formula
    const { data: currentRecord } = await supabase
      .from('personal_records')
      .select('value')
      .eq('user_id', uid)
      .eq('exercise_name', exerciseName)
      .eq('record_type', '1rm')
      .maybeSingle()

    if (!currentRecord || estimated1RM > (currentRecord.value || 0)) {
      await supabase.from('personal_records').upsert({
        user_id: uid,
        exercise_name: exerciseName,
        record_type: '1rm',
        value: Math.round(estimated1RM * 10) / 10,
        unit: 'kg',
        previous_value: currentRecord?.value || null,
        achieved_at: new Date().toISOString().split('T')[0],
      }, { onConflict: 'user_id, exercise_name, record_type' })

      await supabase.from('personal_records').upsert({
        user_id: uid,
        exercise_name: exerciseName,
        record_type: 'max_weight',
        value: weight,
        unit: 'kg',
        achieved_at: new Date().toISOString().split('T')[0],
      }, { onConflict: 'user_id, exercise_name, record_type' })

      const { data: prs } = await supabase.from('personal_records')
        .select('id,user_id,exercise_name,record_type,value,previous_value,unit,achieved_at,created_at')
        .eq('user_id', uid).order('achieved_at', { ascending: false }).limit(50)
      setPersonalRecords(prs || [])

      return { newPR: true, exercise: exerciseName, value: Math.round(estimated1RM * 10) / 10, previous: currentRecord?.value }
    }
    return { newPR: false }
  }

  return {
    personalRecords, weeklyCalories, weeklyWater, weeklyVolume, weightHistoryFull,
    fetchAnalyticsData, checkForPR,
  }
}

function createAnalyticsPort(supabase: SupabaseClient): AnalyticsReadPort {
  const failed = () => ({ ok: false as const, kind: 'failure' as const })
  const journal = createNutritionJournalRepository(supabase as DatabaseClient)
  return {
    async listPersonalRecords(ownerUserId, limit) {
      const { data, error } = await supabase.from('personal_records')
        .select('id,user_id,exercise_name,record_type,value,previous_value,unit,achieved_at,created_at')
        .eq('user_id', ownerUserId).order('achieved_at', { ascending: false }).limit(limit)
      return error ? failed() : { ok: true, data: data ?? [] }
    },
    async listNutrition(ownerUserId, fromDate, limit) {
      const result = await journal.listDailyFoodLogsForOwner(ownerUserId, { fromDate, limit })
      return result.ok ? { ok: true, data: result.data } : failed()
    },
    async listWater(ownerUserId, fromDate, limit) {
      const result = await journal.listWaterIntakeForOwner(ownerUserId, { fromDate, limit })
      return result.ok
        ? { ok: true, data: result.data.map(item => ({ date: item.date, milliliters: item.amount_ml })) }
        : failed()
    },
    async listWeights(ownerUserId, fromDate, limit) {
      const { data, error } = await supabase.from('weight_logs').select('date,poids')
        .eq('user_id', ownerUserId).gte('date', fromDate).order('date', { ascending: true }).limit(limit)
      return error ? failed() : { ok: true, data: (data ?? []).map(item => ({ date: item.date, weight: item.poids })) }
    },
  }
}

async function loadLegacyWeeklyVolume(supabase: SupabaseClient, ownerUserId: string, now: Date) {
  const fourWeeksAgo = new Date(now)
  fourWeeksAgo.setDate(now.getDate() - 28)
  const { data, error } = await supabase.from('workout_sets').select('weight,reps,created_at')
    .eq('user_id', ownerUserId).gte('created_at', fourWeeksAgo.toISOString()).eq('completed', true).limit(500)
  if (error || !data?.length) return null
  const totals = new Map<string, number>()
  for (const set of data) {
    const weekStart = new Date(set.created_at)
    const day = weekStart.getDay()
    weekStart.setDate(weekStart.getDate() - (day === 0 ? 6 : day - 1))
    const key = weekStart.toISOString().split('T')[0]
    totals.set(key, (totals.get(key) ?? 0) + (set.weight || 0) * (set.reps || 0))
  }
  return [...totals].map(([week, volume]) => ({ week, volume: Math.round(volume) })).sort((a, b) => a.week.localeCompare(b.week))
}
