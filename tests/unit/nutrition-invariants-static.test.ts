import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const sourcePath = path.resolve(process.cwd(), 'lib/nutrition/invariants.ts')
const source = fs.readFileSync(sourcePath, 'utf8')

describe('nutrition invariants purity boundary', () => {
  it('does not import React, Next, Supabase, browser or application modules', () => {
    expect(source).not.toMatch(/from\s+['"](?:react|next|@supabase|@\/app|\.\.\/app)/)
    expect(source).not.toMatch(/\b(?:window|document|localStorage|sessionStorage|fetch)\b/)
  })

  it('does not silently use fallback operators for unknown nutrients', () => {
    expect(source).not.toMatch(/(?:kcal|proteinG|carbsG|fatG|fiberG)\s*\|\|\s*0/)
  })
})
