import type { AggregationResult } from './types'

export type KnownRecordType = '1rm' | 'max_weight' | 'max_reps' | 'best_volume'

export interface RecordInput {
  readonly exerciseName: string
  readonly recordType: string
  readonly value: number
  readonly unit: string | null
  readonly achievedAt: string | null
}

export function estimatedOneRepMax(weight: number, reps: number, decimals = 1): AggregationResult<number> {
  if (![weight, reps].every(Number.isFinite) || weight <= 0 || reps <= 0) return { status: 'invalid', value: null, issues: [{ code: 'invalid_number', path: 'set' }] }
  const factor = 10 ** decimals
  return { status: 'complete', value: Math.round(weight * (1 + reps / 30) * factor) / factor, issues: [] }
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
