import {
  getHomeDayWindow,
  isInHomeDay,
  type HomeDayWindow,
} from '../home/home-date'
import type {
  TrainingProgramSource,
  TrainingProgramState,
} from './active-program'

export interface TodayWorkoutSession {
  completed?: boolean | null
  created_at?: string | null
  date?: string | null
}

export interface TodayPlannedTraining {
  exerciseCount: number
  isRest: boolean
}

export type TodayTrainingKind = 'active' | 'completed' | 'planned' | 'rest' | 'error'

export interface TodayTrainingState<TSession extends TodayWorkoutSession = TodayWorkoutSession> {
  kind: TodayTrainingKind
  completedSession: TSession | null
  programSource: TrainingProgramSource
}

export interface DeriveTodayTrainingStateInput<TSession extends TodayWorkoutSession> {
  activeDraft?: boolean
  day?: HomeDayWindow
  now?: Date
  plannedSession?: TodayPlannedTraining | null
  programSource: TrainingProgramSource
  programState?: TrainingProgramState
  scheduledCompleted?: boolean
  workoutSessions: readonly TSession[]
}

export function isWorkoutCompletedInDay(
  session: TodayWorkoutSession,
  day: HomeDayWindow,
): boolean {
  if (session.completed === false) return false
  if (session.created_at && isInHomeDay(session.created_at, day)) return true
  return Boolean(session.date && session.date === day.localDateKey)
}

/**
 * Shared semantic authority for the durable "training today" state.
 * It never matches a session by title and performs no I/O.
 */
export function deriveTodayTrainingState<TSession extends TodayWorkoutSession>({
  activeDraft = false,
  day = getHomeDayWindow(),
  plannedSession = null,
  programSource,
  programState,
  scheduledCompleted = false,
  workoutSessions,
}: DeriveTodayTrainingStateInput<TSession>): TodayTrainingState<TSession> {
  const completedSession = workoutSessions.find(session => (
    isWorkoutCompletedInDay(session, day)
  )) ?? null

  if (activeDraft) return { kind: 'active', completedSession, programSource }
  if (scheduledCompleted || completedSession) {
    return { kind: 'completed', completedSession, programSource }
  }
  if (plannedSession && !plannedSession.isRest && plannedSession.exerciseCount > 0) {
    return { kind: 'planned', completedSession: null, programSource }
  }
  if (programState === 'error') {
    return { kind: 'error', completedSession: null, programSource }
  }
  return { kind: 'rest', completedSession: null, programSource }
}
