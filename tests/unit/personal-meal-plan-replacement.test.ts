import { describe, expect, it, vi } from 'vitest'

import { replacePersonalMealPlan } from '@/lib/meal-plan/replace-personal-plan'

function replacementClient({ insertError = false, deactivateError = false, rollbackError = false } = {}) {
  const events: string[] = []
  let updateCount = 0
  const client = {
    from: vi.fn(() => ({
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(async () => {
            events.push('insert')
            return insertError
              ? { data: null, error: { code: 'INSERT' } }
              : { data: { id: 'new-plan', created_at: '2026-09-14T12:00:00.000Z' }, error: null }
          }),
        })),
      })),
      update: vi.fn(() => {
        updateCount += 1
        const isRollback = updateCount > 1
        const result = Promise.resolve({ error: (isRollback ? rollbackError : deactivateError) ? { code: 'WRITE' } : null })
        const chain = {
          eq: vi.fn(() => chain),
          lt: vi.fn(() => chain),
          neq: vi.fn(() => {
            events.push('deactivate')
            return result
          }),
          then: result.then.bind(result),
        }
        if (isRollback) events.push('rollback')
        return chain
      }),
    })),
  }
  return { client, events }
}

describe('replacePersonalMealPlan', () => {
  it('persists the replacement before deactivating the previous plan', async () => {
    const { client, events } = replacementClient()
    await expect(replacePersonalMealPlan(client as never, 'user-1', { lundi: {} }))
      .resolves.toEqual({ ok: true, id: 'new-plan' })
    expect(events).toEqual(['insert', 'deactivate'])
  })

  it('keeps the previous plan active when insertion fails', async () => {
    const { client, events } = replacementClient({ insertError: true })
    await expect(replacePersonalMealPlan(client as never, 'user-1', {}))
      .resolves.toEqual({ ok: false, stage: 'insert' })
    expect(events).toEqual(['insert'])
  })

  it('deactivates the new plan as rollback when old-plan deactivation fails', async () => {
    const { client, events } = replacementClient({ deactivateError: true })
    await expect(replacePersonalMealPlan(client as never, 'user-1', {}))
      .resolves.toEqual({ ok: false, stage: 'deactivate' })
    expect(events).toEqual(['insert', 'deactivate', 'rollback'])
  })
})
