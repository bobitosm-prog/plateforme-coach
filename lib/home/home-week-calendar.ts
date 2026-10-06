import { getHomeDayWindow, isInHomeDay } from './home-date'
import type { HomeDashboardTrainingSource, HomeDomainState } from './home-dashboard-model'

export type HomeCalendarStatus = 'done' | 'empty' | 'planned' | 'rest' | 'future' | 'unknown'
export interface HomeCalendarDay {
  dateKey: string
  nutrition: HomeCalendarStatus
  sport: HomeCalendarStatus
}

export function homeWeekKeys(todayKey: string): string[] {
  const monday = new Date(`${todayKey}T12:00:00Z`)
  monday.setUTCDate(monday.getUTCDate() - (monday.getUTCDay() + 6) % 7)
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(monday)
    date.setUTCDate(monday.getUTCDate() + index)
    return date.toISOString().slice(0, 10)
  })
}

/** Read-only calendar: absence is never a completed workout or an inferred rest day. */
export function buildHomeWeekCalendar({ todayKey, foodDates, nutritionState, training, foodDatesComplete = true }: {
  todayKey: string
  foodDates: readonly string[]
  nutritionState: HomeDomainState
  training?: Omit<HomeDashboardTrainingSource, 'day'>
  foodDatesComplete?: boolean
}): HomeCalendarDay[] {
  const foodDays = new Set(foodDates)
  return homeWeekKeys(todayKey).map(dateKey => {
    const future = dateKey > todayKey
    const day = getHomeDayWindow(new Date(`${dateKey}T12:00:00Z`))
    const scheduled = training?.scheduledSessions.filter(item => item.scheduled_date === dateKey) ?? []
    const isRest = (type?: string | null) => ['rest', 'repos'].includes(type?.toLowerCase() ?? '')
    const completed = training?.workoutSessions.some(item => item.completed === true && isInHomeDay(item.created_at, day))
      || scheduled.some(item => item.completed === true && !isRest(item.session_type))
    const planned = scheduled.some(item => !isRest(item.session_type))
    const rest = scheduled.some(item => isRest(item.session_type))
      || (dateKey === todayKey && training?.programSession?.isRest === true)
    const unknownTraining = !training || training.state === 'loading' || training.state === 'error'
    return {
      dateKey,
      nutrition: nutritionState === 'loading' || nutritionState === 'error'
        ? 'unknown' : future ? 'future' : foodDays.has(dateKey) ? 'done' : !foodDatesComplete ? 'unknown' : 'empty',
      sport: unknownTraining ? 'unknown' : !future && completed ? 'done' : planned ? 'planned' : rest ? 'rest' : future ? 'future' : 'empty',
    }
  })
}
