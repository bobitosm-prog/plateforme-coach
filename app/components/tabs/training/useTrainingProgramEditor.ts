'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import type { TrainingTabProps } from '../TrainingTabController'
import type { TrainingExerciseVariant } from './modals/TrainingVariantModal'
import type { LegacyTrainingDay, LegacyTrainingExercise, LegacyTrainingProgram } from './training-tab-types'

interface UseTrainingProgramEditorOptions {
  supabase: TrainingTabProps['supabase']
  activeProgram: LegacyTrainingProgram | null
  setActiveProgram: (program: LegacyTrainingProgram | null) => void
  updatedMessage: string
}

export function useTrainingProgramEditor({ supabase, activeProgram, setActiveProgram, updatedMessage }: UseTrainingProgramEditorOptions) {
  const [editMode, setEditMode] = useState(false)
  const [editedDays, setEditedDays] = useState<LegacyTrainingDay[] | null>(null)
  const [variantPopup, setVariantPopup] = useState<{ dayIdx: number; exIdx: number; variants: TrainingExerciseVariant[] } | null>(null)

  function startEditMode() {
    if (!activeProgram?.days) return
    setEditedDays(structuredClone(activeProgram.days))
    setEditMode(true)
  }

  function editExField(dayIndex: number, exerciseIndex: number, field: string, value: string | number) {
    setEditedDays(previous => updateDays(previous, dayIndex, exercises => exercises.map((exercise, index) => index === exerciseIndex ? { ...exercise, [field]: value } : exercise)))
  }

  function editRemoveEx(dayIndex: number, exerciseIndex: number) {
    setEditedDays(previous => updateDays(previous, dayIndex, exercises => exercises.filter((_, index) => index !== exerciseIndex)))
  }

  function editMoveEx(dayIndex: number, exerciseIndex: number, direction: -1 | 1) {
    setEditedDays(previous => updateDays(previous, dayIndex, exercises => {
      const destination = exerciseIndex + direction
      if (destination < 0 || destination >= exercises.length) return exercises
      const next = [...exercises]
      ;[next[exerciseIndex], next[destination]] = [next[destination], next[exerciseIndex]]
      return next
    }))
  }

  function editAddEx(dayIndex: number, exercise: LegacyTrainingExercise) {
    const name = exercise.name || exercise.exercise_name || exercise.custom_name || ''
    setEditedDays(previous => updateDays(previous, dayIndex, exercises => [...exercises, {
      exercise_name: name, custom_name: name, name, sets: 3, reps: 12, rest_seconds: 90,
      muscle_group: exercise.muscle_group || '',
    }]))
  }

  async function loadEditVariants(exerciseName: string, dayIdx: number, exIdx: number) {
    const { data: current } = await supabase.from('exercises_db').select('variant_group').ilike('name', exerciseName).limit(1).maybeSingle()
    const query = current?.variant_group
      ? supabase.from('exercises_db').select('name, equipment, muscle_group').eq('variant_group', current.variant_group).neq('name', exerciseName).order('equipment').limit(10)
      : supabase.from('exercises_db').select('name, equipment, muscle_group').ilike('name', `%${exerciseName.split(' ').slice(0, 2).join(' ')}%`).neq('name', exerciseName).limit(8)
    const { data } = await query
    setVariantPopup({ dayIdx, exIdx, variants: data || [] })
  }

  function selectEditVariant(variant: TrainingExerciseVariant) {
    if (!variantPopup || !variant.name) return
    const variantName = variant.name
    setEditedDays(previous => updateDays(previous, variantPopup.dayIdx, exercises => exercises.map((exercise, index) => index === variantPopup.exIdx ? {
      ...exercise, exercise_name: variantName, custom_name: variantName, name: variantName,
    } : exercise)))
    setVariantPopup(null)
  }

  async function saveEditedProgram() {
    if (!editedDays || !activeProgram?.id) return
    await supabase.from('custom_programs').update({ days: editedDays, updated_at: new Date().toISOString() }).eq('id', activeProgram.id)
    setActiveProgram({ ...activeProgram, days: editedDays })
    setEditMode(false)
    setEditedDays(null)
    toast.success(updatedMessage)
  }

  return {
    editMode, setEditMode, editedDays, setEditedDays, variantPopup, setVariantPopup, startEditMode,
    editExField, editRemoveEx, editMoveEx, editAddEx, loadEditVariants, selectEditVariant, saveEditedProgram,
  }
}

function updateDays(
  days: LegacyTrainingDay[] | null,
  dayIndex: number,
  updateExercises: (exercises: LegacyTrainingExercise[]) => LegacyTrainingExercise[],
) {
  if (!days?.[dayIndex]) return days
  return days.map((day, index) => index === dayIndex ? { ...day, exercises: updateExercises(day.exercises || []) } : day)
}
