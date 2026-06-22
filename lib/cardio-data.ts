export interface HiitExercise {
  name: string
  work_seconds: number
  rest_seconds: number
  rounds: number
}

export interface CardioWorkout {
  id: string
  type: 'hiit' | 'liss'
  duration_min: number
  exercises?: HiitExercise[]
  calories_per_min: number // base rate at 75kg
}

export const HIIT_WORKOUTS: CardioWorkout[] = [
  {
    id: 'tabata_brule_graisses', type: 'hiit', duration_min: 16, calories_per_min: 12,
    exercises: [
      { name: 'Burpees', work_seconds: 20, rest_seconds: 10, rounds: 8 },
      { name: 'Mountain Climbers', work_seconds: 20, rest_seconds: 10, rounds: 8 },
      { name: 'Jump Squats', work_seconds: 20, rest_seconds: 10, rounds: 8 },
      { name: 'High Knees', work_seconds: 20, rest_seconds: 10, rounds: 8 },
    ],
  },
  {
    id: 'sprint_intervals', type: 'hiit', duration_min: 20, calories_per_min: 11,
    exercises: [{ name: 'Sprint', work_seconds: 30, rest_seconds: 60, rounds: 10 }],
  },
  {
    id: 'full_body_hiit', type: 'hiit', duration_min: 20, calories_per_min: 10,
    exercises: [
      { name: 'Jumping Jacks', work_seconds: 40, rest_seconds: 20, rounds: 5 },
      { name: 'Push-ups', work_seconds: 40, rest_seconds: 20, rounds: 5 },
      { name: 'Squat Jumps', work_seconds: 40, rest_seconds: 20, rounds: 5 },
      { name: 'Plank Hold', work_seconds: 40, rest_seconds: 20, rounds: 5 },
    ],
  },
  {
    id: 'pyramide_infernale', type: 'hiit', duration_min: 18, calories_per_min: 11,
    exercises: [
      { name: 'Burpees', work_seconds: 20, rest_seconds: 20, rounds: 1 },
      { name: 'Burpees', work_seconds: 30, rest_seconds: 30, rounds: 1 },
      { name: 'Burpees', work_seconds: 40, rest_seconds: 40, rounds: 1 },
      { name: 'Burpees', work_seconds: 30, rest_seconds: 30, rounds: 1 },
      { name: 'Burpees', work_seconds: 20, rest_seconds: 20, rounds: 1 },
      { name: 'Mountain Climbers', work_seconds: 20, rest_seconds: 20, rounds: 1 },
      { name: 'Mountain Climbers', work_seconds: 30, rest_seconds: 30, rounds: 1 },
      { name: 'Mountain Climbers', work_seconds: 40, rest_seconds: 40, rounds: 1 },
      { name: 'Mountain Climbers', work_seconds: 30, rest_seconds: 30, rounds: 1 },
      { name: 'Mountain Climbers', work_seconds: 20, rest_seconds: 20, rounds: 1 },
    ],
  },
  {
    id: 'cardio_boxing', type: 'hiit', duration_min: 15, calories_per_min: 10,
    exercises: [
      { name: 'Jab-Cross combos', work_seconds: 30, rest_seconds: 15, rounds: 6 },
      { name: 'Uppercuts rapides', work_seconds: 30, rest_seconds: 15, rounds: 6 },
      { name: 'Esquives + crochets', work_seconds: 30, rest_seconds: 15, rounds: 6 },
      { name: 'Combos libres', work_seconds: 30, rest_seconds: 15, rounds: 6 },
    ],
  },
  {
    id: 'core_hiit', type: 'hiit', duration_min: 12, calories_per_min: 9,
    exercises: [
      { name: 'Plank to Push-up', work_seconds: 30, rest_seconds: 15, rounds: 4 },
      { name: 'Russian Twists', work_seconds: 30, rest_seconds: 15, rounds: 4 },
      { name: 'Bicycle Crunches', work_seconds: 30, rest_seconds: 15, rounds: 4 },
      { name: 'Leg Raises', work_seconds: 30, rest_seconds: 15, rounds: 4 },
    ],
  },
  {
    id: 'classique_30_30', type: 'hiit', duration_min: 20, calories_per_min: 10,
    exercises: [
      { name: 'Jumping Lunges', work_seconds: 30, rest_seconds: 30, rounds: 5 },
      { name: 'Burpees', work_seconds: 30, rest_seconds: 30, rounds: 5 },
      { name: 'High Knees', work_seconds: 30, rest_seconds: 30, rounds: 5 },
      { name: 'Squat Thrusts', work_seconds: 30, rest_seconds: 30, rounds: 5 },
    ],
  },
  {
    id: 'emom_20', type: 'hiit', duration_min: 20, calories_per_min: 9,
    exercises: [
      { name: '10 Burpees (min impaire)', work_seconds: 60, rest_seconds: 0, rounds: 10 },
      { name: '15 Squats (min paire)', work_seconds: 60, rest_seconds: 0, rounds: 10 },
    ],
  },
]

export const LISS_WORKOUTS: CardioWorkout[] = [
  { id: 'marche_rapide', type: 'liss', duration_min: 45, calories_per_min: 6 },
  { id: 'velo_zone_2', type: 'liss', duration_min: 40, calories_per_min: 7 },
  { id: 'rameur_steady', type: 'liss', duration_min: 30, calories_per_min: 8 },
  { id: 'elliptique', type: 'liss', duration_min: 35, calories_per_min: 6 },
  { id: 'natation', type: 'liss', duration_min: 30, calories_per_min: 8 },
  { id: 'velo_incline_walk', type: 'liss', duration_min: 40, calories_per_min: 7 },
]

export function estimateCalories(workout: CardioWorkout, weightKg: number): number {
  return Math.round(workout.calories_per_min * workout.duration_min * (weightKg / 75))
}
