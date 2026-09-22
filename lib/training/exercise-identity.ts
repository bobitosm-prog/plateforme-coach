/** Reviewed synonyms only. A variant group is NOT an identity: grip, angle and equipment matter. */
export const EXERCISE_IDENTITIES = [
  { name: 'Développé Couché Barre', equipment: 'barbell', aliases: ['Développé Couché', 'Développé couché à la barre'] },
  { name: 'Curl barre droite', equipment: 'barbell', aliases: ['Curl Barre Droit'] },
  { name: 'Écartés couchés haltères', equipment: 'dumbbell', aliases: ['Écarté Couché Haltères'] },
  { name: 'Hip Thrust Barre', equipment: 'barbell', aliases: ['Hip Thrust'] },
  { name: 'Squat Barre', equipment: 'barbell', aliases: ['Squat', 'Squat classique back squat'] },
  { name: 'Élévations frontales haltères', equipment: 'dumbbell', aliases: ['Élévations Frontales'] },
  { name: 'Élévations latérales haltères', equipment: 'dumbbell', aliases: ['Élévations Latérales'] },
  { name: 'Leg curl allongé', equipment: 'machine_gym', aliases: ['Leg Curl Couché'] },
  { name: 'Leg extension', equipment: 'machine_gym', aliases: ['Extension Jambes Machine'] },
  { name: 'Presse à cuisses', equipment: 'machine_gym', aliases: ['Leg Press'] },
  { name: 'Dips pectoraux', equipment: 'bodyweight', aliases: ['Dips Poitrine'] },
] as const

export function foldExerciseName(name: string): string {
  return name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g, ' ').trim()
}

export function canonicalExerciseName(name: string): string {
  const key = foldExerciseName(name)
  return EXERCISE_IDENTITIES.find(group => [group.name, ...group.aliases].some(alias => foldExerciseName(alias) === key))?.name ?? name
}
