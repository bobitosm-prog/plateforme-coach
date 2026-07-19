import { readFileSync } from 'node:fs'
import { describe, expect, it, vi } from 'vitest'
import type { DatabaseClient } from '../../lib/supabase/types'
import {
  COACH_CLIENT_RELATION_PROJECTION,
  RELATED_PROFILE_SUMMARY_PROJECTION,
  createCoachClientRelationRepository,
} from '../../lib/repositories/coach-client-relations'

type QueryResult = { data: unknown; error: unknown }
type Call = { table: string; method: string; args: unknown[] }

function clientWith(...results: QueryResult[]) {
  const calls: Call[] = []
  let index = 0
  const from = vi.fn((table: string) => {
    const result = results[Math.min(index++, results.length - 1)] ?? { data: null, error: null }
    const chain: Record<string, unknown> = {}
    for (const method of ['select', 'eq', 'order', 'limit', 'in']) {
      chain[method] = vi.fn((...args: unknown[]) => {
        calls.push({ table, method, args })
        return chain
      })
    }
    chain.then = (resolve: (value: QueryResult) => unknown, reject?: (reason: unknown) => unknown) =>
      Promise.resolve(result).then(resolve, reject)
    return chain
  })
  return { client: { from } as unknown as DatabaseClient, from, calls }
}

function relation(overrides: Record<string, unknown> = {}) {
  return {
    id: 'relation-id', coach_id: 'coach-id', client_id: 'client-id', status: 'active',
    created_at: '2026-07-19T10:00:00Z', invited_by_coach: false, ...overrides,
  }
}

describe('Coach/client relation repository', () => {
  it('uses the exact projection and both pair scopes', async () => {
    const mock = clientWith({ data: [relation()], error: null })
    const result = await createCoachClientRelationRepository(mock.client).findActiveBetween('coach-id', 'client-id')
    expect(result).toEqual({ ok: true, data: relation() })
    expect(mock.calls.find(call => call.method === 'select')?.args).toEqual([COACH_CLIENT_RELATION_PROJECTION])
    expect(mock.calls.filter(call => call.method === 'eq').map(call => call.args)).toEqual([
      ['coach_id', 'coach-id'], ['client_id', 'client-id'], ['status', 'active'],
    ])
    expect(mock.calls).toContainEqual({ table: 'coach_clients', method: 'limit', args: [2] })
  })

  it('distinguishes active, inactive and absent pair states', async () => {
    const active = clientWith({ data: [relation()], error: null })
    expect(await createCoachClientRelationRepository(active.client).findRelationByPair('coach-id', 'client-id'))
      .toMatchObject({ ok: true, data: { kind: 'active' } })

    const inactive = clientWith({ data: [relation({ status: 'inactive' })], error: null })
    expect(await createCoachClientRelationRepository(inactive.client).findRelationByPair('coach-id', 'client-id'))
      .toMatchObject({ ok: true, data: { kind: 'inactive' } })

    const absent = clientWith({ data: [], error: null })
    expect(await createCoachClientRelationRepository(absent.client).findRelationByPair('coach-id', 'foreign-id'))
      .toEqual({ ok: false, kind: 'not_found' })
  })

  it('fails closed when more than one active coach is visible for a client', async () => {
    const mock = clientWith({ data: [relation(), relation({ id: 'relation-2', coach_id: 'coach-2' })], error: null })
    const result = await createCoachClientRelationRepository(mock.client).findActiveCoachForClient('client-id')
    expect(result).toEqual({
      ok: false, kind: 'failure', error: { kind: 'conflict', contextCode: 'MULTIPLE_ACTIVE' },
    })
  })

  it('returns an explicit boolean for active existence without hiding failures', async () => {
    const absent = clientWith({ data: [], error: null })
    expect(await createCoachClientRelationRepository(absent.client).hasActiveRelation('coach-id', 'client-id'))
      .toEqual({ ok: true, data: false })

    const failed = clientWith({ data: null, error: { code: '42501', message: 'private policy detail' } })
    const result = await createCoachClientRelationRepository(failed.client).hasActiveRelation('coach-id', 'client-id')
    expect(result).toEqual({ ok: false, kind: 'failure', error: { kind: 'forbidden', contextCode: '42501' } })
    expect(JSON.stringify(result)).not.toContain('private policy detail')
  })

  it('orders and bounds the active client list', async () => {
    const mock = clientWith({ data: [relation()], error: null })
    const result = await createCoachClientRelationRepository(mock.client).listActiveClientsForCoach('coach-id', { limit: 999 })
    expect(result).toEqual({ ok: true, data: [relation()] })
    expect(mock.calls.filter(call => call.method === 'eq').map(call => call.args)).toEqual([
      ['coach_id', 'coach-id'], ['status', 'active'],
    ])
    expect(mock.calls).toContainEqual({ table: 'coach_clients', method: 'limit', args: [100] })
  })

  it('reads only the safe related profile projection and preserves input order data', async () => {
    const rows = [{ id: 'client-id', full_name: 'Client' }]
    const mock = clientWith({ data: rows, error: null })
    const ids = ['client-id']
    const result = await createCoachClientRelationRepository(mock.client).listActiveRelatedProfiles(ids)
    expect(result).toEqual({ ok: true, data: rows })
    expect(ids).toEqual(['client-id'])
    expect(mock.calls.find(call => call.method === 'select')?.args).toEqual([RELATED_PROFILE_SUMMARY_PROJECTION])
    expect(mock.calls).toContainEqual({ table: 'active_related_profiles', method: 'in', args: ['id', ids] })
  })

  it('contains no wildcard, client construction, mutation, privileged or framework import', () => {
    const source = readFileSync(new URL('../../lib/repositories/coach-client-relations/index.ts', import.meta.url), 'utf8')
    expect(source).not.toMatch(/select\(['"]\*['"]|select\([^)]*\*\)/)
    expect(source).not.toMatch(/createClient|service_role|from ['"](?:react|next|@\/app)/)
    expect(source).not.toMatch(/\.(?:insert|update|upsert|delete)\(/)
    expect(source).not.toMatch(/\bany\b/)
  })
})
