import { describe, expect, it } from 'vitest'
import { buildHomeViewModel } from '@/lib/home/home-dashboard-model'
import { getHomeDayWindow } from '@/lib/home/home-date'
import { DAILY_MEALS, resolveDailyCompletion } from '@/lib/home/daily-completion'

function model() {
  return buildHomeViewModel({
    today: getHomeDayWindow(new Date('2026-10-06T12:00:00Z')),
    identity: { firstName: 'Test' }, training: { state: 'ready', isCompleted: true, hasProgram: true },
    nutrition: { state: 'ready', caloriesConsumed: 200, caloriesTarget: 2500, loggedMealTypes: DAILY_MEALS },
    checkIn: { state: 'ready', mood: 'bien', sleep: 7 },
    coach: { relationStatus: 'not_found' },
    capabilities: { ai: true, training: true, nutrition: true, coachManaged: false },
  })
}
const checkIn = { mood: 'bien', sleep: '7' }
const water = { current: 3000, target: 3000, available: true }

describe('daily completion', () => {
  it('completes from journal coverage, never from a calorie quota', () => {
    const m = model()
    m.training.dayStatus = 'completed'
    expect(resolveDailyCompletion(m, checkIn, water).complete).toBe(true)
    m.nutrition.loggedMealTypes = ['breakfast', 'breakfast']
    m.nutrition.caloriesConsumed = 5000
    const result = resolveDailyCompletion(m, checkIn, water)
    expect(result.complete).toBe(false)
    expect(result.missingMeals).toEqual(['lunch', 'snack', 'dinner'])
  })
  it('accepts a planned rest day, but not an unfinished session', () => {
    const m = model()
    m.training.dayStatus = 'rest'
    expect(resolveDailyCompletion(m, checkIn, water).states.training).toBe('done')
    m.training.dayStatus = 'scheduled'
    expect(resolveDailyCompletion(m, checkIn, water).states.training).toBe('pending')
  })
  it('requires both mood and valid sleep, including an explicit zero', () => {
    for (const sleep of ['', 'NaN', '-1', '15']) {
      expect(resolveDailyCompletion(model(), { mood: 'bien', sleep }, water).states.morning).toBe('pending')
    }
    expect(resolveDailyCompletion(model(), { mood: null, sleep: '7' }, water).states.morning).toBe('pending')
    expect(resolveDailyCompletion(model(), { mood: 'fatigue', sleep: '0' }, water).states.morning).toBe('done')
  })
  it('keeps unknown reads and water shortfalls incomplete', () => {
    const m = model()
    m.nutrition.loggedMealTypes = null
    m.training.state = 'error'
    m.checkIn.state = 'loading'
    const result = resolveDailyCompletion(m, checkIn, { ...water, available: false })
    expect(Object.values(result.states)).toEqual(['unavailable','unavailable','unavailable','unavailable'])
    expect(result.complete).toBe(false)
    expect(resolveDailyCompletion(model(), checkIn, { ...water, current: 2750 }).states.hydration).toBe('pending')
    expect(resolveDailyCompletion(model(), checkIn, { ...water, target: 0 }).states.hydration).toBe('unavailable')
  })
})
