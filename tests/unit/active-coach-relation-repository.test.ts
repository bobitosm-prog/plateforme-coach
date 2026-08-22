import { readFileSync } from 'node:fs'
import { describe, expect, it, vi } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import {
  ACTIVE_COACH_RELATION_PROJECTION,
  findActiveBetween,
  findActiveCoachForClient,
  listActiveClientsForCoach,
} from '@/lib/coach-relations/repository'

type RelationFixture = {
  id: string
  coach_id: string
  client_id: string
  status: 'active' | 'ended'
  created_at: string
}

type QueryCall = { method: string; args: unknown[] }

function relation(overrides: Partial<RelationFixture> = {}): RelationFixture {
  return {
    id: 'relation-1',
    coach_id: 'coach-1',
    client_id: 'client-1',
    status: 'active',
    created_at: '2026-08-22T10:00:00Z',
    ...overrides,
  }
}

function clientWith(rows: RelationFixture[], databaseError: unknown = null) {
  const calls: QueryCall[] = []
  const filters: Array<[string, unknown]> = []
  let limitCount: number | null = null
  const chain: Record<string, unknown> = {}

  chain.select = vi.fn((...args: unknown[]) => {
    calls.push({ method: 'select', args })
    return chain
  })
  chain.eq = vi.fn((...args: unknown[]) => {
    calls.push({ method: 'eq', args })
    filters.push([String(args[0]), args[1]])
    return chain
  })
  chain.order = vi.fn((...args: unknown[]) => {
    calls.push({ method: 'order', args })
    return chain
  })
  chain.limit = vi.fn((...args: unknown[]) => {
    calls.push({ method: 'limit', args })
    limitCount = Number(args[0])
    return chain
  })
  chain.then = (
    resolve: (value: { data: RelationFixture[] | null; error: unknown }) => unknown,
    reject?: (reason: unknown) => unknown,
  ) => {
    const filtered = rows.filter(row => filters.every(([column, value]) => Reflect.get(row, column) === value))
    const data = limitCount === null ? filtered : filtered.slice(0, limitCount)
    return Promise.resolve({ data: databaseError ? null : data, error: databaseError }).then(resolve, reject)
  }

  const from = vi.fn(() => chain)
  return { client: { from } as unknown as SupabaseClient, calls }
}

describe('active coach relation repository', () => {
  it('finds an active relation between a coach and client with the bounded projection', async () => {
    const mock = clientWith([relation()])
    const result = await findActiveBetween(mock.client, 'coach-1', 'client-1')

    expect(result).toMatchObject({ kind: 'active', relation: { coach_id: 'coach-1', client_id: 'client-1' } })
    expect(mock.calls.filter(call => call.method === 'eq').map(call => call.args)).toEqual([
      ['coach_id', 'coach-1'],
      ['client_id', 'client-1'],
      ['status', 'active'],
    ])
    expect(mock.calls).toContainEqual({ method: 'select', args: [ACTIVE_COACH_RELATION_PROJECTION] })
    expect(mock.calls).toContainEqual({ method: 'limit', args: [2] })
  })

  it.each([
    { label: 'ended', rows: [relation({ status: 'ended' })] },
    { label: 'absent', rows: [] },
  ])('returns not_found when the pair is $label', async ({ rows }) => {
    const mock = clientWith(rows)
    await expect(findActiveBetween(mock.client, 'coach-1', 'client-1')).resolves.toEqual({ kind: 'not_found' })
  })

  it('preserves database errors instead of treating them as missing', async () => {
    const mock = clientWith([], { code: '42501', message: 'forbidden' })
    await expect(findActiveBetween(mock.client, 'coach-1', 'client-1')).resolves.toEqual({
      kind: 'error',
      code: '42501',
    })
  })

  it('fails closed when a pair has several active rows', async () => {
    const mock = clientWith([relation(), relation({ id: 'relation-2' })])
    await expect(findActiveBetween(mock.client, 'coach-1', 'client-1')).resolves.toEqual({ kind: 'multiple_active' })
  })

  it.each([
    { label: 'no relation', rows: [], expected: { kind: 'not_found' } },
    { label: 'ended only', rows: [relation({ status: 'ended' })], expected: { kind: 'not_found' } },
  ])('findActiveCoachForClient returns no coach for $label', async ({ rows, expected }) => {
    const mock = clientWith(rows)
    await expect(findActiveCoachForClient(mock.client, 'client-1')).resolves.toEqual(expected)
  })

  it('findActiveCoachForClient resolves exactly one active coach', async () => {
    const mock = clientWith([relation()])
    const result = await findActiveCoachForClient(mock.client, 'client-1')
    expect(result).toMatchObject({ kind: 'active', relation: { coach_id: 'coach-1' } })
  })

  it('findActiveCoachForClient fails closed for several active coaches', async () => {
    const mock = clientWith([relation(), relation({ id: 'relation-2', coach_id: 'coach-2' })])
    await expect(findActiveCoachForClient(mock.client, 'client-1')).resolves.toEqual({ kind: 'multiple_active' })
  })

  it('lists active clients only and excludes ended history', async () => {
    const mock = clientWith([
      relation(),
      relation({ id: 'relation-2', client_id: 'client-2', status: 'ended' }),
      relation({ id: 'relation-3', client_id: 'client-3' }),
    ])
    const result = await listActiveClientsForCoach(mock.client, 'coach-1')
    expect(result).toMatchObject({ kind: 'success' })
    if (result.kind === 'success') {
      expect(result.relations.map(item => item.client_id)).toEqual(['client-1', 'client-3'])
    }
    expect(mock.calls.filter(call => call.method === 'eq').map(call => call.args)).toEqual([
      ['coach_id', 'coach-1'],
      ['status', 'active'],
    ])
  })

  it('contains no mutation, client construction, privileged key or legacy fallback', () => {
    const source = readFileSync('lib/coach-relations/repository.ts', 'utf8')
    expect(source).not.toMatch(/\.(?:insert|update|upsert|delete)\(/)
    expect(source).not.toMatch(/createClient|service_role|SUPABASE_SERVICE_ROLE_KEY/)
    expect(source).not.toMatch(/column.*does not exist|legacy.*fallback|read.*without.*status/i)
  })
})
