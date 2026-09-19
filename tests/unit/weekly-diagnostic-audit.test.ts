import { afterEach, describe, expect, it, vi } from 'vitest'
import { generateWeeklyDiagnostic } from '@/lib/weekly-diagnostic/generator'
import { checkAiRateLimit } from '@/lib/rate-limit'
import { readWeeklyCompletion } from '@/lib/weekly-diagnostic/completion'

vi.mock('@/lib/weekly-diagnostic/completion', () => ({ readWeeklyCompletion: vi.fn() }))

// Regression tests converted from the audit reproductions.
// All database writes and provider calls are synthetic, never production.
function fixture(foodReadError = false) {
  vi.mocked(readWeeklyCompletion).mockResolvedValue({ snapshot: 'fixture', status: {
    today: '2026-09-19', weekStart: '2026-09-07', sunday: '2026-09-13', endExclusive: '2026-09-14',
    eligible: true, hasMeals: true, trainingState: 'completed', confirmed: true, canGenerate: true, diagnosticId: null,
  } })
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date('2026-09-19T12:00:00Z'))
  vi.stubEnv('ANTHROPIC_API_KEY', 'synthetic-audit-key')
  vi.stubEnv('NEXT_PUBLIC_VAPID_PUBLIC_KEY', '')
  const rows: Record<string, any[]> = {
    profiles: [{ id: 'audit', calorie_goal: 2200, protein_goal: 160, current_weight: 80, tdee: 2600, objective: 'cut', onboarding_answers: { sessions_per_week: 3 } }],
    daily_food_logs: Array.from({ length: 7 }, (_, i) => ({ user_id: 'audit', date: `2026-09-${String(7 + i).padStart(2, '0')}`, calories: 2200, protein: 160 })),
    weight_logs: [
      { user_id: 'audit', date: '2026-09-07', poids: 80 },
      { user_id: 'audit', date: '2026-09-12', poids: 79 },
      { user_id: 'audit', date: '2026-09-19', poids: 82 },
    ],
    workout_sessions: [{ user_id: 'audit', id: 'sunday-session', date: '2026-09-13', completed: true }],
    weekly_diagnostics: [{ id: 'old', user_id: 'audit', week_start: '2026-08-31', score_semaine: 80 }],
  }
  const inserts: any[] = []
  const reads: { table: string; filters: any[] }[] = []
  const db = { from(table: string) {
    const filters: any[] = []
    let operation = 'read', payload: any
    const resolve = (single = false) => {
      if (operation === 'insert') { inserts.push(payload); return { data: { ...payload, id: 'new' }, error: null } }
      if (operation === 'update') return { data: null, error: null }
      reads.push({ table, filters: [...filters] })
      if (foodReadError && table === 'daily_food_logs') return { data: null, error: { message: 'synthetic unavailable' } }
      const data = (rows[table] ?? []).filter(row => filters.every(([op, field, value]) => op === 'eq' ? row[field] === value : op === 'gte' ? row[field] >= value : op === 'lt' ? row[field] < value : true))
      return { data: single ? data[0] ?? null : data, error: null }
    }
    const chain: any = {
      select: () => chain, order: () => chain, limit: () => chain,
      eq: (field: string, value: any) => { filters.push(['eq', field, value]); return chain },
      gte: (field: string, value: any) => { filters.push(['gte', field, value]); return chain },
      lt: (field: string, value: any) => { filters.push(['lt', field, value]); return chain },
      in: () => chain,
      insert: (value: any) => { operation = 'insert'; payload = value; return chain },
      update: () => { operation = 'update'; return chain },
      single: async () => resolve(true), maybeSingle: async () => resolve(true),
      then: (yes: any, no: any) => Promise.resolve(resolve()).then(yes, no),
    }
    return chain
  } }
  const provider = vi.fn(async (_url: string, _options?: RequestInit) => new Response(JSON.stringify({
    content: [{ type: 'tool_use', input: { points_forts: ['Journal renseigné'], points_alerte: [], ajustements: { calorie_goal_new: 2100 }, objectif_semaine_prochaine: 'Poursuivre le suivi', raisonnement: 'Résumé synthétique de test.' } }],
    usage: { input_tokens: 1, output_tokens: 1 },
  }), { status: 200 }))
  vi.stubGlobal('fetch', provider)
  return { db, rows, inserts, reads, provider }
}
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); vi.unstubAllEnvs() })

describe('weekly diagnostic audit regressions', () => {
  it('includes Sunday nutrition and training', async () => {
    const f = fixture()
    const result = await generateWeeklyDiagnostic('audit', f.db)
    expect(result.error).toBeUndefined()
    expect(f.reads.find(read => read.table === 'daily_food_logs')?.filters).toContainEqual(['lt', 'date', '2026-09-14'])
    expect(JSON.parse(String(f.provider.mock.calls[0]?.[1]?.body)).messages[0].content).toContain('Jours loggés: 7/7')
    expect(f.inserts[0].sessions_done).toBe(1)
    expect(f.inserts[0].ajustements).not.toHaveProperty('calorie_goal_new')
  })
  it('excludes current-week weight from the previous-week diagnostic', async () => {
    const f = fixture()
    await generateWeeklyDiagnostic('audit', f.db)
    expect(f.inserts[0].weight_delta_kg).toBe(-1)
    expect(f.reads.find(read => read.table === 'weight_logs')?.filters).toContainEqual(['lt', 'date', '2026-09-14'])
  })
  it('allows bounded calorie adaptation with seven days and three in-week weights', async () => {
    const f = fixture()
    f.rows.weight_logs.splice(1, 0, { user_id: 'audit', date: '2026-09-10', poids: 79.5 })
    await generateWeeklyDiagnostic('audit', f.db)
    expect(f.inserts[0].ajustements.calorie_goal_new).toBe(2100)
  })
  it('does not publish after Sunday changes during generation', async () => {
    const f = fixture()
    const ready = await readWeeklyCompletion(f.db, 'audit')
    vi.mocked(readWeeklyCompletion).mockResolvedValueOnce(ready)
      .mockResolvedValueOnce({ ...ready, snapshot: 'edited', status: { ...ready.status, confirmed: false } })
    expect(await generateWeeklyDiagnostic('audit', f.db)).toMatchObject({ blocked: true })
    expect(f.inserts).toHaveLength(0)
  })
  it('does not generate or persist when the nutrition database read fails', async () => {
    const f = fixture(true)
    const result = await generateWeeklyDiagnostic('audit', f.db)
    expect(result.error).toBeTruthy()
    expect(f.inserts).toHaveLength(0)
    expect(f.provider).not.toHaveBeenCalled()
  })
  it('enforces the persistent hourly generation limit', async () => {
    const chain: any = { select: () => chain, eq: () => chain, gte: async () => ({ count: 3, error: null }) }
    const from = vi.fn(() => chain)
    expect(await checkAiRateLimit({ from } as any, 'audit', 'weekly-diagnostic')).toMatchObject({ allowed: false, limit: 3 })
    expect(from).toHaveBeenCalled()
  })
  it('returns the diagnostic data Home requires for an existing diagnostic', async () => {
    const f = fixture()
    f.rows.weekly_diagnostics.push({ id: 'existing', user_id: 'audit', week_start: '2026-09-07' })
    const result = await generateWeeklyDiagnostic('audit', f.db)
    expect(result).toMatchObject({ already_exists: true, diagnostic_id: 'existing', diagnostic: { id: 'existing' } })
    expect(f.provider).not.toHaveBeenCalled()
  })
  it('blocks manual and cron generation before Sunday confirmation', async () => {
    const f = fixture()
    const ready = await readWeeklyCompletion(f.db, 'audit')
    vi.mocked(readWeeklyCompletion).mockResolvedValue({ ...ready, status: { ...ready.status, canGenerate: false, confirmed: false } })
    expect(await generateWeeklyDiagnostic('audit', f.db)).toMatchObject({ blocked: true })
    expect(f.provider).not.toHaveBeenCalled()
    expect(f.inserts).toHaveLength(0)
  })
})
