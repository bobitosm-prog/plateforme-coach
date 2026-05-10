import { describe, it, expect } from 'vitest'
import { getHeroImage, getHeroSlot } from '@/lib/session-types'

describe('getHeroSlot', () => {
  // PPL conventions
  it('Push A → push', () => expect(getHeroSlot('Push A')).toBe('push'))
  it('Pull B (Dos-Biceps) → pull', () => expect(getHeroSlot('Pull B (Dos-Biceps)')).toBe('pull'))
  it('Legs A (Quad-Ischio-Mo → legs', () => expect(getHeroSlot('Legs A (Quad-Ischio-Mo')).toBe('legs'))

  // FR muscle groups
  it('Pectoraux → push', () => expect(getHeroSlot('Pectoraux')).toBe('push'))
  it('Dos → pull', () => expect(getHeroSlot('Dos')).toBe('pull'))
  it('Epaules → push', () => expect(getHeroSlot('Épaules')).toBe('push'))
  it('Jambes → legs', () => expect(getHeroSlot('Jambes')).toBe('legs'))
  it('Haut du Corps → push', () => expect(getHeroSlot('Haut du Corps')).toBe('push'))
  it('Bas du Corps → legs', () => expect(getHeroSlot('Bas du Corps')).toBe('legs'))

  // Cardio
  it('Cardio → cardio', () => expect(getHeroSlot('Cardio')).toBe('cardio'))
  it('Cardio LISS → cardio', () => expect(getHeroSlot('Cardio LISS')).toBe('cardio'))

  // Full body
  it('Full body → full', () => expect(getHeroSlot('Full body')).toBe('full'))

  // Generic / fallback
  it('null → default', () => expect(getHeroSlot(null)).toBe('default'))
  it('undefined → default', () => expect(getHeroSlot(undefined)).toBe('default'))
  it('empty string → default', () => expect(getHeroSlot('')).toBe('default'))
  it('Seance du jour → default', () => expect(getHeroSlot('Séance du jour')).toBe('default'))
  it('Jour 1 → default', () => expect(getHeroSlot('Jour 1')).toBe('default'))
  it('Mardi → default', () => expect(getHeroSlot('Mardi')).toBe('default'))
  it('Repos → default', () => expect(getHeroSlot('Repos')).toBe('default'))
  it('Seance libre → default', () => expect(getHeroSlot('Séance libre')).toBe('default'))
})

describe('getHeroImage', () => {
  it('returns full path for push', () => {
    expect(getHeroImage('Push A')).toBe('/images/hero/hero-push.webp')
  })
  it('returns default path for unknown', () => {
    expect(getHeroImage('foobar')).toBe('/images/hero/hero-default.webp')
  })
})
