import type { PaginatedResult } from '@/lib/repositories/pagination'
import type { CoachProgramRow } from '@/lib/repositories/training'

export function mergeCoachProgramPage(
  current: readonly CoachProgramRow[],
  page: PaginatedResult<CoachProgramRow>,
): readonly CoachProgramRow[] {
  const seen = new Set(current.map(item => item.id))
  return [...current, ...page.items.filter(item => !seen.has(item.id))]
}
