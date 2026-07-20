import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const ROOT = process.cwd()
const SCHEMA_DIR = path.join(ROOT, 'lib/ai/schemas')
const files = fs.readdirSync(SCHEMA_DIR).filter(file => file.endsWith('.ts'))

describe('AI output schemas architecture', () => {
  it('keeps schemas independent from application and runtime transports', () => {
    for (const file of files) {
      const source = fs.readFileSync(path.join(SCHEMA_DIR, file), 'utf8')
      expect(source, file).not.toMatch(/from ['"](?:react|next|@anthropic-ai|@supabase|@\/app|\.\.\/\.\.\/app)/)
      expect(source, file).not.toMatch(/createClient|fetch\(|service_role|process\.env|localStorage|sessionStorage/)
    }
  })

  it('exports domain schemas and inferred TypeScript contracts', () => {
    const index = fs.readFileSync(path.join(SCHEMA_DIR, 'index.ts'), 'utf8')
    for (const domain of ['chat', 'diagnostic', 'nutrition', 'progression', 'training', 'validation']) {
      expect(index).toContain(`export * from './${domain}'`)
    }
    for (const file of files.filter(file => !['index.ts', 'validation.ts'].includes(file))) {
      const source = fs.readFileSync(path.join(SCHEMA_DIR, file), 'utf8')
      expect(source, file).toMatch(/z\.infer</)
    }
  })
})
