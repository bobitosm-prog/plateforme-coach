import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
const files = ['types.ts','clients.ts','revenue.ts','analytics.ts','programs.ts','index.ts']
const source = files.map(file => readFileSync(`lib/coaching/dashboard/${file}`, 'utf8')).join('\n')
describe('coach dashboard domain architecture', () => {
  it('has no forbidden infrastructure or wildcard projections', () => {
    expect(source).not.toMatch(/createClient|service_role|select\('\*'\)|from ['"](?:react|next|@\/app)/)
    expect(source).not.toContain(': any')
  })
})
