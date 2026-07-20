export const validRecipeOutput = {
  title: 'Poulet riz', description: 'Repas simple', category: 'dejeuner', prep_time_min: 10, cook_time_min: 15, servings: 1,
  ingredients: [{ name: 'Poulet', quantity_g: 200, calories: 330, proteins: 62, carbs: 0, fat: 7 }],
  instructions: [{ step: 1, text: 'Cuire le poulet.' }], tags: ['high-protein'], calories_per_serving: 500, proteins_per_serving: 45, carbs_per_serving: 50, fat_per_serving: 12,
} as const

export const validModernProgramOutput = {
  program_name: 'Programme force', description: 'Progression contrôlée', days: [{
    day_number: 1, name: 'Push', focus: 'Poitrine', muscle_groups: ['chest'], exercises: [{
      custom_name: 'Développé couché', muscle_primary: 'Poitrine', sets: 4, reps: 8, rest_seconds: 120, order: 1,
      tempo: '2-0-2', technique: null, technique_details: '',
    }],
  }],
} as const

export const validDiagnosticOutput = {
  score_semaine: 72,
  points_forts: ['Trois séances réalisées'],
  points_alerte: ['Deux jours sans journal'],
  ajustements: { calorie_goal_new: 2200, training_volume_delta_pct: -5 },
  exercice_a_ajouter: 'Rowing 3 x 10',
  objectif_semaine_prochaine: 'Journaliser 7 jours sur 7',
  raisonnement: 'Les données montrent une régularité correcte et une nutrition partielle.',
} as const
