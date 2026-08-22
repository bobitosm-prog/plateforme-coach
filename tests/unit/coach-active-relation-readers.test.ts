import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import {
  findActiveBetween,
  listActiveClientsForCoach,
} from '@/lib/coach-relations/repository'

type RelationRow = {
  id: string
  coach_id: string
  client_id: string
  status: 'active' | 'ended'
  created_at: string
  invited_by_coach: boolean
}

const ACTIVE: RelationRow = {
  id: 'relation-1',
  coach_id: 'coach-1',
  client_id: 'client-1',
  status: 'active',
  created_at: '2026-08-22T10:00:00Z',
  invited_by_coach: false,
}

function relationClient(rows: RelationRow[], databaseError: unknown = null): SupabaseClient {
  const filters: Array<[keyof RelationRow, unknown]> = []
  let limit = rows.length
  const query: Record<string, unknown> = {}

  query.select = () => query
  query.eq = (column: keyof RelationRow, value: unknown) => {
    filters.push([column, value])
    return query
  }
  query.order = () => query
  query.limit = (value: number) => {
    limit = value
    return query
  }
  query.then = (resolve: (value: { data: RelationRow[] | null; error: unknown }) => unknown) => {
    const data = rows
      .filter(row => filters.every(([column, value]) => row[column] === value))
      .slice(0, limit)
    return Promise.resolve({ data: databaseError ? null : data, error: databaseError }).then(resolve)
  }

  return { from: () => query } as unknown as SupabaseClient
}

describe('coach dashboard active relation cohort', () => {
  it('includes one active client', async () => {
    await expect(listActiveClientsForCoach(relationClient([ACTIVE]), 'coach-1')).resolves.toMatchObject({
      kind: 'success',
      relations: [{ client_id: 'client-1' }],
    })
  })

  it('excludes an ended client', async () => {
    await expect(listActiveClientsForCoach(
      relationClient([{ ...ACTIVE, status: 'ended' }]),
      'coach-1',
    )).resolves.toEqual({ kind: 'success', relations: [] })
  })

  it('keeps only active clients in a mixed history', async () => {
    const result = await listActiveClientsForCoach(relationClient([
      ACTIVE,
      { ...ACTIVE, id: 'relation-ended', client_id: 'client-ended', status: 'ended' },
    ]), 'coach-1')

    expect(result).toMatchObject({ kind: 'success' })
    if (result.kind === 'success') expect(result.relations.map(row => row.client_id)).toEqual(['client-1'])
  })

  it('returns all active clients', async () => {
    const result = await listActiveClientsForCoach(relationClient([
      ACTIVE,
      { ...ACTIVE, id: 'relation-2', client_id: 'client-2' },
    ]), 'coach-1')

    expect(result).toMatchObject({ kind: 'success' })
    if (result.kind === 'success') {
      expect(result.relations.map(row => row.client_id)).toEqual(['client-1', 'client-2'])
    }
  })

  it('fails closed on relation database errors', async () => {
    await expect(listActiveClientsForCoach(relationClient([], { code: '42501' }), 'coach-1'))
      .resolves.toEqual({ kind: 'error', code: '42501' })
  })

  it('fails closed when the active cohort contains duplicate client relations', async () => {
    await expect(listActiveClientsForCoach(relationClient([
      ACTIVE,
      { ...ACTIVE, id: 'relation-duplicate' },
    ]), 'coach-1')).resolves.toEqual({ kind: 'multiple_active', clientId: 'client-1' })
  })

  it('uses one central active cohort for operational dashboard data and counters', () => {
    const source = readFileSync('app/(application)/coach/hooks/useCoachDashboard.ts', 'utf8')
    expect(source).toContain('listActiveClientsForCoach(supabase, coachId)')
    expect(source).toContain('setActiveCoachingClients(links.length)')
    expect(source).toContain(".in('client_id', clientIds)")
    expect(source).not.toContain(".from('coach_clients')")
  })
})

describe('coach analytics active relation cohort', () => {
  it('resolves active IDs before profiles and sensitive analytics', () => {
    const source = readFileSync('app/(application)/coach/hooks/useCoachAnalytics.ts', 'utf8')
    const relationLookup = source.indexOf('listActiveClientsForCoach(supabase, coachId)')
    expect(relationLookup).toBeGreaterThan(-1)
    expect(relationLookup).toBeLessThan(source.indexOf(".from('profiles')"))
    expect(relationLookup).toBeLessThan(source.indexOf(".from('completed_sessions')"))
    expect(source).toContain(".in('client_id', clientIds)")
    expect(source).toContain(".in('user_id', clientIds)")
    expect(source).not.toContain(".from('coach_clients')")
  })

  it('does not load a former client through an ended relation', async () => {
    const result = await listActiveClientsForCoach(relationClient([
      { ...ACTIVE, client_id: 'former-client', status: 'ended' },
    ]), 'coach-1')
    expect(result).toEqual({ kind: 'success', relations: [] })
  })
})

describe('client detail active relation guard', () => {
  it.each([
    ['ended', [{ ...ACTIVE, status: 'ended' as const }], 'not_found'],
    ['absent', [], 'not_found'],
  ])('refuses %s relations', async (_label, rows, expectedKind) => {
    const result = await findActiveBetween(relationClient(rows), 'coach-1', 'client-1')
    expect(result.kind).toBe(expectedKind)
  })

  it('allows an active relation', async () => {
    await expect(findActiveBetween(relationClient([ACTIVE]), 'coach-1', 'client-1'))
      .resolves.toMatchObject({ kind: 'active' })
  })

  it('refuses relation database errors', async () => {
    await expect(findActiveBetween(relationClient([], { code: '42501' }), 'coach-1', 'client-1'))
      .resolves.toEqual({ kind: 'error', code: '42501' })
  })

  it('checks the active pair before loading sensitive client data', () => {
    const source = readFileSync('app/(application)/client/[id]/hooks/useClientDetail.ts', 'utf8')
    const relationGuard = source.indexOf('findActiveBetween(supabase, coachId, id)')
    expect(relationGuard).toBeGreaterThan(-1)
    expect(relationGuard).toBeLessThan(source.indexOf("supabase.from('profiles')"))
    expect(source).toContain("relation.kind !== 'active'")
    expect(source).toContain("coachRelationStatus !== 'active'")
  })
})
