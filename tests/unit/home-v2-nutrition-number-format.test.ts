import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

import { createHomeNutritionNumberFormatter } from '@/app/components/home-v2/DailyStatus'

describe('Home V2 nutrition number formatting', () => {
  it.each([
    [158.60000000000002, '158,6'],
    [43.199999999999996, '43,2'],
    [161, '161'],
    [161.0, '161'],
    [0, '0'],
    [172, '172'],
  ])('formats the macro value %s for the French locale', (value, expected) => {
    const formatter = createHomeNutritionNumberFormatter('fr', 1)

    expect(formatter.format(value)).toBe(expected)
  })

  it('formats calories as ungrouped integers', () => {
    const formatter = createHomeNutritionNumberFormatter('fr', 0)

    expect(formatter.format(1681)).toBe('1681')
    expect(formatter.format(1783)).toBe('1783')
  })

  it('uses the active locale decimal separator', () => {
    expect(createHomeNutritionNumberFormatter('en', 1).format(158.6)).toBe('158.6')
    expect(createHomeNutritionNumberFormatter('de', 1).format(158.6)).toBe('158,6')
  })

  it('keeps readable spacing around values and units', () => {
    const source = readFileSync('app/components/home-v2/DailyStatus.tsx', 'utf8')

    expect(source).toContain('{macroNumber.format(consumed)} / {macroNumber.format(target)} g')
    expect(source).toContain('{calorieNumber.format(nutrition.caloriesConsumed)} / {calorieNumber.format(nutrition.caloriesTarget)} kcal')
    expect(source).not.toContain('{consumed}/{target}g')
  })
})
