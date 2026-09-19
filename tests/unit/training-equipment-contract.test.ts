import { describe, expect, it } from 'vitest'
import { generationCatalog, exactEquipmentMatch } from '@/lib/training/equipment-contract'

const catalog = [
  { id: '1', name: 'Squat Goblet', equipment: 'dumbbell' },
  { id: '2', name: 'Rowing assis poulie basse', equipment: 'machine_gym' },
  { id: '3', name: 'Planche', equipment: 'bodyweight' },
  { id: '4', name: 'Roue abdominale', equipment: 'band', equipment_legacy: 'Roue abdominale' },
  { id: '5', name: 'Tractions', equipment: 'bodyweight', equipment_legacy: 'Barre de traction' },
]
describe('closed equipment contract', () => {
  it('excludes every unavailable accessory from a home/bands program', () => {
    const allowed = generationCatalog(catalog, 'maison : poids du corps, bandes élastiques')
    expect(allowed.filter(row => row.id).map(row => row.id)).toEqual(['3'])
    expect(allowed.some(row => row.name.includes('Rowing élastique'))).toBe(true)
    expect(allowed.some(row => row.name.includes('Squat au poids'))).toBe(true)
  })
  it('never erases an equipment qualifier during matching', () => {
    expect(exactEquipmentMatch(catalog, 'Squat Goblet (élastique)')).toBeUndefined()
    expect(exactEquipmentMatch(catalog, 'planche')?.id).toBe('3')
  })
  it('allows dumbbells only when declared and preserves gym catalog', () => {
    expect(generationCatalog(catalog, 'maison : haltères').some(row => row.id === '1')).toBe(true)
    expect(generationCatalog(catalog, 'salle de musculation complète')).toEqual(catalog)
  })
})
