import { randomUUID } from 'node:crypto'
import type { SupabaseClient } from '@supabase/supabase-js'
import { generateWeeklyDiagnostic } from './generator'

/** Bounded batch; retries and leases live in Postgres, not server memory. */
export async function runWeeklyGeneration(db: SupabaseClient, generate = generateWeeklyDiagnostic) {
  const runId = randomUUID()
  const claimed = await db.rpc('claim_weekly_generation_v1', { p_run_id: runId })
  if (claimed.error) throw new Error('QUEUE_UNAVAILABLE')
  const jobs = claimed.data ?? []
  const summary = { claimed: jobs.length, succeeded: 0, blocked: 0, errors: 0 }
  await Promise.all(jobs.map(async (job: { user_id: string; week_start: string }) => {
    let outcome: 'succeeded' | 'blocked' | 'failed' = 'failed'
    let diagnosticId: string | null = null
    try {
      const result = await generate(job.user_id, db)
      diagnosticId = result.diagnostic_id ?? null
      outcome = result.blocked ? 'blocked' : !result.error && diagnosticId ? 'succeeded' : 'failed'
    } catch { /* Never retain raw errors, provider text, names or health data. */ }
    const saved = await db.rpc('settle_weekly_generation_v1', { p_run_id: runId, p_user_id: job.user_id,
      p_week_start: job.week_start, p_outcome: outcome, p_diagnostic_id: diagnosticId })
    if (saved.error || saved.data !== true || outcome === 'failed') summary.errors++
    else summary[outcome]++
  }))
  const status = summary.errors ? 'partial' : 'succeeded'
  const saved = await db.from('weekly_generation_runs').update({ ...summary, status, finished_at: new Date().toISOString() }).eq('id', runId)
  if (saved.error) throw new Error('MONITORING_UNAVAILABLE')
  return { runId, ...summary, status }
}
