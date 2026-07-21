import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const root = process.cwd()
const fallbackDir = path.join(root, 'lib/ai/fallbacks')

describe('AI fallback architecture', () => {
  it('keeps the module pure and free from authority, provider and application imports', () => {
    const source = fs.readdirSync(fallbackDir).map(file => fs.readFileSync(path.join(fallbackDir, file), 'utf8')).join('\n')
    expect(source).not.toMatch(/from ['"](?:react|next|@supabase|@anthropic-ai|@\/app|\.\.\/\.\.\/app)/)
    expect(source).not.toMatch(/createClient|service_role|fetch\(|localStorage|sessionStorage|process\.env/)
    expect(source).not.toMatch(/\bany\b/)
  })

  it('keeps runtime routes untouched and policies aligned with the golden feature count', () => {
    const registry = fs.readFileSync(path.join(fallbackDir, 'registry.ts'), 'utf8')
    expect((registry.match(/policy\('/g) ?? [])).toHaveLength(15)
    const golden = fs.readFileSync(path.join(root, 'tests/fixtures/ai-golden/contracts.ts'), 'utf8')
    expect((golden.match(/entryPoint:/g) ?? [])).toHaveLength(15)
  })
})
