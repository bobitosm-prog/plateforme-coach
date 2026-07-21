import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const dir = path.join(process.cwd(), 'lib/ai/usage')
const files = fs.readdirSync(dir).filter(file => file.endsWith('.ts'))
const sources = files.map(file => fs.readFileSync(path.join(dir, file), 'utf8'))

describe('AI usage architecture', () => {
  it('has no application, framework, Supabase, browser or logging dependency', () => {
    for (const [index, source] of sources.entries()) {
      if (['runtime.ts', 'supabase-port.ts'].includes(files[index])) continue
      expect(source).not.toMatch(/from ['"](?:react|next|@supabase|@\/app)/)
      expect(source).not.toMatch(/createClient|service_role|fetch\(|console\.|process\.env|localStorage|sessionStorage/)
    }
  })

  it('keeps the Supabase adapter injected and the fifteen consumers on the common boundary', () => {
    const adapter = fs.readFileSync(path.join(dir, 'supabase-port.ts'), 'utf8')
    expect(adapter).not.toMatch(/createClient|service_role|process\.env|from ['"]@\/app/)
    const consumers: Record<string, string> = {
      'chat-ai': 'app/api/chat-ai/route.ts',
      'generate-recipe': 'app/api/generate-recipe/route.ts',
      'generate-meal-plan': 'app/api/generate-meal-plan/route.ts',
      'analyze-meal-photo': 'app/api/analyze-meal-photo/route.ts',
      'suggest-exercise': 'app/api/suggest-exercise/route.ts',
      'adapt-workout': 'app/api/adapt-workout/route.ts',
      'generate-exercise-instructions': 'app/api/generate-exercise-instructions/route.ts',
      'generate-program': 'app/api/generate-program/route.ts',
      'generate-custom-program': 'app/api/generate-custom-program/route.ts',
      'training-regen': 'app/api/training-regen/cron/route.ts',
      'suggest-overload': 'app/api/suggest-overload/route.ts',
      'analyze-body': 'app/api/analyze-body/route.ts',
      'analyze-progress-photo': 'app/api/analyze-progress-photo/route.ts',
      'weekly-diagnostic': 'app/api/weekly-diagnostic/service.ts',
      'weekly-diagnostic-cron': 'app/api/weekly-diagnostic/cron/route.ts',
    }
    expect(Object.keys(consumers)).toHaveLength(15)
    for (const [feature, file] of Object.entries(consumers)) {
      const source = fs.readFileSync(path.join(process.cwd(), file), 'utf8')
      expect(source).toContain('startAiUsage')
      expect(source).toContain(`feature: '${feature}'`)
    }
  })

  it('contains all fifteen stable features exactly once', () => {
    const types = fs.readFileSync(path.join(dir, 'types.ts'), 'utf8')
    const match = types.match(/export const AI_FEATURES = \[([\s\S]*?)\] as const/)
    expect(match).not.toBeNull()
    const features = [...(match?.[1].matchAll(/'([^']+)'/g) ?? [])].map(item => item[1])
    expect(features).toHaveLength(15)
    expect(new Set(features).size).toBe(15)
  })
})
