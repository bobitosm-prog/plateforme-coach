import { addProgressionDays, getProgressionDateKey, getProgressionWeekWindow } from '../progression/progression-date'

export interface HomeWeeklyWorkoutSession {
  id?: string | null
  created_at?: string | null
  completed?: boolean | null
}

export interface HomeWeeklyScheduledSession {
  scheduled_date?: string | null
  session_type?: string | null
  completed?: boolean | null
}

export interface HomeWeeklyProgress {
  completed: number
  planned: number
  adherence: number | null
}

const REST_SESSION_TYPES = new Set(['rest', 'repos'])

function isTrainingSession(session: HomeWeeklyScheduledSession): boolean {
  return !REST_SESSION_TYPES.has(session.session_type?.trim().toLowerCase() ?? '')
}

export function buildHomeWeeklyProgress({
  now = new Date(),
  workoutSessions,
  scheduledSessions,
}: {
  now?: Date
  workoutSessions: readonly HomeWeeklyWorkoutSession[]
  scheduledSessions: readonly HomeWeeklyScheduledSession[]
}): HomeWeeklyProgress {
  const week = getProgressionWeekWindow(now)
  if (!week) return { completed: 0, planned: 0, adherence: null }

  const completedIds = new Set<string>()
  let completedWithoutId = 0
  for (const session of workoutSessions) {
    if (session.completed !== true || !session.created_at) continue
    const completedAt = new Date(session.created_at)
    if (Number.isNaN(completedAt.getTime()) || completedAt < week.start || completedAt >= week.end) continue
    if (session.id) completedIds.add(session.id)
    else completedWithoutId += 1
  }

  const weekEndKey = addProgressionDays(week.weekKey, 7)
  const plannedSessions = scheduledSessions.filter(session => {
    if (!session.scheduled_date || !isTrainingSession(session)) return false
    const dateKey = getProgressionDateKey(session.scheduled_date)
    return dateKey != null && dateKey >= week.weekKey && dateKey < weekEndKey
  })
  const planned = plannedSessions.length
  const completedPlanned = plannedSessions.filter(session => session.completed === true).length

  return {
    completed: completedIds.size + completedWithoutId,
    planned,
    adherence: planned > 0 ? Math.min(1, completedPlanned / planned) : null,
  }
}
