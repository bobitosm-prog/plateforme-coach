import { getSessionForDay } from './get-today-session'

/**
 * Project planned rest days from a program over the last `windowDays` days.
 * Uses browser-local timezone (getDay). Exact calque of useClientDashboard projection.
 * Returns local 'YYYY-MM-DD' strings for each day the program says is rest.
 */
export function projectRestDates(programDays: any[] | null | undefined, windowDays = 60): string[] {
  if (!programDays?.length) return []
  const restDates: string[] = []
  for (let i = 0; i < windowDays; i++) {
    const d = new Date(); d.setDate(d.getDate() - i)
    const dow = d.getDay()
    const mondayFirstIdx = dow === 0 ? 6 : dow - 1
    if (getSessionForDay(programDays, mondayFirstIdx).type === 'rest') {
      restDates.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`)
    }
  }
  return restDates
}
