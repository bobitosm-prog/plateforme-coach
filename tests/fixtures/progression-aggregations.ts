import type { DatedTrainingSet, DatedWeight, RecordInput } from '../../lib/progression'

export const fixedClock = { now: () => new Date('2026-01-05T12:00:00.000Z') }

export const trainingSets: readonly DatedTrainingSet[] = Object.freeze([
  { completed: true, weight: 100, reps: 5, createdAt: '2025-12-29T10:00:00.000Z' },
  { completed: true, weight: 80, reps: 10, createdAt: '2026-01-05T10:00:00.000Z' },
  { completed: false, weight: 200, reps: 1, createdAt: '2026-01-05T11:00:00.000Z' },
])

export const weights: readonly DatedWeight[] = Object.freeze([
  { date: '2026-01-03', weight: 81 },
  { date: '2026-01-01', weight: 80 },
  { date: '2026-01-02', weight: 82 },
])

export const records: readonly RecordInput[] = Object.freeze([
  { exerciseName: 'Squat', recordType: '1rm', value: 120, unit: 'kg', achievedAt: '2026-01-01' },
  { exerciseName: 'Squat', recordType: '1rm', value: 125, unit: 'kg', achievedAt: '2026-01-02' },
  { exerciseName: 'Bench', recordType: 'max_weight', value: 90, unit: 'kg', achievedAt: '2026-01-01' },
])
