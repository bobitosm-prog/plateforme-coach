import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const source = (file: string) => fs.readFileSync(path.join(process.cwd(), file), 'utf8')

describe('C02 Analytics nutrition static contract', () => {
  const hook = source('app/hooks/useAnalytics.ts')
  const repository = source('lib/repositories/nutrition/journal.ts')
  const readModel = source('lib/progression/read-models/service.ts')
  const aggregation = source('lib/progression/analytics-nutrition.ts')

  it('preserves the single owner-scoped bounded journal query', () => {
    expect(hook).toContain(
      'journal.listDailyFoodLogsForOwner(ownerUserId, { fromDate, limit })',
    )
    expect(repository).toContain(
      "client.from('daily_food_logs').select(DAILY_FOOD_LOG_PROJECTION)",
    )
    expect(repository).toContain(".eq('user_id', ownerUserId).order('date', { ascending: false }).order('created_at', { ascending: false })")
    expect(repository).toContain("if (range.fromDate) query = query.gte('date', range.fromDate)")
    expect(repository).toContain('query.limit(boundedLimit(range.limit))')
  })

  it('uses the C02 aggregation without changing Home or the weekly diagnostic', () => {
    expect(readModel).toContain('aggregateAnalyticsNutritionByDate(nutrition.data)')
    expect(readModel).not.toContain('aggregateLegacyNutritionByDate(nutrition.data')
    expect(aggregation).not.toMatch(/\|\|\s*0|\?\?\s*0/)
    expect(aggregation).not.toMatch(/from\(['"]|insert\(|update\(|upsert\(|delete\(|rpc\(/)
  })
})
