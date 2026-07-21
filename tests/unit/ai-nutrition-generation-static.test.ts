import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const root = process.cwd()
const files = [
  'app/api/generate-meal-plan/route.ts',
  'lib/nutrition/meal-generation/service.ts',
  'lib/nutrition/meal-generation/types.ts',
]
const source = (file: string) => fs.readFileSync(path.join(root, file), 'utf8')

describe('Nutrition generation migration boundaries', () => {
  it.each(files)('%s has no direct Anthropic transport, model literal or ad hoc parser', file => {
    expect(source(file)).not.toMatch(/api\.anthropic\.com|claude-(?:haiku|sonnet|opus)|JSON\.parse|parseAndValidateAiOutput|createAnthropicMealGenerationProvider/)
  })

  it('routes only meal-plan generation through the common provider', () => {
    expect(source(files[0])).toContain('createAnthropicProvider')
    expect(source(files[0])).toContain("resolveAiModel('anthropic-opus-4.8')")
    expect(source(files[1])).toContain('createAiOutputValidator(legacyNutritionDayOutputSchema)')
    expect(source('app/api/analyze-meal-photo/route.ts')).not.toContain('createAnthropicProvider')
  })

  it('keeps seven ordered progress events, one usage operation and no persistence', () => {
    expect(source(files[1])).toContain("const DAYS = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche']")
    expect(source(files[0]).match(/startAiUsage\(/g)).toHaveLength(1)
    expect(source(files[0])).not.toMatch(/\.from\(|\.insert\(|\.update\(|\.upsert\(/)
  })

  it('removes the obsolete Nutrition-specific Anthropic port', () => {
    expect(fs.existsSync(path.join(root, 'lib/nutrition/meal-generation/provider.ts'))).toBe(false)
  })
})
