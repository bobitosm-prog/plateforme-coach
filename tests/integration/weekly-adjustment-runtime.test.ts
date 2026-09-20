import { createHmac, randomUUID } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { createClient } from '@supabase/supabase-js'
import { diagnosticWeek } from '@/lib/weekly-diagnostic/week'
import { adjustTrainingSets } from '@/lib/weekly-diagnostic/adjustments'

const secret = process.env.NUTRITION_TEST_JWT_SECRET
if (!secret) throw new Error('Disposable integration fixture required')
const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString('base64url')
const payload = `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode({ role: 'service_role', exp: Math.floor(Date.now() / 1000) + 600 })}`
const token = `${payload}.${createHmac('sha256', secret).update(payload).digest('base64url')}`
const db = createClient('http://127.0.0.1:56431', 'synthetic-local-key', {
  auth: { persistSession: false, autoRefreshToken: false },
  global: { headers: { Authorization: `Bearer ${token}` }, fetch: (input, init) => {
    const target = new URL(String(input))
    if (target.origin !== 'http://127.0.0.1:56431') throw new Error('External network forbidden')
    target.pathname = target.pathname.replace(/^\/rest\/v1/, '')
    return fetch(target, init)
  } },
})
describe('real weekly adjustment concurrency', () => {
  it('serializes two simultaneous applies and changes sets exactly once', async () => {
    const userId = randomUUID(); const programId = randomUUID(); const diagnosticId = randomUUID()
    const days = Array.from({ length: 7 }, (_, i) => ({ name: `Day ${i}`, is_rest: i > 2,
      exercises: i > 2 ? [] : [{ name: 'Band row', sets: 3, reps: 12 }, { name: 'Planche', sets: 2, duration_seconds: 35 }] }))
    expect((await db.from('profiles').insert({ id: userId, calorie_goal: 2200 })).error).toBeNull()
    expect((await db.from('custom_programs').insert({ id: programId, user_id: userId, days })).error).toBeNull()
    const context = await db.rpc('weekly_adjustment_context_v1', { p_user_id: userId })
    expect(context.error).toBeNull()
    expect((await db.from('weekly_diagnostics').insert({ id: diagnosticId, user_id: userId,
      week_start: diagnosticWeek().weekStart, policy_version: 2, application_context: context.data,
      ajustements: { training_volume_delta_pct: 10 } })).error).toBeNull()
    const adjusted = adjustTrainingSets(days, 10)
    const args = { p_user_id: userId, p_diagnostic_id: diagnosticId,
      p_candidate: { domain: 'training', days: adjusted.days, changes: { setsBefore: adjusted.before, setsAfter: adjusted.after } } }
    const results = await Promise.all([db.rpc('apply_weekly_adjustment_v1', args), db.rpc('apply_weekly_adjustment_v1', args)])
    expect(results.map(result => result.error)).toEqual([null, null])
    expect(results.map(result => result.data.already_applied).sort()).toEqual([false, true])
    expect(results[0].data.applied_at).toBe(results[1].data.applied_at)
    const saved = await db.from('custom_programs').select('days').eq('id', programId).single()
    expect(saved.data?.days).toEqual(adjusted.days)
    const diagnostic = await db.from('weekly_diagnostics').select('applied_changes').eq('id', diagnosticId).single()
    expect(diagnostic.data?.applied_changes.previous_days).toEqual(days)
  })
})
