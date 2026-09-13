import { describe, expect, it, vi } from 'vitest'
import {
  buildAthenaObservedContext,
  formatAthenaObservedContextForPrompt,
  loadAthenaObservedContext,
} from '@/lib/athena/observed-context'

const NOW = new Date('2026-09-13T12:00:00.000Z')

describe('Athena observed client context', () => {
  it('keeps only completed sessions and completed sets in the training window', () => {
    const context = buildAthenaObservedContext({
      workoutSessions: [
        { id: 'valid', completed: true, created_at: '2026-09-12T08:00:00Z' },
        { id: 'incomplete', completed: false, created_at: '2026-09-12T08:00:00Z' },
        { id: 'old', completed: true, created_at: '2026-07-01T08:00:00Z' },
        { id: 'future', completed: true, created_at: '2026-09-14T08:00:00Z' },
      ],
      workoutSets: [
        { session_id: 'valid', completed: true, exercise_id: 'bench', weight: 50, reps: 10, rir: 2 },
        { session_id: 'valid', completed: false, exercise_id: 'bench', weight: 100, reps: 10, rir: 0 },
        { session_id: 'incomplete', completed: true, exercise_id: 'squat', weight: 100, reps: 10, rir: 1 },
        { session_id: 'old', completed: true, exercise_id: 'row', weight: 60, reps: 10, rir: 1 },
      ],
    }, NOW)

    expect(context.training).toMatchObject({
      completedSessions: 1,
      completedSets: 1,
      distinctExercises: 1,
      externalLoadVolumeKg: 500,
      setsWithLoadAndReps: 1,
      medianRir: 2,
      setsWithRir: 1,
    })
  })

  it('aggregates nutrition per logged day and reports coverage explicitly', () => {
    const context = buildAthenaObservedContext({
      foodLogs: [
        { date: '2026-09-12', calories: 500, protein: 30, carbs: 60, fat: 15 },
        { date: '2026-09-12', calories: 700, protein: 50, carbs: 80, fat: 20 },
        { date: '2026-09-13', calories: 1800, protein: 120, carbs: 180, fat: 60 },
        { date: '2026-08-01', calories: 9000, protein: 900 },
        { date: 'invalid', calories: 9000, protein: 900 },
      ],
    }, NOW)

    expect(context.nutrition).toEqual({
      loggedDays: 2,
      coverageDays: 14,
      coverageRatio: 0.14,
      lastLoggedDate: '2026-09-13',
      averagesPerLoggedDay: {
        caloriesKcal: 1500,
        proteinGrams: 100,
        carbsGrams: 160,
        fatGrams: 47.5,
      },
    })
    expect(context.dataQuality.warnings).toContain('nutrition_coverage_below_7_of_14_days')
  })

  it('describes weight change only when at least two valid measurements exist', () => {
    const context = buildAthenaObservedContext({
      weightLogs: [
        { date: '2026-09-01', poids: 80 },
        { date: '2026-09-10', poids: 79.2 },
        { date: '2026-09-14', poids: 10 },
        { date: '2026-09-11', poids: 800 },
      ],
    }, NOW)

    expect(context.weight).toEqual({
      measurementCount: 2,
      firstKg: 80,
      latestKg: 79.2,
      changeKg: -0.8,
      firstDate: '2026-09-01',
      latestDate: '2026-09-10',
    })
    expect(context.dataQuality.warnings).not.toContain('weight_trend_requires_at_least_2_measurements')
  })

  it('summarizes wellbeing without exposing free-form notes', () => {
    const context = buildAthenaObservedContext({
      checkins: [
        { date: '2026-09-11', mood: 'bien', sleep_hours: 7 },
        { date: '2026-09-13', mood: 'top', sleep_hours: 8 },
      ],
    }, NOW)

    expect(context.wellbeing).toMatchObject({
      loggedDays: 2,
      coverageDays: 14,
      coverageRatio: 0.14,
      latestMood: 'top',
      latestDate: '2026-09-13',
      averageSleepHoursPerLoggedNight: 7.5,
      nightsWithSleep: 2,
    })
    expect(JSON.stringify(context)).not.toContain('note')
  })

  it('reports unavailable sources without throwing or fabricating data', () => {
    const context = buildAthenaObservedContext({
      sourceErrors: ['training', 'nutrition', 'training'],
    }, NOW)

    expect(context.dataQuality.sourceErrors).toEqual(['training', 'nutrition'])
    expect(context.dataQuality.warnings).toContain('one_or_more_sources_unavailable')
    expect(context.training.completedSessions).toBe(0)
    expect(context.nutrition.averagesPerLoggedDay.caloriesKcal).toBeNull()
    expect(context.weight.changeKg).toBeNull()
  })

  it('labels logged evidence and warns the model against extrapolation', () => {
    const prompt = formatAthenaObservedContextForPrompt(buildAthenaObservedContext({}, NOW))

    expect(prompt).toContain('evidence-kind="user-recorded-behavior"')
    expect(prompt).toContain('moyennes nutritionnelles portent seulement sur les jours journalisés')
    expect(prompt).toContain("N'extrapole pas")
    expect(prompt).not.toContain('user prompt')
  })

  it('loads only completed sessions and sets with server-side time filters', async () => {
    const builders = new Map<string, ReturnType<typeof queryBuilder>>()
    function queryBuilder(data: unknown[]) {
      const builder = {
        select: vi.fn(),
        eq: vi.fn(),
        gte: vi.fn(),
        in: vi.fn(),
        then: (resolve: (value: { data: unknown[]; error: null }) => unknown) => Promise.resolve({ data, error: null }).then(resolve),
      }
      builder.select.mockReturnValue(builder)
      builder.eq.mockReturnValue(builder)
      builder.gte.mockReturnValue(builder)
      builder.in.mockReturnValue(builder)
      return builder
    }
    const rows: Record<string, unknown[]> = {
      workout_sessions: [{ id: 'session-a', completed: true, created_at: '2026-09-12T08:00:00Z' }],
      workout_sets: [{ session_id: 'session-a', completed: true, exercise_name: 'Squat', reps: 8, weight: 60 }],
      daily_food_logs: [],
      weight_logs: [],
      daily_checkins: [],
    }
    const supabase = {
      from: vi.fn((table: string) => {
        const builder = queryBuilder(rows[table] ?? [])
        builders.set(table, builder)
        return builder
      }),
    }

    const context = await loadAthenaObservedContext(supabase as never, 'user-a', NOW)

    expect(builders.get('workout_sessions')?.eq).toHaveBeenCalledWith('completed', true)
    expect(builders.get('workout_sessions')?.gte).toHaveBeenCalledWith('created_at', '2026-08-16T12:00:00.000Z')
    expect(builders.get('workout_sets')?.eq).toHaveBeenCalledWith('completed', true)
    expect(builders.get('workout_sets')?.in).toHaveBeenCalledWith('session_id', ['session-a'])
    expect(builders.get('daily_food_logs')?.gte).toHaveBeenCalledWith('date', '2026-08-31')
    expect(context.training.completedSets).toBe(1)
  })
})
