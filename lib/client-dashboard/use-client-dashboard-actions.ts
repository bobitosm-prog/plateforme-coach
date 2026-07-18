'use client'

import type { ChangeEvent, Dispatch, SetStateAction } from 'react'
import type { Session } from '@supabase/supabase-js'
import { toast } from 'sonner'
import { toDateStr } from '@/lib/schedule-utils'
import { updateProfile } from '@/lib/profile-service'
import { checkAndUnlockBadges, type Badge } from '@/lib/check-badges'
import { addXP, updateStreak } from '@/lib/gamification'
import { PERSONAL_PROGRAM_PROJECTION } from '@/lib/repositories/training'
import type { DatabaseClient, Tables } from '@/lib/supabase/types'
import { clearActiveWorkout, writeActiveWorkout } from '@/lib/training/workout-session-storage'

type ProfileRow = Tables<'profiles'>
type ProgressPhotoRow = Tables<'progress_photos'>
const BADGE_PROJECTION = 'category,condition_type,condition_value,description,icon,id,name,sort_order,xp_reward' as const

interface WorkoutSetInput {
  reps?: number | string
  weight?: number | string
  rir?: number | null
}

interface WorkoutExerciseInput {
  name: string
  muscle?: string
  exerciseId?: string | null
  sets?: WorkoutSetInput[]
  setsTarget?: number
}

interface FinishedWorkoutInput {
  exercises: WorkoutExerciseInput[]
  duration: number
  completedSets: number
  totalSets: number
  totalVolume: number
}

export interface WorkoutSessionDraft {
  name: string
  exercises: unknown[]
  startedAt?: string
  weekdayKey?: string
}

interface UseClientDashboardActionsOptions {
  supabase: DatabaseClient
  session: Session | null
  profile: ProfileRow | null
  coachProgram: unknown
  workoutSession: WorkoutSessionDraft | null
  setWorkoutSession: Dispatch<SetStateAction<WorkoutSessionDraft | null>>
  setModal(value: string | null): void
  setPhotoUploading(value: boolean): void
  setProgressPhotos: Dispatch<SetStateAction<ProgressPhotoRow[]>>
  setProfile: Dispatch<SetStateAction<ProfileRow | null>>
  getProgramAssignment(): { clientProgramId: string | null; coachOfProgramId: string | null }
  fetchAll(forceRefresh?: boolean): Promise<void>
  checkForPR(exerciseName: string, weight: number, reps: number): Promise<{ newPR: boolean; exercise?: string; value?: number }>
  regenerateWeekSchedule(userId: string, profile: ProfileRow, program: unknown): Promise<void>
  updateReminderSettings(
    client: DatabaseClient,
    userId: string,
    settings: { preferred_training_time?: string; reminder_enabled?: boolean; reminder_minutes_before?: number },
    setProfile: Dispatch<SetStateAction<ProfileRow | null>>,
  ): Promise<void>
  updateRirSettings(
    client: DatabaseClient,
    userId: string,
    settings: { rir_tracking_enabled?: boolean; rir_scale_advanced?: boolean },
    setProfile: Dispatch<SetStateAction<ProfileRow | null>>,
  ): Promise<void>
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Inconnue'
}

function coachToDays(normalized: unknown): { days: unknown[] } | null {
  if (!normalized || typeof normalized !== 'object') return null
  const program = normalized as Record<string, unknown>
  const weekdays = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche']
  return { days: weekdays.map(day => program[day] ?? { is_rest: true, name: '', exercises: [] }) }
}

export function useClientDashboardActions(options: UseClientDashboardActionsOptions) {
  const {
    supabase, session, profile, coachProgram, workoutSession, setWorkoutSession, setModal,
    setPhotoUploading, setProgressPhotos, setProfile, getProgramAssignment,
    fetchAll, checkForPR, regenerateWeekSchedule: regenerateSchedule,
    updateReminderSettings: updateReminders, updateRirSettings: updateRir,
  } = options

  async function startProgramWorkout(day: unknown, exercises: unknown[], weekdayKey?: string) {
    const record = day && typeof day === 'object' ? day as Record<string, unknown> : {}
    const name = typeof record.day_name === 'string'
      ? record.day_name
      : typeof record.name === 'string' ? record.name : 'Séance'
    const draft = { name, exercises, startedAt: new Date().toISOString(), weekdayKey }
    setWorkoutSession(draft)
    try { writeActiveWorkout(localStorage, draft) } catch { /* unavailable */ }
  }

  async function onFinishWorkout(data: FinishedWorkoutInput): Promise<{
    newPRs: { exercise: string; value: number }[]
    newBadges: Badge[]
  }> {
    const newPRs: { exercise: string; value: number }[] = []
    const newBadges: Badge[] = []
    if (!session) return { newPRs, newBadges }
    try { clearActiveWorkout(localStorage) } catch { /* unavailable */ }
    const musclesWorked = [...new Set(data.exercises.map(exercise => exercise.muscle).filter((value): value is string => !!value))]
    const { data: savedSession } = await supabase.from('workout_sessions').insert({
      user_id: session.user.id,
      name: workoutSession?.name,
      completed: true,
      duration_minutes: Math.round(data.duration / 60000),
      notes: `${data.completedSets}/${data.totalSets} sets · ${Math.round(data.totalVolume)} kg volume`,
      muscles_worked: musclesWorked.length > 0 ? musclesWorked : null,
    }).select().single()

    if (savedSession) {
      const completedAt = new Date().toISOString()
      await supabase.from('scheduled_sessions').update({ completed: true, completed_at: completedAt })
        .eq('user_id', session.user.id).eq('scheduled_date', toDateStr(new Date())).eq('completed', false)
      try {
        await addXP(session.user.id, 100, supabase)
        await updateStreak(session.user.id, supabase)
      } catch (error) { console.error('[gamification] fin de séance:', error) }

      try {
        for (const exercise of data.exercises) {
          const valid = (exercise.sets ?? []).filter(set => Number(set.weight) > 0 && Number(set.reps) > 0)
          if (valid.length === 0) continue
          const best = valid.reduce((left, right) => {
            const leftScore = Number(left.weight) * (1 + Number(left.reps) / 30)
            const rightScore = Number(right.weight) * (1 + Number(right.reps) / 30)
            return leftScore >= rightScore ? left : right
          })
          const result = await checkForPR(exercise.name, Number(best.weight), Number(best.reps))
          if (result.newPR && result.exercise && result.value) newPRs.push({ exercise: result.exercise, value: result.value })
        }
      } catch (error) { console.error('[PR detection] fin de séance:', error) }

      const setsToInsert = data.exercises.flatMap(exercise =>
        (exercise.sets ?? []).map((set, index) => ({
          session_id: savedSession.id,
          user_id: session.user.id,
          exercise_name: exercise.name,
          exercise_id: exercise.exerciseId ?? null,
          set_number: index + 1,
          reps: Number(set.reps) || 0,
          weight: Number(set.weight) || 0,
          completed: true,
          rir: set.rir ?? null,
        })),
      )
      if (setsToInsert.length > 0) await supabase.from('workout_sets').insert(setsToInsert)

      try {
        const { newlyUnlockedIds } = await checkAndUnlockBadges(session.user.id, supabase)
        if (newlyUnlockedIds.length > 0) {
          const { data: badges } = await supabase.from('badges').select(BADGE_PROJECTION).in('id', newlyUnlockedIds)
          if (badges) newBadges.push(...badges as unknown as Badge[])
        }
      } catch (error) { console.error('[badges] fin de séance:', error) }

      for (const exercise of data.exercises) {
        const sets = exercise.sets ?? []
        if (sets.length === 0 || (exercise.setsTarget && sets.length < exercise.setsTarget)) continue
        const reps = Number(sets[0].reps) || 0
        const weight = Number(sets[0].weight) || 0
        if (reps <= 0 || weight <= 0) continue
        if (!sets.every(set => Number(set.reps) === reps) || !sets.every(set => Number(set.weight) === weight)) continue
        void fetch('/api/suggest-overload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            exerciseName: exercise.name, currentWeight: weight, currentReps: reps,
            setsCompleted: sets.length, setsTarget: exercise.setsTarget || sets.length,
            sessionId: savedSession.id,
          }),
        }).catch(error => console.warn('[overload] fetch error:', errorMessage(error)))
      }
    }

    await supabase.from('scheduled_sessions').update({ completed: true, completed_at: new Date().toISOString() })
      .eq('user_id', session.user.id).eq('scheduled_date', toDateStr(new Date())).eq('completed', false)
    await updateProfile(session.user.id, { last_workout_at: new Date().toISOString() }, supabase)
    const assignment = getProgramAssignment()
    if (assignment.clientProgramId && workoutSession?.weekdayKey) {
      const weekdays = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche']
      const index = weekdays.indexOf(workoutSession.weekdayKey)
      const { error } = await supabase.from('completed_sessions').insert({
        client_id: session.user.id,
        coach_id: assignment.coachOfProgramId,
        program_id: assignment.clientProgramId,
        session_index: index >= 0 ? index : 0,
        session_name: workoutSession.name,
        duration_minutes: data.duration ? Math.round(data.duration / 60000) : null,
      })
      if (error) console.error('Error tracking completed_sessions:', error)
    }
    toast.success('Séance terminée ! Bien joué 💪')
    void fetchAll(true)
    return { newPRs, newBadges }
  }

  async function saveWeight(value: number, date: string) {
    if (!session) return
    await supabase.from('weight_logs').upsert(
      { user_id: session.user.id, poids: value, date },
      { onConflict: 'user_id,date' },
    )
    await updateProfile(session.user.id, {
      current_weight: value,
      ...(profile?.start_weight ? {} : { start_weight: value }),
    }, supabase)
    toast.success('Poids enregistré !')
    setModal(null)
    void fetchAll(true)
  }

  async function saveMeasurements(data: Record<string, number>, date: string) {
    if (!session) return
    await supabase.from('body_measurements').insert({ user_id: session.user.id, date, ...data })
    toast.success('Mensurations enregistrées !')
    setModal(null)
    void fetchAll(true)
  }

  async function uploadAvatar(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file || !session) return
    try {
      const path = `${session.user.id}/avatar.${file.name.split('.').pop() || 'jpg'}`
      await supabase.storage.from('avatars').remove([path]).catch(() => undefined)
      const { error: uploadError } = await supabase.storage.from('avatars')
        .upload(path, file, { upsert: true, contentType: file.type })
      if (uploadError) { toast.error(`Erreur upload: ${uploadError.message}`); return }
      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path)
      const { error: updateError } = await updateProfile(session.user.id, { avatar_url: publicUrl }, supabase)
      if (updateError) { toast.error(`Erreur sauvegarde: ${updateError.message}`); return }
      toast.success('Photo de profil mise à jour !')
      void fetchAll(true)
    } catch (error) {
      toast.error(`Erreur: ${errorMessage(error)}`)
    }
  }

  async function uploadProgressPhoto(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file || !session) return
    setPhotoUploading(true)
    const path = `${session.user.id}/${Date.now()}.${file.name.split('.').pop()}`
    const { error } = await supabase.storage.from('progress-photos').upload(path, file)
    if (error) { toast.error("Erreur lors de l'upload"); setPhotoUploading(false); return }
    await supabase.from('progress_photos').insert({ user_id: session.user.id, photo_url: path, view_type: 'front' })
    toast.success('Photo ajoutée !')
    setPhotoUploading(false)
    void fetchAll(true)
  }

  async function deletePhoto(photo: ProgressPhotoRow) {
    await supabase.storage.from('progress-photos').remove([photo.photo_url])
    await supabase.from('progress_photos').delete().eq('id', photo.id)
    setProgressPhotos(previous => previous.filter(item => item.id !== photo.id))
  }

  async function handleSubscribe(planId?: string) {
    try {
      const response = await fetch('/api/stripe/checkout', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId: planId || 'client_monthly' }),
      })
      if (!response.ok) {
        const payload: unknown = await response.json().catch(() => null)
        const message = payload && typeof payload === 'object' && typeof (payload as { error?: unknown }).error === 'string'
          ? (payload as { error: string }).error
          : `Erreur serveur (${response.status})`
        throw new Error(message)
      }
      const payload: unknown = await response.json()
      const url = payload && typeof payload === 'object' ? (payload as { url?: unknown }).url : null
      if (typeof url === 'string') window.location.href = url
      else throw new Error('Lien de paiement indisponible')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Impossible de procéder au paiement. Réessaye.')
    }
  }

  async function regenerateWeekSchedule() {
    if (!session || !profile) return
    const { data: customProgram } = await supabase.from('custom_programs').select(PERSONAL_PROGRAM_PROJECTION)
      .eq('user_id', session.user.id).eq('is_active', true).maybeSingle()
    return regenerateSchedule(session.user.id, profile, customProgram ?? coachToDays(coachProgram))
  }

  const updateReminderSettings = async (settings: { preferred_training_time?: string; reminder_enabled?: boolean; reminder_minutes_before?: number }) => {
    if (session) await updateReminders(supabase, session.user.id, settings, setProfile)
  }

  const updateRirSettings = async (settings: { rir_tracking_enabled?: boolean; rir_scale_advanced?: boolean }) => {
    if (session) await updateRir(supabase, session.user.id, settings, setProfile)
  }

  return {
    startProgramWorkout, onFinishWorkout, saveWeight, saveMeasurements,
    uploadAvatar, uploadProgressPhoto, deletePhoto, handleSubscribe,
    regenerateWeekSchedule, updateReminderSettings, updateRirSettings,
  }
}
