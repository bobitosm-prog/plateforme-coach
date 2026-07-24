import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const comparator = readFileSync('lib/nutrition/legacy-total-comparison.ts', 'utf8')

describe('Nutrition total concordance static policy', () => {
  it('keeps aliases and policy in named immutable contracts', () => {
    expect(comparator).toContain('export const TOTAL_CONCORDANCE_POLICY = Object.freeze')
    expect(comparator).toContain('export const LEGACY_NUTRIENT_ALIASES = Object.freeze')
    expect(comparator).toContain('export const DEFAULT_TOTAL_TOLERANCE')
  })

  it('does not round inside the comparison core or add unsafe dependencies', () => {
    expect(comparator).not.toContain('Math.round')
    expect(comparator).not.toMatch(/\bany\b/)
    expect(comparator).not.toMatch(/react|next\/|supabase|window\.|document\.|localStorage|fetch\(/i)
  })
})
