import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const root = process.cwd()
const aiRoutes = [
  'chat-ai', 'generate-recipe', 'generate-meal-plan', 'analyze-meal-photo',
  'suggest-exercise', 'adapt-workout', 'generate-exercise-instructions',
  'generate-program', 'generate-custom-program', 'training-regen/cron',
  'suggest-overload', 'analyze-body', 'analyze-progress-photo',
  'weekly-diagnostic', 'weekly-diagnostic/cron',
].map(route => `app/api/${route}/route.ts`)

const source = (file: string) => fs.readFileSync(path.join(root, file), 'utf8')

describe('AI runtime safety guards', () => {
  it('keeps the complete fifteen-entry-point inventory', () => {
    expect(aiRoutes).toHaveLength(15)
    for (const file of aiRoutes) expect(fs.existsSync(path.join(root, file))).toBe(true)
  })

  it('does not log raw error objects or return error.message from AI routes', () => {
    for (const file of aiRoutes) {
      const runtime = source(file)
      expect(runtime, file).not.toMatch(/console\.(?:log|error|warn|info)\([^\n]*,\s*(?:error|err|\w+Err)\b/)
      expect(runtime, file).not.toMatch(/NextResponse\.json\(\s*\{\s*error:\s*(?:error|err|\w+Err)\.message/)
    }
  })

  it('keeps Chat and Training catalog logs on bounded reason codes', () => {
    expect(source('app/api/chat-ai/route.ts')).not.toMatch(/console\.(?:error|warn|log)/)
    expect(source('lib/training/load-exercise-catalog.ts')).not.toContain('error.message')
    expect(source('lib/training/load-exercise-catalog.ts')).not.toContain('e.message')
  })

  it('propagates Request.signal through training regeneration', () => {
    const cron = source('app/api/training-regen/cron/route.ts')
    expect(cron).toContain('signal: req.signal')
    expect(cron).toContain('abortSignalToAiCancellation(req.signal)')
    expect(cron).toContain("outcome: cancelled ? 'cancelled' : 'failed'")
    expect(cron).not.toContain('error: e.message')
    expect(cron).not.toMatch(/details\.push\(\{\s*user_id:/)
  })
})
