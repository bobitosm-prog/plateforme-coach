'use client'

import { useEffect, useState } from 'react'
import { groupWorkoutSets, type LegacyWorkoutSession, type WorkoutExerciseDetail } from '../../../../lib/training/session-history'
import type { TrainingTabProps } from '../TrainingTabController'

interface UseTrainingSessionHistoryOptions {
  supabase: TrainingTabProps['supabase']
  userId?: string
  refreshKey: boolean
}

export function useTrainingSessionHistory({ supabase, userId, refreshKey }: UseTrainingSessionHistoryOptions) {
  const [workoutHistory, setWorkoutHistory] = useState<LegacyWorkoutSession[]>([])
  const [selectedWorkout, setSelectedWorkout] = useState<LegacyWorkoutSession | null>(null)
  const [workoutDetail, setWorkoutDetail] = useState<WorkoutExerciseDetail[]>([])
  const [loadingDetail, setLoadingDetail] = useState(false)

  useEffect(() => {
    if (!userId) return
    supabase.from('workout_sessions').select('id, name, completed, date, duration_minutes, notes, created_at, muscles_worked')
      .eq('user_id', userId).eq('completed', true).order('created_at', { ascending: false }).limit(50)
      .then(({ data }: { data?: LegacyWorkoutSession[] | null }) => setWorkoutHistory(data || []))
  }, [refreshKey, supabase, userId])

  async function openWorkoutDetail(workout: LegacyWorkoutSession) {
    setSelectedWorkout(workout)
    setLoadingDetail(true)
    const { data } = await supabase.from('workout_sets')
      .select('exercise_name, set_number, weight, reps, completed')
      .eq('session_id', workout.id)
      .order('exercise_name')
      .order('set_number', { ascending: true })
    setWorkoutDetail(groupWorkoutSets(data || []).detail)
    setLoadingDetail(false)
  }

  return {
    workoutHistory, selectedWorkout, setSelectedWorkout, workoutDetail, loadingDetail, openWorkoutDetail,
  }
}
