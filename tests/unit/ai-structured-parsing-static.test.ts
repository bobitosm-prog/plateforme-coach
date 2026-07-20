import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const root = path.join(process.cwd(), 'lib/ai/parsing')
const sources = fs.readdirSync(root).filter(file => file.endsWith('.ts')).map(file => fs.readFileSync(path.join(root, file), 'utf8'))

describe('AI structured parsing architecture', () => {
  it('has no application, framework, provider or network dependency', () => {
    for (const source of sources) {
      expect(source).not.toMatch(/from ['"](?:react|next|@anthropic-ai|@supabase|@\/app)/)
      expect(source).not.toMatch(/fetch\(|createClient|service_role|process\.env|console\.|localStorage|sessionStorage/)
    }
  })

  it('contains JSON.parse only in the bounded decoder', () => {
    const offenders = sources.filter(source => source.includes('JSON.parse'))
    expect(offenders).toHaveLength(1)
    expect(offenders[0]).toContain('input.length > maxCharacters')
  })
})
