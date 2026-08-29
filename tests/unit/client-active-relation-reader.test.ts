import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import {
  findActiveCoachForClient,
  toActiveCoachResolutionState,
} from '@/lib/coach-relations/repository'

type RelationRow = {
  id: string
  coach_id: string
  client_id: string
  status: 'active' | 'ended'
}

const ACTIVE: RelationRow = {
  id: 'relation-active',
  coach_id: 'coach-active',
  client_id: 'client-1',
  status: 'active',
}

function relationClient(rows: RelationRow[], error: unknown = null): SupabaseClient {
  const filters: Array<[keyof RelationRow, unknown]> = []
  let limit = rows.length
  const query: Record<string, unknown> = {}

  query.select = () => query
  query.eq = (column: keyof RelationRow, value: unknown) => {
    filters.push([column, value])
    return query
  }
  query.limit = (value: number) => {
    limit = value
    return query
  }
  query.then = (resolve: (value: { data: RelationRow[] | null; error: unknown }) => unknown) => {
    const data = rows
      .filter(row => filters.every(([column, value]) => row[column] === value))
      .slice(0, limit)
    return Promise.resolve({ data: error ? null : data, error }).then(resolve)
  }

  return { from: () => query } as unknown as SupabaseClient
}

async function resolve(rows: RelationRow[], error: unknown = null) {
  const result = await findActiveCoachForClient(relationClient(rows, error), 'client-1')
  return toActiveCoachResolutionState(result)
}

describe('client dashboard active relation reader', () => {
  it('keeps the dashboard coachless when no active relation exists', async () => {
    await expect(resolve([])).resolves.toEqual({ coachId: null, status: 'not_found' })
  })

  it('uses the single active coach', async () => {
    await expect(resolve([ACTIVE])).resolves.toEqual({ coachId: 'coach-active', status: 'active' })
  })

  it('ignores ended history and uses the active relation', async () => {
    await expect(resolve([
      { ...ACTIVE, id: 'relation-ended', coach_id: 'coach-former', status: 'ended' },
      ACTIVE,
    ])).resolves.toEqual({ coachId: 'coach-active', status: 'active' })
  })

  it('keeps the dashboard coachless when only ended history exists', async () => {
    await expect(resolve([{ ...ACTIVE, coach_id: 'coach-former', status: 'ended' }]))
      .resolves.toEqual({ coachId: null, status: 'not_found' })
  })

  it('fails closed when several active coaches exist', async () => {
    await expect(resolve([ACTIVE, { ...ACTIVE, id: 'relation-2', coach_id: 'coach-2' }]))
      .resolves.toEqual({ coachId: null, status: 'multiple_active' })
  })

  it('fails closed on database errors', async () => {
    await expect(resolve([], { code: '42501' })).resolves.toEqual({ coachId: null, status: 'error' })
  })

  it('uses the central repository and contains no browser relation writer or legacy read', () => {
    const source = readFileSync('app/hooks/useClientDashboard.ts', 'utf8')
    expect(source).toContain('findActiveCoachForClient(supabase, uid)')
    expect(source).toMatch(/toActiveCoachResolutionState\((?:relationResult|result)\)/)
    expect(source).not.toContain(".from('coach_clients')")
    expect(source).not.toMatch(/coach_clients[\s\S]{0,120}\.(?:insert|upsert|delete)\(/)
  })
})
