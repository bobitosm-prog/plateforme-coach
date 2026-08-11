import type { AssignedProgramRow } from '@/lib/repositories/training/program'
import { adaptClientAssignment } from '@/lib/training/adapters'
import { isRecord, parseRest, parseTarget, WEEKDAYS_FR } from '@/lib/training/adapters/shared'
import type {
  AdapterContext,
  AdapterResult,
  AssignedProgram,
  ExerciseReference,
  RestPrescription,
  SetTarget,
} from '@/lib/training/model'

export const CLIENT_PROGRAM_SHADOW_MAX_ROWS_PER_READ = 1 as const

export const CLIENT_PROGRAM_SHADOW_CRITICAL_PROPERTIES = [
  'client_owner',
  'coach_assigner',
  'day_order',
  'rest_days',
  'exercise_order',
  'exercise_references',
  'sets',
  'repetitions',
  'rest_seconds',
] as const

export const CLIENT_PROGRAM_SHADOW_WARNING_PROPERTIES = [
  'missing_source_program',
  'legacy_name_reference',
  'non_critical_unmapped_fields',
] as const

export const CLIENT_PROGRAM_SHADOW_EXCLUDED_PROPERTIES = [
  'assignment_status',
  'source_revision',
  'timezone',
] as const

export type ClientProgramShadowSelection =
  | { readonly consumer: 'dashboard-client' }
  | { readonly consumer: 'coach-client-detail'; readonly coachUserId: string }

export type ClientProgramAdaptationEnvelope =
  | {
      readonly status: 'ready'
      readonly input: {
        readonly program: AssignedProgramRow['program']
        readonly created_at?: string
      }
      readonly context: AdapterContext
    }
  | {
      readonly status: 'unsupported'
      readonly reason: 'MISSING_CLIENT_OWNER'
    }

export type ClientProgramShadowStatus = 'MATCH' | 'WARNING' | 'CRITICAL_MISMATCH' | 'UNSUPPORTED'

export type ClientProgramDifferenceCode =
  | 'OWNER_MISMATCH'
  | 'COACH_ASSIGNER_MISMATCH'
  | 'DAY_ORDER_MISMATCH'
  | 'REST_DAY_MISMATCH'
  | 'EXERCISE_ORDER_MISMATCH'
  | 'EXERCISE_REFERENCE_MISMATCH'
  | 'SETS_MISMATCH'
  | 'REPS_MISMATCH'
  | 'REST_SECONDS_MISMATCH'
  | 'SOURCE_PROGRAM_MISSING'
  | 'LEGACY_NAME_REFERENCE'
  | 'ADAPTER_WARNINGS'
  | 'UNMAPPED_FIELDS'
  | 'CANONICAL_PARTIAL'
  | 'ADAPTER_UNSUPPORTED'

export type ClientProgramDifference = {
  readonly code: ClientProgramDifferenceCode
  readonly path: string
}

export type ClientProgramShadowResult = {
  readonly format: 'client-program-days-v1' | 'client-program-weekdays-fr-v1'
  readonly result: ClientProgramShadowStatus
  readonly differences: readonly ClientProgramDifference[]
  readonly warningCount: number
  readonly unmappedFieldCount: number
}

export type ClientProgramShadowMetric = {
  readonly format: ClientProgramShadowResult['format']
  readonly result: ClientProgramShadowStatus
  readonly difference_codes: readonly ClientProgramDifferenceCode[]
  readonly warning_count: number
  readonly unmapped_field_count: number
  readonly adaptation_duration_ms: number
  readonly correlation_id: string
}

type SemanticExercise = {
  readonly reference: string
  readonly sets: number
  readonly reps: string
  readonly rest: string
}

type SemanticDay = {
  readonly label: string
  readonly kind: 'rest' | 'training'
  readonly exercises: readonly SemanticExercise[]
}

type SemanticAssignment = {
  readonly clientId: string
  readonly assignedBy: string
  readonly days: readonly SemanticDay[]
}

type ClientProgramAdapter = (
  input: unknown,
  context: AdapterContext,
) => AdapterResult<AssignedProgram>

type CompareDependencies = {
  readonly adapter?: ClientProgramAdapter
  readonly now?: () => string
}

type ObserveDependencies = CompareDependencies & {
  readonly clock?: () => number
  readonly correlationId?: () => string
}

/**
 * Mirrors the two existing consumer rules without inventing a global active
 * assignment. The repository already returns rows ordered by created_at DESC.
 */
export function selectClientProgramShadowCandidate(
  rows: readonly AssignedProgramRow[],
  selection: ClientProgramShadowSelection,
): AssignedProgramRow | null {
  if (selection.consumer === 'dashboard-client') return rows[0] ?? null
  return rows.find(row => row.coach_id === selection.coachUserId) ?? null
}

/**
 * Builds the narrow adapter boundary from an already selected legacy row.
 * Database ownership/source fields are carried by AdapterContext and cannot be
 * reported as unmapped payload fields by adaptClientAssignment.
 */
export function buildClientProgramAdaptationEnvelope(
  row: AssignedProgramRow,
  observedAt: string,
): ClientProgramAdaptationEnvelope {
  if (!row.client_id) return { status: 'unsupported', reason: 'MISSING_CLIENT_OWNER' }

  const input: { program: AssignedProgramRow['program']; created_at?: string } = {
    program: row.program,
  }
  if (row.created_at) input.created_at = row.created_at

  const context: AdapterContext = {
    id: row.id,
    now: observedAt,
    owner: { kind: 'client', clientId: row.client_id },
    clientId: row.client_id,
    sourceId: row.id,
    name: 'Programme assigné',
  }
  if (row.coach_id) context.coachId = row.coach_id
  if (row.training_program_id) context.sourceProgramId = row.training_program_id

  return { status: 'ready', input, context }
}

const readNonEmptyString = (record: Record<string, unknown>, keys: readonly string[]): string | undefined => {
  for (const key of keys) {
    const value = record[key]
    if (typeof value === 'string' && value.trim()) return value.trim()
  }
  return undefined
}

const targetKey = (target: SetTarget | undefined): string => {
  if (!target) return 'invalid'
  if (target.kind === 'repetitions') return `repetitions:${target.min}:${target.max}`
  if (target.kind === 'amrap') return `amrap:${target.minimum ?? ''}`
  if (target.kind === 'duration') return `duration:${target.minSeconds}:${target.maxSeconds ?? ''}`
  return `distance:${target.minMeters}:${target.maxMeters ?? ''}`
}

const restKey = (rest: RestPrescription | undefined): string => {
  if (!rest) return 'invalid'
  if (rest.kind === 'fixed') return `fixed:${rest.seconds}`
  if (rest.kind === 'range') return `range:${rest.minSeconds}:${rest.maxSeconds}`
  if (rest.kind === 'until-ready') return `until-ready:${rest.minimumSeconds ?? ''}`
  return 'none'
}

const canonicalReferenceKey = (reference: ExerciseReference): string => {
  if (reference.kind === 'catalog') return `catalog:${reference.exerciseId}`
  if (reference.kind === 'custom') return `custom:${reference.customExerciseId}`
  return `legacy:${reference.legacyName}`
}

function legacyReferenceKey(exercise: Record<string, unknown>): string {
  const catalogId = readNonEmptyString(exercise, ['exercise_id', 'exerciseId'])
  if (catalogId) return `catalog:${catalogId}`
  const customId = readNonEmptyString(exercise, ['custom_exercise_id', 'customExerciseId'])
  if (customId) return `custom:${customId}`
  const name = readNonEmptyString(exercise, ['exercise_name', 'custom_name', 'name', 'exerciseName']) ?? 'invalid'
  return `legacy:${name}`
}

function legacyDays(row: AssignedProgramRow): readonly unknown[] | null {
  const program = row.program
  if (Array.isArray(program)) return program
  if (!isRecord(program)) return null
  const present = WEEKDAYS_FR.filter(day => Object.hasOwn(program, day))
  const unknown = Object.keys(program).filter(key => !WEEKDAYS_FR.includes(key as typeof WEEKDAYS_FR[number]))
  if (present.length === 0 || unknown.length > 0) return null
  return present.map(day => program[day])
}

function legacyProjection(row: AssignedProgramRow): SemanticAssignment | null {
  if (!row.client_id) return null
  const rawDays = legacyDays(row)
  if (!rawDays) return null
  const days: SemanticDay[] = []
  for (const rawDay of rawDays) {
    if (!isRecord(rawDay)) return null
    const label = readNonEmptyString(rawDay, ['name', 'day_name', 'weekday']) ?? `Jour ${days.length + 1}`
    const isRest = rawDay.is_rest === true || rawDay.repos === true
    if (isRest) {
      days.push({ label, kind: 'rest', exercises: [] })
      continue
    }
    if (!Array.isArray(rawDay.exercises) || rawDay.exercises.length === 0) return null
    const exercises: SemanticExercise[] = []
    for (const rawExercise of rawDay.exercises) {
      if (!isRecord(rawExercise)) return null
      const setsValue = rawExercise.sets ?? rawExercise.series
      const sets = typeof setsValue === 'number' ? setsValue : Number(setsValue)
      const repetitions = rawExercise.reps ?? rawExercise.repetitions
      const duration = rawExercise.duration ?? rawExercise.duration_seconds
      const distance = rawExercise.distance ?? rawExercise.distance_meters
      const target = repetitions !== undefined
        ? parseTarget(repetitions)
        : duration !== undefined
          ? { kind: 'duration' as const, minSeconds: Number(duration) }
          : { kind: 'distance' as const, minMeters: Number(distance) }
      const restValue = rawExercise.rest_seconds ?? rawExercise.rest
      exercises.push({
        reference: legacyReferenceKey(rawExercise),
        sets,
        reps: targetKey(target),
        rest: restKey(restValue === undefined || restValue === null ? { kind: 'none' } : parseRest(restValue)),
      })
    }
    days.push({ label, kind: 'training', exercises })
  }
  return {
    clientId: row.client_id,
    assignedBy: row.coach_id ? `coach:${row.coach_id}` : `client:${row.client_id}`,
    days,
  }
}

function canonicalProjection(assignment: AssignedProgram): SemanticAssignment | null {
  const program = assignment.programSnapshot
  if (program.owner.kind !== 'client' || program.weeks.length !== 1) return null
  const days: SemanticDay[] = []
  for (const day of program.weeks[0].days) {
    if (day.kind === 'rest') {
      days.push({ label: day.label, kind: 'rest', exercises: [] })
      continue
    }
    if (day.sessions.length !== 1 || day.sessions[0].blocks.length !== 1) return null
    days.push({
      label: day.label,
      kind: 'training',
      exercises: day.sessions[0].blocks[0].exercises.map(exercise => ({
        reference: canonicalReferenceKey(exercise.exercise),
        sets: exercise.prescriptions.length,
        reps: targetKey(exercise.prescriptions[0]?.target),
        rest: restKey(exercise.defaultRest),
      })),
    })
  }
  const assignedBy = assignment.assignedBy.kind === 'coach'
    ? `coach:${assignment.assignedBy.coachId}`
    : assignment.assignedBy.kind === 'client'
      ? `client:${assignment.assignedBy.clientId}`
      : 'system'
  return { clientId: assignment.clientId, assignedBy, days }
}

const equalArray = (left: readonly string[], right: readonly string[]): boolean => (
  left.length === right.length && left.every((value, index) => value === right[index])
)

function compareProjections(legacy: SemanticAssignment, canonical: SemanticAssignment): ClientProgramDifference[] {
  const differences: ClientProgramDifference[] = []
  const add = (code: ClientProgramDifferenceCode, path: string) => differences.push({ code, path })
  if (legacy.clientId !== canonical.clientId) add('OWNER_MISMATCH', 'owner')
  if (legacy.assignedBy !== canonical.assignedBy) add('COACH_ASSIGNER_MISMATCH', 'assignedBy')
  if (!equalArray(legacy.days.map(day => day.label), canonical.days.map(day => day.label))) {
    add('DAY_ORDER_MISMATCH', 'days')
  }
  const dayCount = Math.max(legacy.days.length, canonical.days.length)
  for (let dayIndex = 0; dayIndex < dayCount; dayIndex += 1) {
    const legacyDay = legacy.days[dayIndex]
    const canonicalDay = canonical.days[dayIndex]
    if (!legacyDay || !canonicalDay) continue
    const path = `days[${dayIndex}]`
    if (legacyDay.kind !== canonicalDay.kind) {
      add('REST_DAY_MISMATCH', path)
      continue
    }
    if (legacyDay.kind === 'rest' || canonicalDay.kind === 'rest') continue
    const legacyReferences = legacyDay.exercises.map(exercise => exercise.reference)
    const canonicalReferences = canonicalDay.exercises.map(exercise => exercise.reference)
    const sameReferenceSet = legacyReferences.length === canonicalReferences.length
      && equalArray([...legacyReferences].sort(), [...canonicalReferences].sort())
    if (legacyReferences.length !== canonicalReferences.length
      || (sameReferenceSet && !equalArray(legacyReferences, canonicalReferences))) {
      add('EXERCISE_ORDER_MISMATCH', `${path}.exercises`)
    }
    const exerciseCount = Math.max(legacyDay.exercises.length, canonicalDay.exercises.length)
    for (let exerciseIndex = 0; exerciseIndex < exerciseCount; exerciseIndex += 1) {
      const legacyExercise = legacyDay.exercises[exerciseIndex]
      const canonicalExercise = canonicalDay.exercises[exerciseIndex]
      if (!legacyExercise || !canonicalExercise) continue
      const exercisePath = `${path}.exercises[${exerciseIndex}]`
      if (legacyExercise.reference !== canonicalExercise.reference) add('EXERCISE_REFERENCE_MISMATCH', `${exercisePath}.reference`)
      if (legacyExercise.sets !== canonicalExercise.sets) add('SETS_MISMATCH', `${exercisePath}.sets`)
      if (legacyExercise.reps !== canonicalExercise.reps) add('REPS_MISMATCH', `${exercisePath}.reps`)
      if (legacyExercise.rest !== canonicalExercise.rest) add('REST_SECONDS_MISMATCH', `${exercisePath}.rest`)
    }
  }
  return differences
}

const formatFor = (row: AssignedProgramRow): ClientProgramShadowResult['format'] => (
  Array.isArray(row.program) ? 'client-program-days-v1' : 'client-program-weekdays-fr-v1'
)

function unsupportedResult(row: AssignedProgramRow): ClientProgramShadowResult {
  return {
    format: formatFor(row),
    result: 'UNSUPPORTED',
    differences: [{ code: 'ADAPTER_UNSUPPORTED', path: 'program' }],
    warningCount: 0,
    unmappedFieldCount: 0,
  }
}

export function compareClientProgramShadow(
  row: AssignedProgramRow,
  dependencies: CompareDependencies = {},
): ClientProgramShadowResult {
  const envelope = buildClientProgramAdaptationEnvelope(
    row,
    dependencies.now?.() ?? row.created_at ?? new Date().toISOString(),
  )
  if (envelope.status !== 'ready') return unsupportedResult(row)
  try {
    const adapted = (dependencies.adapter ?? adaptClientAssignment)(envelope.input, envelope.context)
    if (adapted.status !== 'converted') return unsupportedResult(row)
    const legacy = legacyProjection(row)
    const canonical = canonicalProjection(adapted.value)
    if (!legacy || !canonical) {
      return {
        format: formatFor(row),
        result: 'CRITICAL_MISMATCH',
        differences: [{ code: 'CANONICAL_PARTIAL', path: 'program' }],
        warningCount: adapted.warnings.length,
        unmappedFieldCount: adapted.unmappedFields.length,
      }
    }
    const differences = compareProjections(legacy, canonical)
    const warningCodes = new Set(adapted.warnings.map(warning => warning.code))
    if (warningCodes.has('unresolved_reference')) differences.push({ code: 'SOURCE_PROGRAM_MISSING', path: 'source' })
    if (warningCodes.has('legacy_name_reference')) differences.push({ code: 'LEGACY_NAME_REFERENCE', path: 'exercises' })
    if ([...warningCodes].some(code => code !== 'unresolved_reference' && code !== 'legacy_name_reference' && code !== 'unmapped_field')) {
      differences.push({ code: 'ADAPTER_WARNINGS', path: 'adapter.warnings' })
    }
    if (adapted.unmappedFields.length > 0 || warningCodes.has('unmapped_field')) {
      differences.push({ code: 'UNMAPPED_FIELDS', path: 'adapter.unmappedFields' })
    }
    const warningOnly = new Set<ClientProgramDifferenceCode>([
      'SOURCE_PROGRAM_MISSING', 'LEGACY_NAME_REFERENCE', 'ADAPTER_WARNINGS', 'UNMAPPED_FIELDS',
    ])
    const critical = differences.some(difference => !warningOnly.has(difference.code))
    return {
      format: formatFor(row),
      result: critical ? 'CRITICAL_MISMATCH' : differences.length > 0 ? 'WARNING' : 'MATCH',
      differences,
      warningCount: adapted.warnings.length,
      unmappedFieldCount: adapted.unmappedFields.length,
    }
  } catch {
    return unsupportedResult(row)
  }
}

export function toClientProgramShadowMetric(
  shadow: ClientProgramShadowResult,
  adaptationDurationMs: number,
  correlationId: string,
): ClientProgramShadowMetric {
  return {
    format: shadow.format,
    result: shadow.result,
    difference_codes: [...new Set(shadow.differences.map(difference => difference.code))],
    warning_count: shadow.warningCount,
    unmapped_field_count: shadow.unmappedFieldCount,
    adaptation_duration_ms: Math.max(0, Math.round(adaptationDurationMs * 100) / 100),
    correlation_id: correlationId,
  }
}

export type ClientProgramShadowObserver = (metric: ClientProgramShadowMetric) => void

const defaultCorrelationId = (): string => globalThis.crypto?.randomUUID?.()
  ?? `shadow-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`

const localConsoleObserver: ClientProgramShadowObserver = metric => {
  console.info('[training.client-program.shadow]', metric)
}

export function observeClientProgramShadow(
  rows: readonly AssignedProgramRow[],
  selection: ClientProgramShadowSelection,
  observer: ClientProgramShadowObserver = localConsoleObserver,
  dependencies: ObserveDependencies = {},
): void {
  try {
    const row = selectClientProgramShadowCandidate(rows, selection)
    if (!row) return
    const clock = dependencies.clock ?? (() => performance.now())
    const correlationId = dependencies.correlationId ?? defaultCorrelationId
    const startedAt = clock()
    const result = compareClientProgramShadow(row, dependencies)
    observer(toClientProgramShadowMetric(result, clock() - startedAt, correlationId()))
  } catch {
    // Shadow observability must never affect the legacy read.
  }
}
