import { useState } from 'react'

export interface ExerciseInfoData {
  name: string
  muscle_group: string
  equipment: string
  instructions: string
  tips: string
  description: string
  video_url: string
  gif_url: string
}

export function useExerciseInfo(supabase: any) {
  const [exerciseInfo, setExerciseInfo] = useState<ExerciseInfoData | null>(null)

  async function loadExerciseInfo(exerciseName: string) {
    const { data } = await supabase
      .from('exercises_db')
      .select('name, muscle_group, equipment, instructions, tips, description, video_url, gif_url')
      .ilike('name', exerciseName)
      .limit(1)
      .maybeSingle()

    console.log('[ExerciseInfo]', exerciseName, '→ video_url:', data?.video_url, '| gif_url:', data?.gif_url)

    setExerciseInfo(data || {
      name: exerciseName,
      muscle_group: '',
      equipment: '',
      instructions: '',
      tips: '',
      description: '',
      video_url: '',
      gif_url: '',
    })
  }

  return { exerciseInfo, setExerciseInfo, loadExerciseInfo }
}
