import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import { findActiveCoachForClient } from '@/lib/coach-relations/repository'

function relationClient(data: unknown[]) {
  const filters: Array<[string, unknown]> = []
  const chain: Record<string, unknown> = {}
  chain.select = () => chain
  chain.eq = (column: string, value: unknown) => {
    filters.push([column, value])
    return chain
  }
  chain.limit = () => chain
  chain.then = (resolve: (value: { data: unknown[]; error: null }) => unknown) => Promise.resolve({
    data: data.filter(row => filters.every(([column, value]) => Reflect.get(row as object, column) === value)),
    error: null,
  }).then(resolve)
  return { from: () => chain } as unknown as SupabaseClient
}

const ACTIVE = { id: 'relation-1', coach_id: 'coach-1', client_id: 'client-1', status: 'active' }

describe('video feedback active-coach authorization', () => {
  it('resolves the active coach', async () => {
    await expect(findActiveCoachForClient(relationClient([ACTIVE]), 'client-1')).resolves.toMatchObject({
      kind: 'active', relation: { coach_id: 'coach-1' },
    })
  })

  it.each([
    ['ended relation', [{ ...ACTIVE, status: 'ended' }]],
    ['no active coach', []],
  ])('refuses %s', async (_label, rows) => {
    await expect(findActiveCoachForClient(relationClient(rows), 'client-1')).resolves.toEqual({ kind: 'not_found' })
  })

  it('fails closed when several coaches are active', async () => {
    await expect(findActiveCoachForClient(relationClient([
      ACTIVE,
      { ...ACTIVE, id: 'relation-2', coach_id: 'coach-2' },
    ]), 'client-1')).resolves.toEqual({ kind: 'multiple_active' })
  })

  it('authorizes before upload and no longer performs an unfiltered relation lookup', () => {
    const source = readFileSync('app/components/VideoFeedbackModal.tsx', 'utf8')
    expect(source).toContain('findActiveCoachForClient(supabase, userId)')
    expect(source).toContain("relation.kind !== 'active'")
    expect(source.indexOf('findActiveCoachForClient(supabase, userId)')).toBeLessThan(source.indexOf(".from('exercise-videos')"))
    expect(source).not.toContain(".from('coach_clients')")
    expect(source).not.toContain('relation?.coach_id || null')
  })
})
