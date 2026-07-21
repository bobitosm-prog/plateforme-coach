import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const root = process.cwd()
const routes = [
  'app/api/chat-ai/route.ts',
  'app/api/generate-recipe/route.ts',
  'app/api/suggest-exercise/route.ts',
  'app/api/generate-program/route.ts',
  'app/api/generate-custom-program/route.ts',
]

describe('Anthropic provider migration boundaries', () => {
  it('keeps direct Anthropic transport and provider model literals out of migrated routes', () => {
    for (const file of routes) {
      const source = fs.readFileSync(path.join(root, file), 'utf8')
      expect(source).toContain('createAnthropicProvider')
      expect(source).not.toMatch(/new Anthropic|messages\.create|api\.anthropic\.com|claude-(?:haiku|sonnet|opus)/)
      expect(source).not.toMatch(/JSON\.parse|readAnthropicMetadata/)
    }
  })

  it('isolates SDK/network details in the server-only adapter', () => {
    const provider = fs.readFileSync(path.join(root, 'lib/ai/providers/anthropic/provider.ts'), 'utf8')
    expect(provider).toContain("import 'server-only'")
    expect(provider).not.toMatch(/console\.|prompt|response\.body/)
    for (const folder of ['lib/ai/provider', 'lib/ai/prompts', 'lib/ai/schemas', 'lib/ai/parsing', 'lib/ai/usage', 'lib/ai/models']) {
      const files = fs.readdirSync(path.join(root, folder)).filter(file => file.endsWith('.ts'))
      for (const file of files) expect(fs.readFileSync(path.join(root, folder, file), 'utf8')).not.toMatch(/@anthropic-ai\/sdk/)
    }
  })

  it('tracks the migrated top-level routes', () => {
    const migrated = fs.readdirSync(path.join(root, 'app/api'), { withFileTypes: true })
      .filter(entry => entry.isDirectory())
      .map(entry => `app/api/${entry.name}/route.ts`)
      .filter(file => fs.existsSync(path.join(root, file)) && fs.readFileSync(path.join(root, file), 'utf8').includes('createAnthropicProvider'))
      .sort()
    expect(migrated).toEqual([...routes].sort())
  })
})
