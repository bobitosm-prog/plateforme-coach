import type { CoachProgramRow } from '@/lib/repositories/training'
import { adaptCoachTemplate } from '@/lib/training/adapters'
import { parseRest, parseTarget } from '@/lib/training/adapters/shared'
import type {
  AdapterContext,
  AdapterResult,
  ExerciseReference,
  RestPrescription,
  SetTarget,
  TrainingProgram,
} from '@/lib/training/model'

export const COACH_TEMPLATE_SHADOW_FORMAT = 'coach-template-envelope-v1' as const

export type CoachTemplateShadowStatus = 'MATCH' | 'WARNING' | 'CRITICAL_MISMATCH' | 'UNSUPPORTED'

export type CoachTemplateDifferenceCode =
  | 'OWNER_MISMATCH'
  | 'NAME_MISMATCH'
  | 'STATUS_MISMATCH'
  | 'TAGS_MISMATCH'
  | 'DAY_ORDER_MISMATCH'
  | 'REST_DAY_MISMATCH'
  | 'EXERCISE_ORDER_MISMATCH'
  | 'EXERCISE_REFERENCE_MISMATCH'
  | 'SETS_MISMATCH'
  | 'REPS_MISMATCH'
  | 'REST_SECONDS_MISMATCH'
  | 'ADAPTER_WARNINGS'
  | 'UNMAPPED_FIELDS'
  | 'CANONICAL_PARTIAL'
  | 'ADAPTER_UNSUPPORTED'

export type CoachTemplateDifference = {
  readonly code: CoachTemplateDifferenceCode
  readonly path: string
}

export type CoachTemplateShadowResult = {
  readonly format: typeof COACH_TEMPLATE_SHADOW_FORMAT
  readonly result: CoachTemplateShadowStatus
  readonly differences: readonly CoachTemplateDifference[]
  readonly warningCount: number
  readonly unmappedFieldCount: number
}

export type CoachTemplateShadowMetric = {
  readonly format: typeof COACH_TEMPLATE_SHADOW_FORMAT
  readonly result: CoachTemplateShadowStatus
  readonly difference_codes: readonly CoachTemplateDifferenceCode[]
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

type SemanticProgram = {
  readonly ownerCoachId: string
  readonly name: string
  readonly status: 'draft' | 'active' | 'archived'
  readonly tags: readonly string[]
  readonly days: readonly SemanticDay[]
}

type CoachTemplateAdapter = (
  input: unknown,
  context: AdapterContext,
) => AdapterResult<TrainingProgram>

type CompareDependencies = {
  readonly adapter?: CoachTemplateAdapter
  readonly now?: () => string
}

type ObserveDependencies = CompareDependencies & {
  readonly clock?: () => number
  readonly correlationId?: () => string
}

const isRecord = (value: unknown): value is Record<string, unknown> => (
  typeof value === 'object' && value !== null && !Array.isArray(value)
)

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

const referenceKey = (reference: ExerciseReference): string => {
  if (reference.kind === 'catalog') return `catalog:${reference.exerciseId}`
  if (reference.kind === 'custom') return `custom:${reference.customExerciseId}`
  return `legacy:${reference.legacyName}`
}

function legacyReferenceKey(exercise: Record<string, unknown>): string {
  const catalogId = readNonEmptyString(exercise, ['exercise_id', 'exerciseId'])
  if (catalogId) return `catalog:${catalogId}`
  const name = readNonEmptyString(exercise, ['exercise_name', 'custom_name', 'name', 'exerciseName']) ?? 'invalid'
  return `legacy:${name}`
}

function legacyProjection(row: CoachProgramRow): SemanticProgram | null {
  if (!isRecord(row.program) || !Array.isArray(row.program.days)) return null
  const days: SemanticDay[] = []
  for (const rawDay of row.program.days) {
    if (!isRecord(rawDay)) return null
    const label = readNonEmptyString(rawDay, ['name', 'day_name', 'weekday']) ?? `Jour ${days.length + 1}`
    const rest = rawDay.is_rest === true || rawDay.repos === true
    if (rest) {
      days.push({ label, kind: 'rest', exercises: [] })
      continue
    }
    if (!Array.isArray(rawDay.exercises)) return null
    const exercises: SemanticExercise[] = []
    for (const rawExercise of rawDay.exercises) {
      if (!isRecord(rawExercise)) return null
      const setsValue = rawExercise.sets ?? rawExercise.series
      const sets = typeof setsValue === 'number' ? setsValue : Number(setsValue)
      const target = rawExercise.reps ?? rawExercise.repetitions ?? (
        rawExercise.duration ?? rawExercise.duration_seconds ?? rawExercise.distance ?? rawExercise.distance_meters
      )
      const parsedTarget = rawExercise.reps !== undefined || rawExercise.repetitions !== undefined
        ? parseTarget(target)
        : rawExercise.duration !== undefined || rawExercise.duration_seconds !== undefined
          ? { kind: 'duration' as const, minSeconds: Number(target) }
          : { kind: 'distance' as const, minMeters: Number(target) }
      const restValue = rawExercise.rest_seconds ?? rawExercise.rest
      exercises.push({
        reference: legacyReferenceKey(rawExercise),
        sets,
        reps: targetKey(parsedTarget),
        rest: restKey(restValue === undefined || restValue === null ? { kind: 'none' } : parseRest(restValue)),
      })
    }
    days.push({ label, kind: 'training', exercises })
  }
  return {
    ownerCoachId: row.coach_id ?? '',
    name: row.name,
    status: 'draft',
    tags: row.tags ?? [],
    days,
  }
}

function canonicalProjection(program: TrainingProgram): SemanticProgram | null {
  if (program.owner.kind !== 'coach' || program.weeks.length !== 1) return null
  const days: SemanticDay[] = []
  for (const day of program.weeks[0].days) {
    if (day.kind === 'rest') {
      days.push({ label: day.label, kind: 'rest', exercises: [] })
      continue
    }
    if (day.sessions.length !== 1 || day.sessions[0].blocks.length !== 1) return null
    const exercises = day.sessions[0].blocks[0].exercises.map(exercise => ({
      reference: referenceKey(exercise.exercise),
      sets: exercise.prescriptions.length,
      reps: targetKey(exercise.prescriptions[0]?.target),
      rest: restKey(exercise.defaultRest),
    }))
    days.push({ label: day.label, kind: 'training', exercises })
  }
  return {
    ownerCoachId: program.owner.coachId,
    name: program.name,
    status: program.status,
    tags: program.tags,
    days,
  }
}

const equalArray = (left: readonly string[], right: readonly string[]): boolean => (
  left.length === right.length && left.every((value, index) => value === right[index])
)

function compareProjections(legacy: SemanticProgram, canonical: SemanticProgram): CoachTemplateDifference[] {
  const differences: CoachTemplateDifference[] = []
  const add = (code: CoachTemplateDifferenceCode, path: string) => differences.push({ code, path })
  if (legacy.ownerCoachId !== canonical.ownerCoachId) add('OWNER_MISMATCH', 'owner')
  if (legacy.name !== canonical.name) add('NAME_MISMATCH', 'name')
  if (legacy.status !== canonical.status) add('STATUS_MISMATCH', 'status')
  if (!equalArray(legacy.tags, canonical.tags)) add('TAGS_MISMATCH', 'tags')
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

function unsupportedResult(): CoachTemplateShadowResult {
  return {
    format: COACH_TEMPLATE_SHADOW_FORMAT,
    result: 'UNSUPPORTED',
    differences: [{ code: 'ADAPTER_UNSUPPORTED', path: 'program' }],
    warningCount: 0,
    unmappedFieldCount: 0,
  }
}

export function compareCoachTemplateShadow(
  row: CoachProgramRow,
  coachId: string,
  dependencies: CompareDependencies = {},
): CoachTemplateShadowResult {
  const adapter = dependencies.adapter ?? adaptCoachTemplate
  const adapterInput = {
    id: row.id,
    name: row.name,
    description: row.description,
    is_template: row.is_template,
    tags: row.tags,
    program: row.program,
    created_at: row.created_at,
  }
  try {
    const adapted = adapter(adapterInput, {
      id: row.id,
      now: dependencies.now?.() ?? row.created_at ?? new Date().toISOString(),
      owner: { kind: 'coach', coachId },
      coachId,
      sourceId: row.id,
      name: row.name,
      description: row.description ?? undefined,
    })
    if (adapted.status !== 'converted') return unsupportedResult()
    const legacy = legacyProjection(row)
    const canonical = canonicalProjection(adapted.value)
    if (!legacy || !canonical) {
      return {
        format: COACH_TEMPLATE_SHADOW_FORMAT,
        result: 'CRITICAL_MISMATCH',
        differences: [{ code: 'CANONICAL_PARTIAL', path: 'program' }],
        warningCount: adapted.warnings.length,
        unmappedFieldCount: adapted.unmappedFields.length,
      }
    }
    const differences = compareProjections(legacy, canonical)
    if (adapted.warnings.length > 0) differences.push({ code: 'ADAPTER_WARNINGS', path: 'adapter.warnings' })
    if (adapted.unmappedFields.length > 0) differences.push({ code: 'UNMAPPED_FIELDS', path: 'adapter.unmappedFields' })
    const critical = differences.some(({ code }) => code !== 'ADAPTER_WARNINGS' && code !== 'UNMAPPED_FIELDS')
    return {
      format: COACH_TEMPLATE_SHADOW_FORMAT,
      result: critical ? 'CRITICAL_MISMATCH' : differences.length > 0 ? 'WARNING' : 'MATCH',
      differences,
      warningCount: adapted.warnings.length,
      unmappedFieldCount: adapted.unmappedFields.length,
    }
  } catch {
    return unsupportedResult()
  }
}

export function toCoachTemplateShadowMetric(
  shadow: CoachTemplateShadowResult,
  adaptationDurationMs: number,
  correlationId: string,
): CoachTemplateShadowMetric {
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

export type CoachTemplateShadowObserver = (metric: CoachTemplateShadowMetric) => void

const defaultCorrelationId = (): string => globalThis.crypto?.randomUUID?.()
  ?? `shadow-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`

const localConsoleObserver: CoachTemplateShadowObserver = metric => {
  console.info('[training.coach-template.shadow]', metric)
}

export function observeCoachTemplateShadowPage(
  rows: readonly CoachProgramRow[],
  coachId: string,
  observer: CoachTemplateShadowObserver = localConsoleObserver,
  dependencies: ObserveDependencies = {},
): void {
  const clock = dependencies.clock ?? (() => performance.now())
  const correlationId = dependencies.correlationId ?? defaultCorrelationId
  for (const row of rows) {
    try {
      const startedAt = clock()
      const result = compareCoachTemplateShadow(row, coachId, dependencies)
      const metric = toCoachTemplateShadowMetric(result, clock() - startedAt, correlationId())
      observer(metric)
    } catch {
      // Shadow observability must never affect the legacy list.
    }
  }
}
