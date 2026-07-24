import { readFileSync, readdirSync, statSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const core = readFileSync('lib/nutrition/legacy-snapshot.ts', 'utf8')
const savedMeal = readFileSync('lib/nutrition/saved-meal-snapshot.ts', 'utf8')
const savedMealView = readFileSync('app/components/tabs/nutrition/NutritionSavedMealsSection.tsx', 'utf8')

function sourceFiles(directory: string): string[] {
  return readdirSync(directory).flatMap(name => {
    const path = `${directory}/${name}`
    return statSync(path).isDirectory() ? sourceFiles(path) : [path]
  }).filter(path => /\.[cm]?[jt]sx?$/.test(path))
}

describe('Nutrition legacy snapshot architecture', () => {
  it('keeps the snapshot boundary pure and independent from persistence/UI', () => {
    for (const source of [core, savedMeal]) {
      expect(source).not.toMatch(/react|next\/|supabase|window\.|document\.|localStorage|fetch\(/i)
      expect(source).not.toMatch(/\bany\b/)
      expect(source).not.toContain('Math.round')
    }
  })

  it('routes historical saved-meal reads through the compatible boundary', () => {
    expect(savedMealView).toContain('readSavedMealFoodValues')
    expect(savedMealView).not.toMatch(/sum\\('protein'\\)/)
  })

  it('keeps version metadata construction inside the pure boundary', () => {
    const applicationSources = sourceFiles('app').map(file => readFileSync(file, 'utf8')).join('\n')
    expect(applicationSources).not.toContain('_nutrition_snapshot')
    expect(applicationSources).not.toMatch(/schemaVersion\s*:\s*1/)
  })
})
