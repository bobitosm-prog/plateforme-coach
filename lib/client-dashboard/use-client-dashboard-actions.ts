'use client'

import type { ChangeEvent, Dispatch, SetStateAction } from 'react'
import type { Session } from '@supabase/supabase-js'
import { toast } from 'sonner'
import { updateProfile } from '@/lib/profile-service'
import { checkAndUnlockBadges, type Badge } from '@/lib/check-badges'
import { addXP, updateStreak } from '@/lib/gamification'
import { PERSONAL_PROGRAM_PROJECTION } from '@/lib/repositories/training'
import type { DatabaseClient, Tables } from '@/lib/supabase/types'
import { writeActiveWorkout } from '@/lib/training/workout-session-storage'
import { createLegacyWorkoutLaunch } from '@/lib/training/workout-session-model'
import { createSupabaseWorkoutPersistencePort, createWorkoutLocalStoragePort, persistDetailedWorkout } from '@/lib/training/workout-persistence'

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
    const draft = createLegacyWorkoutLaunch({ name, exercises, weekdayKey }, { now: () => new Date() })
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
    const persistenceResult = await persistDetailedWorkout({
      userId: session.user.id,
      workoutName: workoutSession?.name,
      weekdayKey: workoutSession?.weekdayKey,
      exercises: data.exercises,
      durationMs: data.duration,
      completedSets: data.completedSets,
      totalSets: data.totalSets,
      totalVolume: data.totalVolume,
      assignment: getProgramAssignment(),
    }, {
      local: createWorkoutLocalStoragePort(localStorage),
      persistence: createSupabaseWorkoutPersistencePort(supabase),
      clock: { now: () => new Date() },
      hooks: {
        async afterSessionCreated() {
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

        },
        async afterSetsAttempted(savedSessionId) {
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
            sessionId: savedSessionId,
          }),
        }).catch(error => console.warn('[overload] fetch error:', errorMessage(error)))
      }
        },
      },
    })
    if (!persistenceResult.ok && 'issues' in persistenceResult && persistenceResult.issues.includes('profile_sync_failed')) {
      throw new Error('WORKOUT_PROFILE_SYNC_FAILED')
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
