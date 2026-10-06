// @vitest-environment jsdom
import { act, cleanup, renderHook, waitFor } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import useAnalytics from '@/app/hooks/useAnalytics'

const sessions: [] = [], weights: [] = []
afterEach(cleanup)
it('keeps the newest period when an older daily read completes late, with owner-scoped queries', async () => {
  let releaseOld: (value: unknown) => void = () => {}
  const old = new Promise(resolve => { releaseOld = resolve })
  let calorieReads = 0
  const owners: string[] = []
  const db = { from: vi.fn((table: string) => {
    const query = {
      select: () => query, order: () => query, limit: () => query,
      range: () => query, returns: () => query, gte: () => query, lte: () => query,
      eq: (key: string, value: string) => { if (key === 'user_id') owners.push(value); return query },
      then: (resolve: (value: unknown) => void) => {
        if (table === 'daily_food_logs' && ++calorieReads === 1) return old.then(resolve)
        return Promise.resolve({ data: table === 'daily_food_logs' ? [{ date: '2026-10-06', calories: 200, protein: 10, carbs: 20, fat: 5 }] : [], error: null }).then(resolve)
      },
    }
    return query
  }) } as unknown as SupabaseClient
  const { result, rerender } = renderHook(({period}: {period:'30d'|'7d'}) => useAnalytics({supabase:db,enabled:true,userId:'owner-A',period,workoutSessions:sessions,weightHistory:weights}), { initialProps:{period:'30d'} })
  await waitFor(()=>expect(calorieReads).toBe(1))
  rerender({period:'7d'})
  expect(result.current.sourceStates.nutrition).toBe('loading')
  await waitFor(()=>expect(result.current.sourceStates.nutrition).toBe('ready'))
  await act(async()=>releaseOld({data:[{date:'2026-10-06',calories:999}],error:null}))
  expect(result.current.weeklyCalories[0].calories).toBe(200)
  expect(owners.length).toBeGreaterThanOrEqual(8)
  expect(owners.every(owner=>owner==='owner-A')).toBe(true)
})
