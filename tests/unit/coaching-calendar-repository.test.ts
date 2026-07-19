import { describe, expect, it, vi } from 'vitest'
import type { DatabaseClient } from '../../lib/supabase/types'
import { COACH_APPOINTMENT_PROJECTION, createCoachAppointmentRepository } from '../../lib/coaching/calendar'

type Result = { data: unknown; error: unknown }

function clientWith(result: Result) {
  const calls: Array<{ method: string; args: unknown[] }> = []
  const chain: Record<string, unknown> = {}
  for (const method of ['select', 'eq', 'gte', 'lte', 'order', 'limit', 'insert', 'delete']) {
    chain[method] = vi.fn((...args: unknown[]) => { calls.push({ method, args }); return chain })
  }
  chain.maybeSingle = vi.fn(async () => result)
  chain.then = (resolve: (value: Result) => unknown, reject?: (reason: unknown) => unknown) =>
    Promise.resolve(result).then(resolve, reject)
  const from = vi.fn(() => chain)
  return { client: { from } as unknown as DatabaseClient, from, chain, calls }
}

const period = { startInclusive: '2026-07-13T00:00:00.000Z', endInclusive: '2026-07-19T23:59:59.999Z' }
const row = {
  id: 'appointment-id', coach_id: 'coach-id', client_id: 'client-id',
  scheduled_at: '2026-07-19T08:00:00.000Z', duration_minutes: 60,
  session_type: 'Force', location: null, notes: null, status: 'scheduled',
  created_at: '2026-07-18T08:00:00.000Z',
}

describe('coach appointment repository', () => {
  it('uses explicit projections, actor scopes, periods, order and bounds', async () => {
    const mock = clientWith({ data: [row], error: null })
    const result = await createCoachAppointmentRepository(mock.client).listForCoach('coach-id', period, { limit: 999 })
    expect(result).toEqual({ ok: true, data: [row] })
    expect(mock.from).toHaveBeenCalledWith('coach_appointments')
    expect(mock.chain.select).toHaveBeenCalledWith(COACH_APPOINTMENT_PROJECTION)
    expect(mock.calls).toContainEqual({ method: 'eq', args: ['coach_id', 'coach-id'] })
    expect(mock.calls).toContainEqual({ method: 'gte', args: ['scheduled_at', period.startInclusive] })
    expect(mock.calls).toContainEqual({ method: 'limit', args: [100] })
  })

  it('scopes client reads separately and distinguishes absence', async () => {
    const list = clientWith({ data: [], error: null })
    expect(await createCoachAppointmentRepository(list.client).listForClient('client-id', period))
      .toEqual({ ok: true, data: [] })
    expect(list.calls).toContainEqual({ method: 'eq', args: ['client_id', 'client-id'] })
    const absent = clientWith({ data: null, error: null })
    expect(await createCoachAppointmentRepository(absent.client).findByIdForCoach('missing', 'coach-id'))
      .toEqual({ ok: false, kind: 'not_found' })
  })

  it('creates and deletes only through coach-scoped methods', async () => {
    const created = clientWith({ data: row, error: null })
    const payload = { ...row }
    delete (payload as Partial<typeof row>).id
    delete (payload as Partial<typeof row>).created_at
    expect(await createCoachAppointmentRepository(created.client).createForCoach(payload))
      .toEqual({ ok: true, data: row })
    expect(created.chain.insert).toHaveBeenCalledWith(payload)

    const deleted = clientWith({ data: null, error: null })
    expect(await createCoachAppointmentRepository(deleted.client).deleteForCoach('appointment-id', 'coach-id'))
      .toEqual({ ok: true, data: null })
    expect(deleted.calls.filter(call => call.method === 'eq').map(call => call.args))
      .toEqual([['id', 'appointment-id'], ['coach_id', 'coach-id']])
  })

  it('expurgates raw persistence errors', async () => {
    const mock = clientWith({ data: null, error: { code: '42501', message: 'private SQL detail' } })
    const result = await createCoachAppointmentRepository(mock.client).listForCoach('coach-id', period)
    expect(result).toEqual({ ok: false, kind: 'failure', error: { kind: 'forbidden', contextCode: '42501' } })
    expect(JSON.stringify(result)).not.toContain('private SQL detail')
  })
})
