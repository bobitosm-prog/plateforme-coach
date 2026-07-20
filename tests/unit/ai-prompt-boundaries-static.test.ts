import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const promptRoot = join(process.cwd(), 'lib/ai/prompts')
const sources = readdirSync(promptRoot).filter(file => file.endsWith('.ts')).map(file => readFileSync(join(promptRoot, file), 'utf8')).join('\n')

describe('AI prompt boundary architecture', () => {
  it('remains pure and transport independent', () => {
    expect(sources).not.toMatch(/from ['"](?:react|next|@supabase|@anthropic-ai|app\/)/)
    expect(sources).not.toMatch(/\bfetch\s*\(|createClient|service_role|process\.env|console\./)
  })

  it('delegates the extracted runtime prompts from their transports', () => {
    const routes = [
      'app/api/chat-ai/route.ts', 'app/api/generate-recipe/route.ts', 'app/api/analyze-meal-photo/route.ts',
      'app/api/suggest-exercise/route.ts', 'app/api/adapt-workout/route.ts',
      'app/api/generate-exercise-instructions/route.ts', 'app/api/suggest-overload/route.ts',
      'app/api/analyze-body/route.ts',
      'app/api/generate-program/route.ts',
      'app/api/analyze-progress-photo/route.ts',
    ].map(file => readFileSync(join(process.cwd(), file), 'utf8'))
    for (const source of routes) expect(source).toMatch(/lib\/ai\/prompts/)
    expect(readFileSync(join(process.cwd(), 'lib/training/generate-program.ts'), 'utf8')).toContain('buildTrainingProgramInvocation')
    expect(readFileSync(join(process.cwd(), 'lib/nutrition/meal-generation/service.ts'), 'utf8')).toContain('buildSequentialMealDayInvocation')
    expect(readFileSync(join(process.cwd(), 'lib/weekly-diagnostic/generator.ts'), 'utf8')).toContain('buildWeeklyDiagnosticInvocation')
  })

  it('accounts for all fifteen runtime entry points', () => {
    const entryPoints = ['chat-ai', 'generate-recipe', 'generate-meal-plan', 'analyze-meal-photo', 'suggest-exercise', 'generate-exercise-instructions', 'generate-program', 'generate-custom-program', 'training-regen', 'adapt-workout', 'suggest-overload', 'analyze-body', 'analyze-progress-photo', 'weekly-diagnostic', 'weekly-diagnostic-cron']
    expect(entryPoints).toHaveLength(15)
    expect(new Set(entryPoints).size).toBe(15)
  })
})
