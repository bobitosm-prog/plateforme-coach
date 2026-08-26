import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

import {
  buildProgressionViewModel,
  normalizeProgressionGoal,
  PROGRESSION_MEASUREMENT_FIELDS,
  type ProgressionViewModelInput,
} from '@/lib/progression/progression-dashboard-model'
import {
  getProgressionDateKey,
  getProgressionWeekKey,
  getProgressionWeekWindow,
} from '@/lib/progression/progression-date'

const now = new Date('2026-08-26T12:00:00.000Z')

function input(overrides: Partial<ProgressionViewModelInput> = {}): ProgressionViewModelInput {
  return {
    period: '30d',
    now,
    goal: 'maintain',
    weight: { logs: [] },
    sessions: { rows: [] },
    records: { rows: [] },
    measurements: { rows: [] },
    photos: { rows: [] },
    wellbeing: { rows: [] },
    ...overrides,
  }
}

describe('Progression V2 period and weight model', () => {
  const logs = [
    { date: '2026-05-20', poids: 84 },
    { date: '2026-07-20', poids: 82 },
    { date: '2026-08-01', poids: 81 },
    { date: '2026-08-20', poids: 80 },
    { date: '2026-08-26', poids: 79 },
  ]

  it.each([
    ['7d', ['2026-08-20', '2026-08-26'], -1],
    ['30d', ['2026-08-01', '2026-08-20', '2026-08-26'], -2],
    ['90d', ['2026-07-20', '2026-08-01', '2026-08-20', '2026-08-26'], -3],
  ] as const)('filters %s and calculates the delta from that period', (period, dates, delta) => {
    const model = buildProgressionViewModel(input({ period, weight: { logs } }))

    expect(model.weight.series.map(point => point.date)).toEqual(dates)
    expect(model.weight.delta).toBe(delta)
    expect(model.weight.current).toBe(79)
    expect(model.weight.previous).toBe(80)
    expect(model.weight.trend).toBe('down')
  })

  it('marks a truncated all period instead of claiming complete history', () => {
    const model = buildProgressionViewModel(input({
      period: 'all',
      weight: { logs, isTruncated: true },
    }))

    expect(model.period.key).toBe('all')
    expect(model.period.days).toBeNull()
    expect(model.period.isTruncated).toBe(true)
    expect(model.period.availableFrom).toBe('2026-05-20')
    expect(model.weight.state).toBe('partial')
  })

  it('keeps profile current_weight as an explicit non-historical fallback', () => {
    const model = buildProgressionViewModel(input({
      weight: { logs: [], profileCurrentWeight: 78.5, targetWeight: 75 },
    }))

    expect(model.weight.current).toBe(78.5)
    expect(model.weight.currentSource).toBe('profile_fallback')
    expect(model.weight.series).toEqual([])
    expect(model.weight.delta).toBeNull()
    expect(model.weight.state).toBe('partial')
  })

  it('never converts a read error into empty or zero', () => {
    const model = buildProgressionViewModel(input({
      weight: {
        logs: [{ date: '2026-08-26', poids: 79 }],
        state: 'error',
        errorCode: 'PROGRESSION_WEIGHT_READ_FAILED',
      },
    }))

    expect(model.weight.state).toBe('error')
    expect(model.weight.current).toBeNull()
    expect(model.weight.series).toEqual([])
    expect(model.errors.weight?.code).toBe('PROGRESSION_WEIGHT_READ_FAILED')
  })
})

describe('Progression goal normalization', () => {
  it.each([
    ['mass', 'gain'],
    ['bulk', 'gain'],
    ['prise_masse', 'gain'],
    ['gain', 'gain'],
    ['cut', 'loss'],
    ['weight_loss', 'loss'],
    ['loss', 'loss'],
    ['maintain', 'maintain'],
    ['maintenance', 'maintain'],
    ['maintien', 'maintain'],
    ['objectif libre saisi par le coach', 'unknown'],
    [null, 'unknown'],
  ])('maps %j to %s', (value, expected) => {
    expect(normalizeProgressionGoal(value)).toBe(expected)
  })
})

describe('Progression Zurich calendar and regularity', () => {
  it('uses Zurich dates and Monday week keys across local midnight', () => {
    expect(getProgressionDateKey(new Date('2026-08-24T21:59:59.000Z'))).toBe('2026-08-24')
    expect(getProgressionDateKey(new Date('2026-08-24T22:00:01.000Z'))).toBe('2026-08-25')
    expect(getProgressionWeekKey(new Date('2026-08-30T12:00:00.000Z'))).toBe('2026-08-24')
    expect(getProgressionWeekKey(new Date('2026-08-31T12:00:00.000Z'))).toBe('2026-08-31')
  })

  it('resolves DST-safe week boundaries', () => {
    const spring = getProgressionWeekWindow(new Date('2026-03-29T12:00:00.000Z'))
    const autumn = getProgressionWeekWindow(new Date('2026-10-25T12:00:00.000Z'))

    expect(spring?.start.toISOString()).toBe('2026-03-22T23:00:00.000Z')
    expect(spring?.end.toISOString()).toBe('2026-03-29T22:00:00.000Z')
    expect(autumn?.start.toISOString()).toBe('2026-10-18T22:00:00.000Z')
    expect(autumn?.end.toISOString()).toBe('2026-10-25T23:00:00.000Z')
  })

  it('exposes current and previous weeks without inventing adherence', () => {
    const model = buildProgressionViewModel(input({
      sessions: {
        rows: [
          { created_at: '2026-08-17T10:00:00Z', completed: true },
          { created_at: '2026-08-18T10:00:00Z', completed: true },
          { created_at: '2026-08-24T10:00:00Z', completed: true },
          { created_at: '2026-08-25T10:00:00Z', completed: true },
          { created_at: '2026-08-26T10:00:00Z', completed: true },
        ],
      },
    }))

    expect(model.regularity.previousWeek).toMatchObject({ weekKey: '2026-08-17', completed: 2 })
    expect(model.regularity.currentWeek).toMatchObject({ weekKey: '2026-08-24', completed: 3 })
    expect(model.regularity.currentWeek?.planned).toBeNull()
    expect(model.regularity.currentWeek?.adherence).toBeNull()
    expect(model.regularity.trend).toBe('up')
  })

  it('calculates adherence only when reliable planned data is supplied', () => {
    const model = buildProgressionViewModel(input({
      sessions: {
        rows: [{ created_at: '2026-08-24T10:00:00Z', completed: true }],
        plannedByWeek: { '2026-08-24': 4 },
      },
    }))

    expect(model.regularity.currentWeek?.adherence).toBe(0.25)
  })
})

describe('Progression training volume and exercise series', () => {
  const previousWeekSet = {
    completed: true,
    created_at: '2026-08-18T10:00:00Z',
    exercise_id: 'bench-id',
    exercise_name: 'Bench press',
    weight: 100,
    reps: 5,
  }
  const currentWeekSet = {
    ...previousWeekSet,
    created_at: '2026-08-25T10:00:00Z',
    weight: 105,
  }

  it('derives weekly volume and e1RM from the same nested workout sets', () => {
    const model = buildProgressionViewModel(input({
      sessions: {
        rows: [
          { created_at: previousWeekSet.created_at, workout_sets: [previousWeekSet] },
          { created_at: currentWeekSet.created_at, workout_sets: [currentWeekSet] },
        ],
      },
    }))

    expect(model.volume.previousWeek).toBe(500)
    expect(model.volume.currentWeek).toBe(525)
    expect(model.volume.deltaPercent).toBe(5)
    expect(model.exerciseProgress.exercises[0]).toMatchObject({
      exerciseId: 'bench-id',
      exerciseName: 'Bench press',
      metric: 'e1rm',
    })
    expect(model.exerciseProgress.exercises[0].series.map(point => point.value)).toEqual([116.7, 122.5])
  })

  it('does not manufacture an infinite percentage when previous volume is zero', () => {
    const model = buildProgressionViewModel(input({
      sessions: { rows: [{ created_at: currentWeekSet.created_at, workout_sets: [currentWeekSet] }] },
    }))

    expect(model.volume.previousWeek).toBe(0)
    expect(model.volume.currentWeek).toBe(525)
    expect(model.volume.deltaPercent).toBeNull()
  })

  it('preserves a sessions error in both regularity and volume', () => {
    const model = buildProgressionViewModel(input({
      sessions: { rows: [], state: 'error', errorCode: 'PROGRESSION_SESSIONS_READ_FAILED' },
    }))

    expect(model.regularity.state).toBe('error')
    expect(model.volume.state).toBe('error')
    expect(model.errors.sets?.code).toBe('PROGRESSION_SESSIONS_READ_FAILED')
  })
})

describe('Progression personal records', () => {
  it('distinguishes estimated 1RM from max weight without inventing history', () => {
    const model = buildProgressionViewModel(input({
      records: {
        rows: [
          { exercise_name: 'Squat', record_type: '1rm', value: 150, previous_value: 145, unit: 'kg', achieved_at: '2026-08-25' },
          { exercise_name: 'Squat', record_type: 'max_weight', value: 130, unit: 'kg', achieved_at: '2026-08-24' },
        ],
      },
    }))

    expect(model.records.items[0]).toMatchObject({ estimated: true, delta: 5, previousValue: 145 })
    expect(model.records.items[1]).toMatchObject({ estimated: false, delta: null, previousValue: null })
    expect(model.records.hasEventHistory).toBe(false)
  })
})

describe('Progression canonical measurements', () => {
  it('exposes only canonical fields with current, previous, delta and series', () => {
    const model = buildProgressionViewModel(input({
      measurements: {
        rows: [
          { date: '2026-07-30', waist: 90, biceps: 34, calves: 38 },
          { date: '2026-08-01', waist: 88, biceps: 35, calves: 38.5 },
        ],
      },
    }))

    expect(PROGRESSION_MEASUREMENT_FIELDS).toEqual(['chest', 'waist', 'hips', 'biceps', 'thighs', 'calves'])
    expect(model.measurements.fields.waist).toMatchObject({ current: 88, previous: 90, delta: -2, state: 'ready' })
    expect(model.measurements.fields.biceps?.series).toHaveLength(2)
    expect(model.measurements.fields.chest).toBeUndefined()
    expect(model.measurements.state).toBe('partial')
  })

  it('ignores outdated runtime aliases', () => {
    const model = buildProgressionViewModel(input({
      measurements: {
        rows: [{ date: '2026-08-01', left_arm: 35, left_thigh: 58, body_fat: 18 } as never],
      },
    }))

    expect(model.measurements.fields).toEqual({})
    expect(model.measurements.state).toBe('empty')
  })

  it('keeps partial data and read errors distinct', () => {
    const partial = buildProgressionViewModel(input({
      measurements: { rows: [{ date: '2026-08-01', hips: 94 }] },
    }))
    const failed = buildProgressionViewModel(input({
      measurements: { rows: [], state: 'error', errorCode: 'PROGRESSION_MEASUREMENTS_READ_FAILED' },
    }))

    expect(partial.measurements.fields.hips?.state).toBe('partial')
    expect(failed.measurements.state).toBe('error')
    expect(failed.errors.measurements?.code).toBe('PROGRESSION_MEASUREMENTS_READ_FAILED')
  })
})

describe('Progression V2 architecture guards', () => {
  const model = readFileSync('lib/progression/progression-dashboard-model.ts', 'utf8')
  const date = readFileSync('lib/progression/progression-date.ts', 'utf8')
  const analytics = readFileSync('app/hooks/useAnalytics.ts', 'utf8')
  const dashboard = readFileSync('app/hooks/useClientDashboard.ts', 'utf8')
  const progressTab = readFileSync('app/components/tabs/ProgressTab.tsx', 'utf8')

  it('keeps selectors pure and independent from product authority or coach relations', () => {
    expect(model).not.toMatch(/supabase|supabase\.from\(|fetch\(|coach_clients|resolveEffectiveEntitlement|resolveUserCapabilities/i)
    expect(date).not.toMatch(/supabase|supabase\.from\(|fetch\(/i)
  })

  it('keeps Progression analytics lazy and Home on a one-record snapshot', () => {
    expect(dashboard).toContain("enabled: activeTab === 'progress'")
    expect(dashboard).not.toContain('analyticsHook.fetchAnalyticsData')
    expect(analytics).toMatch(/if \(!userId \|\| enabled\) return/)
    expect(analytics).toMatch(/limit\(1\)/)
  })

  it('removes duplicate weight and workout set reads from analytics', () => {
    expect(analytics).not.toContain("from('weight_logs')")
    expect(analytics).not.toContain("from('workout_sets')")
    expect(analytics).toContain('workoutSessions')
    expect(analytics).toContain('weightHistory')
  })

  it('loads detailed private photo URLs only when the Photos section is open', () => {
    expect(progressTab).toContain('shouldLoadSignedPhotoUrls(photosOpen, progressPhotos.length)')
    expect(progressTab).toContain("const [photosOpen, setPhotosOpen] = useState(false)")
    expect(progressTab).toContain('createSignedUrl(photo.photo_url, 3600)')
  })

  it('adds no API, SQL or direct DB access to future visual components', () => {
    const hook = readFileSync('app/hooks/useProgressionViewModel.ts', 'utf8')
    expect(hook).not.toMatch(/supabase|\.from\(|fetch\(/i)
    expect(model).not.toMatch(/entitlement|coach relation|NutritionTab|TrainingTab/i)
  })
})
