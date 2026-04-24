type CoachProgramDay = {
  name?: string
  exercises?: any[]
  is_rest?: boolean
  repos?: boolean
  [key: string]: any
}

type NormalizedProgram = {
  [weekday: string]: CoachProgramDay | undefined
}

export type SuggestedSession = {
  sessionIndex: number
  weekday: string
  day: CoachProgramDay
  reason: string
}

const WEEKDAYS_FR = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'] as const

export function suggestNextSession(
  coachProgram: NormalizedProgram | null,
  lastCompletedByIndex: Map<number, string> | null
): SuggestedSession | null {
  if (!coachProgram) return null

  const availableSessions: Array<{ sessionIndex: number; weekday: string; day: CoachProgramDay }> = []
  for (let i = 0; i < WEEKDAYS_FR.length; i++) {
    const weekday = WEEKDAYS_FR[i]
    const day = coachProgram[weekday]
    if (day && !day.is_rest && !day.repos && day.exercises && day.exercises.length > 0) {
      availableSessions.push({ sessionIndex: i, weekday, day })
    }
  }

  if (availableSessions.length === 0) return null

  if (!lastCompletedByIndex || lastCompletedByIndex.size === 0) {
    return {
      ...availableSessions[0],
      reason: 'Commence par cette seance',
    }
  }

  let mostRecentIndex = -1
  let mostRecentTime = 0
  for (const [idx, completedAtStr] of lastCompletedByIndex.entries()) {
    const t = new Date(completedAtStr).getTime()
    if (t > mostRecentTime) {
      mostRecentTime = t
      mostRecentIndex = idx
    }
  }

  const posInList = availableSessions.findIndex(s => s.sessionIndex === mostRecentIndex)
  const nextPos = (posInList + 1) % availableSessions.length
  const next = availableSessions[nextPos]

  const lastDay = availableSessions[posInList]?.day?.name || 'la derniere'
  const daysSince = Math.floor((Date.now() - mostRecentTime) / (1000 * 60 * 60 * 24))
  const timeStr = daysSince === 0 ? "aujourd'hui" : daysSince === 1 ? 'hier' : `il y a ${daysSince} jours`

  return {
    ...next,
    reason: `Tu as fait ${lastDay} ${timeStr}.`,
  }
}
