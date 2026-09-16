import { describe, expect, it, vi } from 'vitest'

import { replacePersonalMealPlan } from '@/lib/meal-plan/replace-personal-plan'

function replacementClient({ insertError = false, legacyMissing = false, deactivateError = false } = {}) {
  const events: string[] = []
  const insertPayloads: Array<Record<string, unknown>> = []
  const updatePayloads: Array<Record<string, unknown>> = []
  let insertCount = 0
  const client = {
    from: vi.fn(() => ({
      insert: vi.fn((payload: Record<string, unknown>) => {
        insertPayloads.push(payload)
        insertCount += 1
        return {
        select: vi.fn(() => ({
          single: vi.fn(async () => {
            events.push('insert')
            if (legacyMissing && insertCount === 1) return { data: null, error: { code: '42703' } }
            return insertError
              ? { data: null, error: { code: 'INSERT' } }
              : { data: { id: 'new-plan', created_at: '2026-09-14T12:00:00.000Z' }, error: null }
          }),
        })),
      }}),
      update: vi.fn((payload: Record<string, unknown>) => {
        updatePayloads.push(payload)
        const result = Promise.resolve({ error: deactivateError ? { code: 'WRITE' } : null })
        const chain = {
          eq: vi.fn(() => chain),
          lt: vi.fn(() => chain),
          neq: vi.fn(() => {
            events.push('deactivate')
            return result
          }),
          then: result.then.bind(result),
        }
        return chain
      }),
    })),
  }
  return { client, events, insertPayloads, updatePayloads }
}

describe('replacePersonalMealPlan', () => {
  it('persists the replacement before deactivating the previous plan', async () => {
    const { client, events, insertPayloads, updatePayloads } = replacementClient()
    await expect(replacePersonalMealPlan(client as never, 'user-1', { lundi: {} }))
      .resolves.toEqual({ ok: true, id: 'new-plan' })
    expect(events).toEqual(['insert', 'deactivate'])
    expect(insertPayloads).toEqual([{ user_id: 'user-1', plan_data: { lundi: {} }, is_active: true }])
    expect(updatePayloads).toEqual([{ is_active: false }])
  })

  it('falls back to the newer physical columns only when legacy columns are absent', async () => {
    const { client, insertPayloads, updatePayloads } = replacementClient({ legacyMissing: true })
    await expect(replacePersonalMealPlan(client as never, 'user-1', { lundi: {} }))
      .resolves.toEqual({ ok: true, id: 'new-plan' })
    expect(insertPayloads).toEqual([
      { user_id: 'user-1', plan_data: { lundi: {} }, is_active: true },
      { user_id: 'user-1', plan: { lundi: {} }, active: true },
    ])
    expect(updatePayloads).toEqual([{ active: false }])
  })

  it('keeps the previous plan active when insertion fails', async () => {
    const { client, events } = replacementClient({ insertError: true })
    await expect(replacePersonalMealPlan(client as never, 'user-1', {}))
      .resolves.toEqual({ ok: false, stage: 'insert' })
    expect(events).toEqual(['insert'])
  })

  it('keeps a valid new plan when previous-plan cleanup is unavailable', async () => {
    const { client, events } = replacementClient({ deactivateError: true })
    await expect(replacePersonalMealPlan(client as never, 'user-1', {}))
      .resolves.toEqual({ ok: true, id: 'new-plan' })
    expect(events).toEqual(['insert', 'deactivate'])
  })
})
