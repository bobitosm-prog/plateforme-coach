/**
 * Semaine effective d'un programme, derivee de start_date (avancement calendaire).
 * Source unique de verite : la semaine = temps ecoule, pas un compteur stocke.
 */
import { programWeekAt } from './resolve-program'
export function getEffectiveWeek(program: { start_date?: string | null; total_weeks?: number; current_week?: number } | null | undefined): number {
  if (!program?.start_date || !program?.total_weeks) return program?.current_week || 1
  return Math.min(programWeekAt(program),program.total_weeks)
}
