import { readFileSync } from 'node:fs'
import { describe, expect, it, vi } from 'vitest'
import type { DatabaseClient } from '../../lib/supabase/types'
import { loadClientDetailNutrition, loadClientDetailProfile, loadClientDetailProgression, loadClientDetailTraining, saveClientDetailProgram, updateClientDetailProfile } from '../../lib/coaching/client-detail'
import { LEGACY_AI_WEEK, LEGACY_COACH_WEEK } from '../fixtures/nutrition-plan-envelope'

type TableResult = { data?: unknown; single?: unknown; error?: { code?: string; message?: string } | null }

function database(tables: Record<string, TableResult>, userId = 'coach-1') {
  const calls: Array<{ table: string; method: string; args: unknown[] }> = []
  const from = vi.fn((table: string) => {
    const result = tables[table] ?? { data: [] }
    const chain: Record<string, unknown> = {}
    for (const method of ['select', 'insert', 'update', 'eq', 'in', 'gte', 'not', 'order', 'limit']) {
      chain[method] = vi.fn((...args: unknown[]) => { calls.push({ table, method, args }); return chain })
    }
    chain.maybeSingle = vi.fn(async () => ({ data: result.single ?? null, error: result.error ?? null }))
    chain.single = vi.fn(async () => ({ data: result.single ?? null, error: result.error ?? null }))
    chain.then = (resolve: (value: unknown) => unknown, reject?: (reason: unknown) => unknown) =>
      Promise.resolve({ data: result.data ?? [], error: result.error ?? null }).then(resolve, reject)
    return chain
  })
  const client = {
    auth: { getUser: vi.fn(async () => ({ data: { user: userId ? { id: userId, email: 'hidden@example.test' } : null }, error: null })) },
    from,
    storage: { from: vi.fn(() => ({ createSignedUrl: vi.fn(async (path: string) => ({ data: { signedUrl: `signed:${path}` }, error: null })) })) },
  } as unknown as DatabaseClient
  return { client, calls, from }
}

const scope = { coachUserId: 'coach-1', clientUserId: 'client-1' }

describe('client detail domain boundaries', () => {
  it('derives coach identity, requires an active relation and reads only the related profile projection', async () => {
    const db = database({
      coach_clients: { data: [{ id: 'rel', coach_id: 'coach-1', client_id: 'client-1', status: 'active', created_at: '2026-01-01', invited_by_coach: true }] },
      active_related_profiles: { single: { id: 'client-1', full_name: 'Client', created_at: '2026-01-01' } },
      coach_notes: { single: { content: 'note' } },
    })
    const result = await loadClientDetailProfile(db.client, 'client-1')
    expect(result).toMatchObject({ status: 'success', data: { scope, profile: { id: 'client-1' }, notes: 'note' } })
    expect(db.calls.find(call => call.table === 'active_related_profiles' && call.method === 'select')?.args[0]).not.toBe('*')
  })

  it('fails closed without exposing whether a foreign profile exists', async () => {
    const db = database({ coach_clients: { data: [] }, active_related_profiles: { single: { id: 'foreign' } } })
    expect(await loadClientDetailProfile(db.client, 'foreign')).toEqual({ status: 'forbidden' })
    expect(db.from).not.toHaveBeenCalledWith('active_related_profiles')
  })

  it('loads assigned and legacy programs through bounded repositories without mutating rows', async () => {
    const assigned = [{ id: 'assigned', client_id: 'client-1', coach_id: 'coach-1', program: { lundi: { repos: false } }, created_at: '2026-01-02' }]
    const personal = [{ id: 'personal', user_id: 'client-1', name: 'Perso', days: [{ exercises: [{ name: 'Squat' }] }], is_active: true, created_at: '2026-01-01', updated_at: '2026-01-02', source: 'custom' }]
    const db = database({
      client_programs: { data: assigned }, custom_programs: { data: personal },
      training_programs: { data: [{ id: 'tpl', coach_id: 'coach-1', name: 'Template', is_template: true, program: {}, created_at: '2026-01-01' }] },
      workout_sessions: { data: [{ id: 'session', user_id: 'client-1', created_at: '2026-01-03', completed: true, name: 'Jambes' }] },
    })
    const before = JSON.stringify(personal)
    const result = await loadClientDetailTraining(db.client, scope)
    expect(result).toMatchObject({ status: 'success', data: { assignedProgram: { id: 'assigned' }, totalSessionsCount: 1, customPrograms: [{ id: 'personal' }], coachTemplates: [{ id: 'tpl' }] } })
    expect(JSON.stringify(personal)).toBe(before)
  })

  it('keeps assigned, personal and tracking Nutrition formats distinct', async () => {
    const db = database({
      client_meal_plans: { single: { id: 'assigned', client_id: 'client-1', coach_id: 'coach-1', calorie_target: 2283, protein_target: 134, carb_target: 266, fat_target: 76, plan: LEGACY_COACH_WEEK, created_at: '2026-01-01', updated_at: '2026-01-01' } },
      meal_plans: { single: { id: 'personal', user_id: 'client-1', created_by: null, name: 'Personnel', plan: LEGACY_AI_WEEK, active: true, created_at: '2026-01-01' } },
      meal_tracking: { data: [{ date: '2026-01-05', meal_type: 'Déjeuner', is_completed: true }] },
    })
    const result = await loadClientDetailNutrition(db.client, scope, '2026-01-05')
    expect(result).toMatchObject({ status: 'success', data: { assignedPlan: { id: 'assigned' }, activePlan: { id: 'personal' } } })
    if (result.status === 'success') {
      expect(result.data.assignedPlan).toMatchObject({
        calorie_target: 2283,
        protein_target: 134,
        carb_target: 266,
        fat_target: 76,
      })
      expect([...result.data.weeklyTracking['2026-01-05']]).toEqual(['Déjeuner'])
    }
    expect(db.from.mock.calls.map(call => call[0])).toEqual([
      'client_meal_plans',
      'meal_plans',
      'meal_tracking',
    ])
    expect(db.calls.filter(call => call.method === 'limit').map(call => [call.table, call.args[0]]))
      .toEqual([['client_meal_plans', 1], ['meal_plans', 1], ['meal_tracking', 200]])
  })

  it('keeps not_found distinct from invalid or unavailable Nutrition plans', async () => {
    const absent = database({
      client_meal_plans: { single: null },
      meal_plans: { single: null },
      meal_tracking: { data: [] },
    })
    expect(await loadClientDetailNutrition(absent.client, scope, '2026-01-05'))
      .toMatchObject({ status: 'success', data: { assignedPlan: null, activePlan: null } })

    const invalid = database({
      client_meal_plans: { single: { id: 'assigned', client_id: 'client-1', coach_id: 'coach-1', plan: { unknown: true }, created_at: '2026-01-01', updated_at: '2026-01-01' } },
      meal_plans: { single: null },
      meal_tracking: { data: [] },
    })
    expect(await loadClientDetailNutrition(invalid.client, scope, '2026-01-05'))
      .toEqual({ status: 'unavailable', source: 'nutrition' })

    const failure = database({
      client_meal_plans: { error: { code: 'PGRST000', message: 'private detail' } },
      meal_plans: { single: null },
      meal_tracking: { data: [] },
    })
    const result = await loadClientDetailNutrition(failure.client, scope, '2026-01-05')
    expect(result).toEqual({ status: 'unavailable', source: 'nutrition' })
    expect(JSON.stringify(result)).not.toContain('private detail')
  })

  it('builds progression histories separately and signs photos', async () => {
    const db = database({
      weight_logs: { data: [{ id: 'w', date: '2026-01-02', poids: 80 }] },
      body_measurements: { data: [{ id: 'm', date: '2026-01-02', waist: 80 }] },
      progress_photos: { data: [{ id: 'p', photo_url: 'private.jpg', created_at: '2026-01-02' }] },
      completed_sessions: { data: [{ id: 'c', client_id: 'client-1', coach_id: 'coach-1', session_index: 1, session_name: 'A', completed_at: '2026-01-02' }] },
    })
    const result = await loadClientDetailProgression(db.client, scope)
    expect(result).toMatchObject({ status: 'success', data: { weights: [{ poids: 80 }], photos: [{ signedUrl: 'signed:private.jpg' }], completions: [{ id: 'c' }] } })
  })

  it('scopes mutations and returns expurgated failures', async () => {
    const db = database({
      client_programs: { single: { id: 'new-program' } },
    })
    const program = await saveClientDetailProgram(db.client, scope, { programId: null, program: {}, weekStart: '2026-01-05', updatedAt: '2026-01-05T00:00:00Z' })
    expect(program).toEqual({ status: 'success', data: 'new-program' })

    const failing = database({}, 'coach-1')
    const rpc = vi.fn(async () => ({ data: null, error: { code: '42501', message: 'private SQL detail' } }))
    ;(failing.client as unknown as { rpc: typeof rpc }).rpc = rpc
    const result = await updateClientDetailProfile(failing.client, scope, { objective: 'maintien' })
    expect(result).toEqual({ status: 'failure', stage: 'profile' })
    expect(JSON.stringify(result)).not.toContain('private SQL detail')
  })

  it('keeps all extracted modules framework-free and projections explicit', () => {
    const files = ['types.ts', 'profile.ts', 'training.ts', 'nutrition.ts', 'progression.ts', 'index.ts']
    const source = files.map(file => readFileSync(new URL(`../../lib/coaching/client-detail/${file}`, import.meta.url), 'utf8')).join('\n')
    expect(source).not.toMatch(/from ['"](?:react|next|@\/app)/)
    expect(source).not.toMatch(/\bcreateClient\(|service_role|select\(['"]\*['"]|:\s*any\b/)
  })
})
