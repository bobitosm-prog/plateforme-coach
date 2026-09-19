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
  it('uses the generation snapshot for deferred client activation without direct writes', async () => {
    const context = { profileUpdatedAt: '2026-01-01T00:00:00.000Z', activePlanId: null, operationId: '00000000-0000-4000-8000-000000000031' }
    const rpc = vi.fn().mockResolvedValue({ data: context.operationId, error: null })
    const from = vi.fn()
    const plan = { _activation_context: context }
    expect(await replacePersonalMealPlan({ rpc, from } as never, 'owner', plan)).toEqual({ ok: true, id: context.operationId })
    expect(rpc).toHaveBeenCalledWith('activate_personal_meal_plan_v1', {
      p_operation_id: context.operationId, p_plan: plan, p_expected_active_plan_id: null, p_expected_profile_updated_at: context.profileUpdatedAt,
    })
    expect(from).not.toHaveBeenCalled()
  })
  it('never falls back to nontransactional writes for invalid activation metadata', async () => {
    const from = vi.fn()
    expect(await replacePersonalMealPlan({ from } as never, 'owner', { _activation_context: {} })).toEqual({ ok: false, stage: 'activation' })
    expect(from).not.toHaveBeenCalled()
  })
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
