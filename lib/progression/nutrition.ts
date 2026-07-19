import { aggregateNutrition, type NutritionCalculationResult, type NutritionValues } from '../nutrition/invariants'
import type { AggregationResult } from './types'

export interface DatedNutritionAmount {
  readonly date: string
  readonly values: NutritionValues
}

export function aggregateNutritionByDate(entries: readonly DatedNutritionAmount[]): AggregationResult<Readonly<Record<string, NutritionCalculationResult>>> {
  if (entries.length === 0) return { status: 'unavailable', value: null, issues: [{ code: 'empty_input', path: 'entries' }] }
  const groups = new Map<string, DatedNutritionAmount[]>()
  for (const [index, entry] of entries.entries()) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(entry.date)) return { status: 'invalid', value: null, issues: [{ code: 'invalid_date', path: `entries.${index}.date` }] }
    groups.set(entry.date, [...(groups.get(entry.date) ?? []), entry])
  }
  const value = Object.fromEntries([...groups].sort(([a], [b]) => a.localeCompare(b)).map(([date, rows]) => [date, aggregateNutrition(rows.map((row, index) => ({ id: String(index), result: nutritionResult(row.values) })))]))
  const results = Object.values(value)
  if (results.some(result => result.status === 'invalid')) return { status: 'invalid', value: null, issues: [{ code: 'invalid_number', path: 'entries' }] }
  return { status: results.some(result => result.status !== 'complete') ? 'partial' : 'complete', value, issues: [] }
}

function nutritionResult(values: NutritionValues): NutritionCalculationResult {
  for (const value of Object.values(values)) {
    if (value !== null && (!Number.isFinite(value) || value < 0)) return { status: 'invalid', values, issues: [{ code: 'invalid_nutrient_value', path: 'values' }] }
  }
  const unknown = Object.entries(values).filter(([, value]) => value === null)
  return { status: unknown.length ? 'partial' : 'complete', values, issues: unknown.map(([key]) => ({ code: 'unknown_nutrient_value', path: `values.${key}` })) }
}

export function aggregateWaterByDate(entries: readonly { readonly date: string; readonly milliliters: number | null }[]): AggregationResult<readonly { date: string; milliliters: number }[]> {
  if (entries.length === 0) return { status: 'unavailable', value: null, issues: [{ code: 'empty_input', path: 'entries' }] }
  const totals = new Map<string, number>()
  const issues = []
  for (const [index, entry] of entries.entries()) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(entry.date)) return { status: 'invalid', value: null, issues: [{ code: 'invalid_date', path: `entries.${index}.date` }] }
    if (entry.milliliters === null) {
      issues.push({ code: 'missing_value' as const, path: `entries.${index}.milliliters` })
      continue
    }
    if (!Number.isFinite(entry.milliliters) || entry.milliliters < 0) return { status: 'invalid', value: null, issues: [{ code: 'invalid_number', path: `entries.${index}.milliliters` }] }
    totals.set(entry.date, (totals.get(entry.date) ?? 0) + entry.milliliters)
  }
  return { status: issues.length ? 'partial' : 'complete', value: [...totals].map(([date, milliliters]) => ({ date, milliliters })).sort((a, b) => a.date.localeCompare(b.date)), issues }
}
