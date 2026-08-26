import {
  addProgressionDays,
  getProgressionDateKey,
  getProgressionWeekKey,
  progressionPeriodStart,
  PROGRESSION_TIME_ZONE,
} from './progression-date'

export type ProgressionDomainState = 'loading' | 'ready' | 'partial' | 'empty' | 'error'
export type ProgressionPeriod = '7d' | '30d' | '90d' | 'all'
export type ProgressionGoal = 'gain' | 'loss' | 'maintain' | 'unknown'
export type ProgressionTrend = 'up' | 'down' | 'stable' | 'unknown'
export type ProgressionDomain =
  | 'weight'
  | 'sessions'
  | 'sets'
  | 'records'
  | 'measurements'
  | 'photos'
  | 'wellbeing'

export interface ProgressionSourceStatus {
  state?: 'loading' | 'ready' | 'error'
  errorCode?: string
}

export interface ProgressionWeightLog {
  date: string
  poids: number
}

export interface ProgressionWorkoutSet {
  exercise_id?: string | null
  exercise_name?: string | null
  weight?: number | null
  reps?: number | null
  completed?: boolean | null
  created_at?: string | null
}

export interface ProgressionWorkoutSession {
  id?: string | null
  created_at?: string | null
  completed?: boolean | null
  workout_sets?: readonly ProgressionWorkoutSet[] | null
}

export interface ProgressionRecordRow {
  exercise_id?: string | null
  exercise_name?: string | null
  record_type?: string | null
  value?: number | null
  unit?: string | null
  achieved_at?: string | null
  previous_value?: number | null
}

export const PROGRESSION_MEASUREMENT_FIELDS = [
  'chest',
  'waist',
  'hips',
  'biceps',
  'thighs',
  'calves',
] as const

export type ProgressionMeasurementField = typeof PROGRESSION_MEASUREMENT_FIELDS[number]

export interface ProgressionMeasurementRow {
  date?: string | null
  chest?: number | null
  waist?: number | null
  hips?: number | null
  biceps?: number | null
  thighs?: number | null
  calves?: number | null
}

export interface ProgressionViewModelInput {
  period?: ProgressionPeriod
  now?: Date
  goal?: unknown
  weight: ProgressionSourceStatus & {
    logs: readonly ProgressionWeightLog[]
    profileCurrentWeight?: number | null
    targetWeight?: number | null
    isTruncated?: boolean
  }
  sessions: ProgressionSourceStatus & {
    rows: readonly ProgressionWorkoutSession[]
    plannedByWeek?: Readonly<Record<string, number>>
    isTruncated?: boolean
  }
  records: ProgressionSourceStatus & {
    rows: readonly ProgressionRecordRow[]
    isTruncated?: boolean
  }
  measurements: ProgressionSourceStatus & {
    rows: readonly ProgressionMeasurementRow[]
    isTruncated?: boolean
  }
  photos: ProgressionSourceStatus & {
    rows: ReadonlyArray<{ id?: string | null; date?: string | null; view_type?: string | null }>
    isTruncated?: boolean
  }
  wellbeing: ProgressionSourceStatus & {
    rows: ReadonlyArray<{ date?: string | null; mood?: string | null; sleep_hours?: number | null }>
    isTruncated?: boolean
  }
  freshness?: 'dashboard-cache' | 'network' | 'mixed'
}

interface ProgressionPeriodContract {
  key: ProgressionPeriod
  days: number | null
  start: string | null
  end: string
  availableFrom: string | null
  availableTo: string | null
  isTruncated: boolean
}

interface ProgressionMeasurementValue {
  current: number
  previous: number | null
  delta: number | null
  series: Array<{ date: string; value: number }>
  state: 'ready' | 'partial'
}

export interface ProgressionViewModel {
  period: ProgressionPeriodContract
  goal: ProgressionGoal
  summary: {
    state: ProgressionDomainState
    currentWeight: number | null
    weightDelta: number | null
    completedCurrentWeek: number | null
    volumeDeltaPercent: number | null
    latestRecord: ProgressionRecord | null
  }
  weight: {
    state: ProgressionDomainState
    current: number | null
    currentSource: 'weight_log' | 'profile_fallback' | 'none'
    previous: number | null
    target: number | null
    delta: number | null
    trend: ProgressionTrend
    series: Array<{ date: string; value: number }>
    period: ProgressionPeriodContract
    isTruncated: boolean
  }
  regularity: {
    state: ProgressionDomainState
    weeks: ProgressionWeekSummary[]
    averageCompleted: number | null
    currentWeek: ProgressionWeekSummary | null
    previousWeek: ProgressionWeekSummary | null
    trend: ProgressionTrend
  }
  volume: {
    state: ProgressionDomainState
    weeklyVolume: Array<{ weekKey: string; volume: number }>
    currentWeek: number | null
    previousWeek: number | null
    deltaPercent: number | null
  }
  records: {
    state: ProgressionDomainState
    items: ProgressionRecord[]
    hasEventHistory: false
  }
  exerciseProgress: {
    state: ProgressionDomainState
    exercises: ProgressionExerciseSeries[]
  }
  measurements: {
    state: ProgressionDomainState
    fields: Partial<Record<ProgressionMeasurementField, ProgressionMeasurementValue>>
    isTruncated: boolean
  }
  photos: {
    state: ProgressionDomainState
    count: number | null
    latest: { id: string | null; date: string | null; viewType: string | null } | null
  }
  wellbeing: {
    state: ProgressionDomainState
    moodTrend: ProgressionTrend
    sleepTrend: ProgressionTrend
  }
  loading: boolean
  errors: Partial<Record<ProgressionDomain, { code: string }>>
  freshness: {
    generatedAt: string
    timezone: typeof PROGRESSION_TIME_ZONE
    source: 'dashboard-cache' | 'network' | 'mixed'
  }
}

export interface ProgressionWeekSummary {
  weekKey: string
  completed: number
  planned: number | null
  adherence: number | null
}

export interface ProgressionRecord {
  exerciseId: string | null
  exerciseName: string
  recordType: string
  value: number
  unit: string | null
  estimated: boolean
  recordedAt: string | null
  previousValue: number | null
  delta: number | null
}

export interface ProgressionExerciseSeries {
  exerciseId: string | null
  exerciseName: string
  metric: 'e1rm'
  series: Array<{ date: string; value: number; weight: number; reps: number }>
}

const PERIOD_DAYS: Record<Exclude<ProgressionPeriod, 'all'>, number> = {
  '7d': 7,
  '30d': 30,
  '90d': 90,
}

const MOOD_SCORE: Record<string, number> = {
  fatigue: 1,
  normal: 2,
  bien: 3,
  top: 4,
  energie: 5,
}

function finiteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function round(value: number, decimals = 1): number {
  const factor = 10 ** decimals
  return Math.round(value * factor) / factor
}

function sourceIsError(source: ProgressionSourceStatus): boolean {
  return source.state === 'error' || Boolean(source.errorCode)
}

function trendFromDelta(delta: number | null): ProgressionTrend {
  if (delta == null) return 'unknown'
  if (delta > 0) return 'up'
  if (delta < 0) return 'down'
  return 'stable'
}

export function normalizeProgressionGoal(value: unknown): ProgressionGoal {
  if (typeof value !== 'string') return 'unknown'
  const normalized = value.trim().toLowerCase().replace(/[\s-]+/g, '_')
  if (['mass', 'bulk', 'gain', 'prise_masse', 'muscle_gain'].includes(normalized)) return 'gain'
  if (['cut', 'loss', 'weight_loss', 'perte_poids', 'seche'].includes(normalized)) return 'loss'
  if (['maintain', 'maintenance', 'maintien'].includes(normalized)) return 'maintain'
  return 'unknown'
}

function periodRows<T extends { date: string }>(
  rows: readonly T[],
  period: ProgressionPeriod,
  now: Date,
): T[] {
  if (period === 'all') return [...rows]
  const start = progressionPeriodStart(now, PERIOD_DAYS[period])
  const end = getProgressionDateKey(now)
  return rows.filter(row => row.date >= start && (!end || row.date <= end))
}

function periodContract(
  period: ProgressionPeriod,
  rows: readonly { date: string }[],
  now: Date,
  isTruncated: boolean,
): ProgressionPeriodContract {
  const sorted = [...rows].sort((a, b) => a.date.localeCompare(b.date))
  return {
    key: period,
    days: period === 'all' ? null : PERIOD_DAYS[period],
    start: period === 'all' ? null : progressionPeriodStart(now, PERIOD_DAYS[period]),
    end: getProgressionDateKey(now) ?? '',
    availableFrom: sorted[0]?.date ?? null,
    availableTo: sorted[sorted.length - 1]?.date ?? null,
    isTruncated,
  }
}

function buildWeight(input: ProgressionViewModelInput, now: Date) {
  const valid = input.weight.logs
    .filter(row => getProgressionDateKey(row.date) && finiteNumber(row.poids) && row.poids > 0)
    .map(row => ({ date: getProgressionDateKey(row.date)!, poids: row.poids }))
    .sort((a, b) => a.date.localeCompare(b.date))
  const selected = periodRows(valid, input.period ?? '30d', now)
  const contract = periodContract(
    input.period ?? '30d',
    valid,
    now,
    Boolean(input.weight.isTruncated),
  )
  if (sourceIsError(input.weight)) {
    return {
      state: 'error' as const,
      current: null,
      currentSource: 'none' as const,
      previous: null,
      target: finiteNumber(input.weight.targetWeight) ? input.weight.targetWeight : null,
      delta: null,
      trend: 'unknown' as const,
      series: [],
      period: contract,
      isTruncated: contract.isTruncated,
    }
  }
  if (input.weight.state === 'loading') {
    return {
      state: 'loading' as const,
      current: null,
      currentSource: 'none' as const,
      previous: null,
      target: finiteNumber(input.weight.targetWeight) ? input.weight.targetWeight : null,
      delta: null,
      trend: 'unknown' as const,
      series: [],
      period: contract,
      isTruncated: contract.isTruncated,
    }
  }

  const currentLog = selected[selected.length - 1]
  const firstLog = selected[0]
  const previousLog = selected.length > 1 ? selected[selected.length - 2] : null
  const fallback = finiteNumber(input.weight.profileCurrentWeight) && input.weight.profileCurrentWeight > 0
    ? input.weight.profileCurrentWeight
    : null
  const current = currentLog?.poids ?? fallback
  const delta = selected.length > 1 ? round(currentLog.poids - firstLog.poids) : null
  const state: ProgressionDomainState = selected.length > 0
    ? (contract.isTruncated ? 'partial' : 'ready')
    : fallback != null ? 'partial' : 'empty'

  return {
    state,
    current,
    currentSource: currentLog ? 'weight_log' as const : fallback != null ? 'profile_fallback' as const : 'none' as const,
    previous: previousLog?.poids ?? null,
    target: finiteNumber(input.weight.targetWeight) ? input.weight.targetWeight : null,
    delta,
    trend: trendFromDelta(delta),
    series: selected.map(row => ({ date: row.date, value: row.poids })),
    period: contract,
    isTruncated: contract.isTruncated,
  }
}

function buildRegularity(input: ProgressionViewModelInput, now: Date) {
  if (sourceIsError(input.sessions)) return { state: 'error' as const, weeks: [], averageCompleted: null, currentWeek: null, previousWeek: null, trend: 'unknown' as const }
  if (input.sessions.state === 'loading') return { state: 'loading' as const, weeks: [], averageCompleted: null, currentWeek: null, previousWeek: null, trend: 'unknown' as const }

  const currentWeekKey = getProgressionWeekKey(now)
  if (!currentWeekKey) return { state: 'empty' as const, weeks: [], averageCompleted: null, currentWeek: null, previousWeek: null, trend: 'unknown' as const }
  const period = input.period ?? '30d'
  const weekCount = period === '7d' ? 2 : period === '30d' ? 5 : period === '90d' ? 14 : 14
  const counts = new Map<string, number>()
  for (const session of input.sessions.rows) {
    if (session.completed === false || !session.created_at) continue
    const key = getProgressionWeekKey(session.created_at)
    if (key) counts.set(key, (counts.get(key) ?? 0) + 1)
  }
  const weeks: ProgressionWeekSummary[] = []
  for (let offset = weekCount - 1; offset >= 0; offset -= 1) {
    const weekKey = addProgressionDays(currentWeekKey, -offset * 7)
    const planned = input.sessions.plannedByWeek?.[weekKey]
    weeks.push({
      weekKey,
      completed: counts.get(weekKey) ?? 0,
      planned: finiteNumber(planned) ? planned : null,
      adherence: finiteNumber(planned) && planned > 0
        ? Math.min(1, (counts.get(weekKey) ?? 0) / planned)
        : null,
    })
  }
  const currentWeek = weeks[weeks.length - 1] ?? null
  const previousWeek = weeks[weeks.length - 2] ?? null
  const averageCompleted = weeks.length
    ? round(weeks.reduce((sum, week) => sum + week.completed, 0) / weeks.length)
    : null
  const delta = currentWeek && previousWeek ? currentWeek.completed - previousWeek.completed : null
  return {
    state: input.sessions.rows.length ? 'ready' as const : 'empty' as const,
    weeks,
    averageCompleted,
    currentWeek,
    previousWeek,
    trend: trendFromDelta(delta),
  }
}

function completedSets(input: ProgressionViewModelInput): Array<ProgressionWorkoutSet & { date: string }> {
  const rows: Array<ProgressionWorkoutSet & { date: string }> = []
  for (const session of input.sessions.rows) {
    for (const set of session.workout_sets ?? []) {
      if (set.completed === false) continue
      const date = getProgressionDateKey(set.created_at ?? session.created_at ?? '')
      if (!date) continue
      rows.push({ ...set, date })
    }
  }
  return rows
}

function buildVolume(input: ProgressionViewModelInput, now: Date) {
  if (sourceIsError(input.sessions)) return { state: 'error' as const, weeklyVolume: [], currentWeek: null, previousWeek: null, deltaPercent: null }
  if (input.sessions.state === 'loading') return { state: 'loading' as const, weeklyVolume: [], currentWeek: null, previousWeek: null, deltaPercent: null }
  const sets = completedSets(input)
  const currentWeekKey = getProgressionWeekKey(now)
  if (!currentWeekKey) return { state: 'empty' as const, weeklyVolume: [], currentWeek: null, previousWeek: null, deltaPercent: null }
  const weekCount = (input.period ?? '30d') === '7d' ? 2 : (input.period ?? '30d') === '90d' ? 14 : 5
  const sums = new Map<string, number>()
  for (const set of sets) {
    if (!finiteNumber(set.weight) || !finiteNumber(set.reps) || set.weight <= 0 || set.reps <= 0) continue
    const weekKey = getProgressionWeekKey(set.date)
    if (weekKey) sums.set(weekKey, (sums.get(weekKey) ?? 0) + set.weight * set.reps)
  }
  const weeklyVolume = Array.from({ length: weekCount }, (_, index) => {
    const weekKey = addProgressionDays(currentWeekKey, -(weekCount - 1 - index) * 7)
    return { weekKey, volume: round(sums.get(weekKey) ?? 0, 0) }
  })
  const currentWeek = weeklyVolume[weeklyVolume.length - 1]?.volume ?? null
  const previousWeek = weeklyVolume[weeklyVolume.length - 2]?.volume ?? null
  const deltaPercent = currentWeek != null && previousWeek != null && previousWeek > 0
    ? Math.round(((currentWeek - previousWeek) / previousWeek) * 100)
    : null
  return {
    state: sets.length ? 'ready' as const : 'empty' as const,
    weeklyVolume,
    currentWeek,
    previousWeek,
    deltaPercent,
  }
}

function buildRecords(input: ProgressionViewModelInput) {
  if (sourceIsError(input.records)) return { state: 'error' as const, items: [], hasEventHistory: false as const }
  if (input.records.state === 'loading') return { state: 'loading' as const, items: [], hasEventHistory: false as const }
  const items = input.records.rows.flatMap<ProgressionRecord>(row => {
    if (!row.exercise_name || !row.record_type || !finiteNumber(row.value)) return []
    const previousValue = finiteNumber(row.previous_value) ? row.previous_value : null
    return [{
      exerciseId: row.exercise_id ?? null,
      exerciseName: row.exercise_name,
      recordType: row.record_type,
      value: row.value,
      unit: row.unit ?? null,
      estimated: row.record_type === '1rm',
      recordedAt: row.achieved_at ?? null,
      previousValue,
      delta: previousValue == null ? null : round(row.value - previousValue),
    }]
  }).sort((a, b) => (b.recordedAt ?? '').localeCompare(a.recordedAt ?? ''))
  return { state: items.length ? 'ready' as const : 'empty' as const, items, hasEventHistory: false as const }
}

function buildExerciseProgress(input: ProgressionViewModelInput, now: Date) {
  if (sourceIsError(input.sessions)) return { state: 'error' as const, exercises: [] }
  if (input.sessions.state === 'loading') return { state: 'loading' as const, exercises: [] }
  const grouped = new Map<string, { id: string | null; name: string; days: Map<string, { value: number; weight: number; reps: number }> }>()
  for (const set of periodRows(completedSets(input), input.period ?? '30d', now)) {
    if (!set.exercise_name || !finiteNumber(set.weight) || !finiteNumber(set.reps) || set.weight <= 0 || set.reps <= 0) continue
    const key = set.exercise_id ?? set.exercise_name
    const e1rm = round(set.weight * (1 + set.reps / 30))
    if (!grouped.has(key)) grouped.set(key, { id: set.exercise_id ?? null, name: set.exercise_name, days: new Map() })
    const day = grouped.get(key)!.days
    const previous = day.get(set.date)
    if (!previous || e1rm > previous.value) day.set(set.date, { value: e1rm, weight: set.weight, reps: set.reps })
  }
  const exercises = Array.from(grouped.values()).map<ProgressionExerciseSeries>(exercise => ({
    exerciseId: exercise.id,
    exerciseName: exercise.name,
    metric: 'e1rm',
    series: Array.from(exercise.days.entries())
      .map(([date, value]) => ({ date, ...value }))
      .sort((a, b) => a.date.localeCompare(b.date)),
  })).sort((a, b) => b.series.length - a.series.length)
  return { state: exercises.length ? 'ready' as const : 'empty' as const, exercises }
}

function buildMeasurements(input: ProgressionViewModelInput, now: Date) {
  if (sourceIsError(input.measurements)) return { state: 'error' as const, fields: {}, isTruncated: Boolean(input.measurements.isTruncated) }
  if (input.measurements.state === 'loading') return { state: 'loading' as const, fields: {}, isTruncated: Boolean(input.measurements.isTruncated) }
  const rows = periodRows(input.measurements.rows
    .flatMap(row => {
      const date = row.date ? getProgressionDateKey(row.date) : null
      return date ? [{ ...row, date }] : []
    })
    .sort((a, b) => a.date.localeCompare(b.date)), input.period ?? '30d', now)
  const fields: Partial<Record<ProgressionMeasurementField, ProgressionMeasurementValue>> = {}
  for (const field of PROGRESSION_MEASUREMENT_FIELDS) {
    const series = rows
      .filter(row => finiteNumber(row[field]))
      .map(row => ({ date: row.date, value: row[field] as number }))
    if (!series.length) continue
    const current = series[series.length - 1].value
    const previous = series.length > 1 ? series[series.length - 2].value : null
    fields[field] = {
      current,
      previous,
      delta: previous == null ? null : round(current - previous),
      series,
      state: series.length > 1 ? 'ready' : 'partial',
    }
  }
  const count = Object.keys(fields).length
  return {
    state: count === 0 ? 'empty' as const : count === PROGRESSION_MEASUREMENT_FIELDS.length ? 'ready' as const : 'partial' as const,
    fields,
    isTruncated: Boolean(input.measurements.isTruncated),
  }
}

function buildPhotos(input: ProgressionViewModelInput, now: Date) {
  if (sourceIsError(input.photos)) return { state: 'error' as const, count: null, latest: null }
  if (input.photos.state === 'loading') return { state: 'loading' as const, count: null, latest: null }
  const rows = periodRows(input.photos.rows.flatMap(row => {
    const date = row.date ? getProgressionDateKey(row.date) : null
    return date ? [{ ...row, date }] : []
  }), input.period ?? '30d', now).sort((a, b) => b.date.localeCompare(a.date))
  const latest = rows[0]
  return {
    state: rows.length ? 'ready' as const : 'empty' as const,
    count: rows.length,
    latest: latest ? { id: latest.id ?? null, date: latest.date ?? null, viewType: latest.view_type ?? null } : null,
  }
}

function seriesTrend(values: number[]): ProgressionTrend {
  if (values.length < 2) return 'unknown'
  const middle = Math.ceil(values.length / 2)
  const first = values.slice(0, middle)
  const second = values.slice(middle)
  if (!second.length) return 'unknown'
  const firstAverage = first.reduce((sum, value) => sum + value, 0) / first.length
  const secondAverage = second.reduce((sum, value) => sum + value, 0) / second.length
  return trendFromDelta(round(secondAverage - firstAverage))
}

function buildWellbeing(input: ProgressionViewModelInput, now: Date) {
  if (sourceIsError(input.wellbeing)) return { state: 'error' as const, moodTrend: 'unknown' as const, sleepTrend: 'unknown' as const }
  if (input.wellbeing.state === 'loading') return { state: 'loading' as const, moodTrend: 'unknown' as const, sleepTrend: 'unknown' as const }
  const rows = periodRows(input.wellbeing.rows.flatMap(row => {
    const date = row.date ? getProgressionDateKey(row.date) : null
    return date ? [{ ...row, date }] : []
  }), input.period ?? '30d', now).sort((a, b) => a.date.localeCompare(b.date))
  const moods = rows.flatMap(row => row.mood && MOOD_SCORE[row.mood] ? [MOOD_SCORE[row.mood]] : [])
  const sleep = rows.flatMap(row => finiteNumber(row.sleep_hours) ? [row.sleep_hours] : [])
  return {
    state: rows.length ? (moods.length && sleep.length ? 'ready' as const : 'partial' as const) : 'empty' as const,
    moodTrend: seriesTrend(moods),
    sleepTrend: seriesTrend(sleep),
  }
}

function summaryState(states: ProgressionDomainState[]): ProgressionDomainState {
  if (states.every(state => state === 'loading')) return 'loading'
  if (states.every(state => state === 'error')) return 'error'
  if (states.every(state => state === 'empty')) return 'empty'
  if (states.some(state => state === 'error' || state === 'loading' || state === 'partial' || state === 'empty')) return 'partial'
  return 'ready'
}

export function buildProgressionViewModel(input: ProgressionViewModelInput): ProgressionViewModel {
  const now = input.now ?? new Date()
  const weight = buildWeight(input, now)
  const regularity = buildRegularity(input, now)
  const volume = buildVolume(input, now)
  const records = buildRecords(input)
  const exerciseProgress = buildExerciseProgress(input, now)
  const measurements = buildMeasurements(input, now)
  const photos = buildPhotos(input, now)
  const wellbeing = buildWellbeing(input, now)
  const errors: ProgressionViewModel['errors'] = {}
  const sources: Array<[ProgressionDomain, ProgressionSourceStatus]> = [
    ['weight', input.weight],
    ['sessions', input.sessions],
    ['sets', input.sessions],
    ['records', input.records],
    ['measurements', input.measurements],
    ['photos', input.photos],
    ['wellbeing', input.wellbeing],
  ]
  for (const [domain, source] of sources) {
    if (sourceIsError(source)) errors[domain] = { code: source.errorCode ?? `PROGRESSION_${domain.toUpperCase()}_READ_FAILED` }
  }
  const latestRecord = records.items[0] ?? null
  const states = [weight.state, regularity.state, volume.state, records.state, measurements.state, photos.state, wellbeing.state]
  const datedRows = [
    ...input.weight.logs.map(row => ({ date: row.date })),
    ...input.sessions.rows.flatMap(row => row.created_at ? [{ date: row.created_at }] : []),
    ...input.records.rows.flatMap(row => row.achieved_at ? [{ date: row.achieved_at }] : []),
    ...input.measurements.rows.flatMap(row => row.date ? [{ date: row.date }] : []),
    ...input.photos.rows.flatMap(row => row.date ? [{ date: row.date }] : []),
    ...input.wellbeing.rows.flatMap(row => row.date ? [{ date: row.date }] : []),
  ].flatMap(row => {
    const date = getProgressionDateKey(row.date)
    return date ? [{ date }] : []
  })
  const globalPeriod = periodContract(
    input.period ?? '30d',
    datedRows,
    now,
    Boolean(
      input.weight.isTruncated
      || input.sessions.isTruncated
      || input.records.isTruncated
      || input.measurements.isTruncated
      || input.photos.isTruncated
      || input.wellbeing.isTruncated
    ),
  )

  return {
    period: globalPeriod,
    goal: normalizeProgressionGoal(input.goal),
    summary: {
      state: summaryState(states),
      currentWeight: weight.current,
      weightDelta: weight.delta,
      completedCurrentWeek: regularity.currentWeek?.completed ?? null,
      volumeDeltaPercent: volume.deltaPercent,
      latestRecord,
    },
    weight,
    regularity,
    volume,
    records,
    exerciseProgress,
    measurements,
    photos,
    wellbeing,
    loading: states.some(state => state === 'loading'),
    errors,
    freshness: {
      generatedAt: now.toISOString(),
      timezone: PROGRESSION_TIME_ZONE,
      source: input.freshness ?? 'mixed',
    },
  }
}
