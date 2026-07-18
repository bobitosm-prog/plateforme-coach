import { resolveSessionType } from '@/lib/session-types'

export const RECENT_SESSION_PREVIEW_LIMIT = 3
export const RECENT_SESSION_FULL_LIMIT = 20
export const DASHBOARD_COMPLETION_LIMIT = 50

export interface LegacyWorkoutSession {
  id: string
  name?: string | null
  completed?: boolean | null
  date?: string | null
  duration_minutes?: number | null
  notes?: string | null
  created_at: string
  muscles_worked?: unknown
  [key: string]: unknown
}

export interface LegacyCompletionMarker {
  id: string
  session_index: number
  completed_at: string
  [key: string]: unknown
}

export interface LegacyWorkoutSet {
  exercise_name: string
  set_number?: number | null
  weight?: number | null
  reps?: number | null
  completed?: boolean | null
  [key: string]: unknown
}

export interface HistoryIssue {
  source: 'workout_sessions' | 'completed_sessions' | 'workout_sets'
  index: number
  code: 'invalid_shape' | 'invalid_date' | 'missing_exercise_name'
}

export interface PreparedWorkoutSession {
  session: LegacyWorkoutSession
  timestamp: number
}

export interface WorkoutExerciseDetail {
  name: string
  sets: LegacyWorkoutSet[]
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function timestamp(value: unknown): number | null {
  if (typeof value !== 'string' || value.trim() === '') return null
  const parsed = Date.parse(value)
  return Number.isFinite(parsed) ? parsed : null
}

function stableNewestFirst<T extends { timestamp: number; inputIndex: number }>(rows: T[]): T[] {
  return [...rows].sort((left, right) => right.timestamp - left.timestamp || left.inputIndex - right.inputIndex)
}

export function prepareWorkoutSessions(input: readonly unknown[]): {
  sessions: PreparedWorkoutSession[]
  isolated: HistoryIssue[]
} {
  const accepted: Array<PreparedWorkoutSession & { inputIndex: number }> = []
  const isolated: HistoryIssue[] = []

  input.forEach((value, inputIndex) => {
    if (!isRecord(value) || typeof value.id !== 'string') {
      isolated.push({ source: 'workout_sessions', index: inputIndex, code: 'invalid_shape' })
      return
    }
    const createdAt = timestamp(value.created_at)
    if (createdAt === null) {
      isolated.push({ source: 'workout_sessions', index: inputIndex, code: 'invalid_date' })
      return
    }
    accepted.push({
      session: value as LegacyWorkoutSession,
      timestamp: createdAt,
      inputIndex,
    })
  })

  return {
    sessions: stableNewestFirst(accepted).map(row => ({ session: row.session, timestamp: row.timestamp })),
    isolated,
  }
}

export function selectRecentWorkoutSessions(
  input: readonly unknown[],
  options: { filter?: string; expanded?: boolean } = {},
) {
  const prepared = prepareWorkoutSessions(input)
  const filter = options.filter ?? 'all'
  const filtered = filter === 'all'
    ? prepared.sessions
    : prepared.sessions.filter(({ session }) => resolveSessionType(session.name).key === filter)
  const limit = options.expanded ? RECENT_SESSION_FULL_LIMIT : RECENT_SESSION_PREVIEW_LIMIT

  return {
    sessions: filtered.slice(0, limit),
    filteredCount: filtered.length,
    totalCount: prepared.sessions.length,
    isolated: prepared.isolated,
  }
}

export function formatWorkoutSessionDate(createdAt: string, locale: string): string | null {
  const parsed = timestamp(createdAt)
  if (parsed === null) return null
  return new Date(parsed).toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long' })
}

export function completedWorkoutDateKeys(input: readonly unknown[]): Set<string> {
  const dates = input.flatMap(value => {
    if (!isRecord(value) || value.completed !== true || typeof value.date !== 'string') return []
    return [value.date]
  })
  return new Set(dates)
}

export function prepareCompletionMarkers(input: readonly unknown[], limit = DASHBOARD_COMPLETION_LIMIT): {
  completions: LegacyCompletionMarker[]
  isolated: HistoryIssue[]
} {
  const accepted: Array<{ completion: LegacyCompletionMarker; timestamp: number; inputIndex: number }> = []
  const isolated: HistoryIssue[] = []

  input.forEach((value, inputIndex) => {
    if (!isRecord(value) || typeof value.id !== 'string' || typeof value.session_index !== 'number') {
      isolated.push({ source: 'completed_sessions', index: inputIndex, code: 'invalid_shape' })
      return
    }
    const completedAt = timestamp(value.completed_at)
    if (completedAt === null) {
      isolated.push({ source: 'completed_sessions', index: inputIndex, code: 'invalid_date' })
      return
    }
    accepted.push({ completion: value as LegacyCompletionMarker, timestamp: completedAt, inputIndex })
  })

  return {
    completions: stableNewestFirst(accepted).slice(0, limit).map(row => row.completion),
    isolated,
  }
}

export function groupWorkoutSets(input: readonly unknown[]): {
  detail: WorkoutExerciseDetail[]
  isolated: HistoryIssue[]
} {
  const groups = new Map<string, LegacyWorkoutSet[]>()
  const isolated: HistoryIssue[] = []

  input.forEach((value, index) => {
    if (!isRecord(value)) {
      isolated.push({ source: 'workout_sets', index, code: 'invalid_shape' })
      return
    }
    if (typeof value.exercise_name !== 'string' || value.exercise_name.trim() === '') {
      isolated.push({ source: 'workout_sets', index, code: 'missing_exercise_name' })
      return
    }
    const set = value as LegacyWorkoutSet
    const existing = groups.get(set.exercise_name) ?? []
    groups.set(set.exercise_name, [...existing, set])
  })

  return {
    detail: [...groups.entries()].map(([name, sets]) => ({ name, sets })),
    isolated,
  }
}

export function summarizeWorkoutDetail(detail: readonly WorkoutExerciseDetail[]) {
  return detail.reduce((summary, exercise) => {
    summary.totalExercises += 1
    summary.totalSets += exercise.sets.length
    summary.totalVolume += exercise.sets.reduce((volume, set) =>
      volume + (Number(set.weight) || 0) * (Number(set.reps) || 0), 0)
    return summary
  }, { totalExercises: 0, totalSets: 0, totalVolume: 0 })
}
