import { useState } from 'react'

export interface ExerciseInfoData {
  name: string
  muscle_group: string
  equipment: string
  instructions: string
  tips: string
}

export function useExerciseInfo(supabase: any) {
  const [exerciseInfo, setExerciseInfo] = useState<ExerciseInfoData | null>(null)

  async function loadExerciseInfo(exerciseName: string) {
    const { data } = await supabase
      .from('exercises_db')
      .select('name, muscle_group, equipment, instructions, tips')
      .ilike('name', exerciseName)
      .limit(1)
      .maybeSingle()

    setExerciseInfo(data || {
      name: exerciseName,
      muscle_group: '',
      equipment: '',
      instructions: 'Instructions non disponibles pour cet exercice.',
      tips: '',
    })
  }

  return { exerciseInfo, setExerciseInfo, loadExerciseInfo }
}
