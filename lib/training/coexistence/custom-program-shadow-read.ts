import type { PersonalProgramRow } from '@/lib/repositories/training/program'
import { adaptCustomProgram } from '@/lib/training/adapters'
import { isRecord, parseRest, parseTarget } from '@/lib/training/adapters/shared'
import type {
  AdapterContext,
  AdapterResult,
  ExerciseReference,
  RestPrescription,
  SetTarget,
  TrainingProgram,
} from '@/lib/training/model'

export const CUSTOM_PROGRAM_SHADOW_FORMAT = 'custom-program-days-v1' as const
export const CUSTOM_PROGRAM_SHADOW_PROVENANCE = 'manual/editor-normalized' as const
export const CUSTOM_PROGRAM_AI_SHADOW_PROVENANCE = 'ai/program-builder' as const
export const CUSTOM_PROGRAM_ONBOARDING_SHADOW_PROVENANCE = 'onboarding-auto' as const
export const CUSTOM_PROGRAM_DIAGNOSTIC_SHADOW_PROVENANCE = 'diagnostic-auto' as const
export const CUSTOM_PROGRAM_CRON_SHADOW_PROVENANCE = 'cron-auto' as const

export type CustomProgramShadowSource = 'manual' | 'ai' | 'onboarding_auto' | 'diagnostic_auto' | 'cron_auto'
export type CustomProgramShadowProvenance =
  | typeof CUSTOM_PROGRAM_SHADOW_PROVENANCE
  | typeof CUSTOM_PROGRAM_AI_SHADOW_PROVENANCE
  | typeof CUSTOM_PROGRAM_ONBOARDING_SHADOW_PROVENANCE
  | typeof CUSTOM_PROGRAM_DIAGNOSTIC_SHADOW_PROVENANCE
  | typeof CUSTOM_PROGRAM_CRON_SHADOW_PROVENANCE

export type CustomProgramShadowStatus = 'MATCH' | 'WARNING' | 'CRITICAL_MISMATCH' | 'UNSUPPORTED'

export type CustomProgramDifferenceCode =
  | 'OWNER_MISMATCH'
  | 'NAME_MISMATCH'
  | 'DAY_ORDER_MISMATCH'
  | 'REST_DAY_MISMATCH'
  | 'EXERCISE_ORDER_MISMATCH'
  | 'EXERCISE_REFERENCE_MISMATCH'
  | 'SETS_MISMATCH'
  | 'REPS_MISMATCH'
  | 'REST_SECONDS_MISMATCH'
  | 'FOCUS_MUSCLES_MISMATCH'
  | 'LEGACY_NAME_REFERENCE'
  | 'PROVENANCE_UNCERTAIN'
  | 'AI_MUSCLE_PRIMARY_UNMAPPED'
  | 'AI_METADATA_UNMAPPED'
  | 'AI_PROVIDER_METADATA_UNAVAILABLE'
  | 'PHASES_UNMAPPED'
  | 'TECHNIQUE_SEMANTICS_UNMAPPED'
  | 'REST_DAYS_NOT_PERSISTED'
  | 'DAY_NUMBER_NON_AUTHORITATIVE'
  | 'DIAGNOSTIC_ID_NOT_PERSISTED'
  | 'VOLUME_DELTA_NOT_PERSISTED'
  | 'PREVIOUS_PROGRAM_LINK_UNAVAILABLE'
  | 'ANTI_STAGNATION_CONTEXT_UNAVAILABLE'
  | 'CRON_TRIGGER_AT_NOT_PERSISTED'
  | 'ADAPTER_WARNINGS'
  | 'UNMAPPED_FIELDS'
  | 'CANONICAL_PARTIAL'
  | 'ADAPTER_UNSUPPORTED'

export type CustomProgramDifference = {
  readonly code: CustomProgramDifferenceCode
  readonly path: string
}

export type CustomProgramShadowResult = {
  readonly format: typeof CUSTOM_PROGRAM_SHADOW_FORMAT
  readonly result: CustomProgramShadowStatus
  readonly differences: readonly CustomProgramDifference[]
  readonly warningCount: number
  readonly unmappedFieldCount: number
}

export type CustomProgramShadowMetric = {
  readonly format: typeof CUSTOM_PROGRAM_SHADOW_FORMAT
  readonly provenance_bucket: CustomProgramShadowProvenance
  readonly result: CustomProgramShadowStatus
  readonly difference_codes: readonly CustomProgramDifferenceCode[]
  readonly warning_count: number
  readonly unmapped_field_count: number
  readonly adaptation_duration_ms: number
  readonly correlation_id: string
}

export type CustomProgramAdaptationEnvelope =
  | {
      readonly status: 'ready'
      readonly input: {
        readonly name: string
        readonly description?: string
        readonly days: PersonalProgramRow['days']
        readonly source: CustomProgramShadowSource
        readonly phases?: PersonalProgramRow['phases']
      }
      readonly context: AdapterContext
    }
  | {
      readonly status: 'unsupported'
      readonly reason: 'MISSING_CLIENT_OWNER'
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
  readonly focusMuscles: readonly string[]
  readonly exercises: readonly SemanticExercise[]
}

type SemanticProgram = {
  readonly clientId: string
  readonly name: string
  readonly days: readonly SemanticDay[]
}

type CustomProgramAdapter = (
  input: unknown,
  context: AdapterContext,
) => AdapterResult<TrainingProgram>

type CompareDependencies = {
  readonly adapter?: CustomProgramAdapter
  readonly now?: () => string
}

type ObserveDependencies = CompareDependencies & {
  readonly clock?: () => number
  readonly correlationId?: () => string
}

export function isManualCustomProgramShadowCandidate(
  row: PersonalProgramRow | null | undefined,
): row is PersonalProgramRow & { source: 'manual' } {
  return row?.source === 'manual'
}

export function isAiCustomProgramShadowCandidate(
  row: PersonalProgramRow | null | undefined,
): row is PersonalProgramRow & { source: 'ai' } {
  return row?.source === 'ai'
}

export function isOnboardingCustomProgramShadowCandidate(
  row: PersonalProgramRow | null | undefined,
): row is PersonalProgramRow & { source: 'onboarding_auto' } {
  return row?.source === 'onboarding_auto'
}

export function isDiagnosticCustomProgramShadowCandidate(
  row: PersonalProgramRow | null | undefined,
): row is PersonalProgramRow & { source: 'diagnostic_auto' } {
  return row?.source === 'diagnostic_auto'
}

export function isCronCustomProgramShadowCandidate(
  row: PersonalProgramRow | null | undefined,
): row is PersonalProgramRow & { source: 'cron_auto' } {
  return row?.source === 'cron_auto'
}

/**
 * Keeps database ownership and technical columns out of the adapter payload.
 * Only the legacy program data needed for semantic adaptation crosses this
 * boundary; the verified client owner is carried by AdapterContext.
 */
export function buildCustomProgramAdaptationEnvelope(
  row: PersonalProgramRow & { source: CustomProgramShadowSource },
  observedAt: string,
): CustomProgramAdaptationEnvelope {
  if (!row.user_id) return { status: 'unsupported', reason: 'MISSING_CLIENT_OWNER' }

  const input: {
    name: string
    description?: string
    days: PersonalProgramRow['days']
    source: CustomProgramShadowSource
    phases?: PersonalProgramRow['phases']
  } = {
    name: row.name,
    days: row.days,
    source: row.source,
  }
  if (row.description) input.description = row.description
  if (row.phases !== null) input.phases = row.phases

  const sourceContext = row.source === 'onboarding_auto'
    ? {
        sourceCreatedBy: { kind: 'system' as const },
        sourceTrigger: 'onboarding' as const,
      }
    : row.source === 'cron_auto'
      ? {
          sourceCreatedBy: { kind: 'system' as const },
          sourceTrigger: 'cron' as const,
        }
    : row.source === 'diagnostic_auto'
      ? {
          sourceCreatedBy: { kind: 'client' as const, id: row.user_id },
          sourceTrigger: 'diagnostic' as const,
        }
      : {}

  return {
    status: 'ready',
    input,
    context: {
      id: row.id,
      now: observedAt,
      owner: { kind: 'client', clientId: row.user_id },
      clientId: row.user_id,
      sourceId: row.id,
      name: row.name,
      description: row.description ?? undefined,
      ...sourceContext,
    },
  }
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

function legacyProjection(row: PersonalProgramRow): SemanticProgram | null {
  if (!row.user_id || !Array.isArray(row.days)) return null
  const days: SemanticDay[] = []
  for (const rawDay of row.days) {
    if (!isRecord(rawDay)) return null
    const label = readNonEmptyString(rawDay, ['name', 'day_name', 'weekday']) ?? `Jour ${days.length + 1}`
    const isRest = rawDay.is_rest === true || rawDay.repos === true
    if (isRest) {
      days.push({ label, kind: 'rest', focusMuscles: [], exercises: [] })
      continue
    }
    if (!Array.isArray(rawDay.exercises) || rawDay.exercises.length === 0) return null
    const exercises: SemanticExercise[] = []
    for (const rawExercise of rawDay.exercises) {
      if (!isRecord(rawExercise)) return null
      const setsValue = rawExercise.sets ?? rawExercise.series
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
        sets: typeof setsValue === 'number' ? setsValue : Number(setsValue),
        reps: targetKey(target),
        rest: restKey(restValue === undefined || restValue === null ? { kind: 'none' } : parseRest(restValue)),
      })
    }
    const focusMuscles = Array.isArray(rawDay.muscle_groups)
      ? rawDay.muscle_groups.filter((value): value is string => typeof value === 'string')
      : typeof rawDay.focus === 'string'
        ? rawDay.focus.split(',').map(value => value.trim()).filter(Boolean)
        : []
    days.push({ label, kind: 'training', focusMuscles, exercises })
  }
  return { clientId: row.user_id, name: row.name, days }
}

function canonicalProjection(program: TrainingProgram): SemanticProgram | null {
  if (program.owner.kind !== 'client' || program.weeks.length !== 1) return null
  const days: SemanticDay[] = []
  for (const day of program.weeks[0].days) {
    if (day.kind === 'rest') {
      days.push({ label: day.label, kind: 'rest', focusMuscles: [], exercises: [] })
      continue
    }
    if (day.sessions.length !== 1 || day.sessions[0].blocks.length !== 1) return null
    days.push({
      label: day.label,
      kind: 'training',
      focusMuscles: day.sessions[0].focusMuscles,
      exercises: day.sessions[0].blocks[0].exercises.map(exercise => ({
        reference: canonicalReferenceKey(exercise.exercise),
        sets: exercise.prescriptions.length,
        reps: targetKey(exercise.prescriptions[0]?.target),
        rest: restKey(exercise.defaultRest),
      })),
    })
  }
  return { clientId: program.owner.clientId, name: program.name, days }
}

const equalArray = (left: readonly string[], right: readonly string[]): boolean => (
  left.length === right.length && left.every((value, index) => value === right[index])
)

function compareProjections(legacy: SemanticProgram, canonical: SemanticProgram): CustomProgramDifference[] {
  const differences: CustomProgramDifference[] = []
  const add = (code: CustomProgramDifferenceCode, path: string) => differences.push({ code, path })
  if (legacy.clientId !== canonical.clientId) add('OWNER_MISMATCH', 'owner')
  if (legacy.name !== canonical.name) add('NAME_MISMATCH', 'name')
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
    if (!equalArray(legacyDay.focusMuscles, canonicalDay.focusMuscles)) {
      add('FOCUS_MUSCLES_MISMATCH', `${path}.focusMuscles`)
    }
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

function containsNestedField(days: PersonalProgramRow['days'], field: string): boolean {
  if (!Array.isArray(days)) return false
  return days.some(day => isRecord(day) && (
    Object.hasOwn(day, field)
    || (Array.isArray(day.exercises) && day.exercises.some(exercise => isRecord(exercise) && Object.hasOwn(exercise, field)))
  ))
}

function containsNestedValue(days: PersonalProgramRow['days'], field: string): boolean {
  if (!Array.isArray(days)) return false
  return days.some(day => isRecord(day) && (
    (Object.hasOwn(day, field) && day[field] !== null && day[field] !== '' && day[field] !== undefined)
    || (Array.isArray(day.exercises) && day.exercises.some(exercise => isRecord(exercise)
      && Object.hasOwn(exercise, field)
      && exercise[field] !== null
      && exercise[field] !== ''
      && exercise[field] !== undefined))
  ))
}

function containsEditorNormalizedProvenanceSignals(days: PersonalProgramRow['days']): boolean {
  if (!Array.isArray(days)) return false
  return days.some(day => isRecord(day) && (
    Object.hasOwn(day, 'day_number')
    || Object.hasOwn(day, 'focus')
    || Object.hasOwn(day, 'muscle_groups')
    || (Array.isArray(day.exercises) && day.exercises.some(exercise => isRecord(exercise) && (
      Object.hasOwn(exercise, 'muscle_primary') || Object.hasOwn(exercise, 'order')
    )))
  ))
}

const unsupportedResult = (): CustomProgramShadowResult => ({
  format: CUSTOM_PROGRAM_SHADOW_FORMAT,
  result: 'UNSUPPORTED',
  differences: [{ code: 'ADAPTER_UNSUPPORTED', path: 'program' }],
  warningCount: 0,
  unmappedFieldCount: 0,
})

export function compareCustomProgramShadow(
  row: PersonalProgramRow & { source: CustomProgramShadowSource },
  dependencies: CompareDependencies = {},
): CustomProgramShadowResult {
  const envelope = buildCustomProgramAdaptationEnvelope(
    row,
    dependencies.now?.() ?? row.updated_at ?? row.created_at ?? new Date().toISOString(),
  )
  if (envelope.status !== 'ready') return unsupportedResult()
  try {
    const adapted = (dependencies.adapter ?? adaptCustomProgram)(envelope.input, envelope.context)
    if (adapted.status !== 'converted') return unsupportedResult()
    const legacy = legacyProjection(row)
    const canonical = canonicalProjection(adapted.value)
    if (!legacy || !canonical) {
      if (row.source === 'cron_auto') return unsupportedResult()
      return {
        format: CUSTOM_PROGRAM_SHADOW_FORMAT,
        result: 'CRITICAL_MISMATCH',
        differences: [{ code: 'CANONICAL_PARTIAL', path: 'program' }],
        warningCount: adapted.warnings.length,
        unmappedFieldCount: adapted.unmappedFields.length,
      }
    }
    const differences = compareProjections(legacy, canonical)
    const warningCodes = new Set(adapted.warnings.map(warning => warning.code))
    if (warningCodes.has('legacy_name_reference')) differences.push({ code: 'LEGACY_NAME_REFERENCE', path: 'exercises' })
    if (row.phases !== null || containsNestedField(row.days, 'phases')) differences.push({ code: 'PHASES_UNMAPPED', path: 'phases' })
    const hasTechniqueSignal = row.source === 'manual'
      ? containsNestedField(row.days, 'technique')
      : containsNestedValue(row.days, 'technique')
    if (hasTechniqueSignal) differences.push({ code: 'TECHNIQUE_SEMANTICS_UNMAPPED', path: 'techniques' })
    if (row.source === 'manual' && containsEditorNormalizedProvenanceSignals(row.days)) {
      differences.push({ code: 'PROVENANCE_UNCERTAIN', path: 'provenance' })
    }
    if (row.source === 'ai' || row.source === 'onboarding_auto' || row.source === 'diagnostic_auto' || row.source === 'cron_auto') {
      if (containsNestedValue(row.days, 'muscle_primary')) {
        differences.push({ code: 'AI_MUSCLE_PRIMARY_UNMAPPED', path: 'exercises.muscle_primary' })
      }
      if (containsNestedField(row.days, 'day_number') || containsNestedField(row.days, 'order')) {
        differences.push({ code: 'AI_METADATA_UNMAPPED', path: 'ai.metadata' })
      }
      differences.push({ code: 'AI_PROVIDER_METADATA_UNAVAILABLE', path: 'source.provider_metadata' })
    }
    if (row.source === 'onboarding_auto') {
      differences.push({ code: 'REST_DAYS_NOT_PERSISTED', path: 'days' })
      if (containsNestedField(row.days, 'day_number')) {
        differences.push({ code: 'DAY_NUMBER_NON_AUTHORITATIVE', path: 'days.day_number' })
      }
    }
    if (row.source === 'diagnostic_auto') {
      differences.push({ code: 'REST_DAYS_NOT_PERSISTED', path: 'days' })
      if (containsNestedField(row.days, 'day_number')) {
        differences.push({ code: 'DAY_NUMBER_NON_AUTHORITATIVE', path: 'days.day_number' })
      }
      differences.push({ code: 'DIAGNOSTIC_ID_NOT_PERSISTED', path: 'source.diagnostic_id' })
      differences.push({ code: 'VOLUME_DELTA_NOT_PERSISTED', path: 'source.volume_delta' })
      differences.push({ code: 'PREVIOUS_PROGRAM_LINK_UNAVAILABLE', path: 'source.previous_program' })
    }
    if (row.source === 'cron_auto') {
      differences.push({ code: 'REST_DAYS_NOT_PERSISTED', path: 'days' })
      if (containsNestedField(row.days, 'day_number')) {
        differences.push({ code: 'DAY_NUMBER_NON_AUTHORITATIVE', path: 'days.day_number' })
      }
      differences.push({ code: 'PREVIOUS_PROGRAM_LINK_UNAVAILABLE', path: 'source.previous_program' })
      differences.push({ code: 'ANTI_STAGNATION_CONTEXT_UNAVAILABLE', path: 'source.anti_stagnation_context' })
      differences.push({ code: 'CRON_TRIGGER_AT_NOT_PERSISTED', path: 'source.triggered_at' })
    }
    if ([...warningCodes].some(code => code !== 'legacy_name_reference' && code !== 'unmapped_field')) {
      differences.push({ code: 'ADAPTER_WARNINGS', path: 'adapter.warnings' })
    }
    if (adapted.unmappedFields.length > 0 || warningCodes.has('unmapped_field')) {
      differences.push({ code: 'UNMAPPED_FIELDS', path: 'adapter.unmappedFields' })
    }
    const warningOnly = new Set<CustomProgramDifferenceCode>([
      'LEGACY_NAME_REFERENCE', 'PROVENANCE_UNCERTAIN', 'AI_MUSCLE_PRIMARY_UNMAPPED',
      'AI_METADATA_UNMAPPED', 'AI_PROVIDER_METADATA_UNAVAILABLE', 'PHASES_UNMAPPED',
      'TECHNIQUE_SEMANTICS_UNMAPPED', 'ADAPTER_WARNINGS', 'UNMAPPED_FIELDS',
      'REST_DAYS_NOT_PERSISTED', 'DAY_NUMBER_NON_AUTHORITATIVE',
      'DIAGNOSTIC_ID_NOT_PERSISTED', 'VOLUME_DELTA_NOT_PERSISTED',
      'PREVIOUS_PROGRAM_LINK_UNAVAILABLE', 'ANTI_STAGNATION_CONTEXT_UNAVAILABLE',
      'CRON_TRIGGER_AT_NOT_PERSISTED',
    ])
    const critical = differences.some(difference => !warningOnly.has(difference.code))
    return {
      format: CUSTOM_PROGRAM_SHADOW_FORMAT,
      result: critical ? 'CRITICAL_MISMATCH' : differences.length > 0 ? 'WARNING' : 'MATCH',
      differences,
      warningCount: adapted.warnings.length,
      unmappedFieldCount: adapted.unmappedFields.length,
    }
  } catch {
    return unsupportedResult()
  }
}

export function toCustomProgramShadowMetric(
  shadow: CustomProgramShadowResult,
  adaptationDurationMs: number,
  correlationId: string,
  provenanceBucket: CustomProgramShadowProvenance = CUSTOM_PROGRAM_SHADOW_PROVENANCE,
): CustomProgramShadowMetric {
  return {
    format: shadow.format,
    provenance_bucket: provenanceBucket,
    result: shadow.result,
    difference_codes: [...new Set(shadow.differences.map(difference => difference.code))],
    warning_count: shadow.warningCount,
    unmapped_field_count: shadow.unmappedFieldCount,
    adaptation_duration_ms: Math.max(0, Math.round(adaptationDurationMs * 100) / 100),
    correlation_id: correlationId,
  }
}

export type CustomProgramShadowObserver = (metric: CustomProgramShadowMetric) => void

const defaultCorrelationId = (): string => globalThis.crypto?.randomUUID?.()
  ?? `shadow-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`

const localConsoleObserver: CustomProgramShadowObserver = metric => {
  console.info('[training.custom-program.shadow]', metric)
}

export function observeActiveManualCustomProgramShadow(
  row: PersonalProgramRow | null | undefined,
  observer: CustomProgramShadowObserver = localConsoleObserver,
  dependencies: ObserveDependencies = {},
): void {
  if (!isManualCustomProgramShadowCandidate(row)) return
  try {
    const clock = dependencies.clock ?? (() => performance.now())
    const correlationId = dependencies.correlationId ?? defaultCorrelationId
    const startedAt = clock()
    const result = compareCustomProgramShadow(row, dependencies)
    observer(toCustomProgramShadowMetric(result, clock() - startedAt, correlationId()))
  } catch {
    // Shadow observability must never affect the legacy dashboard read.
  }
}

export function observeActiveAiCustomProgramShadow(
  row: PersonalProgramRow | null | undefined,
  observer: CustomProgramShadowObserver = localConsoleObserver,
  dependencies: ObserveDependencies = {},
): void {
  if (!isAiCustomProgramShadowCandidate(row)) return
  try {
    const clock = dependencies.clock ?? (() => performance.now())
    const correlationId = dependencies.correlationId ?? defaultCorrelationId
    const startedAt = clock()
    const result = compareCustomProgramShadow(row, dependencies)
    observer(toCustomProgramShadowMetric(
      result,
      clock() - startedAt,
      correlationId(),
      CUSTOM_PROGRAM_AI_SHADOW_PROVENANCE,
    ))
  } catch {
    // Shadow observability must never affect the legacy dashboard read.
  }
}

export function observeActiveOnboardingCustomProgramShadow(
  row: PersonalProgramRow | null | undefined,
  observer: CustomProgramShadowObserver = localConsoleObserver,
  dependencies: ObserveDependencies = {},
): void {
  if (!isOnboardingCustomProgramShadowCandidate(row)) return
  try {
    const clock = dependencies.clock ?? (() => performance.now())
    const correlationId = dependencies.correlationId ?? defaultCorrelationId
    const startedAt = clock()
    const result = compareCustomProgramShadow(row, dependencies)
    observer(toCustomProgramShadowMetric(
      result,
      clock() - startedAt,
      correlationId(),
      CUSTOM_PROGRAM_ONBOARDING_SHADOW_PROVENANCE,
    ))
  } catch {
    // Shadow observability must never affect the legacy dashboard read.
  }
}

export function observeActiveDiagnosticCustomProgramShadow(
  row: PersonalProgramRow | null | undefined,
  observer: CustomProgramShadowObserver = localConsoleObserver,
  dependencies: ObserveDependencies = {},
): void {
  if (!isDiagnosticCustomProgramShadowCandidate(row)) return
  try {
    const clock = dependencies.clock ?? (() => performance.now())
    const correlationId = dependencies.correlationId ?? defaultCorrelationId
    const startedAt = clock()
    const result = compareCustomProgramShadow(row, dependencies)
    observer(toCustomProgramShadowMetric(
      result,
      clock() - startedAt,
      correlationId(),
      CUSTOM_PROGRAM_DIAGNOSTIC_SHADOW_PROVENANCE,
    ))
  } catch {
    // Shadow observability must never affect the legacy dashboard read.
  }
}
