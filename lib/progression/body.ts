import { propagateAggregationFailure, type AggregationResult } from './types'

export interface DatedWeight {
  readonly date: string
  readonly weight: number
}

function validWeight(value: number): boolean {
  return Number.isFinite(value) && value > 0
}

export function sortWeights(entries: readonly DatedWeight[]): AggregationResult<readonly DatedWeight[]> {
  if (entries.length === 0) return { status: 'unavailable', value: null, issues: [{ code: 'empty_input', path: 'entries' }] }
  if (entries.some(entry => !validWeight(entry.weight) || !/^\d{4}-\d{2}-\d{2}$/.test(entry.date))) return { status: 'invalid', value: null, issues: [{ code: 'invalid_number', path: 'entries' }] }
  return { status: 'complete', value: entries.map(entry => ({ ...entry })).sort((a, b) => a.date.localeCompare(b.date)), issues: [] }
}

export function latestWeight(entries: readonly DatedWeight[]): AggregationResult<DatedWeight> {
  const sorted = sortWeights(entries)
  if (sorted.status !== 'complete') return propagateAggregationFailure(sorted)
  return { status: 'complete', value: sorted.value.at(-1) as DatedWeight, issues: [] }
}

export function weightDelta(entries: readonly DatedWeight[], decimals = 1): AggregationResult<{ absolute: number; relative: number }> {
  const sorted = sortWeights(entries)
  if (sorted.status !== 'complete' || sorted.value.length < 2) return { status: 'unavailable', value: null, issues: [{ code: 'empty_input', path: 'entries' }] }
  const first = sorted.value[0].weight
  const last = (sorted.value.at(-1) as DatedWeight).weight
  const factor = 10 ** decimals
  return { status: 'complete', value: { absolute: Math.round((last - first) * factor) / factor, relative: (last - first) / first }, issues: [] }
}

export function movingAverageByObservation(entries: readonly DatedWeight[], size: number, decimals = 1): AggregationResult<readonly (DatedWeight & { average: number })[]> {
  if (!Number.isInteger(size) || size <= 0) return { status: 'invalid', value: null, issues: [{ code: 'invalid_number', path: 'size' }] }
  const sorted = sortWeights(entries)
  if (sorted.status !== 'complete') return propagateAggregationFailure(sorted)
  const factor = 10 ** decimals
  return { status: 'complete', value: sorted.value.map((entry, index) => {
    const observations = sorted.value.slice(Math.max(0, index - size + 1), index + 1)
    const average = observations.reduce((sum, item) => sum + item.weight, 0) / observations.length
    return { ...entry, average: Math.round(average * factor) / factor }
  }), issues: [] }
}

export function weightGoalProgress(input: { readonly start: number | null; readonly current: number | null; readonly target: number | null }): AggregationResult<number> {
  if (input.start === null || input.current === null || input.target === null) return { status: 'unavailable', value: null, issues: [{ code: 'missing_value', path: 'weight' }] }
  if (![input.start, input.current, input.target].every(validWeight)) return { status: 'invalid', value: null, issues: [{ code: 'invalid_number', path: 'weight' }] }
  if (input.start === input.target) return { status: 'complete', value: 100, issues: [] }
  return { status: 'complete', value: Math.max(0, Math.min(100, Math.round(((input.start - input.current) / (input.start - input.target)) * 100))), issues: [] }
}

export function measurementDelta(current: number | null, previous: number | null): AggregationResult<number> {
  if (current === null || previous === null) return { status: 'unavailable', value: null, issues: [{ code: 'missing_value', path: 'measurement' }] }
  if (![current, previous].every(value => Number.isFinite(value) && value >= 0)) return { status: 'invalid', value: null, issues: [{ code: 'invalid_number', path: 'measurement' }] }
  return { status: 'complete', value: current - previous, issues: [] }
}
