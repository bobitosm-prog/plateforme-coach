import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const producer = readFileSync('app/components/tabs/NutritionTab.tsx', 'utf8')
const persistence = readFileSync('lib/nutrition/saved-meal-persistence.ts', 'utf8')
const overlay = readFileSync('app/components/tabs/nutrition/NutritionTabOverlays.tsx', 'utf8')

describe('saved_meals producer architecture', () => {
  it('routes every nutritional Insert and Update through the common boundary', () => {
    expect(producer).toContain('prepareSavedMealInsert')
    expect(producer).toContain('prepareSavedMealUpdate')
    expect(producer).toContain('prepareEmptySavedMealInsert')
    expect(producer).not.toMatch(/total_proteins\s*:/)
    expect(producer).not.toMatch(/total_fats\s*:/)
    expect(producer).not.toContain('_nutrition_snapshot')
    expect(producer).not.toContain('schemaVersion: 1')
  })

  it('uses generated Insert and Update contracts without forbidden dependencies', () => {
    expect(persistence).toContain("TablesInsert<'saved_meals'>")
    expect(persistence).toContain("TablesUpdate<'saved_meals'>")
    expect(persistence).not.toMatch(/\bas any\b/)
    expect(persistence).not.toMatch(/createClient|service_role/)
    expect(persistence).not.toContain("select('*')")
    expect(persistence).not.toContain('.from(')
    expect(persistence).not.toMatch(/\breact\b|next\/|window|document/i)
    expect(persistence).not.toContain('fetch(')
  })

  it('renders a stable accessible conflict state and keeps retry buttons enabled', () => {
    expect(overlay).toContain('role="alert"')
    expect(overlay).toContain('SavedMealWriteAlert')
    expect(overlay).not.toContain('disabled={!!props.savedMealError}')
    expect(producer).toContain('setSavedMealError(null)')
  })
})
