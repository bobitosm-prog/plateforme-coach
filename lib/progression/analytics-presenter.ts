import type { AnalyticsPersonalRecord } from './read-models'
import type { DatedWeight } from './body'
import type { ProgressionClock } from './types'

export type AnalyticsWeightPeriod = '30j' | '60j' | '90j' | 'tout'

const validDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(new Date(value).getTime())
const validAmount = (value: number) => Number.isFinite(value) && value >= 0

export function buildLegacyWeightSeries(input: {
  readonly weights: readonly DatedWeight[]
  readonly period: AnalyticsWeightPeriod
  readonly clock: ProgressionClock
}): readonly (DatedWeight & { readonly trend: number })[] {
  const now = input.clock.now().getTime()
  if (!Number.isFinite(now) || input.weights.some(value => !validDate(value.date) || !validAmount(value.weight))) return []
  const days = input.period === '30j' ? 30 : input.period === '60j' ? 60 : input.period === '90j' ? 90 : 9999
  const filtered = input.weights.filter(weight => new Date(weight.date).getTime() >= now - days * 86_400_000)
  return filtered.map((weight, index) => {
    const observations = filtered.slice(Math.max(0, index - 6), index + 1)
    const average = observations.reduce((sum, value) => sum + value.weight, 0) / observations.length
    return { ...weight, trend: Math.round(average * 10) / 10 }
  })
}

export function buildLegacyCalorieSeries(entries: readonly { readonly date: string; readonly calories: number }[], goal: number) {
  if (!validAmount(goal) || entries.some(entry => !validDate(entry.date) || !validAmount(entry.calories))) return []
  return entries.map(entry => ({ date: entry.date, calories: Math.round(entry.calories), inTarget: Math.abs(entry.calories - goal) <= 100 }))
}

export function buildLegacyMacroSeries(entries: readonly { readonly date: string; readonly protein: number; readonly carbs: number; readonly fat: number }[]) {
  if (entries.some(entry => !validDate(entry.date) || ![entry.protein, entry.carbs, entry.fat].every(validAmount))) return []
  return entries.map(entry => ({ date: entry.date, protein: Math.round(entry.protein), carbs: Math.round(entry.carbs), fat: Math.round(entry.fat) }))
}

export function buildLegacyWaterSeries(entries: readonly { readonly date: string; readonly ml: number }[]) {
  if (entries.some(entry => !validDate(entry.date) || !validAmount(entry.ml))) return []
  return entries.map(entry => ({ date: entry.date, litres: Math.round(entry.ml) / 1000 }))
}

export function buildLegacyAnalyticsSummary(input: {
  readonly weights: readonly DatedWeight[]
  readonly records: readonly Pick<AnalyticsPersonalRecord, 'achieved_at'>[]
  readonly clock: ProgressionClock
}): { readonly monthWeightDiff: number | null; readonly monthRecordCount: number } {
  const now = input.clock.now()
  if (!Number.isFinite(now.getTime()) || input.weights.some(value => !validDate(value.date) || !validAmount(value.weight)) || input.records.some(record => record.achieved_at !== null && !validDate(record.achieved_at))) return { monthWeightDiff: null, monthRecordCount: 0 }
  const cutoffInstant = now.getTime() - 30 * 86_400_000
  const recent = input.weights.filter(weight => new Date(weight.date).getTime() >= cutoffInstant)
  const monthWeightDiff = recent.length < 2 ? null : Math.round(((recent.at(-1)?.weight ?? 0) - recent[0].weight) * 10) / 10
  const cutoffDate = new Date(now)
  cutoffDate.setDate(cutoffDate.getDate() - 30)
  const cutoff = cutoffDate.toISOString().split('T')[0]
  return { monthWeightDiff, monthRecordCount: input.records.filter(record => (record.achieved_at ?? '') >= cutoff).length }
}

export function buildLegacyAnalyticsCsvRows(input: {
  readonly weights: readonly DatedWeight[]
  readonly calories: readonly { readonly date: string; readonly calories: number; readonly protein: number; readonly carbs: number; readonly fat: number }[]
  readonly water: readonly { readonly date: string; readonly ml: number }[]
}): readonly (readonly (string | number | null)[])[] {
  if (input.weights.some(value => !validDate(value.date) || !validAmount(value.weight))
    || input.calories.some(value => !validDate(value.date) || ![value.calories, value.protein, value.carbs, value.fat].every(validAmount))
    || input.water.some(value => !validDate(value.date) || !validAmount(value.ml))) return []
  const dates = new Set<string>()
  input.weights.forEach(value => dates.add(value.date))
  input.calories.forEach(value => dates.add(value.date))
  input.water.forEach(value => dates.add(value.date))
  const weightMap = new Map(input.weights.map(value => [value.date, value.weight]))
  const calorieMap = new Map(input.calories.map(value => [value.date, value]))
  const waterMap = new Map(input.water.map(value => [value.date, value.ml]))
  return [...dates].sort().map(date => {
    const nutrition = calorieMap.get(date)
    const water = waterMap.get(date)
    return [date, weightMap.get(date) ?? null, nutrition?.calories ?? null, nutrition?.protein ?? null, nutrition?.carbs ?? null, nutrition?.fat ?? null, water ? Math.round(water / 1000 * 10) / 10 : null]
  })
}
