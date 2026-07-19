import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

describe('timezone and unit matrix architecture', () => {
  it('keeps the tested calculation kernels pure', () => {
    const files = ['lib/progression/dates.ts', 'lib/progression/training.ts', 'lib/progression/body.ts', 'lib/progression/nutrition.ts', 'lib/nutrition/invariants.ts']
    const source = files.map(file => fs.readFileSync(path.join(process.cwd(), file), 'utf8')).join('\n')
    for (const forbidden of ['react', 'next/', 'supabase', 'createClient', 'service_role', 'localStorage', 'sessionStorage', 'fetch(']) expect(source).not.toContain(forbidden)
    expect(source).not.toMatch(/\bany\b/)
  })
})
