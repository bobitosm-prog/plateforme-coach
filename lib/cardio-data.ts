export interface HiitExercise {
  name: string
  work_seconds: number
  rest_seconds: number
  rounds: number
}

export interface CardioWorkout {
  name: string
  type: 'hiit' | 'liss'
  duration_min: number
  exercises?: HiitExercise[]
  notes?: string
  calories_per_min: number // base rate at 75kg
}

export const HIIT_WORKOUTS: CardioWorkout[] = [
  {
    name: 'Tabata Brûle-Graisses', type: 'hiit', duration_min: 16, calories_per_min: 12,
    exercises: [
      { name: 'Burpees', work_seconds: 20, rest_seconds: 10, rounds: 8 },
      { name: 'Mountain Climbers', work_seconds: 20, rest_seconds: 10, rounds: 8 },
      { name: 'Jump Squats', work_seconds: 20, rest_seconds: 10, rounds: 8 },
      { name: 'High Knees', work_seconds: 20, rest_seconds: 10, rounds: 8 },
    ],
  },
  {
    name: 'Sprint Intervals', type: 'hiit', duration_min: 20, calories_per_min: 11,
    exercises: [{ name: 'Sprint', work_seconds: 30, rest_seconds: 60, rounds: 10 }],
  },
  {
    name: 'Full Body HIIT', type: 'hiit', duration_min: 20, calories_per_min: 10,
    exercises: [
      { name: 'Jumping Jacks', work_seconds: 40, rest_seconds: 20, rounds: 5 },
      { name: 'Push-ups', work_seconds: 40, rest_seconds: 20, rounds: 5 },
      { name: 'Squat Jumps', work_seconds: 40, rest_seconds: 20, rounds: 5 },
      { name: 'Plank Hold', work_seconds: 40, rest_seconds: 20, rounds: 5 },
    ],
  },
  {
    name: 'Pyramide Infernale', type: 'hiit', duration_min: 18, calories_per_min: 11,
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
    name: 'Cardio Boxing', type: 'hiit', duration_min: 15, calories_per_min: 10,
    exercises: [
      { name: 'Jab-Cross combos', work_seconds: 30, rest_seconds: 15, rounds: 6 },
      { name: 'Uppercuts rapides', work_seconds: 30, rest_seconds: 15, rounds: 6 },
      { name: 'Esquives + crochets', work_seconds: 30, rest_seconds: 15, rounds: 6 },
      { name: 'Combos libres', work_seconds: 30, rest_seconds: 15, rounds: 6 },
    ],
  },
  {
    name: 'Core HIIT', type: 'hiit', duration_min: 12, calories_per_min: 9,
    exercises: [
      { name: 'Plank to Push-up', work_seconds: 30, rest_seconds: 15, rounds: 4 },
      { name: 'Russian Twists', work_seconds: 30, rest_seconds: 15, rounds: 4 },
      { name: 'Bicycle Crunches', work_seconds: 30, rest_seconds: 15, rounds: 4 },
      { name: 'Leg Raises', work_seconds: 30, rest_seconds: 15, rounds: 4 },
    ],
  },
  {
    name: '30/30 Classique', type: 'hiit', duration_min: 20, calories_per_min: 10,
    exercises: [
      { name: 'Jumping Lunges', work_seconds: 30, rest_seconds: 30, rounds: 5 },
      { name: 'Burpees', work_seconds: 30, rest_seconds: 30, rounds: 5 },
      { name: 'High Knees', work_seconds: 30, rest_seconds: 30, rounds: 5 },
      { name: 'Squat Thrusts', work_seconds: 30, rest_seconds: 30, rounds: 5 },
    ],
  },
  {
    name: 'EMOM 20 min', type: 'hiit', duration_min: 20, calories_per_min: 9,
    exercises: [
      { name: '10 Burpees (min impaire)', work_seconds: 60, rest_seconds: 0, rounds: 10 },
      { name: '15 Squats (min paire)', work_seconds: 60, rest_seconds: 0, rounds: 10 },
    ],
  },
]

export const LISS_WORKOUTS: CardioWorkout[] = [
  { name: 'Marche rapide', type: 'liss', duration_min: 45, calories_per_min: 6, notes: 'Rythme soutenu, 6-7 km/h. Idéal en extérieur ou sur tapis.' },
  { name: 'Vélo zone 2', type: 'liss', duration_min: 40, calories_per_min: 7, notes: 'Résistance modérée, FC 120-140 bpm.' },
  { name: 'Rameur steady', type: 'liss', duration_min: 30, calories_per_min: 8, notes: 'Cadence régulière 20-24 coups/min.' },
  { name: 'Elliptique', type: 'liss', duration_min: 35, calories_per_min: 6, notes: 'Résistance moyenne, mouvement fluide.' },
  { name: 'Natation', type: 'liss', duration_min: 30, calories_per_min: 8, notes: 'Crawl ou brasse à rythme modéré.' },
  { name: 'Vélo + Incline Walk', type: 'liss', duration_min: 40, calories_per_min: 7, notes: '20 min vélo + 20 min marche inclinée 10-12% à 5 km/h.' },
]

export function estimateCalories(workout: CardioWorkout, weightKg: number): number {
  return Math.round(workout.calories_per_min * workout.duration_min * (weightKg / 75))
}
