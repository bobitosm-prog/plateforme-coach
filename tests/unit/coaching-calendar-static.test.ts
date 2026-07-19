import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const files = ['types.ts', 'schema.ts', 'model.ts', 'repository.ts', 'service.ts', 'client-adapter.ts', 'index.ts']
const source = files.map(file => readFileSync(`lib/coaching/calendar/${file}`, 'utf8')).join('\n')

describe('coaching calendar architecture', () => {
  it('keeps the core independent from frameworks, browser and privileged clients', () => {
    expect(source).not.toMatch(/from ['"](?:react|next|@\/app)/)
    expect(source).not.toMatch(/createClient|service_role|localStorage|window\.|document\./)
    expect(source).not.toMatch(/\bany\b/)
  })

  it('uses explicit projections and no generic mutations', () => {
    expect(source).not.toMatch(/select\(['"]\*['"]|select\([^)]*\*\)/)
    expect(source).not.toContain("from('scheduled_sessions')")
  })
})
