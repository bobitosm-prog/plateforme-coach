import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const root = process.cwd()
const migrated = [
  'app/api/generate-program/route.ts',
  'app/api/generate-custom-program/route.ts',
  'app/api/training-regen/cron/route.ts',
  'lib/training/generate-program.ts',
  'app/api/adapt-workout/route.ts',
]
const excluded = [
  'app/api/generate-exercise-instructions/route.ts',
  'app/api/suggest-overload/route.ts',
  'app/api/analyze-body/route.ts',
]

function source(file: string) {
  return fs.readFileSync(path.join(root, file), 'utf8')
}

describe('Training generation migration boundaries', () => {
  it.each(migrated)('%s has no direct Anthropic transport or ad hoc structured parsing', file => {
    expect(source(file)).not.toMatch(/api\.anthropic\.com|readAnthropicMetadata|parseAndValidate(?:AiOutput|ToolUse)|\bJSON\.parse\s*\(/)
  })

  it('routes legacy, SSE and cron generation through the shared provider', () => {
    expect(source(migrated[0])).toContain('createAnthropicProvider')
    expect(source(migrated[1])).toContain('createAnthropicProvider')
    expect(source(migrated[2])).toContain('createAnthropicProvider')
    expect(source(migrated[3])).toContain('promptInvocationToToolRequest')
    expect(source(migrated[4])).toContain('createAnthropicProvider')
    expect(source(migrated[1])).toContain('abortSignalToAiCancellation(req.signal)')
  })

  it('preserves SSE heartbeat and cron persistence order', () => {
    const sse = source(migrated[1])
    expect(sse).toContain("{ type: 'progress' }")
    expect(sse).toContain("{ type: 'done', program }")
    const cron = source(migrated[2])
    expect(cron.indexOf(".update({ is_active: false })")).toBeLessThan(cron.indexOf(".insert({"))
    expect(cron.indexOf(".insert({")).toBeLessThan(cron.indexOf(".update({ next_program_regen_at:"))
  })

  it('preserves distinct user and server usage authorities', () => {
    expect(source(migrated[0])).toMatch(/feature: 'generate-program'[\s\S]*principal: \{ kind: 'user', id: user\.id \}/)
    expect(source(migrated[1])).toMatch(/feature: 'generate-custom-program'[\s\S]*principal: \{ kind: 'user', id: user\.id \}/)
    expect(source(migrated[2])).toMatch(/feature: 'training-regen'[\s\S]*principal: \{ kind: 'server', id: 'cron\.training-regen', subjectUserId: profile\.id \}/)
    expect(source(migrated[1])).toContain('checkRateLimit(`custom-prog:${ip}`, 3, 60000)')
    expect(source(migrated[0])).toContain('checkRateLimit(`program:${ip}`, 5, 60000)')
  })

  it.each(excluded)('does not migrate excluded flow %s', file => {
    expect(source(file)).not.toContain('createAnthropicProvider')
  })
})
