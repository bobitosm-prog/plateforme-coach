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

export type CoachTemplateServingPage = {
  readonly page: PaginatedResult<CoachProgramRow>
  readonly decisions: readonly CoachTemplateServingDecision[]
}

type CoachTemplateAdapter = (
  input: unknown,
  context: AdapterContext,
) => AdapterResult<TrainingProgram>

type ServingDependencies = {
  readonly adapter?: CoachTemplateAdapter
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
  dependencies: ServingDependencies,
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
 * Dormant serving contract. No runtime reader imports it yet.
 * Switching the mode back to `legacy-only` is the complete rollback.
 */
export function prepareCoachTemplatePageForServing(
  page: PaginatedResult<CoachProgramRow>,
  coachId: string,
  mode: CoachTemplateServingMode = COACH_TEMPLATE_SERVING_DEFAULT_MODE,
  dependencies: ServingDependencies = {},
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
