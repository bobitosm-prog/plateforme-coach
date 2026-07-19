import { describe, expect, it } from 'vitest'
import { boundedPageSize, decodeTimestampCursor, encodeTimestampCursor } from '../../lib/repositories/pagination'
import { mergeCoachProgramPage } from '../../lib/coaching/dashboard/program-pages'
import type { CoachProgramRow } from '../../lib/repositories/training'

const row = (id: string, createdAt: string): CoachProgramRow => ({
  id, created_at: createdAt, coach_id: 'coach', name: id, description: null,
  is_template: true, tags: [], program: {},
})

describe('coach list pagination contracts', () => {
  it('bounds page sizes and round-trips opaque cursors', () => {
    expect(boundedPageSize(undefined)).toBe(20)
    expect(boundedPageSize(0)).toBe(1)
    expect(boundedPageSize(999)).toBe(50)
    expect(boundedPageSize(Number.NaN)).toBe(20)
    const value = { timestamp: '2026-07-19T10:00:00.000Z', id: '00000000-0000-0000-0000-000000000001' }
    expect(decodeTimestampCursor(encodeTimestampCursor(value))).toEqual(value)
    const nullTimestamp = { timestamp: null, id: '00000000-0000-0000-0000-000000000002' }
    expect(decodeTimestampCursor(encodeTimestampCursor(nullTimestamp))).toEqual(nullTimestamp)
    expect(decodeTimestampCursor('not-a-cursor')).toBeNull()
  })

  it('accumulates pages without duplicates and without mutating inputs', () => {
    const first = [row('00000000-0000-0000-0000-000000000001', '2026-07-19T10:00:00.000Z')]
    const snapshot = structuredClone(first)
    const merged = mergeCoachProgramPage(first, {
      items: [first[0], row('00000000-0000-0000-0000-000000000002', '2026-07-19T10:00:00.000Z')],
      hasMore: false,
      nextCursor: null,
    })
    expect(merged.map(item => item.id)).toEqual([
      '00000000-0000-0000-0000-000000000001',
      '00000000-0000-0000-0000-000000000002',
    ])
    expect(first).toEqual(snapshot)
  })
})
