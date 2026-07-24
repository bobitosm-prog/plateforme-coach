export const PERSONAL_GENERATED_PLAN_PAYLOAD = {
  user_id: 'owner-id',
  plan_data: { lundi: { repas: {} } },
  is_active: true,
} as const

export const PERSONAL_DIAGNOSTIC_PLAN_PAYLOAD = {
  user_id: 'owner-id',
  plan_data: { lundi: { repas: {}, total_kcal: 600 } },
  is_active: true,
  total_calories: 500,
  protein_g: 20,
  carbs_g: 50,
  fat_g: 20,
  objective: 'maintien',
} as const

export const COACH_AI_PERSONAL_PLAN_PAYLOAD = {
  user_id: 'client-id',
  created_by: 'coach-id',
  total_calories: 500,
  protein_g: 20,
  carbs_g: 50,
  fat_g: 20,
  objective: 'maintien',
  plan_data: { lundi: { repas: {}, total_kcal: 600 } },
  is_active: true,
} as const

export const COACH_ASSIGNED_PLAN_PAYLOAD = {
  coach_id: 'coach-id',
  client_id: 'client-id',
  week_start: '2026-07-20',
  calorie_target: 2_000,
  protein_target: 150,
  carb_target: 220,
  fat_target: 70,
  plan: { lundi: { meals: [] } },
  updated_at: '2026-07-24T00:00:00.000Z',
} as const

export const SELF_ASSIGNED_PLAN_PAYLOAD = {
  client_id: 'client-id',
  plan: { lundi: { repas: {} } },
  created_at: '2026-07-24T00:00:00.000Z',
} as const

export const SEVEN_FRENCH_DAYS = [
  'lundi',
  'mardi',
  'mercredi',
  'jeudi',
  'vendredi',
  'samedi',
  'dimanche',
] as const
