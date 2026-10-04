import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

function sources(root: string): string[] {
  return readdirSync(root, { withFileTypes: true }).flatMap(entry => entry.isDirectory()
    ? sources(join(root, entry.name)) : /\.tsx?$/.test(entry.name) ? [join(root, entry.name)] : [])
}
describe('AI provider coverage', () => {
  it('does not introduce unguarded direct calls or SDK transports in app/server code', () => {
    for (const path of [...sources('app/api'), ...sources('lib')]) {
      const source = readFileSync(path, 'utf8')
      expect(source, path).not.toMatch(/\bfetch\(['"]https:\/\/api\.anthropic\.com/)
      if (source.includes('new Anthropic(')) expect(source, path).toContain('fetch: consentedAnthropicFetch')
      if (path.startsWith('app/api/') && (source.includes('consentedAnthropicFetch(') || source.includes('new Anthropic('))) {
        expect(source, path).toContain('export const POST = withAiConsent(')
      }
    }
  })
  it('binds scheduled generations to each profile rather than the scheduler identity', () => {
    expect(readFileSync('app/api/training-regen/cron/route.ts', 'utf8')).toContain('withAiUser(supabaseAdmin, profile.id,')
    expect(readFileSync('lib/weekly-diagnostic/generator.ts', 'utf8')).toContain('withAiUser(supabase, userId,')
  })
})
