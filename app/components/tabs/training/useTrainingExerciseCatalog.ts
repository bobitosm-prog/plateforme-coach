'use client'

import { useEffect, useRef, useState } from 'react'
import type { TrainingTabProps } from '../TrainingTabController'
import type { LegacyTrainingExercise } from './training-tab-types'

export function useTrainingExerciseCatalog(supabase: TrainingTabProps['supabase']) {
  const [showExDbModal, setShowExDbModal] = useState(false)
  const [exerciseDetail, setExerciseDetail] = useState<LegacyTrainingExercise | null>(null)
  const [exercisesCache, setExercisesCache] = useState<LegacyTrainingExercise[]>([])
  const [showAddExercise, setShowAddExercise] = useState(false)
  const [exerciseSearchQ, setExerciseSearchQ] = useState('')
  const [exerciseSearchResults, setExerciseSearchResults] = useState<LegacyTrainingExercise[]>([])
  const cacheLoaded = useRef(false)

  useEffect(() => {
    if (cacheLoaded.current) return
    cacheLoaded.current = true
    supabase.from('exercises_db').select('*').order('name').limit(200)
      .then(({ data }: { data?: LegacyTrainingExercise[] | null }) => setExercisesCache(data || []))
  }, [supabase])

  useEffect(() => {
    if (!showAddExercise) return
    if (exerciseSearchQ.length < 1) {
      supabase.from('exercises_db').select('id, name, muscle_group').order('name').limit(50)
        .then(({ data }: { data?: LegacyTrainingExercise[] | null }) => setExerciseSearchResults(data || []))
      return
    }
    const timeout = setTimeout(async () => {
      const { data } = await supabase.from('exercises_db').select('id, name, muscle_group').ilike('name', `%${exerciseSearchQ}%`).limit(30)
      setExerciseSearchResults(data || [])
    }, 200)
    return () => clearTimeout(timeout)
  }, [exerciseSearchQ, showAddExercise, supabase])

  return {
    showExDbModal, setShowExDbModal, exerciseDetail, setExerciseDetail, exercisesCache,
    showAddExercise, setShowAddExercise, exerciseSearchQ, setExerciseSearchQ, exerciseSearchResults,
  }
}
