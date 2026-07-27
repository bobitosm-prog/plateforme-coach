import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const home = fs.readFileSync(
  path.join(process.cwd(), 'app/components/tabs/HomeTab.tsx'),
  'utf8',
)

interface LegacyResponse<T> {
  readonly data: T[] | null
  readonly error: unknown
}

function legacyCollection<T>(response: LegacyResponse<T>): readonly T[] {
  return response.data ?? []
}

describe('Home nutrition transport legacy characterization', () => {
  it('keeps the exact three owner-scoped reads and their historical bounds', () => {
    expect(home.match(/Promise\.all\(\[/g)).toBeTruthy()
    expect(home.match(/from\('meal_tracking'\)\.select\('meal_type'\)/g)).toHaveLength(1)
    expect(home).toContain(
      ".eq('user_id', uid).eq('date', todayDate).eq('completed', true).limit(20)",
    )
    expect(home).toContain('personalPlanReader.load(uid)')
    expect(home.match(/from\('daily_food_logs'\)\.select\('calories'\)/g)).toHaveLength(1)
    expect(home).toContain(".eq('user_id', uid).eq('date', todayDate).limit(20)")
  })

  it('characterizes a daily_food_logs failure as the same empty collection as success', () => {
    expect(legacyCollection({
      data: null,
      error: { code: 'PGRST000' },
    })).toEqual([])
    expect(legacyCollection({ data: [], error: null })).toEqual([])
  })

  it('characterizes a meal_tracking failure as the same empty collection as success', () => {
    expect(legacyCollection({
      data: null,
      error: { code: '42501' },
    })).toEqual([])
    expect(legacyCollection({ data: [], error: null })).toEqual([])
  })

  it('characterizes simultaneous failures as two successful-looking empty inputs', () => {
    const tracking = legacyCollection({
      data: null,
      error: new TypeError('network'),
    })
    const logs = legacyCollection({
      data: null,
      error: new SyntaxError('parse'),
    })
    expect({ tracking, logs }).toEqual({ tracking: [], logs: [] })
    expect(home).not.toContain('trackingRes.data ?? []')
    expect(home).not.toContain('logsRes.data ?? []')
    expect(home).toContain(
      "classifyHomeNutritionCollectionRead('meal_tracking', data, error)",
    )
    expect(home).toContain(
      "classifyHomeNutritionCollectionRead('daily_food_logs', data, error)",
    )
    expect(home).toContain(
      ".catch(() => homeNutritionCollectionFailure<HomeMealCompletion>('meal_tracking'))",
    )
    expect(home).toContain(
      ".catch(() => homeNutritionCollectionFailure<HomeCalorieLog>('daily_food_logs'))",
    )
  })
})
