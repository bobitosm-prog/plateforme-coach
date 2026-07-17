import type {
  AdapterContext,
  AdapterResult,
  AdapterWarning,
  ExerciseCompletion,
  LegacyCompletionMarker,
  PersonalRecord,
  ScheduledTrainingSession,
  SessionExecution,
} from '../model'
import { isRecord, unsupported } from './shared'

function numberOrUndefined(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
}

function exerciseName(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined
}

export function adaptScheduledSession(input: unknown, context: AdapterContext): AdapterResult<ScheduledTrainingSession> {
  const format = 'scheduled-session-v1' as const
  if (!isRecord(input)) return unsupported(format, 'Séance calendrier invalide', context.sourceId)
  const clientId = context.clientId
    ?? (typeof input.client_id === 'string' ? input.client_id : undefined)
    ?? (typeof input.user_id === 'string' ? input.user_id : undefined)
  const scheduledFor = typeof input.scheduled_at === 'string'
    ? input.scheduled_at
    : typeof input.scheduled_date === 'string'
      ? `${input.scheduled_date}T${typeof input.scheduled_time === 'string' ? input.scheduled_time : '00:00:00'}`
      : undefined
  if (!clientId || !scheduledFor) return unsupported(format, 'client et date planifiée requis', context.sourceId)
  const rawStatus = typeof input.status === 'string' ? input.status : input.completed === true ? 'completed' : 'planned'
  const status = rawStatus === 'completed' ? 'completed' : rawStatus === 'canceled' || rawStatus === 'cancelled' ? 'canceled' : rawStatus === 'planned' || rawStatus === 'scheduled' ? 'planned' : 'unknown'
  const warnings: AdapterWarning[] = status === 'unknown'
    ? [{ code: 'legacy_status', path: 'status', detail: `Statut non reconnu: ${rawStatus}` }]
    : []
  const duration = numberOrUndefined(input.duration_minutes) ?? numberOrUndefined(input.duration_min)
  return {
    status: 'converted',
    legacyFormat: format,
    value: {
      id: typeof input.id === 'string' ? input.id : context.id,
      clientId,
      coachId: typeof input.coach_id === 'string' ? input.coach_id : context.coachId,
      scheduledFor,
      timezone: context.timezone ?? 'UTC',
      status,
      sessionType: typeof input.session_type === 'string' ? input.session_type : undefined,
      title: typeof input.title === 'string' ? input.title : 'Séance planifiée',
      durationSeconds: duration === undefined ? undefined : duration * 60,
      legacyReference: { format, sourceId: typeof input.id === 'string' ? input.id : context.sourceId },
    },
    warnings,
    unmappedFields: [],
  }
}

export function adaptWorkoutHistory(input: unknown, context: AdapterContext): AdapterResult<SessionExecution> {
  const format = 'workout-history-v1' as const
  if (!isRecord(input)) return unsupported(format, 'workout session invalide', context.sourceId)
  const clientId = context.clientId ?? (typeof input.user_id === 'string' ? input.user_id : undefined)
  const rawSets = Array.isArray(input.workout_sets) ? input.workout_sets : Array.isArray(input.sets) ? input.sets : undefined
  if (!clientId || !rawSets) return unsupported(format, 'user_id et séries requis', context.sourceId)
  const warnings: AdapterWarning[] = []
  const groups = new Map<string, { name: string; exerciseId?: string; rows: Record<string, unknown>[] }>()
  for (const raw of rawSets) {
    if (!isRecord(raw)) return unsupported(format, 'Série invalide', context.sourceId)
    const name = exerciseName(raw.exercise_name)
    if (!name) return unsupported(format, 'exercise_name absent', context.sourceId)
    const exerciseId = typeof raw.exercise_id === 'string' ? raw.exercise_id : undefined
    const key = exerciseId ?? name
    const group = groups.get(key) ?? { name, exerciseId, rows: [] }
    group.rows.push(raw)
    groups.set(key, group)
  }
  const exercises: ExerciseCompletion[] = [...groups.values()].map((group, exerciseIndex) => {
    if (!group.exerciseId) warnings.push({ code: 'legacy_name_reference', path: `workout_sets.${exerciseIndex}`, detail: group.name })
    const rows = [...group.rows].sort((a, b) => (numberOrUndefined(a.set_number) ?? 0) - (numberOrUndefined(b.set_number) ?? 0))
    return {
      id: `${context.id}:exercise:${exerciseIndex}`,
      exercise: group.exerciseId
        ? { kind: 'catalog', exerciseId: group.exerciseId, snapshotName: group.name }
        : { kind: 'legacy', legacyName: group.name, legacySource: format },
      status: rows.every(row => row.completed === true) ? 'completed' : rows.some(row => row.completed === true) ? 'partial' : 'skipped',
      sets: rows.map((row, index) => ({
        id: typeof row.id === 'string' ? row.id : `${context.id}:set:${exerciseIndex}:${index}`,
        index,
        status: row.completed === true ? 'completed' : 'skipped',
        repetitions: numberOrUndefined(row.reps),
        load: numberOrUndefined(row.weight) === undefined ? undefined : { value: numberOrUndefined(row.weight)!, unit: 'kg' },
        rir: numberOrUndefined(row.rir),
      })),
    }
  })
  return {
    status: 'converted',
    legacyFormat: format,
    value: {
      id: typeof input.id === 'string' ? input.id : context.id,
      formatVersion: 1,
      clientId,
      legacyReference: { format, sourceId: typeof input.id === 'string' ? input.id : context.sourceId },
      status: input.completed === true ? 'completed' : 'in-progress',
      startedAt: typeof input.created_at === 'string' ? input.created_at : undefined,
      completedAt: input.completed === true && typeof input.created_at === 'string' ? input.created_at : undefined,
      durationSeconds: numberOrUndefined(input.duration_minutes) === undefined ? undefined : numberOrUndefined(input.duration_minutes)! * 60,
      exercises,
      notes: typeof input.notes === 'string' ? input.notes : undefined,
    },
    warnings,
    unmappedFields: [],
  }
}

export function adaptCompletionMarker(input: unknown, context: AdapterContext): AdapterResult<LegacyCompletionMarker> {
  const format = 'completed-program-session-v1' as const
  if (!isRecord(input)) return unsupported(format, 'Completion invalide', context.sourceId)
  const clientId = context.clientId ?? (typeof input.client_id === 'string' ? input.client_id : undefined)
  const index = numberOrUndefined(input.session_index)
  const name = exerciseName(input.session_name)
  if (!clientId || index === undefined || !Number.isInteger(index) || index < 0 || !name) {
    return unsupported(format, 'client_id, session_index et session_name requis', context.sourceId)
  }
  return {
    status: 'converted',
    legacyFormat: format,
    value: {
      id: typeof input.id === 'string' ? input.id : context.id,
      clientId,
      coachId: typeof input.coach_id === 'string' ? input.coach_id : context.coachId,
      assignedProgramId: typeof input.program_id === 'string' ? input.program_id : undefined,
      sessionIndex: index,
      sessionName: name,
      completedAt: typeof input.completed_at === 'string' ? input.completed_at : undefined,
      durationSeconds: numberOrUndefined(input.duration_minutes) === undefined ? undefined : numberOrUndefined(input.duration_minutes)! * 60,
      legacyReference: { format, sourceId: typeof input.id === 'string' ? input.id : context.sourceId },
    },
    warnings: typeof input.program_id === 'string' ? [] : [{ code: 'unresolved_reference', path: 'program_id', detail: 'Affectation source absente' }],
    unmappedFields: [],
  }
}

const RECORD_KINDS: Record<string, PersonalRecord['kind']> = {
  max_weight: 'max-load',
  max_reps: 'max-repetitions',
  '1rm': 'estimated-1rm',
  estimated_1rm: 'estimated-1rm',
  best_volume: 'best-volume',
  best_duration: 'best-duration',
  best_distance: 'best-distance',
}

export function adaptPersonalRecord(input: unknown, context: AdapterContext): AdapterResult<PersonalRecord> {
  const format = 'personal-record-v1' as const
  if (!isRecord(input)) return unsupported(format, 'Record invalide', context.sourceId)
  const clientId = context.clientId ?? (typeof input.user_id === 'string' ? input.user_id : undefined)
  const name = exerciseName(input.exercise_name)
  const rawKind = typeof input.record_type === 'string' ? input.record_type : ''
  const kind = RECORD_KINDS[rawKind]
  const value = numberOrUndefined(input.value)
  if (!clientId || !name || !kind || value === undefined) return unsupported(format, 'Record incomplet ou type inconnu', context.sourceId)
  const unitByKind: Record<PersonalRecord['kind'], PersonalRecord['unit']> = {
    'max-load': 'kg',
    'max-repetitions': 'repetitions',
    'estimated-1rm': 'kg',
    'best-volume': 'kg-repetitions',
    'best-duration': 'seconds',
    'best-distance': 'meters',
  }
  return {
    status: 'converted',
    legacyFormat: format,
    value: {
      id: typeof input.id === 'string' ? input.id : context.id,
      clientId,
      exercise: { kind: 'legacy', legacyName: name, legacySource: format },
      kind,
      value,
      unit: unitByKind[kind],
      achievedAt: typeof input.achieved_at === 'string' ? input.achieved_at : context.now,
      previousValue: numberOrUndefined(input.previous_value),
      legacyReference: { format, sourceId: typeof input.id === 'string' ? input.id : context.sourceId },
    },
    warnings: [{ code: 'legacy_name_reference', path: 'exercise_name', detail: name }],
    unmappedFields: [],
  }
}
