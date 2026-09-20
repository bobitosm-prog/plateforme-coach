import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import { weeklyFixture } from '../fixtures/weekly-adjustment'
const mocks = vi.hoisted(() => ({ load: vi.fn() }))
vi.mock('@/lib/weekly-diagnostic/adjustment-state', () => ({ loadWeeklyAdjustmentState: mocks.load }))
import { applyWeeklyDiagnostic } from '@/lib/weekly-diagnostic/apply'

const now = new Date('2026-09-20T18:00:00Z')
function database(overrides: Record<string, unknown> = {}) {
  const diagnostic = { policy_version: 2, week_start: '2026-09-14', application_context: weeklyFixture().context,
    ajustements: { training_volume_delta_pct: 10 }, ...overrides }
  const query = { select: vi.fn(), eq: vi.fn(), single: vi.fn().mockResolvedValue({ data: diagnostic, error: null }) }
  query.select.mockReturnValue(query); query.eq.mockReturnValue(query)
  const rpc = vi.fn().mockResolvedValue({ data: { already_applied: false, applied_at: now.toISOString() }, error: null })
  return { query, rpc, db: { from: () => query, rpc } as unknown as SupabaseClient }
}
beforeEach(() => { vi.clearAllMocks(); mocks.load.mockResolvedValue(weeklyFixture()) })
describe('weekly application service', () => {
  it('scopes the decision to its owner and sends a deterministic candidate to the transaction', async () => {
    const f = database()
    expect(await applyWeeklyDiagnostic(f.db, 'owner', 'diagnostic', now)).toMatchObject({ status: 200, already_applied: false })
    expect(f.query.eq).toHaveBeenCalledWith('user_id', 'owner')
    expect(f.rpc).toHaveBeenCalledWith('apply_weekly_adjustment_v1', expect.objectContaining({ p_user_id: 'owner',
      p_diagnostic_id: 'diagnostic', p_candidate: expect.objectContaining({ domain: 'training', changes: expect.objectContaining({ setsBefore: 15, setsAfter: 17 }) }) }))
  })
  it('returns the original application timestamp on retry without recomputing', async () => {
    const f = database({ applied_at: '2026-09-20T13:00:00Z' })
    expect(await applyWeeklyDiagnostic(f.db, 'owner', 'd', now)).toMatchObject({ status: 200, already_applied: true, applied_at: '2026-09-20T13:00:00Z' })
    expect(mocks.load).not.toHaveBeenCalled(); expect(f.rpc).not.toHaveBeenCalled()
  })
  it.each([{ policy_version: 1 }, { week_start: '2026-09-07' }])('rejects legacy or expired decisions', async overrides => {
    const f = database(overrides)
    expect(await applyWeeklyDiagnostic(f.db, 'owner', 'd', now)).toMatchObject({ status: 409 })
    expect(f.rpc).not.toHaveBeenCalled()
  })
  it('rejects changed plans and coach ownership', async () => {
    const f = database({ application_context: {} })
    expect(await applyWeeklyDiagnostic(f.db, 'owner', 'd', now)).toMatchObject({ status: 409, code: 'changed' })
    mocks.load.mockResolvedValue({ ...weeklyFixture(), coachManaged: true })
    expect(await applyWeeklyDiagnostic(f.db, 'owner', 'd', now)).toMatchObject({ status: 403 })
    expect(f.rpc).not.toHaveBeenCalled()
  })
  it('does not persist unsupported or empty proposals', async () => {
    const f = database({ ajustements: {} })
    expect(await applyWeeklyDiagnostic(f.db, 'owner', 'd', now)).toMatchObject({ status: 422 })
    expect(f.rpc).not.toHaveBeenCalled()
  })
  it('reports a concurrent baseline change without success', async () => {
    const f = database(); f.rpc.mockResolvedValue({ data: null, error: { code: 'PT409' } })
    expect(await applyWeeklyDiagnostic(f.db, 'owner', 'd', now)).toMatchObject({ status: 409, code: 'changed' })
  })
})
