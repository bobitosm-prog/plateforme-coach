import type { AggregationResult } from './types'

export type KnownRecordType = '1rm' | 'max_weight' | 'max_reps' | 'best_volume'

export interface RecordInput {
  readonly exerciseName: string
  readonly recordType: string
  readonly value: number
  readonly unit: string | null
  readonly achievedAt: string | null
}

export function estimatedOneRepMax(weight: number, reps: number, decimals: number | null = 1): AggregationResult<number> {
  if (![weight, reps].every(Number.isFinite) || weight <= 0 || reps <= 0) return { status: 'invalid', value: null, issues: [{ code: 'invalid_number', path: 'set' }] }
  if (decimals === null) return { status: 'complete', value: weight * (1 + reps / 30), issues: [] }
  const factor = 10 ** decimals
  return { status: 'complete', value: Math.round(weight * (1 + reps / 30) * factor) / factor, issues: [] }
}

export function bestSetByEstimatedOneRepMax<T extends {
  readonly weight: number
  readonly reps: number
}>(sets: readonly T[]): AggregationResult<T> {
  if (sets.length === 0) return { status: 'unavailable', value: null, issues: [{ code: 'empty_input', path: 'sets' }] }
  let best = sets[0]
  let bestEstimate = estimatedOneRepMax(best.weight, best.reps, null)
  if (bestEstimate.status !== 'complete') return { status: 'invalid', value: null, issues: bestEstimate.issues }
  for (const set of sets.slice(1)) {
    const estimate = estimatedOneRepMax(set.weight, set.reps, null)
    if (estimate.status !== 'complete') return { status: 'invalid', value: null, issues: estimate.issues }
    if (estimate.value > bestEstimate.value) {
      best = set
      bestEstimate = estimate
    }
  }
  return { status: 'complete', value: best, issues: [] }
}

function knownType(value: string): value is KnownRecordType {
  return ['1rm', 'max_weight', 'max_reps', 'best_volume'].includes(value)
}

export function groupBestRecords(records: readonly RecordInput[]): AggregationResult<readonly RecordInput[]> {
  if (records.length === 0) return { status: 'unavailable', value: null, issues: [{ code: 'empty_input', path: 'records' }] }
  const best = new Map<string, RecordInput>()
  for (const [index, record] of records.entries()) {
    if (!knownType(record.recordType)) return { status: 'invalid', value: null, issues: [{ code: 'unknown_record_type', path: `records.${index}.recordType` }] }
    if (!record.exerciseName.trim() || !Number.isFinite(record.value) || record.value < 0) return { status: 'invalid', value: null, issues: [{ code: 'invalid_number', path: `records.${index}` }] }
    const key = `${record.exerciseName}\u0000${record.recordType}\u0000${record.unit ?? ''}`
    const previous = best.get(key)
    if (!previous || record.value > previous.value || (record.value === previous.value && (record.achievedAt ?? '') > (previous.achievedAt ?? ''))) best.set(key, { ...record })
  }
  return { status: 'complete', value: [...best.values()].sort((a, b) => a.exerciseName.localeCompare(b.exerciseName) || a.recordType.localeCompare(b.recordType) || (a.unit ?? '').localeCompare(b.unit ?? '')), issues: [] }
}
