import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const source = fs.readFileSync(path.join(process.cwd(), 'lib/nutrition/legacy-total-comparison.ts'), 'utf8')

describe('nutrition total comparator purity', () => {
  it('does not depend on UI, persistence, browser or network boundaries', () => {
    for (const forbidden of ['react', 'next/', 'supabase', 'window.', 'document.', 'localStorage', 'fetch(']) {
      expect(source).not.toContain(forbidden)
    }
  })

  it('does not add any or intermediate rounding', () => {
    expect(source).not.toMatch(/\bany\b/)
    expect(source).not.toContain('Math.round')
  })
})
