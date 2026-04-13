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

const FIELDS = 'name, muscle_group, equipment, instructions, tips, description, video_url, gif_url'

export function useExerciseInfo(supabase: any) {
  const [exerciseInfo, setExerciseInfo] = useState<ExerciseInfoData | null>(null)

  async function loadExerciseInfo(exerciseName: string) {
    // Try exact match first, then fuzzy
    let { data } = await supabase
      .from('exercises_db')
      .select(FIELDS)
      .ilike('name', exerciseName)
      .limit(1)
      .maybeSingle()

    if (!data) {
      const fuzzy = await supabase
        .from('exercises_db')
        .select(FIELDS)
        .ilike('name', `%${exerciseName}%`)
        .limit(1)
        .maybeSingle()
      data = fuzzy.data
    }

    console.log('[ExerciseInfo]', exerciseName, '→ video_url:', data?.video_url, '| gif_url:', data?.gif_url, '| matched:', data?.name)

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
