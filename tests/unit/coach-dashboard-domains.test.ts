import { describe, expect, it } from 'vitest'
import { aggregateCoachRevenue, loadCoachClients, programEligibleClients, summarizeCoachSessions } from '../../lib/coaching/dashboard'

describe('coach dashboard domain boundaries', () => {
  it('loads only active relation projections and preserves order', async () => {
    const source = { listActiveClientsForCoach: async () => ({ ok: true as const, data: [{ id: 'r1', client_id: 'c1', created_at: null, invited_by_coach: null }] }), listActiveRelatedProfiles: async () => ({ ok: true as const, data: [{ id: 'c1', full_name: 'Client', email: null, avatar_url: null, current_weight: null, calorie_goal: null }] }) }
    const result = await loadCoachClients(source, 'coach')
    expect(result).toEqual({ ok: true, data: [{ id: 'r1', client_id: 'c1', created_at: '', invited_by_coach: false, profiles: { id: 'c1', full_name: 'Client', email: null, avatar_url: null, current_weight: null, calorie_goal: null } }] })
  })
  it('distinguishes empty and unavailable clients', async () => {
    const empty = { listActiveClientsForCoach: async () => ({ ok: true as const, data: [] }), listActiveRelatedProfiles: async () => ({ ok: true as const, data: [] }) }
    expect(await loadCoachClients(empty, 'coach')).toEqual({ ok: true, data: [] })
    expect((await loadCoachClients({ ...empty, listActiveClientsForCoach: async () => ({ ok: false as const }) }, 'coach')).ok).toBe(false)
  })
  it('preserves historical revenue periods and zero fallback', () => {
    expect(aggregateCoachRevenue([{ amount: 10.5, paid_at: '2026-07-02T00:00:00Z' }, { amount: 4, paid_at: '2025-01-01T00:00:00Z' }], new Date('2026-07-19T00:00:00Z'))).toEqual({ monthRevenue: 10.5, yearRevenue: 10.5, totalRevenue: 14.5, monthPaymentsCount: 1 })
  })
  it('summarizes ordered sessions without mutating rows', () => {
    const rows = [{ client_id: 'c', session_name: 'B', completed_at: '2026-07-18T00:00:00Z' }, { client_id: 'c', session_name: 'A', completed_at: '2026-07-01T00:00:00Z' }]
    const before = structuredClone(rows); const result = summarizeCoachSessions(rows, new Date('2026-07-14T00:00:00Z'))
    expect(result.lastSessionByClient.get('c')?.name).toBe('B'); expect(result.sessionsThisWeekByClient.get('c')).toBe(1); expect(rows).toEqual(before)
  })
  it('keeps the program handoff immutable and relation-scoped', () => {
    const clients = [{ id: 'r', client_id: 'c', created_at: '', profiles: null }]
    expect(programEligibleClients(clients)).toEqual(clients); expect(programEligibleClients(clients)).not.toBe(clients)
  })
})
