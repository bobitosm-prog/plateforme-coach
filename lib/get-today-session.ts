/**
 * Single source of truth for determining today's session
 * from a custom program. Used by both HomeTab and TrainingTab.
 */

export interface TodaySession {
  type: 'workout' | 'rest'
  name: string
  focus?: string
  exercises: any[]
  dayIndex: number // 0=Monday ... 6=Sunday
}

/**
 * Get the session for a specific day of the week from a custom program.
 * @param programDays - The program's days array (as stored in Supabase)
 * @param dayOfWeek - 0-6 where 0=Monday, 6=Sunday (NOT JS getDay())
 */
export function getSessionForDay(programDays: any[], dayOfWeek: number): TodaySession {
  if (!programDays?.length) {
    return { type: 'rest', name: 'Repos', exercises: [], dayIndex: dayOfWeek }
  }

  // Pad to 7 days (same logic as padTo7Days in ProgramBuilder)
  const padded = [...programDays]
  while (padded.length < 7) {
    padded.push({ name: '', is_rest: true, exercises: [] })
  }
  const days = padded.slice(0, 7)

  const day = days[dayOfWeek]
  if (!day || day.is_rest) {
    return { type: 'rest', name: 'Repos', exercises: [], dayIndex: dayOfWeek }
  }

  return {
    type: 'workout',
    name: day.name || day.weekday || `Séance ${dayOfWeek + 1}`,
    focus: day.focus || day.muscle_group || '',
    exercises: (day.exercises || []).map((ex: any) => ({
      name: ex.exercise_name || ex.custom_name || ex.name || 'Exercice',
      exercise_name: ex.exercise_name || ex.custom_name || ex.name || 'Exercice',
      sets: ex.sets || 3,
      reps: ex.reps || 10,
      rest_seconds: ex.rest_seconds || 90,
      muscle_group: ex.muscle_group || day.focus || '',
    })),
    dayIndex: dayOfWeek,
  }
}

/**
 * Get today's session using local timezone.
 * Returns Monday-based index (0=Mon, 6=Sun).
 */
export function getTodaySession(programDays: any[]): TodaySession {
  const todayIndex = getTodayIndex()
  return getSessionForDay(programDays, todayIndex)
}

/**
 * Convert JS getDay() (0=Sun) to Monday-first index (0=Mon, 6=Sun)
 */
export function getTodayIndex(): number {
  const dow = new Date().getDay() // 0=Sun, 1=Mon, ... 6=Sat
  return dow === 0 ? 6 : dow - 1  // Mon=0, Tue=1, ... Sun=6
}

/**
 * Convert a French day name to Monday-first index
 */
export function frDayToIndex(day: string): number {
  return ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'].indexOf(day.toLowerCase())
}
