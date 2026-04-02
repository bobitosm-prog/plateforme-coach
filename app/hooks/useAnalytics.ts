'use client'
import { useState } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'

interface UseAnalyticsParams {
  supabase: SupabaseClient
}

export default function useAnalytics({ supabase }: UseAnalyticsParams) {
  const [personalRecords, setPersonalRecords] = useState<any[]>([])
  const [weeklyCalories, setWeeklyCalories] = useState<{ date: string; calories: number; proteins: number; carbs: number; fats: number }[]>([])
  const [weeklyWater, setWeeklyWater] = useState<{ date: string; ml: number }[]>([])
  const [weeklyVolume, setWeeklyVolume] = useState<{ week: string; volume: number }[]>([])
  const [weightHistoryFull, setWeightHistoryFull] = useState<{ date: string; poids: number }[]>([])

  async function fetchAnalyticsData(uid: string) {
    const today = new Date()
    const sevenDaysAgo = new Date(today)
    sevenDaysAgo.setDate(today.getDate() - 7)
    const ninetyDaysAgo = new Date(today)
    ninetyDaysAgo.setDate(today.getDate() - 90)

    const [prRes, calsRes, waterRes, weightsFullRes] = await Promise.all([
      supabase.from('personal_records').select('*').eq('user_id', uid).order('achieved_at', { ascending: false }).limit(50),
      supabase.from('meal_logs').select('date, calories, proteins, carbs, fats').eq('user_id', uid).gte('date', sevenDaysAgo.toISOString().split('T')[0]).order('date').limit(100),
      supabase.from('water_intake').select('date, amount_ml').eq('user_id', uid).gte('date', sevenDaysAgo.toISOString().split('T')[0]).order('date').limit(30),
      supabase.from('weight_logs').select('date, poids').eq('user_id', uid).gte('date', ninetyDaysAgo.toISOString().split('T')[0]).order('date', { ascending: true }).limit(100),
    ])

    setPersonalRecords(prRes.data || [])
    setWeightHistoryFull(weightsFullRes.data || [])

    // Aggregate calories by day
    const calsByDay: Record<string, { calories: number; proteins: number; carbs: number; fats: number }> = {}
    for (const m of (calsRes.data || [])) {
      if (!calsByDay[m.date]) calsByDay[m.date] = { calories: 0, proteins: 0, carbs: 0, fats: 0 }
      calsByDay[m.date].calories += m.calories || 0
      calsByDay[m.date].proteins += m.proteins || 0
      calsByDay[m.date].carbs += m.carbs || 0
      calsByDay[m.date].fats += m.fats || 0
    }
    const calArr = Object.entries(calsByDay).map(([date, v]) => ({ date, ...v })).sort((a, b) => a.date.localeCompare(b.date))
    setWeeklyCalories(calArr)

    // Aggregate water by day
    const waterByDay: Record<string, number> = {}
    for (const w of (waterRes.data || [])) {
      waterByDay[w.date] = (waterByDay[w.date] || 0) + (w.amount_ml || 0)
    }
    setWeeklyWater(Object.entries(waterByDay).map(([date, ml]) => ({ date, ml })).sort((a, b) => a.date.localeCompare(b.date)))

    // Weekly training volume from workout_sets (last 4 weeks)
    const fourWeeksAgo = new Date(today)
    fourWeeksAgo.setDate(today.getDate() - 28)
    const { data: setsData } = await supabase
      .from('workout_sets')
      .select('weight, reps, created_at')
      .eq('user_id', uid)
      .gte('created_at', fourWeeksAgo.toISOString())
      .eq('completed', true)
      .limit(500)

    if (setsData && setsData.length > 0) {
      const volByWeek: Record<string, number> = {}
      for (const s of setsData) {
        const d = new Date(s.created_at)
        const weekStart = new Date(d)
        const day = weekStart.getDay()
        weekStart.setDate(weekStart.getDate() - (day === 0 ? 6 : day - 1))
        const weekKey = weekStart.toISOString().split('T')[0]
        volByWeek[weekKey] = (volByWeek[weekKey] || 0) + (s.weight || 0) * (s.reps || 0)
      }
      setWeeklyVolume(
        Object.entries(volByWeek)
          .map(([week, volume]) => ({ week, volume: Math.round(volume) }))
          .sort((a, b) => a.week.localeCompare(b.week))
      )
    }
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

      const { data: prs } = await supabase.from('personal_records').select('*').eq('user_id', uid).order('achieved_at', { ascending: false }).limit(50)
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
