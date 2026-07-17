import { afterEach, describe, expect, it, vi } from 'vitest'
import { buildProgramParams, composeEquipmentString } from '../../lib/training/build-program-params'
import {
  EQUIPMENT_VALUES,
  getLegacyValuesForEquipment,
  isHomeFriendly,
  normalizeEquipment,
} from '../../lib/training/equipment-normalize'
import { getEffectiveWeek } from '../../lib/training/program-week'

afterEach(() => vi.useRealTimers())

describe('equipment normalization', () => {
  it('normalizes representative legacy spellings across all categories', () => {
    expect(normalizeEquipment('Barre EZ')).toBe('barbell')
    expect(normalizeEquipment('haltères')).toBe('dumbbell')
    expect(normalizeEquipment('Kettlebell')).toBe('kettlebell')
    expect(normalizeEquipment('Cordes')).toBe('band')
    expect(normalizeEquipment('Barre de traction')).toBe('bodyweight')
    expect(normalizeEquipment('Poulie haute')).toBe('machine_gym')
  })

  it('fails closed on unknown values and preserves the documented case-sensitive behavior', () => {
    expect(normalizeEquipment('barre de traction')).toBeNull()
    expect(normalizeEquipment('Battle Ropes')).toBe('band')
    expect(normalizeEquipment('')).toBeNull()
    expect(normalizeEquipment(null)).toBeNull()
  })

  it('keeps reverse mappings complete and disjoint', () => {
    const all = EQUIPMENT_VALUES.flatMap(value => getLegacyValuesForEquipment(value))
    expect(new Set(all).size).toBe(all.length)
    for (const equipment of EQUIPMENT_VALUES) {
      expect(getLegacyValuesForEquipment(equipment).length).toBeGreaterThan(0)
      expect(getLegacyValuesForEquipment(equipment).every(value => normalizeEquipment(value) === equipment)).toBe(true)
    }
  })

  it('classifies only portable categories as home friendly', () => {
    expect(EQUIPMENT_VALUES.filter(isHomeFriendly)).toEqual(['dumbbell', 'kettlebell', 'band', 'bodyweight'])
  })
})

describe('program parameter normalization', () => {
  const profile = (overrides: Record<string, unknown> = {}) => ({
    objective: 'Prendre du muscle',
    gender: 'Femme',
    training_location: 'home',
    home_equipment: ['dumbbell', 'band'],
    onboarding_answers: { experience_level: 'Expérimenté', sessions_per_week: 3 },
    ...overrides,
  }) as Parameters<typeof buildProgramParams>[0]

  it('normalizes profile vocabulary and composes deterministic home equipment', () => {
    expect(buildProgramParams(profile())).toEqual({
      objective: 'prise de muscle',
      level: 'avance',
      daysPerWeek: 3,
      duration: 60,
      equipment: 'maison : poids du corps, haltères, bandes élastiques',
      priorities: [],
      notes: '',
      gender: 'female',
    })
  })

  it('applies overrides without mutating the profile', () => {
    const input = profile()
    const before = structuredClone(input)
    const result = buildProgramParams(input, { daysPerWeek: 5, duration: 45, level: 'debutant', priorities: ['dos'], notes: 'Sans saut' })
    expect(result).toMatchObject({ daysPerWeek: 5, duration: 45, level: 'debutant', priorities: ['dos'], notes: 'Sans saut' })
    expect(input).toEqual(before)
  })

  it.each([
    ['gym', [], 'salle de musculation complète'],
    ['both', ['dumbbell'], 'salle de musculation complète + matériel maison disponible'],
    ['home', ['kettlebell'], 'maison : poids du corps, kettlebell'],
    ['unknown', undefined, 'maison : poids du corps'],
  ])('composes %s equipment deterministically', (location, equipment, expected) => {
    expect(composeEquipmentString(location, equipment)).toBe(expected)
  })
})

describe('effective program week', () => {
  it('clamps before start, during the program and after its last week', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-07-17T12:00:00.000Z'))
    expect(getEffectiveWeek({ start_date: '2026-07-20', total_weeks: 4 })).toBe(1)
    expect(getEffectiveWeek({ start_date: '2026-07-06', total_weeks: 4 })).toBe(2)
    expect(getEffectiveWeek({ start_date: '2026-05-01', total_weeks: 4 })).toBe(4)
  })

  it('uses current_week only when calendar inputs are unavailable', () => {
    expect(getEffectiveWeek({ current_week: 3 })).toBe(3)
    expect(getEffectiveWeek(null)).toBe(1)
  })

  it('fails safely on invalid dates and invalid week bounds', () => {
    expect(getEffectiveWeek({ start_date: 'not-a-date', total_weeks: 4, current_week: 2 })).toBe(2)
    expect(getEffectiveWeek({ start_date: '2026-07-01', total_weeks: 0, current_week: 2 })).toBe(2)
    expect(getEffectiveWeek({ start_date: '2026-07-01', total_weeks: -4, current_week: 2 })).toBe(2)
  })
})
