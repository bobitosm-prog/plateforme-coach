import { useState } from 'react'
import { canonicalExerciseName } from '@/lib/training/exercise-identity'

export interface ExerciseInfoData {
  name: string
  muscle_group: string
  equipment: string
  instructions: string
  tips: string
  description: string
  video_url: string
  gif_url: string
  name_en?: string | null
  name_de?: string | null
  description_en?: string | null
  description_de?: string | null
  tips_en?: string | null
  tips_de?: string | null
}

const FIELDS = 'name, muscle_group, equipment, instructions, tips, description, video_url, gif_url, variant_group, name_en, name_de, description_en, description_de, tips_en, tips_de'

export function useExerciseInfo(supabase: any) {
  const [exerciseInfo, setExerciseInfo] = useState<ExerciseInfoData | null>(null)

  async function loadExerciseInfo(exerciseName: string) {
    // A similar name or variant group may use different equipment or a different movement.
    const { data } = await supabase
      .from('exercises_db')
      .select(FIELDS)
      .ilike('name', canonicalExerciseName(exerciseName))
      .limit(1)
      .maybeSingle()

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
