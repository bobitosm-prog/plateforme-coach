import type { RepositoryErrorKind } from '@/lib/repositories/result'
import type {
  AssignedProgramRow,
  PersonalProgramRow,
  TrainingProgramRepository,
} from '@/lib/repositories/training/program'
import type {
  CompletedWorkoutDateRow,
  CompletionRow,
  DashboardWorkoutSessionRow,
  TrainingSessionRepository,
} from '@/lib/repositories/training/session'
import { normalizeCoachProgram } from '@/lib/normalizeCoachProgram'
import { prepareCompletionMarkers } from '@/lib/training/session-history'

type TrainingLoadSource =
  | 'assigned_programs'
  | 'personal_program'
  | 'workout_sessions'
  | 'completions'
  | 'workout_count'
  | 'workout_dates'

export interface TrainingDashboardData {
  workoutSessions: DashboardWorkoutSessionRow[]
  assignedProgram: AssignedProgramRow | null
  coachProgram: ReturnType<typeof normalizeCoachProgram>
  activePersonalProgram: PersonalProgramRow | null
  completions: CompletionRow[]
  hasTrainedBefore: boolean
  sessionDates: Array<CompletedWorkoutDateRow & { created_at: string }>
}

export type TrainingDashboardLoadResult =
  | { ok: true; data: TrainingDashboardData }
  | { ok: false; error: { kind: RepositoryErrorKind; sources: TrainingLoadSource[] } }

export function createTrainingDashboardLoader(dependencies: {
  programRepository: Pick<TrainingProgramRepository,
    'listAssignedProgramsForClient' | 'findActivePersonalProgramForClient'>
  sessionRepository: Pick<TrainingSessionRepository,
    'listDashboardWorkoutSessions' | 'listCompletionsForClient' | 'listPersonalRecordsForClient' |
    'hasCompletedWorkout' | 'listCompletedWorkoutDates'>
}) {
  const { programRepository, sessionRepository } = dependencies

  return {
    async load(verifiedClientUserId: string): Promise<TrainingDashboardLoadResult> {
      const [assigned, personal, sessions, completions, trained, dates] = await Promise.all([
        programRepository.listAssignedProgramsForClient(verifiedClientUserId),
        programRepository.findActivePersonalProgramForClient(verifiedClientUserId),
        sessionRepository.listDashboardWorkoutSessions(verifiedClientUserId),
        sessionRepository.listCompletionsForClient(verifiedClientUserId),
        sessionRepository.hasCompletedWorkout(verifiedClientUserId),
        sessionRepository.listCompletedWorkoutDates(verifiedClientUserId),
      ])

      const results = [
        ['assigned_programs', assigned],
        ['personal_program', personal],
        ['workout_sessions', sessions],
        ['completions', completions],
        ['workout_count', trained],
        ['workout_dates', dates],
      ] as const
      const failures = results.filter((entry): entry is typeof entry & readonly [TrainingLoadSource, { ok: false; kind: 'failure'; error: { kind: RepositoryErrorKind } }] =>
        !entry[1].ok && entry[1].kind === 'failure')
      if (failures.length > 0) {
        return {
          ok: false,
          error: {
            kind: failures.some(([, result]) => result.error.kind === 'unavailable') ? 'unavailable' : failures[0][1].error.kind,
            sources: failures.map(([source]) => source),
          },
        }
      }

      const assignedProgram = assigned.ok ? assigned.data[0] ?? null : null
      return {
        ok: true,
        data: {
          workoutSessions: sessions.ok ? sessions.data : [],
          assignedProgram,
          coachProgram: normalizeCoachProgram(assignedProgram?.program),
          activePersonalProgram: personal.ok ? personal.data : null,
          completions: completions.ok
            ? prepareCompletionMarkers(completions.data).completions as CompletionRow[]
            : [],
          hasTrainedBefore: trained.ok ? trained.data : false,
          sessionDates: dates.ok
            ? dates.data.filter((row): row is CompletedWorkoutDateRow & { created_at: string } => typeof row.created_at === 'string')
            : [],
        },
      }
    },

    async loadPersonalRecords(verifiedClientUserId: string) {
      return sessionRepository.listPersonalRecordsForClient(verifiedClientUserId)
    },
  }
}

export type TrainingDashboardLoader = ReturnType<typeof createTrainingDashboardLoader>
