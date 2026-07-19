import type { CompletedSessionRow } from './types'
import type { DatabaseClient } from '@/lib/supabase/types'
export function summarizeCoachSessions(rows: readonly CompletedSessionRow[], startOfWeek: Date) {
  const last = new Map<string, { name: string; completedAt: string }>()
  const weekly = new Map<string, number>()
  for (const row of rows) {
    if (!last.has(row.client_id)) last.set(row.client_id, { name: row.session_name, completedAt: row.completed_at })
    if (new Date(row.completed_at) >= startOfWeek) weekly.set(row.client_id, (weekly.get(row.client_id) ?? 0) + 1)
  }
  return { lastSessionByClient: last, sessionsThisWeekByClient: weekly }
}
export async function loadCoachSessionSummary(client: DatabaseClient, coachId: string, now: Date) {
  const result = await client.from('completed_sessions').select('client_id, session_name, completed_at').eq('coach_id', coachId).order('completed_at', { ascending: false }).limit(200)
  if (result.error) return { ok: false as const, error: { kind: 'unavailable' as const, contextCode: 'COACH_ANALYTICS_UNAVAILABLE' as const } }
  const start = new Date(now); const dow = start.getDay() || 7; start.setDate(start.getDate() - (dow - 1)); start.setHours(0, 0, 0, 0)
  return { ok: true as const, data: summarizeCoachSessions((result.data ?? []) as CompletedSessionRow[], start) }
}
