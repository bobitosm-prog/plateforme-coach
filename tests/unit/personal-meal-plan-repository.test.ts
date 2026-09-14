import { describe, expect, it, vi } from 'vitest'

import {
  isMissingPersonalMealPlanColumn,
  readActivePersonalMealPlan,
} from '@/lib/meal-plan/personal-plan-repository'

function readClient(results: Array<{ data: unknown; error: unknown }>) {
  const selects: string[] = []
  const filters: Array<[string, unknown]> = []
  const client = {
    from: vi.fn(() => ({
      select: vi.fn((columns: string) => {
        selects.push(columns)
        const chain = {
          eq: vi.fn((column: string, value: unknown) => {
            filters.push([column, value])
            return chain
          }),
          order: vi.fn(() => chain),
          limit: vi.fn(() => chain),
          maybeSingle: vi.fn(async () => results.shift()),
        }
        return chain
      }),
    })),
  }
  return { client, selects, filters }
}

describe('personal meal plan repository', () => {
  it('recognizes only missing-column compatibility errors', () => {
    expect(isMissingPersonalMealPlanColumn({ code: '42703' })).toBe(true)
    expect(isMissingPersonalMealPlanColumn({ code: 'PGRST204' })).toBe(true)
    expect(isMissingPersonalMealPlanColumn({ code: '42501', message: 'permission denied' })).toBe(false)
  })

  it('maps the deployed plan_data/is_active columns to the canonical domain', async () => {
    const row = { id: 'plan-1', user_id: 'user-1', plan: { lundi: {} }, active: true }
    const { client, selects, filters } = readClient([{ data: row, error: null }])

    await expect(readActivePersonalMealPlan(client as never, 'user-1'))
      .resolves.toEqual({ data: row, error: null, schema: 'legacy' })
    expect(selects).toEqual(['id,user_id,plan:plan_data,active:is_active,created_at'])
    expect(filters).toContainEqual(['is_active', true])
  })

  it('supports a migrated schema but never retries permission or network failures', async () => {
    const canonical = { id: 'plan-2', user_id: 'user-1', plan: {}, active: true }
    const missing = readClient([
      { data: null, error: { code: '42703' } },
      { data: canonical, error: null },
    ])
    await expect(readActivePersonalMealPlan(missing.client as never, 'user-1'))
      .resolves.toEqual({ data: canonical, error: null, schema: 'canonical' })
    expect(missing.selects).toHaveLength(2)
    expect(missing.filters).toContainEqual(['active', true])

    const denied = readClient([{ data: null, error: { code: '42501' } }])
    await expect(readActivePersonalMealPlan(denied.client as never, 'user-1'))
      .resolves.toMatchObject({ error: { code: '42501' }, schema: 'legacy' })
    expect(denied.selects).toHaveLength(1)
  })
})
