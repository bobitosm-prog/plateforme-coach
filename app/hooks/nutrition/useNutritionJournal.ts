'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'

import { DAILY_FOOD_LOG_PROJECTION, type DailyFoodLogRow } from '@/lib/repositories/nutrition'

export type NutritionLoadState = 'idle' | 'loading' | 'ready' | 'empty' | 'error'

interface UseNutritionJournalParams {
  supabase: SupabaseClient
  userId: string | undefined
  selectedDate: string
}

export function useNutritionJournal({ supabase, userId, selectedDate }: UseNutritionJournalParams) {
  const [dailyLogs, setDailyLogs] = useState<DailyFoodLogRow[]>([])
  const [daysWithMeals, setDaysWithMeals] = useState<Set<string>>(new Set())
  const [waterToday, setWaterToday] = useState(0)
  const [state, setState] = useState<NutritionLoadState>('idle')
  const requestId = useRef(0)

  const reload = useCallback(async () => {
    if (!userId) {
      setDailyLogs([]); setWaterToday(0); setState('idle')
      return
    }
    const current = ++requestId.current
    setState('loading')
    const thirtyAgo = new Date(Date.now() - 30 * 86_400_000).toISOString().split('T')[0]
    const [logs, days, water] = await Promise.all([
      supabase.from('daily_food_logs').select(DAILY_FOOD_LOG_PROJECTION)
        .eq('user_id', userId).eq('date', selectedDate).order('created_at', { ascending: true }),
      supabase.from('daily_food_logs').select('date').eq('user_id', userId).gte('date', thirtyAgo),
      supabase.from('water_intake').select('amount_ml').eq('user_id', userId).eq('date', selectedDate).limit(50),
    ])
    if (current !== requestId.current) return
    if (logs.error || days.error || water.error) {
      setState('error')
      return
    }
    const nextLogs = logs.data ?? []
    setDailyLogs(nextLogs)
    setDaysWithMeals(new Set((days.data ?? []).map(item => item.date)))
    setWaterToday((water.data ?? []).reduce((sum, item) => sum + (item.amount_ml ?? 0), 0))
    setState(nextLogs.length ? 'ready' : 'empty')
  }, [selectedDate, supabase, userId])

  useEffect(() => {
    queueMicrotask(() => { void reload() })
    return () => { requestId.current += 1 }
  }, [reload])

  const addWater = useCallback(async (ml: number, date: string) => {
    if (!userId) return false
    const { error } = await supabase.from('water_intake').insert({ user_id: userId, amount_ml: ml, date })
    if (error) return false
    if (date === selectedDate) setWaterToday(previous => previous + ml)
    return true
  }, [selectedDate, supabase, userId])

  return { dailyLogs, setDailyLogs, daysWithMeals, setDaysWithMeals, waterToday, state, reload, retry: reload, addWater }
}
