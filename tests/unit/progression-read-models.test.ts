import { describe, expect, it, vi } from 'vitest'
import {
  buildProgressionHistoryReadModel,
  buildProgressionSummaryReadModel,
  createAnalyticsReadModel,
  LatestAnalyticsReadCoordinator,
  type AnalyticsReadPort,
  type ProgressionPortResult,
} from '../../lib/progression'

const ok = <T>(data: readonly T[]): ProgressionPortResult<T> => ({ ok: true, data })
const failed = () => ({ ok: false as const, kind: 'failure' as const })

function port(overrides: Partial<AnalyticsReadPort> = {}): AnalyticsReadPort {
  return {
    listPersonalRecords: vi.fn(async () => ok([{ id: 'pr', user_id: 'owner', exercise_name: 'Squat', record_type: '1rm', value: 100, previous_value: null, unit: 'kg', achieved_at: '2026-01-02', created_at: null }])),
    listNutrition: vi.fn(async () => ok([{ date: '2026-01-02', calories: 100, protein: 10, carbs: 12, fat: 3 }])),
    listWater: vi.fn(async () => ok([{ date: '2026-01-02', milliliters: 500 }])),
    listWeights: vi.fn(async () => ok([{ date: '2026-01-02', weight: 81 }, { date: '2026-01-01', weight: 80 }])),
    listCompletedSets: vi.fn(async () => ok([{ createdAt: '2026-01-02T12:00:00Z', completed: true, weight: 100, reps: 5 }])),
    ...overrides,
  }
}

const context = { ownerUserId: 'owner', clock: { now: () => new Date('2026-01-05T12:00:00Z') }, timeZone: 'UTC' }

describe('progression read models', () => {
  it('loads a complete legacy-compatible analytics model through bounded owner ports', async () => {
    const reader = port()
    const result = await createAnalyticsReadModel(reader).load(context)
    expect(result).toMatchObject({ status: 'success', data: {
      weeklyCalories: [{ date: '2026-01-02', calories: 100 }],
      weeklyWater: [{ date: '2026-01-02', ml: 500 }],
      weeklyVolume: [{ week: '2025-12-29', volume: 500 }],
      weightHistoryFull: [{ date: '2026-01-01', weight: 80 }, { date: '2026-01-02', weight: 81 }],
    } })
    expect(reader.listNutrition).toHaveBeenCalledWith('owner', '2025-12-29', 100)
    expect(reader.listWater).toHaveBeenCalledWith('owner', '2025-12-29', 30)
    expect(reader.listWeights).toHaveBeenCalledWith('owner', '2025-10-07', 100)
    expect(reader.listCompletedSets).toHaveBeenCalledWith('owner', '2025-12-08T12:00:00.000Z', 500)
  })

  it('distinguishes partial data from total failure without leaking errors', async () => {
    const partial = await createAnalyticsReadModel(port({ listWater: vi.fn(async () => failed()) })).load(context)
    expect(partial).toMatchObject({ status: 'partial', sources: ['water'], data: { weeklyWater: [], weeklyCalories: [{ calories: 100 }] } })
    const failedPort = port({
      listPersonalRecords: vi.fn(async () => failed()), listNutrition: vi.fn(async () => failed()),
      listWater: vi.fn(async () => failed()), listWeights: vi.fn(async () => failed()),
      listCompletedSets: vi.fn(async () => failed()),
    })
    expect(await createAnalyticsReadModel(failedPort).load(context)).toEqual({ status: 'failure', data: null, sources: ['records', 'nutrition', 'water', 'weights', 'training_sets'] })
  })

  it('keeps zero-fallback legacy totals explicit while canonical functions remain strict', async () => {
    const result = await createAnalyticsReadModel(port({
      listNutrition: vi.fn(async () => ok([{ date: '2026-01-02', calories: null, protein: 0, carbs: null, fat: 0 }])),
    })).load(context)
    expect(result).toMatchObject({ status: 'success', data: { weeklyCalories: [{ calories: 0, protein: 0, carbs: 0, fat: 0 }] } })
  })

  it('distinguishes confirmed absence from a read failure', async () => {
    const empty = port({
      listPersonalRecords: vi.fn(async () => ok([])), listNutrition: vi.fn(async () => ok([])),
      listWater: vi.fn(async () => ok([])), listWeights: vi.fn(async () => ok([])),
      listCompletedSets: vi.fn(async () => ok([])),
    })
    expect(await createAnalyticsReadModel(empty).load(context)).toMatchObject({ status: 'unavailable', data: { personalRecords: [], weeklyCalories: [] }, sources: [] })
  })

  it('builds summary and separate histories immutably', () => {
    const sessions = [{ id: 'workout' }]
    const completions = [{ id: 'marker' }]
    const scheduled = [{ id: 'scheduled' }]
    expect(buildProgressionSummaryReadModel({ detailedSessionCount: 1, personalRecordCount: 2, streak: 3, weeklyVolume: [{ volume: 100 }, { volume: 200 }], weights: [{ date: '2026-01-01', weight: 80 }, { date: '2026-01-02', weight: 81 }] })).toEqual({ detailedSessionCount: 1, personalRecordCount: 2, streak: 3, totalWeeklyVolume: 300, weightDelta: 1 })
    const history = buildProgressionHistoryReadModel({ weights: [], measurements: [{ date: '2026-01-02' }, { date: '2026-01-01' }], records: [], workoutSessions: sessions, completionMarkers: completions, scheduledSessions: scheduled })
    expect(history).toMatchObject({ measurements: [{ date: '2026-01-01' }, { date: '2026-01-02' }], workoutSessions: sessions, completionMarkers: completions, scheduledSessions: scheduled })
    expect(history.workoutSessions).not.toBe(sessions)
  })

  it('rejects obsolete responses after a newer request or owner change', () => {
    const coordinator = new LatestAnalyticsReadCoordinator()
    const first = coordinator.begin('owner-a')
    const retry = coordinator.begin('owner-a')
    expect(coordinator.isCurrent(first)).toBe(false)
    expect(coordinator.isCurrent(retry)).toBe(true)
    const changedOwner = coordinator.begin('owner-b')
    expect(coordinator.isCurrent(retry)).toBe(false)
    expect(coordinator.isCurrent(changedOwner)).toBe(true)
    coordinator.invalidate()
    expect(coordinator.isCurrent(changedOwner)).toBe(false)
  })
})
