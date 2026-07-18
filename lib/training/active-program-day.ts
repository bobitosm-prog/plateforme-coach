import { frDayToIndex, getSessionForDay } from '../get-today-session'
import { getEffectiveWeek } from './program-week'

export const TRAINING_WEEK_DAYS = [
  'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche',
] as const

export type TrainingWeekDay = (typeof TRAINING_WEEK_DAYS)[number]
export type LegacyExercise = Record<string, unknown>
export type LegacyTrainingDay = Record<string, unknown> & {
  repos?: boolean
  exercises?: LegacyExercise[]
}
export type LegacyCustomProgram = Record<string, unknown> & {
  days?: unknown[]
  is_active?: boolean
  current_week?: number
  start_date?: string | null
  total_weeks?: number
}

export interface ActiveProgramDayResolution {
  source: 'personal' | 'coach' | 'none'
  day: LegacyTrainingDay | null
  exercises: LegacyExercise[]
}

export function selectActivePersonalProgram<T extends { is_active?: boolean }>(programs: readonly T[]): T | null {
  return programs.find(program => program.is_active) ?? null
}

export function resolveActiveProgramDay(input: {
  activePersonalProgram: LegacyCustomProgram | null | undefined
  coachProgram: Record<string, LegacyTrainingDay | undefined> | null | undefined
  trainingDay: string
}): ActiveProgramDayResolution {
  const { activePersonalProgram, coachProgram, trainingDay } = input

  if (activePersonalProgram?.days?.length) {
    const dayIndex = frDayToIndex(trainingDay)
    if (dayIndex >= 0) {
      const session = getSessionForDay(activePersonalProgram.days, dayIndex)
      const day: LegacyTrainingDay = session.type === 'rest'
        ? { repos: true, exercises: [] }
        : { repos: false, exercises: session.exercises }
      const exercises = resolvePeriodizedExercises(day.exercises ?? [], activePersonalProgram)
      return { source: 'personal', day, exercises }
    }
  }

  if (coachProgram) {
    const day = coachProgram[trainingDay] ?? { repos: false, exercises: [] }
    return { source: 'coach', day, exercises: day.exercises ?? [] }
  }

  return { source: 'none', day: null, exercises: [] }
}

export function resolvePeriodizedExercises(
  exercises: readonly LegacyExercise[],
  program: LegacyCustomProgram,
): LegacyExercise[] {
  const week = getEffectiveWeek(program)
  const phaseKey = week <= 4 ? 'p1' : week <= 8 ? 'p2' : 'p3'

  return exercises.map(exercise => {
    const phases = asRecord(exercise.phases)
    if (!phases) return exercise
    const phase = asRecord(phases[phaseKey]) ?? asRecord(phases.p1) ?? {}
    const phaseReps = phase.reps
    const parsedReps = typeof phaseReps === 'string'
      ? Number.parseInt(phaseReps, 10) || exercise.reps
      : phaseReps ?? exercise.reps

    return {
      ...exercise,
      sets: phase.sets ?? exercise.sets,
      reps: parsedReps,
      tempo: phase.tempo ?? exercise.tempo,
      technique: phase.technique ?? exercise.technique,
      technique_details: phase.technique_details ?? exercise.technique_details,
      rest_seconds: phase.rest_seconds ?? exercise.rest_seconds,
    }
  })
}

export function selectTrainingDay(dayIndex: number): TrainingWeekDay | null {
  return TRAINING_WEEK_DAYS[dayIndex] ?? null
}

export function navigateTrainingWeek(
  currentOffset: number,
  action: 'previous' | 'next' | 'today',
): { offset: number; direction: -1 | 1 } {
  if (action === 'previous') return { offset: currentOffset - 1, direction: -1 }
  if (action === 'next') return { offset: currentOffset + 1, direction: 1 }
  return { offset: 0, direction: currentOffset > 0 ? -1 : 1 }
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null
}
