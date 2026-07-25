import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const desktop = fs.readFileSync(
  path.join(process.cwd(), 'app/(dashboard)/page-desktop.tsx'),
  'utf8',
)

describe('desktop nutrition week runtime boundary', () => {
  it('keeps the single C04 query projection, owner, lower bound, order and no limit', () => {
    expect(desktop.match(/from\('daily_food_logs'\)/g)).toHaveLength(2)
    expect(desktop).toContain(
      "from('daily_food_logs').select(DESKTOP_NUTRITION_WEEK_PROJECTION).eq('user_id', uid).gte('date', startDate).order('date')",
    )
    expect(desktop).not.toMatch(
      /gte\('date', startDate\)\.order\('date'\)\.limit\(/,
    )
  })

  it('keeps the refresh dependency and adds stale-response cleanup', () => {
    expect(desktop).toContain('}, [session?.user?.id, todayFoodLogs])')
    expect(desktop).toContain('desktopNutritionWeekRequest.current')
    expect(desktop).toContain('.catch(() => {')
    expect(desktop).toMatch(
      /return \(\) => \{\s+desktopNutritionWeekRequest\.current \+= 1\s+\}/,
    )
  })

  it('removes false-zero transformations and the synthetic zero fallback', () => {
    expect(desktop).not.toContain(';(data || []).forEach')
    expect(desktop).not.toContain("weekChart.length > 0 ? weekChart : [{ day: '-', calories: 0 }]")
    expect(desktop).toContain('readDesktopNutritionWeekResponse(data, error, window)')
  })

  it('does not reopen the frozen C03 boundary', () => {
    expect(desktop).toContain(
      "from('daily_food_logs').select(DESKTOP_NUTRITION_DAY_PROJECTION)",
    )
    expect(desktop).toContain('readDesktopNutritionDayResponse(data, error, uid, today)')
  })
})
