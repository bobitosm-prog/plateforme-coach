import { describe, expect, it } from 'vitest'
import {
  calculateMacrosOnTargetBadge,
  createMacrosOnTargetBadgeReader,
} from '@/lib/nutrition/macros-on-target-badge'

const owner = 'owner-1'
const row = (date: string, calories: unknown, userId: string = owner) => ({
  user_id: userId,
  date,
  calories,
})

describe('C07 macros_on_target calculation', () => {
  it('preserves complete valid data, real zeros and the historic inclusive threshold', () => {
    const result = calculateMacrosOnTargetBadge({
      ownerUserId: owner,
      calorieGoal: 100,
      rows: [
        row('2026-07-25', 89.99),
        row('2026-07-24', 90),
        row('2026-07-23', 110),
        row('2026-07-22', 110.01),
        row('2026-07-21', 0),
      ],
    })
    expect(result).toMatchObject({
      status: 'calculable',
      matchingDays: 2,
      calorieGoal: 100,
    })
  })

  it('adds several valid rows from the same day and converts numeric strings', () => {
    expect(calculateMacrosOnTargetBadge({
      ownerUserId: owner,
      calorieGoal: '100',
      rows: [
        row('2026-07-25', '50.5'),
        row('2026-07-25', '49.5'),
      ],
    })).toMatchObject({
      status: 'calculable',
      matchingDays: 1,
      calorieGoal: 100,
    })
  })

  it('treats a successful empty collection as a calculable zero-day result', () => {
    expect(calculateMacrosOnTargetBadge({
      ownerUserId: owner,
      calorieGoal: 100,
      rows: [],
    })).toEqual({
      status: 'calculable',
      matchingDays: 0,
      calorieGoal: 100,
    })
  })

  it.each([
    ['undefined', undefined],
    ['null', null],
    ['absent', Symbol.for('absent')],
  ] as const)('keeps a %s goal absent and non-calculable', (_, goal) => {
    const input: Record<string, unknown> = {
      ownerUserId: owner,
      rows: [row('2026-07-25', 100)],
    }
    if (goal !== Symbol.for('absent')) input.calorieGoal = goal
    expect(calculateMacrosOnTargetBadge(input)).toEqual({
      status: 'not_calculable',
      reason: 'goal_absent',
    })
  })

  it.each([
    ['real zero', 0],
    ['negative', -1],
    ['invalid string', 'invalid'],
    ['empty string', ''],
    ['NaN', Number.NaN],
    ['Infinity', Number.POSITIVE_INFINITY],
  ])('keeps a %s goal invalid and non-calculable', (_, calorieGoal) => {
    expect(calculateMacrosOnTargetBadge({
      ownerUserId: owner,
      calorieGoal,
      rows: [row('2026-07-25', 100)],
    })).toEqual({
      status: 'not_calculable',
      reason: 'goal_invalid',
    })
  })

  it.each([
    ['null', null],
    ['undefined', undefined],
    ['absent', Symbol.for('absent')],
  ] as const)('keeps %s calories unknown and non-calculable', (_, calories) => {
    const log: Record<string, unknown> = { user_id: owner, date: '2026-07-25' }
    if (calories !== Symbol.for('absent')) log.calories = calories
    expect(calculateMacrosOnTargetBadge({
      ownerUserId: owner,
      calorieGoal: 100,
      rows: [log],
    })).toEqual({
      status: 'not_calculable',
      reason: 'consumption_unknown',
    })
  })

  it.each([
    ['negative', -1],
    ['invalid string', 'invalid'],
    ['empty string', ''],
    ['NaN', Number.NaN],
    ['Infinity', Number.POSITIVE_INFINITY],
  ])('keeps %s calories invalid and non-calculable', (_, calories) => {
    expect(calculateMacrosOnTargetBadge({
      ownerUserId: owner,
      calorieGoal: 100,
      rows: [row('2026-07-25', calories)],
    })).toEqual({
      status: 'not_calculable',
      reason: 'consumption_invalid',
    })
  })

  it('rejects a row that explicitly belongs to another owner', () => {
    expect(calculateMacrosOnTargetBadge({
      ownerUserId: owner,
      calorieGoal: 100,
      rows: [row('2026-07-25', 100, 'owner-2')],
    })).toEqual({
      status: 'not_calculable',
      reason: 'owner_mismatch',
    })
  })
})

describe('C07 macros_on_target read lifecycle', () => {
  it('distinguishes a profiles error and does not execute the logs read', async () => {
    let logReads = 0
    const reader = createMacrosOnTargetBadgeReader({
      readGoal: async () => ({ data: null, error: new Error('profiles down') }),
      readLogs: async () => {
        logReads += 1
        return { data: [], error: null }
      },
    })
    await expect(reader.read(owner)).resolves.toMatchObject({
      status: 'failure',
      source: 'profiles',
    })
    expect(logReads).toBe(0)
  })

  it('distinguishes a Supabase logs error and a network rejection', async () => {
    const supabaseFailure = createMacrosOnTargetBadgeReader({
      readGoal: async () => ({ data: { calorie_goal: 100 }, error: null }),
      readLogs: async () => ({ data: null, error: new Error('logs down') }),
    })
    await expect(supabaseFailure.read(owner)).resolves.toMatchObject({
      status: 'failure',
      source: 'daily_food_logs',
    })

    const networkFailure = createMacrosOnTargetBadgeReader({
      readGoal: async () => ({ data: { calorie_goal: 100 }, error: null }),
      readLogs: async () => {
        throw new Error('network rejected')
      },
    })
    await expect(networkFailure.read(owner)).resolves.toMatchObject({
      status: 'failure',
      source: 'daily_food_logs',
    })
  })

  it('does not reuse a previously visible value after a failure', async () => {
    let fails = false
    const reader = createMacrosOnTargetBadgeReader({
      readGoal: async () => ({ data: { calorie_goal: 100 }, error: null }),
      readLogs: async () => fails
        ? ({ data: null, error: new Error('logs down') })
        : ({ data: [row('2026-07-25', 100)], error: null }),
    })
    await expect(reader.read(owner)).resolves.toMatchObject({
      status: 'ready',
      value: { status: 'calculable', matchingDays: 1 },
    })
    fails = true
    await expect(reader.read(owner)).resolves.toMatchObject({
      status: 'failure',
      source: 'daily_food_logs',
    })
  })

  it('marks an older response stale after a newer valid response', async () => {
    let releaseFirst: ((value: {
      data: { calorie_goal: number }
      error: null
    }) => void) | undefined
    let goalRead = 0
    const reader = createMacrosOnTargetBadgeReader({
      readGoal: async () => {
        goalRead += 1
        if (goalRead === 1) {
          return await new Promise(resolve => {
            releaseFirst = resolve
          })
        }
        return { data: { calorie_goal: 100 }, error: null }
      },
      readLogs: async () => ({
        data: [row('2026-07-25', 100)],
        error: null,
      }),
    })

    const older = reader.read(owner)
    const newer = reader.read(owner)
    await expect(newer).resolves.toMatchObject({
      status: 'ready',
      value: { status: 'calculable', matchingDays: 1 },
    })
    releaseFirst?.({ data: { calorie_goal: 100 }, error: null })
    await expect(older).resolves.toEqual({ status: 'stale' })
  })
})
