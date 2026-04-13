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

const FIELDS = 'name, muscle_group, equipment, instructions, tips, description, video_url, gif_url, variant_group'

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

    // If no video_url but has variant_group, try siblings
    if (data && !data.video_url && data.variant_group) {
      const { data: sibling } = await supabase
        .from('exercises_db')
        .select('video_url')
        .eq('variant_group', data.variant_group)
        .not('video_url', 'is', null)
        .limit(1)
        .maybeSingle()
      if (sibling?.video_url) data.video_url = sibling.video_url
    }

    console.log('[ExerciseInfo]', exerciseName, '→ video_url:', data?.video_url, '| matched:', data?.name)

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
