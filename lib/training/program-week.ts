/**
 * Semaine effective d'un programme, derivee de start_date (avancement calendaire).
 * Source unique de verite : la semaine = temps ecoule, pas un compteur stocke.
 */
export function getEffectiveWeek(program: { start_date?: string | null; total_weeks?: number; current_week?: number } | null | undefined): number {
  if (!program?.start_date || !program?.total_weeks) return program?.current_week || 1
  const [y, m, d] = program.start_date.split('-').map(Number)
  const startUTC = Date.UTC(y, m - 1, d)
  const now = new Date()
  const todayUTC = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())
  const diffDays = Math.floor((todayUTC - startUTC) / 86400000)
  const week = Math.floor(diffDays / 7) + 1
  return Math.max(1, Math.min(week, program.total_weeks))
}
