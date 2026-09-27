import { getSessionForDay } from '../get-today-session'
import { resolveProgramDays } from './resolve-program'

const dayKeys = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'] as const

export interface NextPlannedSession {
  date: Date
  dayIndex: number
  dayKey: typeof dayKeys[number]
  title: string
  exercises: Array<Record<string, unknown>>
}

type CoachDay = { name?: string; day_name?: string; repos?: boolean; is_rest?: boolean; exercises?: unknown[] }

/** Resolve the same phase-aware prescription that will be used when starting the workout. */
export function findNextPlannedSession({
  personalProgram,
  coachProgram,
  today = new Date(),
  todaySessionDone = false,
}: {
  personalProgram?: unknown | null
  coachProgram?: Record<string, CoachDay> | null
  today?: Date
  todaySessionDone?: boolean
}): NextPlannedSession | null {
  if (!personalProgram && !coachProgram) return null

  for (let offset = todaySessionDone ? 1 : 0; offset < 8; offset += 1) {
    // Local noon avoids crossing a date boundary during daylight-saving changes.
    const date = new Date(today.getFullYear(), today.getMonth(), today.getDate() + offset, 12)
    const dayIndex = (date.getDay() + 6) % 7
    const dayKey = dayKeys[dayIndex]

    if (personalProgram) {
      const session = getSessionForDay(resolveProgramDays(personalProgram, date), dayIndex)
      if (session.type === 'workout' && session.exercises.length > 0) {
        return { date, dayIndex, dayKey, title: session.name, exercises: session.exercises }
      }
      continue
    }

    const day = coachProgram?.[dayKey]
    if (!day || day.repos || day.is_rest || !Array.isArray(day.exercises) || day.exercises.length === 0) continue
    const exercises = day.exercises.filter((exercise): exercise is Record<string, unknown> => Boolean(exercise) && typeof exercise === 'object' && !Array.isArray(exercise))
    if (exercises.length === 0) continue
    return {
      date,
      dayIndex,
      dayKey,
      title: day.name || day.day_name || dayKey,
      exercises,
    }
  }

  return null
}
