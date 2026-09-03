import { readFileSync } from 'node:fs'
import { describe, expect, it, vi } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import {
  ACTIVE_COACH_RELATION_PROJECTION,
  findActiveCoachForClient,
  resolveCoachRelationAuthority,
  type ActiveCoachRelation,
} from '@/lib/coach-relations/repository'

function active(
  source: ActiveCoachRelation['source'],
  overrides: Partial<ActiveCoachRelation> = {},
): ActiveCoachRelation {
  return {
    id: 'relation-1',
    coach_id: 'coach-1',
    client_id: 'client-1',
    status: 'active',
    source,
    ...overrides,
  }
}

function relationClient(rows: unknown[], error: unknown = null) {
  const select = vi.fn()
  const filters: Array<[string, unknown]> = []
  const query: Record<string, unknown> = {}

  query.select = (...args: unknown[]) => {
    select(...args)
    return query
  }
  query.eq = (column: string, value: unknown) => {
    filters.push([column, value])
    return query
  }
  query.limit = () => query
  query.then = (resolve: (value: { data: unknown[] | null; error: unknown }) => unknown) => {
    const filtered = rows.filter(row => filters.every(
      ([column, value]) => typeof row === 'object'
        && row !== null
        && Reflect.get(row, column) === value,
    ))
    return Promise.resolve({ data: error ? null : filtered, error }).then(resolve)
  }

  const from = vi.fn(() => query)
  return { client: { from } as unknown as SupabaseClient, from, select }
}

describe('authoritative coach relation repository', () => {
  it.each(['invitation', 'admin'] as const)(
    'treats an active %s relation as authoritative',
    source => {
      expect(resolveCoachRelationAuthority({ kind: 'active', relation: active(source) }))
        .toMatchObject({
          physicalState: 'active',
          authorityState: 'authoritative',
          source,
          isAuthoritative: true,
          requiresReconciliation: false,
        })
    },
  )

  it('keeps an active default relation physical but non-authoritative', () => {
    expect(resolveCoachRelationAuthority({ kind: 'active', relation: active('default') }))
      .toMatchObject({
        physicalState: 'active',
        authorityState: 'non_authoritative',
        source: 'default',
        isAuthoritative: false,
        requiresReconciliation: false,
      })
  })

  it('marks an active legacy relation as requiring reconciliation', () => {
    expect(resolveCoachRelationAuthority({ kind: 'active', relation: active('legacy') }))
      .toMatchObject({
        physicalState: 'active',
        authorityState: 'non_authoritative',
        source: 'legacy',
        isAuthoritative: false,
        requiresReconciliation: true,
      })
  })

  it.each([
    [{ kind: 'not_found' } as const, 'not_found', null],
    [{ kind: 'multiple_active' } as const, 'multiple_active', null],
    [{ kind: 'error', code: 'PGRST204' } as const, 'error', 'PGRST204'],
  ])('fails safe for %s', (input, expectedState, errorCode) => {
    expect(resolveCoachRelationAuthority(input)).toEqual({
      physicalState: expectedState,
      authorityState: expectedState,
      relation: null,
      source: null,
      isAuthoritative: false,
      requiresReconciliation: false,
      errorCode,
    })
  })

  it('never selects an apparently authoritative row from multiple active relations', () => {
    const result = resolveCoachRelationAuthority({ kind: 'multiple_active' })
    expect(result.relation).toBeNull()
    expect(result.isAuthoritative).toBe(false)
  })

  it('ignores invited_by_coach when resolving authority', () => {
    const defaultRelation = active('default', { invited_by_coach: true })
    const invitation = active('invitation', { invited_by_coach: false })

    expect(resolveCoachRelationAuthority({ kind: 'active', relation: defaultRelation }).isAuthoritative)
      .toBe(false)
    expect(resolveCoachRelationAuthority({ kind: 'active', relation: invitation }).isAuthoritative)
      .toBe(true)
  })

  it('treats an ended invitation as not active and not authoritative', async () => {
    const mock = relationClient([{ ...active('invitation'), status: 'ended' }])
    const physical = await findActiveCoachForClient(mock.client, 'client-1')
    expect(resolveCoachRelationAuthority(physical)).toMatchObject({
      physicalState: 'not_found',
      authorityState: 'not_found',
      isAuthoritative: false,
    })
  })

  it('fails explicitly when the deployed schema does not return source', async () => {
    const rowWithoutSource: Record<string, unknown> = { ...active('invitation') }
    delete rowWithoutSource.source
    const mock = relationClient([rowWithoutSource])

    await expect(findActiveCoachForClient(mock.client, 'client-1')).resolves.toEqual({
      kind: 'error',
      code: 'INVALID_RELATION_DATA',
    })
  })

  it('preserves a missing-column database error instead of inferring provenance', async () => {
    const mock = relationClient([], { code: 'PGRST204', message: 'source does not exist' })

    await expect(findActiveCoachForClient(mock.client, 'client-1')).resolves.toEqual({
      kind: 'error',
      code: 'PGRST204',
    })
  })

  it('adds source to the existing projection without adding a database read', async () => {
    const mock = relationClient([active('invitation')])
    await findActiveCoachForClient(mock.client, 'client-1')

    expect(ACTIVE_COACH_RELATION_PROJECTION).toBe(
      'id,coach_id,client_id,status,source,created_at,invited_by_coach',
    )
    expect(mock.from).toHaveBeenCalledTimes(1)
    expect(mock.select).toHaveBeenCalledTimes(1)
  })

  it('keeps authority independent from subscription and entitlement signals', () => {
    const source = readFileSync('lib/coach-relations/repository.ts', 'utf8')
    expect(source).not.toMatch(/subscription|entitlement/i)
    expect(source).not.toMatch(/invited_by_coach\s*===?/)
  })
})
