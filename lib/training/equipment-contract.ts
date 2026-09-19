import type { Equipment } from './equipment-normalize'

export interface CatalogExercise { id: string; name: string; equipment?: string | null; equipment_legacy?: string | null }
const fold = (value: string) => value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim()

export function availableEquipment(value: string): Set<Equipment> {
  const text = fold(value)
  if (/\bsalle\b|\bgym\b/.test(text)) return new Set(['bodyweight', 'band', 'dumbbell', 'kettlebell', 'barbell', 'machine_gym'])
  const available = new Set<Equipment>(['bodyweight'])
  if (/haltere|dumbbell/.test(text)) available.add('dumbbell')
  if (/kettlebell/.test(text)) available.add('kettlebell')
  if (/elastique|band/.test(text)) available.add('band')
  if (/barre|barbell/.test(text)) available.add('barbell')
  return available
}

/** Legacy categories group ab wheels/ropes under band and pull-ups under bodyweight.
 * Check the physical requirements too; "home friendly" is not "equipment available".
 */
export function isCatalogExerciseCompatible(exercise: CatalogExercise, equipment: string): boolean {
  const available = availableEquipment(equipment)
  if (available.has('machine_gym')) return true
  if (!exercise.equipment || !available.has(exercise.equipment as Equipment)) return false
  const physical = fold(`${exercise.name} ${exercise.equipment_legacy ?? ''}`)
  if (/poulie|machine|banc|bench|box|traction|pull up|chin up|parallele|dips|roue|wheel|cordes|battle rope|suspension|trx|bulgar|incline|decline/.test(physical)) return false
  if (exercise.equipment === 'bodyweight' && /barre/.test(physical)) return false
  return true
}

// Unambiguous movements which do not require an anchor, bench or hidden accessory.
const HOME_MOVEMENTS = [
  ['Squat au poids du corps', 'bodyweight'], ['Fentes arrière au poids du corps', 'bodyweight'],
  ['Pompes au sol', 'bodyweight'], ['Pompes sur les genoux', 'bodyweight'],
  ['Pont fessier au sol', 'bodyweight'], ['Planche', 'bodyweight'],
  ['Planche latérale', 'bodyweight'], ['Dead bug', 'bodyweight'], ['Bird dog', 'bodyweight'],
  ['Mollets debout au poids du corps', 'bodyweight'],
  ['Rowing élastique assis, bande autour des pieds', 'band'],
  ['Écartés élastiques debout (band pull-apart)', 'band'],
  ['Curl biceps élastique, bande sous les pieds', 'band'],
  ['Développé épaules élastique, bande sous les pieds', 'band'],
] as const

export function generationCatalog(catalog: CatalogExercise[], equipment: string): CatalogExercise[] {
  const allowed = availableEquipment(equipment)
  if (allowed.has('machine_gym')) return catalog
  const filtered = catalog.filter(exercise => isCatalogExerciseCompatible(exercise, equipment))
  for (const [name, required] of HOME_MOVEMENTS) {
    if (allowed.has(required) && !filtered.some(ex => fold(ex.name) === fold(name))) filtered.push({ id: '', name, equipment: required })
  }
  return filtered
}

/** Matching must preserve qualifiers, especially equipment in parentheses. */
export function exactEquipmentMatch(catalog: CatalogExercise[], name: string): CatalogExercise | undefined {
  return catalog.find(exercise => fold(exercise.name) === fold(name))
}
