/**
 * Semaine effective d'un programme, derivee de start_date (avancement calendaire).
 * Source unique de verite : la semaine = temps ecoule, pas un compteur stocke.
 */
export function getEffectiveWeek(program: { start_date?: string | null; total_weeks?: number; current_week?: number } | null | undefined): number {
  const currentWeek = program?.current_week
  const fallbackWeek = typeof currentWeek === 'number' && Number.isInteger(currentWeek) && currentWeek > 0 ? currentWeek : 1
  const totalWeeks = program?.total_weeks
  if (!program?.start_date || typeof totalWeeks !== 'number' || !Number.isInteger(totalWeeks) || totalWeeks <= 0) return fallbackWeek
  const match = program.start_date.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!match) return fallbackWeek
  const [, year, month, day] = match
  const [y, m, d] = [Number(year), Number(month), Number(day)]
  const startUTC = Date.UTC(y, m - 1, d)
  const parsedStart = new Date(startUTC)
  if (parsedStart.getUTCFullYear() !== y || parsedStart.getUTCMonth() !== m - 1 || parsedStart.getUTCDate() !== d) return fallbackWeek
  const now = new Date()
  const todayUTC = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())
  const diffDays = Math.floor((todayUTC - startUTC) / 86400000)
  const week = Math.floor(diffDays / 7) + 1
  return Math.max(1, Math.min(week, totalWeeks))
}
