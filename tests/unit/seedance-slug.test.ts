import { describe, it, expect } from 'vitest'
import { slugify } from '@/lib/seedance/slug'

describe('slugify', () => {
  it('lowercases, strips accents, hyphenates', () => {
    expect(slugify('Développé Couché Barre')).toBe('developpe-couche-barre')
  })
  it('trims leading/trailing separators and collapses runs', () => {
    expect(slugify('  Leg  Press!! ')).toBe('leg-press')
  })
})
