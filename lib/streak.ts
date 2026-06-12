/**
 * Pure streak computation — single source of truth for the entire app.
 * Zero dependencies (no Supabase, no React). Testable in plain Node.
 *
 * Semantics (Duolingo-style grace period):
 * - If the user trained TODAY: streak = consecutive days ending today.
 *   endsToday = true, atRisk = false.
 * - If NOT today but trained YESTERDAY: streak = consecutive days ending
 *   yesterday. endsToday = false, atRisk = true (the streak survives
 *   until midnight — used to trigger "keep your streak" push at 18h).
 * - Otherwise: current = 0, atRisk = false (streak already broken).
 *
 * All dates must be LOCAL 'YYYY-MM-DD' strings (not UTC — UTC midnight
 * shifts caused the original streak bug, fixed via toDateStr).
 */

export interface StreakResult {
  /** Consecutive days with at least one completed session */
  current: number
  /** True if today is part of the streak (user already trained) */
  endsToday: boolean
  /** True if the streak is alive but the user hasn't trained today yet */
  atRisk: boolean
}

export function computeStreak(
  completedLocalDates: string[],
  todayLocal: string
): StreakResult {
  // Deduplicate and sort descending
  const unique = [...new Set(completedLocalDates)].sort().reverse()
  if (unique.length === 0) return { current: 0, endsToday: false, atRisk: false }

  const prevDay = (dateStr: string): string => {
    const d = new Date(dateStr + 'T12:00:00') // noon avoids DST edge
    d.setDate(d.getDate() - 1)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  }

  const trainedToday = unique[0] === todayLocal
  const yesterday = prevDay(todayLocal)
  const trainedYesterday = unique[0] === yesterday || (unique.length > 1 && unique[0] === todayLocal && unique[1] === yesterday)

  // Determine anchor: the most recent date that starts the backward count
  let anchor: string
  if (trainedToday) {
    anchor = todayLocal
  } else if (unique[0] === yesterday) {
    anchor = yesterday
  } else {
    return { current: 0, endsToday: false, atRisk: false }
  }

  // Count consecutive days backward from anchor
  const dateSet = new Set(unique)
  let count = 0
  let cursor = anchor
  while (dateSet.has(cursor)) {
    count++
    cursor = prevDay(cursor)
  }

  return {
    current: count,
    endsToday: trainedToday,
    atRisk: !trainedToday,
  }
}
