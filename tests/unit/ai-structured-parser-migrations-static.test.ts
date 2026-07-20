import fs from 'node:fs'
import { describe, expect, it } from 'vitest'

const migrated = [
  'app/api/generate-recipe/route.ts',
  'app/api/analyze-meal-photo/route.ts',
  'app/api/suggest-exercise/route.ts',
  'app/api/generate-exercise-instructions/route.ts',
  'app/api/generate-program/route.ts',
  'app/api/adapt-workout/route.ts',
  'app/api/suggest-overload/route.ts',
  'app/api/analyze-body/route.ts',
  'lib/training/generate-program.ts',
  'lib/weekly-diagnostic/generator.ts',
  'lib/nutrition/meal-generation/service.ts',
] as const

describe('structured parser migrations', () => {
  it('routes every structured output through the common parsing boundary', () => {
    for (const file of migrated) {
      const source = fs.readFileSync(file, 'utf8')
      expect(source, file).toMatch(/parseAndValidate(?:AiOutput|ToolUse)/)
      expect(source, file).not.toMatch(/JSON\.parse|jsonMatch|unwrapToolInput/)
      expect(source, file).not.toContain('match(/\\{[\\s\\S]*\\}/)')
      expect(source, file).not.toContain('match(/\\[[\\s\\S]*\\]/)')
    }
  })

  it('leaves free-text Progression and Athena outputs outside structured parsing', () => {
    for (const file of ['app/api/chat-ai/route.ts', 'app/api/analyze-progress-photo/route.ts']) {
      const source = fs.readFileSync(file, 'utf8')
      expect(source, file).not.toContain("from '../../../lib/ai/parsing'")
    }
  })
})
