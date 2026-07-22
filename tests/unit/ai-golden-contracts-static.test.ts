import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const root = process.cwd()
const fixtures = path.join(root, 'tests/fixtures/ai-golden')

describe('AI golden fixture architecture', () => {
  it('keeps fixtures typed, readable and independent of runtime rewrites', () => {
    const files = fs.readdirSync(fixtures).sort()
    expect(files).toEqual(['canonical.ts', 'contracts.ts', 'index.ts', 'types.ts'])
    const source = files.map(file => fs.readFileSync(path.join(fixtures, file), 'utf8')).join('\n')
    expect(source).not.toMatch(/writeFile|UPDATE_SNAPSHOT|process\.env|fetch\(|createClient|Anthropic/)
    expect(source).not.toMatch(/\bany\b/)
  })

  it('guards the documented fifteen entry points against untracked additions', () => {
    const source = fs.readFileSync(path.join(fixtures, 'contracts.ts'), 'utf8')
    expect((source.match(/entryPoint:/g) ?? [])).toHaveLength(15)
    expect(source).toContain("'POST /api/chat-ai'")
    expect(source).toContain("'GET /api/training-regen/cron'")
    expect(source).toContain("'GET /api/weekly-diagnostic/cron'")
  })

  it('fails when a runtime AI entry file is added without extending the golden inventory', () => {
    const roots = ['app/api', 'lib/training', 'lib/nutrition', 'lib/weekly-diagnostic']
    const runtimeFiles = roots.flatMap(relative => walk(path.join(root, relative)))
      .filter(file => /startAiUsage\(|createAnthropicProvider\(|anthropic\.messages\.create|messages\.create\(/.test(fs.readFileSync(file, 'utf8')))
      .map(file => path.relative(root, file)).sort()
    expect(runtimeFiles).toEqual([
      'app/api/adapt-workout/route.ts', 'app/api/analyze-body/route.ts',
      'app/api/analyze-meal-photo/route.ts', 'app/api/analyze-progress-photo/route.ts',
      'app/api/chat-ai/route.ts', 'app/api/generate-custom-program/route.ts',
      'app/api/generate-exercise-instructions/route.ts', 'app/api/generate-meal-plan/route.ts',
      'app/api/generate-program/route.ts', 'app/api/generate-recipe/route.ts',
      'app/api/suggest-exercise/route.ts', 'app/api/suggest-overload/route.ts',
      'app/api/training-regen/cron/route.ts', 'app/api/weekly-diagnostic/cron/route.ts',
      'app/api/weekly-diagnostic/service.ts',
      'lib/weekly-diagnostic/generator.ts',
    ])
  })
})

function walk(directory: string): string[] {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const target = path.join(directory, entry.name)
    return entry.isDirectory() ? walk(target) : entry.name.endsWith('.ts') ? [target] : []
  })
}
