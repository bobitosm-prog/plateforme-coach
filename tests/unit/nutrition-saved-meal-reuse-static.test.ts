import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const producer = readFileSync('app/components/tabs/NutritionTab.tsx', 'utf8')
const boundary = readFileSync('lib/nutrition/saved-meal-reuse.ts', 'utf8')
const overlay = readFileSync('app/components/tabs/nutrition/NutritionTabOverlays.tsx', 'utf8')

describe('saved meal reuse architecture', () => {
  it('removes the unsupported use_count contract', () => {
    expect(producer).not.toContain("update({ use_count:")
    expect(producer).not.toContain("order('use_count'")
    expect(overlay).not.toContain('use_count')
  })

  it('prepares all rows before one batch write', () => {
    expect(producer).toContain('prepareSavedMealReuse')
    expect(producer).toContain('persistSavedMealReuse')
    expect(producer).toContain("from('daily_food_logs').insert(inserts)")
    expect(producer).not.toMatch(/for\s*\([^)]*meal\.foods[^)]*\)[\s\S]{0,300}from\('daily_food_logs'\)/)
  })

  it('does not build reuse nutrient payloads or resolve aliases in the component', () => {
    const functionStart = producer.indexOf('async function applySavedMeal')
    const functionEnd = producer.indexOf('async function copyMealToDate')
    const reuseFunction = producer.slice(functionStart, functionEnd)
    expect(reuseFunction).not.toMatch(/protein\s*:|proteins\s*:|fat\s*:|fats\s*:|\|\|\s*0/)
    expect(reuseFunction).not.toContain('use_count')
  })

  it('keeps the pure boundary independent from runtime frameworks and data clients', () => {
    expect(boundary).not.toMatch(/\bas any\b|createClient|service_role|react|next\/|window|document/i)
    expect(boundary).not.toContain("select('*')")
    expect(boundary).not.toContain('fetch(')
  })

  it('guards double submission, stale responses, and accessible retry UI', () => {
    expect(producer).toContain('savedMealReuseInFlight.current')
    expect(producer).toContain('request !== savedMealReuseRequest.current')
    expect(overlay).toContain('disabled={props.savedMealReusing}')
    expect(overlay).toContain('<SavedMealWriteAlert message={props.savedMealError} />')
  })
})
