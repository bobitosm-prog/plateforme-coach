'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'

import { readNutritionJournalCycle } from '@/lib/nutrition/nutrition-journal-read-model'
import type { DailyFoodLogRow } from '@/lib/repositories/nutrition'

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
    const result = await readNutritionJournalCycle({ client: supabase, userId, selectedDate })
    if (current !== requestId.current) return
    if (result.status === 'error') {
      setState('error')
      return
    }
    const nextLogs: DailyFoodLogRow[] = [...result.dailyLogs]
    setDailyLogs(nextLogs)
    setDaysWithMeals(new Set(result.calendarDates))
    setWaterToday(result.waterTotal)
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
