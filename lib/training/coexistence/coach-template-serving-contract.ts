import type { PaginatedResult } from '@/lib/repositories/pagination'
import type { CoachProgramRow } from '@/lib/repositories/training/program'
import type { Json } from '@/lib/supabase/types'
import { adaptCoachTemplate } from '@/lib/training/adapters'
import { compareCoachTemplateShadow, type CoachTemplateShadowStatus } from '@/lib/training/coexistence/coach-template-shadow-read'
import type {
  AdapterContext,
  AdapterResult,
  ExerciseReference,
  RestPrescription,
  SetTarget,
  TrainingProgram,
} from '@/lib/training/model'

export const COACH_TEMPLATE_SERVING_DEFAULT_MODE = 'legacy-only' as const

export type CoachTemplateServingMode = 'legacy-only' | 'canonical-when-identical'

export type CoachTemplateServingFallbackReason =
  | 'ROLLBACK_LEGACY_ONLY'
  | 'WARNING'
  | 'CRITICAL_MISMATCH'
  | 'UNSUPPORTED'
  | 'PRESENTATION_MISMATCH'
  | 'ADAPTATION_ERROR'

export type CoachTemplateServingDecision =
  | { readonly id: string; readonly source: 'canonical'; readonly shadowResult: 'MATCH' }
  | {
      readonly id: string
      readonly source: 'legacy-fallback'
      readonly reason: CoachTemplateServingFallbackReason
      readonly shadowResult?: CoachTemplateShadowStatus
    }

export type CoachTemplateServingDecisionTelemetry = {
  readonly serving_mode: CoachTemplateServingMode
  readonly served_source: CoachTemplateServingDecision['source']
  readonly fallback_reason: CoachTemplateServingFallbackReason | null
}

export type CoachTemplateServingDecisionObserver = (
  telemetry: CoachTemplateServingDecisionTelemetry,
) => void

export type CoachTemplateAssessmentPageTelemetry = {
  readonly assessment_run_id: string
  readonly page_sequence: number
  readonly item_count: number
  readonly terminal_page: boolean
  readonly canonical_eligible: number
  readonly warning: number
  readonly critical_mismatch: number
  readonly unsupported: number
  readonly presentation_mismatch: number
  readonly adaptation_error: number
  readonly observer_error: number
}

export type CoachTemplateAssessmentPageObserver = (
  telemetry: CoachTemplateAssessmentPageTelemetry,
) => void

export type CoachTemplateServingPage = {
  readonly page: PaginatedResult<CoachProgramRow>
  readonly decisions: readonly CoachTemplateServingDecision[]
}

type CoachTemplateAdapter = (
  input: unknown,
  context: AdapterContext,
) => AdapterResult<TrainingProgram>

export type CoachTemplateServingDependencies = {
  readonly adapter?: CoachTemplateAdapter
}

export type CoachTemplateCanonicalServingValidationControl = {
  readonly mode: 'canonical-when-identical'
  readonly dependencies: CoachTemplateServingDependencies
}

export type CoachTemplateAssessmentControl = {
  readonly mode: 'assessment-only'
  readonly assessmentRunId: string
  readonly dependencies: CoachTemplateServingDependencies
  readonly observer: CoachTemplateAssessmentPageObserver
  readonly fallbackObserver: CoachTemplateAssessmentPageObserver
  readonly nextPageSequence: () => number
}

export type CoachTemplateAssessmentControlOptions = CoachTemplateServingDependencies & {
  readonly observer?: CoachTemplateAssessmentPageObserver
  readonly fallbackObserver?: CoachTemplateAssessmentPageObserver
}

export function createCoachTemplateCanonicalServingValidationControl(
  dependencies: CoachTemplateServingDependencies = {},
): CoachTemplateCanonicalServingValidationControl {
  return { mode: 'canonical-when-identical', dependencies }
}

const defaultOpaqueAssessmentRunId = (): string => globalThis.crypto?.randomUUID?.()
  ?? `assessment-${Math.random().toString(36).slice(2, 14)}-${Math.random().toString(36).slice(2, 14)}`

const localAssessmentPageObserver: CoachTemplateAssessmentPageObserver = telemetry => {
  console.info('[training.coach-template.assessment]', telemetry)
}

const localAssessmentFallbackObserver: CoachTemplateAssessmentPageObserver = telemetry => {
  console.warn('[training.coach-template.assessment]', telemetry)
}

export function createCoachTemplateAssessmentControl(
  options: CoachTemplateAssessmentControlOptions = {},
): CoachTemplateAssessmentControl {
  let pageSequence = 0
  return {
    mode: 'assessment-only',
    assessmentRunId: defaultOpaqueAssessmentRunId(),
    dependencies: { ...(options.adapter ? { adapter: options.adapter } : {}) },
    observer: options.observer ?? localAssessmentPageObserver,
    fallbackObserver: options.fallbackObserver ?? localAssessmentFallbackObserver,
    nextPageSequence: () => {
      pageSequence += 1
      return pageSequence
    },
  }
}

export function toCoachTemplateServingDecisionTelemetry(
  mode: CoachTemplateServingMode,
  decision: CoachTemplateServingDecision,
): CoachTemplateServingDecisionTelemetry {
  return {
    serving_mode: mode,
    served_source: decision.source,
    fallback_reason: decision.source === 'legacy-fallback' ? decision.reason : null,
  }
}

const localServingDecisionObserver: CoachTemplateServingDecisionObserver = telemetry => {
  console.info('[training.coach-template.serving]', telemetry)
}

export function observeCoachTemplateServingDecisions(
  mode: CoachTemplateServingMode,
  decisions: readonly CoachTemplateServingDecision[],
  observer: CoachTemplateServingDecisionObserver = localServingDecisionObserver,
): void {
  for (const decision of decisions) {
    try {
      observer(toCoachTemplateServingDecisionTelemetry(mode, decision))
    } catch {
      // Serving telemetry must never affect the selected legacy/canonical page.
    }
  }
}

export function toCoachTemplateAssessmentPageTelemetry(
  assessmentRunId: string,
  pageSequence: number,
  itemCount: number,
  terminalPage: boolean,
  decisions: readonly CoachTemplateServingDecision[],
  observerError = 0,
): CoachTemplateAssessmentPageTelemetry {
  let canonicalEligible = 0
  let warning = 0
  let criticalMismatch = 0
  let unsupported = 0
  let presentationMismatch = 0
  let adaptationError = 0
  for (const decision of decisions) {
    if (decision.source === 'canonical') canonicalEligible += 1
    else if (decision.reason === 'WARNING') warning += 1
    else if (decision.reason === 'CRITICAL_MISMATCH') criticalMismatch += 1
    else if (decision.reason === 'UNSUPPORTED') unsupported += 1
    else if (decision.reason === 'PRESENTATION_MISMATCH') presentationMismatch += 1
    else if (decision.reason === 'ADAPTATION_ERROR') adaptationError += 1
  }
  return {
    assessment_run_id: assessmentRunId,
    page_sequence: pageSequence,
    item_count: itemCount,
    terminal_page: terminalPage,
    canonical_eligible: canonicalEligible,
    warning,
    critical_mismatch: criticalMismatch,
    unsupported,
    presentation_mismatch: presentationMismatch,
    adaptation_error: adaptationError,
    observer_error: observerError,
  }
}

export function observeCoachTemplateAssessmentPage(
  telemetry: CoachTemplateAssessmentPageTelemetry,
  observer: CoachTemplateAssessmentPageObserver,
  fallbackObserver: CoachTemplateAssessmentPageObserver,
): void {
  try {
    observer(telemetry)
  } catch {
    try {
      fallbackObserver({ ...telemetry, observer_error: telemetry.observer_error + 1 })
    } catch {
      // Assessment observability must never affect the legacy page.
    }
  }
}

type JsonObject = { [key: string]: Json | undefined }

type UiExercise = {
  readonly name: unknown
  readonly sets: unknown
  readonly reps: unknown
  readonly rest: unknown
}

type UiDay = {
  readonly name: unknown
  readonly is_rest: boolean
  readonly exercises: readonly UiExercise[] | null
}

type UiProjection = {
  readonly id: string
  readonly coach_id: string | null
  readonly name: string
  readonly created_at: string | null
  readonly tags: readonly string[]
  readonly split: unknown
  readonly duration: unknown
  readonly days: readonly UiDay[] | null
}

const isRecord = (value: unknown): value is Record<string, unknown> => (
  typeof value === 'object' && value !== null && !Array.isArray(value)
)

const referenceName = (reference: ExerciseReference): string => {
  if (reference.kind === 'legacy') return reference.legacyName
  return reference.snapshotName
}

const referenceFields = (reference: ExerciseReference): Record<string, string> => {
  if (reference.kind === 'catalog') return { exercise_id: reference.exerciseId }
  if (reference.kind === 'custom') return { custom_exercise_id: reference.customExerciseId }
  return {}
}

const targetValue = (target: SetTarget): string | number => {
  if (target.kind === 'repetitions') return target.min === target.max ? target.min : `${target.min}-${target.max}`
  if (target.kind === 'amrap') return target.minimum === undefined ? 'AMRAP' : `AMRAP ${target.minimum}`
  if (target.kind === 'duration') {
    return target.maxSeconds === undefined ? `${target.minSeconds}s` : `${target.minSeconds}-${target.maxSeconds}s`
  }
  return target.maxMeters === undefined ? `${target.minMeters}m` : `${target.minMeters}-${target.maxMeters}m`
}

const restValue = (rest: RestPrescription): string | number => {
  if (rest.kind === 'fixed') return rest.seconds
  if (rest.kind === 'range') return `${rest.minSeconds}-${rest.maxSeconds}s`
  if (rest.kind === 'until-ready') return rest.minimumSeconds === undefined ? 'until-ready' : `until-ready:${rest.minimumSeconds}`
  return 0
}

function canonicalProgramEnvelope(program: TrainingProgram): JsonObject | null {
  if (program.kind !== 'template' || program.owner.kind !== 'coach' || program.weeks.length !== 1) return null
  const days: JsonObject[] = []
  for (const day of program.weeks[0].days) {
    if (day.kind === 'rest') {
      days.push({ name: day.label, is_rest: true, exercises: [] })
      continue
    }
    if (day.sessions.length !== 1 || day.sessions[0].blocks.length !== 1) return null
    const exercises: JsonObject[] = []
    for (const exercise of day.sessions[0].blocks[0].exercises) {
      const target = exercise.prescriptions[0]?.target
      if (!target || exercise.prescriptions.length === 0) return null
      exercises.push({
        ...referenceFields(exercise.exercise),
        name: referenceName(exercise.exercise),
        sets: exercise.prescriptions.length,
        reps: targetValue(target),
        rest: restValue(exercise.defaultRest),
      })
    }
    days.push({ name: day.label, exercises })
  }
  return { days }
}

function canonicalBackedRow(program: TrainingProgram, legacy: CoachProgramRow): CoachProgramRow | null {
  const envelope = canonicalProgramEnvelope(program)
  if (!envelope || program.owner.kind !== 'coach') return null
  return {
    id: program.id,
    coach_id: program.owner.coachId,
    name: program.name,
    description: program.description ?? null,
    is_template: legacy.is_template,
    tags: [...program.tags],
    program: envelope,
    created_at: legacy.created_at,
  }
}

function uiProjection(row: CoachProgramRow): UiProjection {
  const envelope = isRecord(row.program) ? row.program : {}
  const rawDays = envelope.days
  return {
    id: row.id,
    coach_id: row.coach_id,
    name: row.name,
    created_at: row.created_at,
    tags: row.tags ?? [],
    split: envelope.split,
    duration: envelope.duration,
    days: Array.isArray(rawDays)
      ? rawDays.map(rawDay => {
          if (!isRecord(rawDay)) return { name: undefined, is_rest: false, exercises: null }
          const rawExercises = rawDay.exercises
          return {
            name: rawDay.name,
            is_rest: rawDay.is_rest === true,
            exercises: Array.isArray(rawExercises)
              ? rawExercises.map(rawExercise => {
                  if (!isRecord(rawExercise)) return { name: undefined, sets: undefined, reps: undefined, rest: undefined }
                  return {
                    name: rawExercise.name,
                    sets: rawExercise.sets,
                    reps: rawExercise.reps,
                    rest: rawExercise.rest,
                  }
                })
              : null,
          }
        })
      : null,
  }
}

const sameUiProjection = (left: CoachProgramRow, right: CoachProgramRow): boolean => (
  JSON.stringify(uiProjection(left)) === JSON.stringify(uiProjection(right))
)

const fallbackReasonFor = (status: Exclude<CoachTemplateShadowStatus, 'MATCH'>): CoachTemplateServingFallbackReason => status

function adaptationInput(row: CoachProgramRow): Record<string, unknown> {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    is_template: row.is_template,
    tags: row.tags,
    program: row.program,
    created_at: row.created_at,
  }
}

function adaptationContext(row: CoachProgramRow, coachId: string): AdapterContext {
  return {
    id: row.id,
    now: row.created_at ?? '1970-01-01T00:00:00.000Z',
    owner: { kind: 'coach', coachId },
    coachId,
    sourceId: row.id,
    name: row.name,
    description: row.description ?? undefined,
  }
}

function prepareItem(
  row: CoachProgramRow,
  coachId: string,
  mode: CoachTemplateServingMode,
  dependencies: CoachTemplateServingDependencies,
): { readonly item: CoachProgramRow; readonly decision: CoachTemplateServingDecision } {
  if (mode === 'legacy-only') {
    return {
      item: row,
      decision: { id: row.id, source: 'legacy-fallback', reason: 'ROLLBACK_LEGACY_ONLY' },
    }
  }
  try {
    const adapter = dependencies.adapter ?? adaptCoachTemplate
    const adapted = adapter(adaptationInput(row), adaptationContext(row, coachId))
    const shadow = compareCoachTemplateShadow(row, coachId, { adapter: () => adapted })
    if (shadow.result !== 'MATCH') {
      return {
        item: row,
        decision: {
          id: row.id,
          source: 'legacy-fallback',
          reason: fallbackReasonFor(shadow.result),
          shadowResult: shadow.result,
        },
      }
    }
    if (adapted.status !== 'converted') {
      return {
        item: row,
        decision: { id: row.id, source: 'legacy-fallback', reason: 'UNSUPPORTED', shadowResult: 'UNSUPPORTED' },
      }
    }
    const canonical = canonicalBackedRow(adapted.value, row)
    if (!canonical || !sameUiProjection(row, canonical)) {
      return {
        item: row,
        decision: { id: row.id, source: 'legacy-fallback', reason: 'PRESENTATION_MISMATCH', shadowResult: 'MATCH' },
      }
    }
    return { item: canonical, decision: { id: row.id, source: 'canonical', shadowResult: 'MATCH' } }
  } catch {
    return {
      item: row,
      decision: { id: row.id, source: 'legacy-fallback', reason: 'ADAPTATION_ERROR' },
    }
  }
}

/**
 * Runtime serving boundary for the paginated coach-template reader only.
 * Its default mode is legacy-only; switching back to it is the complete rollback.
 */
export function prepareCoachTemplatePageForServing(
  page: PaginatedResult<CoachProgramRow>,
  coachId: string,
  mode: CoachTemplateServingMode = COACH_TEMPLATE_SERVING_DEFAULT_MODE,
  dependencies: CoachTemplateServingDependencies = {},
): CoachTemplateServingPage {
  if (mode === 'legacy-only') {
    return {
      page,
      decisions: page.items.map(item => ({
        id: item.id,
        source: 'legacy-fallback' as const,
        reason: 'ROLLBACK_LEGACY_ONLY' as const,
      })),
    }
  }
  const prepared = page.items.map(row => prepareItem(row, coachId, mode, dependencies))
  return {
    page: {
      items: prepared.map(result => result.item),
      hasMore: page.hasMore,
      nextCursor: page.nextCursor,
    },
    decisions: prepared.map(result => result.decision),
  }
}
