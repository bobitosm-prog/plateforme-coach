import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const desktop = fs.readFileSync(
  path.join(process.cwd(), 'app/(dashboard)/page-desktop.tsx'),
  'utf8',
)

describe('desktop nutrition day runtime boundary', () => {
  it('keeps one owner/day query with its historical order and no limit', () => {
    expect(desktop.match(/from\('daily_food_logs'\)/g)).toHaveLength(2)
    expect(desktop).toContain(
      ".eq('user_id', uid).eq('date', today).order('created_at', { ascending: true })",
    )
    expect(desktop).not.toMatch(
      /eq\('date', today\)\.order\('created_at', \{ ascending: true \}\)\.limit\(/,
    )
  })

  it('uses the validated projection and current-response cleanup', () => {
    expect(desktop).toContain('DESKTOP_NUTRITION_DAY_PROJECTION')
    expect(desktop).toContain('desktopNutritionRequest.current')
    expect(desktop).toContain('return () => { desktopNutritionRequest.current += 1 }')
    expect(desktop).toContain('readDesktopNutritionDayResponse(data, error, uid, today)')
  })

  it('removes the legacy false-zero aggregation without touching C04', () => {
    expect(desktop).not.toContain(
      'data.forEach((x: any) => { c += x.calories || 0; p += x.protein || 0; ca += x.carbs || 0; f += x.fat || 0 })',
    )
    expect(desktop).toContain(
      ';(data || []).forEach((r: any) => { byDate[r.date] = (byDate[r.date] || 0) + (r.calories || 0) })',
    )
  })
})
