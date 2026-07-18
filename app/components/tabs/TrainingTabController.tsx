'use client'

import { useEffect, useRef, useState } from 'react'
import { type Locale } from 'date-fns'
import { fr as frLocale } from 'date-fns/locale/fr'
import { enUS } from 'date-fns/locale/en-US'
import { de as deLocale } from 'date-fns/locale/de'
import { useLocale, useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { addXP, updateStreak } from '../../../lib/gamification'
import { findExerciseMatch } from '../../../lib/exercise-matching'
import { JS_DAYS_FR, titleStyle } from '../../../lib/design-tokens'
import { buildWeekSessions, type ScheduledSession, toDateStr } from '../../../lib/schedule-utils'
import { resolveActiveProgramDay, selectActivePersonalProgram } from '../../../lib/training/active-program-day'
import { padTo7Days } from '../training/ProgramBuilder'
import { useExerciseInfo } from '../../hooks/useExerciseInfo'
import type { ImportResult } from '../../../lib/program-excel'
import { completedWorkoutDateKeys } from '../../../lib/training/session-history'
import { createSupabaseWorkoutPersistencePort, persistQuickWorkout } from '../../../lib/training/workout-persistence'
import TrainingTabView, { type TrainingTabRuntime } from './TrainingTabView'
import { useTrainingWorkoutTimer } from './training/useTrainingWorkoutTimer'
import { useTrainingSessionHistory } from './training/useTrainingSessionHistory'
import { useTrainingProgramEditor } from './training/useTrainingProgramEditor'
import { useTrainingExerciseCatalog } from './training/useTrainingExerciseCatalog'

const DATE_LOCALES: Record<string, Locale> = { fr: frLocale, en: enUS, de: deLocale }

export interface TrainingTabProps {
  supabase: any
  session: any
  profile?: any
  coachProgram: any
  todayKey: string
  todaySessionDone: boolean
  startProgramWorkout: (day: any, exercises: any[], weekdayKey?: string) => void
  fetchAll: () => Promise<void>
  scheduledSessions: ScheduledSession[]
  calendarSelectedDate: Date
  setCalendarSelectedDate: (d: Date) => void
  markSessionCompleted: (id: string) => Promise<void>
  checkForPR: (exerciseName: string, weight: number, reps: number) => Promise<{ newPR: boolean; exercise?: string; value?: number; previous?: number }>
  lastCompletedByIndex?: Map<number, string>
  setModal: (m: string | null) => void
}

export default function TrainingTabController({
  supabase, session, profile, coachProgram, todayKey, todaySessionDone, startProgramWorkout, fetchAll,
  scheduledSessions, calendarSelectedDate, setCalendarSelectedDate, markSessionCompleted, checkForPR,
  lastCompletedByIndex, setModal,
}: TrainingTabProps) {
  const t = useTranslations('training_tab')
  const locale = useLocale() as 'fr' | 'en' | 'de'
  const dateLocale = DATE_LOCALES[locale] || frLocale
  const T = titleStyle
  // Source de vérité : profiles.subscription_type (pas coach_clients.invited_by_coach)
  const aiAllowed = profile?.subscription_type !== 'invited'
  const { exerciseInfo, setExerciseInfo, loadExerciseInfo } = useExerciseInfo(supabase)
  const [trainingDay, setTrainingDay]   = useState<string>(() => JS_DAYS_FR[new Date().getDay()])
  const [showProgramManager, setShowProgramManager] = useState(false)
  const [weekOffset, setWeekOffset] = useState(0)
  const [weekDir, setWeekDir] = useState(0)
  const calTouchStart = useRef<number | null>(null)
  const [expandedProgram, setExpandedProgram] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [videoExercise, setVideoExercise]     = useState<string | null>(null)
  const [customPrograms, setCustomPrograms] = useState<any[]>([])
  const [showProgramBuilder, setShowProgramBuilder] = useState(false)
  const [activeCustomProgram, setActiveCustomProgram] = useState<any>(null)
  const [editingProgram, setEditingProgram] = useState<any>(null)
  // Feature: add exercise in session
  const [addedExercises, setAddedExercises] = useState<any[]>([])
  // Feature: save choice popup
  const {
    showExDbModal, setShowExDbModal, exerciseDetail, setExerciseDetail, exercisesCache,
    showAddExercise, setShowAddExercise, exerciseSearchQ, setExerciseSearchQ, exerciseSearchResults,
  } = useTrainingExerciseCatalog(supabase)
  const [showSaveChoice, setShowSaveChoice] = useState(false)
  // Workout detail
  // Program edit mode
  const [techniqueTooltip, setTechniqueTooltip] = useState<string | null>(null)
  const [importPreview, setImportPreview] = useState<ImportResult['program'] | null>(null)
  const [importSkipped, setImportSkipped] = useState<string[]>([])
  const [importName, setImportName] = useState('')
  const importFileRef = useRef<HTMLInputElement>(null)
  // Start program modal: holds the program to activate/schedule + optional import data
  const [startModalProgram, setStartModalProgram] = useState<any>(null)
  const [startModalImportData, setStartModalImportData] = useState<any>(null)
  const [scheduledBannerDismissed, setScheduledBannerDismissed] = useState(false)
  const [showSessionModal, setShowSessionModal] = useState(false)

  // Use local date (not UTC) to avoid timezone issues
  const _now = new Date()
  const todayStr = `${_now.getFullYear()}-${String(_now.getMonth() + 1).padStart(2, '0')}-${String(_now.getDate()).padStart(2, '0')}`
  const trainingIsToday  = trainingDay === todayKey

  const {
    completedSets, setCompletedSets, setInputs, setSetInputs, workoutFinished, setWorkoutFinished,
    workoutStarted, setWorkoutStarted, activeRestExName, setActiveRestExName, restingSet, setRestingSet,
    restTimer, setRestTimer, restRunning, setRestRunning, elapsedSecs, setElapsedSecs,
    showTimerAlert, setShowTimerAlert, motivationalMsg, updateInput, addSet, toggleSet, cancelRest,
  } = useTrainingWorkoutTimer({ coachProgram, trainingDay, todayDateKey: todayStr })

  const { workoutHistory, selectedWorkout, setSelectedWorkout, workoutDetail, loadingDetail, openWorkoutDetail } = useTrainingSessionHistory({
    supabase, userId: session?.user?.id, refreshKey: todaySessionDone,
  })

  const {
    editMode, setEditMode, editedDays, setEditedDays, variantPopup, setVariantPopup, startEditMode,
    editExField, editRemoveEx, editMoveEx, editAddEx, loadEditVariants, selectEditVariant, saveEditedProgram,
  } = useTrainingProgramEditor({
    supabase, activeProgram: activeCustomProgram, setActiveProgram: setActiveCustomProgram,
    updatedMessage: t('calendar.toasts.updated'),
  })

  // Priorité legacy préservée : programme personnel actif > programme coach > aucun programme.
  const activeDayResolution = resolveActiveProgramDay({
    activePersonalProgram: activeCustomProgram,
    coachProgram,
    trainingDay,
  })
  const trainingDayData = activeDayResolution.day
  const resolvedExercises: any[] = activeDayResolution.exercises

  const trainingExercises: any[] = [...resolvedExercises, ...addedExercises].map((ex: any) => {
    const dbMatch = findExerciseMatch(exercisesCache, ex.name)
    if (!dbMatch) return ex
    return {
      ...ex,
      gif_url: dbMatch.gif_url ?? ex.gif_url,
      video_url: dbMatch.video_url ?? ex.video_url,
    }
  })

  const trainingTotalSets = trainingExercises.reduce((s: number, ex: any) => {
    const key = `moovx-sets-${todayStr}-${ex.name}`
    return s + (completedSets[key]?.length || Number(ex.sets) || 0)
  }, 0)
  const trainingDoneSets = trainingExercises.reduce((s: number, ex: any) => {
    const key = `moovx-sets-${todayStr}-${ex.name}`
    return s + (completedSets[key] || []).filter(Boolean).length
  }, 0)

  // Dates with a completed workout (used by calendar + HeroSessionCard)
  const doneDates = completedWorkoutDateKeys(workoutHistory)

  // Build week sessions from custom program (single source of truth for calendar)
  const weekSessions: any[] = (() => {
    if (!activeCustomProgram?.days?.length) return scheduledSessions
    const paddedDays = padTo7Days(activeCustomProgram.days)
    const today = new Date()
    const dow = today.getDay()
    const monday = new Date(today)
    monday.setDate(today.getDate() - (dow === 0 ? 6 : dow - 1))
    monday.setHours(0, 0, 0, 0)
    return paddedDays.map((day: any, i: number) => {
      const date = new Date(monday)
      date.setDate(monday.getDate() + i)
      const dateStr = toDateStr(date)
      const existing = scheduledSessions.find((s: any) => s.scheduled_date === dateStr)
      const isRest = day.is_rest
      return {
        id: existing?.id || `custom-${i}`,
        user_id: session?.user?.id || '',
        title: isRest ? t('calendar.rest') : (day.name || day.weekday || t('calendar.day', { num: i + 1 })),
        session_type: isRest ? 'rest' as const : 'custom' as const,
        scheduled_date: dateStr,
        scheduled_time: existing?.scheduled_time || '08:00',
        duration_min: existing?.duration_min || 60,
        completed: existing?.completed || false,
        completed_at: existing?.completed_at || null,
        reminder_enabled: false,
        reminder_minutes_before: 30,
        notes: null,
        created_at: existing?.created_at || new Date().toISOString(),
      }
    })
  })()

  // ── Load custom programs + auto-activate scheduled ──
  useEffect(() => {
    if (!session?.user?.id) return
    supabase.from('custom_programs').select('*').eq('user_id', session.user.id).order('updated_at', { ascending: false })
      .then(async ({ data }: any) => {
        const programs = data || []
        // Auto-activate scheduled programs that are due
        const today = toDateStr(new Date())
        const dueToStart = programs.filter((p: any) => p.scheduled && p.start_date && p.start_date <= today)
        if (dueToStart.length > 0) {
          await supabase.from('custom_programs').update({ is_active: false }).eq('user_id', session.user.id).eq('is_active', true)
          await supabase.from('custom_programs').update({ is_active: true, scheduled: false }).eq('id', dueToStart[0].id)
          dueToStart[0].is_active = true
          dueToStart[0].scheduled = false
          programs.forEach((p: any) => { if (p.id !== dueToStart[0].id) p.is_active = false })
          toast.success(t('programs.newProgramToast'))
        }
        setCustomPrograms(programs)
        const active = selectActivePersonalProgram(programs)
        if (active) setActiveCustomProgram(active)
      })
  }, [session?.user?.id])

  // Open start modal instead of activating directly
  function activateProgram(programId: string) {
    const prog = customPrograms.find(p => p.id === programId)
    if (prog) setStartModalProgram(prog)
  }

  async function doActivateProgram(programId: string) {
    await supabase.from('custom_programs').update({ is_active: false }).eq('user_id', session.user.id).neq('id', programId)
    const progToActivate = customPrograms.find(p => p.id === programId)
    const startDate = progToActivate?.start_date || toDateStr(new Date())
    const { error } = await supabase.from('custom_programs').update({ is_active: true, scheduled: false, start_date: startDate }).eq('id', programId).eq('user_id', session.user.id)
    if (error) { toast.error(t('calendar.toasts.error') + ': ' + error.message); return }
    const updated = customPrograms.map(p => ({ ...p, is_active: p.id === programId, scheduled: p.id === programId ? false : p.scheduled }))
    setCustomPrograms(updated)
    const activeProg = updated.find(p => p.id === programId) || null
    setActiveCustomProgram(activeProg)

    if (activeProg?.days) {
      try {
        const today = new Date()
        const dow = today.getDay()
        const monday = new Date(today)
        monday.setDate(today.getDate() - (dow === 0 ? 6 : dow - 1))
        monday.setHours(0, 0, 0, 0)
        const sunday = new Date(monday); sunday.setDate(monday.getDate() + 6)
        const mondayStr = toDateStr(monday)
        const sundayStr = toDateStr(sunday)
        await supabase.from('scheduled_sessions').delete().eq('user_id', session.user.id).gte('scheduled_date', mondayStr).lte('scheduled_date', sundayStr).eq('completed', false)
        const { data: remaining } = await supabase.from('scheduled_sessions')
          .select('scheduled_date, session_type').eq('user_id', session.user.id)
          .gte('scheduled_date', mondayStr).lte('scheduled_date', sundayStr)
        const remainingKeys = new Set((remaining || []).map((s: any) => `${s.scheduled_date}|${s.session_type}`))
        const newSessions = buildWeekSessions(session.user.id, monday, profile || {}, activeProg)
          .filter(s => !remainingKeys.has(`${s.scheduled_date}|${s.session_type}`))
        if (newSessions.length > 0) await supabase.from('scheduled_sessions').insert(newSessions)
      } catch (e) { console.error('[activateProgram] sync error:', e) }
    }
    toast.success(t('calendar.toasts.activated'))
  }

  async function scheduleProgram(programId: string, startDate: string) {
    await supabase.from('custom_programs').update({ scheduled: true, start_date: startDate, current_week: 1 }).eq('id', programId)
    const updated = customPrograms.map(p => p.id === programId ? { ...p, scheduled: true, start_date: startDate } : p)
    setCustomPrograms(updated)
    toast.success(t('calendar.toasts.scheduled', { date: new Date(startDate + 'T00:00:00').toLocaleDateString(locale, { day: 'numeric', month: 'long' }) }))
  }

  async function handleStartProgram(option: 'now' | 'monday' | 'custom', date?: string) {
    const prog = startModalProgram
    const importData = startModalImportData
    setStartModalProgram(null)
    setStartModalImportData(null)

    if (importData) {
      // Import flow: insert program first
      const insertData: any = { ...importData, user_id: session.user.id, is_active: false }
      if (option === 'now') { insertData.is_active = true; insertData.scheduled = false }
      else { insertData.scheduled = true; insertData.start_date = date; insertData.is_active = false }

      // Deactivate others if starting now
      if (option === 'now') {
        await supabase.from('custom_programs').update({ is_active: false }).eq('user_id', session.user.id).eq('is_active', true)
      }

      const { error } = await supabase.from('custom_programs').insert(insertData)
      if (error) { toast.error(t('calendar.toasts.error') + ': ' + error.message); return }
      if (option === 'now') toast.success(t('calendar.toasts.importedActive'))
      else toast.success(t('calendar.toasts.importedScheduled', { date: new Date(date + 'T00:00:00').toLocaleDateString(locale, { day: 'numeric', month: 'long' }) }))
      refreshPrograms()
      return
    }

    if (!prog?.id) return
    if (option === 'now') {
      await doActivateProgram(prog.id)
    } else {
      await scheduleProgram(prog.id, date!)
    }
  }

  async function deactivateProgram(programId: string) {
    await supabase.from('custom_programs').update({ is_active: false }).eq('id', programId).eq('user_id', session.user.id)
    const updated = customPrograms.map(p => p.id === programId ? { ...p, is_active: false } : p)
    setCustomPrograms(updated)
    setActiveCustomProgram(null)
    toast.success(t('calendar.toasts.deactivated'))
  }


  async function deleteProgram(programId: string) {
    await supabase.from('custom_programs').delete().eq('id', programId).eq('user_id', session.user.id)
    setCustomPrograms(prev => prev.filter(p => p.id !== programId))
    if (activeCustomProgram?.id === programId) setActiveCustomProgram(null)
    toast.success(t('calendar.toasts.deleted'))
  }

  function refreshPrograms() {
    supabase.from('custom_programs').select('*').eq('user_id', session.user.id).order('updated_at', { ascending: false })
      .then(({ data }: any) => {
        setCustomPrograms(data || [])
        const active = (data || []).find((p: any) => p.is_active)
        setActiveCustomProgram(active || null)
      })
  }
  // ── Helpers ──
  function fmtElapsed(s: number) {
    const h   = Math.floor(s / 3600)
    const m   = Math.floor((s % 3600) / 60)
    const sec = s % 60
    if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
    return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
  }

  function fmtRest(s: number) {
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
  }
  function addExerciseToSession(ex: any) {
    const newEx = { name: ex.name, sets: 3, reps: 12, rest_seconds: 90, muscle_group: ex.muscle_group || '', isAdded: true }
    setAddedExercises(prev => [...prev, newEx])
    // Init localStorage for the new exercise
    const key = `moovx-sets-${todayStr}-${newEx.name}`
    const inputKey = `moovx-inputs-${todayStr}-${newEx.name}`
    const setsArr = Array.from({ length: 3 }, () => false)
    const inputsArr = Array.from({ length: 3 }, () => ({ kg: '', reps: '12' }))
    setCompletedSets(prev => ({ ...prev, [key]: setsArr }))
    setSetInputs(prev => ({ ...prev, [newEx.name]: inputsArr }))
    if (typeof window !== 'undefined') {
      localStorage.setItem(key, JSON.stringify(setsArr))
      localStorage.setItem(inputKey, JSON.stringify(inputsArr))
    }
  }
  function handleFinishWithCheck() {
    if (addedExercises.length > 0) {
      setShowSaveChoice(true)
    } else {
      finishTrainingWorkout()
    }
  }

  async function saveWithModifications() {
    // Save session + update the custom program with new exercises
    await finishTrainingWorkout()
    if (activeCustomProgram?.id) {
      const dayIndex = ['lundi','mardi','mercredi','jeudi','vendredi','samedi','dimanche'].indexOf(trainingDay)
      const updatedDays = [...(activeCustomProgram.days || [])]
      if (updatedDays[dayIndex]) {
        const existingExs = updatedDays[dayIndex].exercises || []
        const newExs = addedExercises.map(ex => ({ exercise_name: ex.name, custom_name: ex.name, sets: ex.sets, reps: ex.reps, rest_seconds: ex.rest_seconds, muscle_group: ex.muscle_group }))
        updatedDays[dayIndex] = { ...updatedDays[dayIndex], exercises: [...existingExs, ...newExs] }
        await supabase.from('custom_programs').update({ days: updatedDays }).eq('id', activeCustomProgram.id)
      }
    }
    setAddedExercises([])
  }

  async function saveOriginal() {
    await finishTrainingWorkout()
    setAddedExercises([])
  }

  async function finishTrainingWorkout() {
    const duration = workoutStarted ? Math.round((Date.now() - workoutStarted) / 60000) : 1
    const exs: any[] = (coachProgram?.[trainingDay]?.exercises as any[]) || []
    const totalSetsCount = exs.reduce((s: number, ex: any) => {
      const key = `moovx-sets-${todayStr}-${ex.name}`
      return s + (completedSets[key]?.length || Number(ex.sets) || 0)
    }, 0)
    const doneSetsCount = exs.reduce((s: number, ex: any) => {
      const key = `moovx-sets-${todayStr}-${ex.name}`
      return s + (completedSets[key] || []).filter(Boolean).length
    }, 0)
    // Get the session title from custom program or scheduled session
    const sessionTitle = (() => {
      if (activeCustomProgram?.days?.length) {
        const idx = ['lundi','mardi','mercredi','jeudi','vendredi','samedi','dimanche'].indexOf(trainingDay)
        const paddedDays = padTo7Days(activeCustomProgram.days)
        const day = paddedDays[idx]
        if (day?.name && day.name !== 'Repos') return day.name
      }
      const todaySession = weekSessions.find((s: any) => s.scheduled_date === todayStr && s.session_type !== 'rest')
      if (todaySession?.title) return todaySession.title
      return trainingDay
    })()
    await persistQuickWorkout({
      userId: session.user.id,
      workoutName: sessionTitle,
      durationMinutes: duration,
      completedSets: doneSetsCount,
      totalSets: totalSetsCount,
      exerciseCount: exs.length,
    }, createSupabaseWorkoutPersistencePort(supabase))

    // Gamification: +100 XP for completing a workout
    try { await addXP(session.user.id, 100, supabase); await updateStreak(session.user.id, supabase) } catch {}

    for (const ex of exs) {
      const inputs = setInputs[ex.name] || []
      for (const input of inputs) {
        const weight = parseFloat(input.kg.replace(',', '.'))
        const reps = parseInt(input.reps)
        if (weight > 0 && reps > 0) {
          const result = await checkForPR(ex.name, weight, reps)
          if (result.newPR) {
            toast.success(t('calendar.toasts.newPR', { exercise: result.exercise || '', value: result.value?.toLocaleString(locale) || '' }), { duration: 5000 })
          }
        }
      }
    }

    exs.forEach((ex: any) => {
      if (typeof window !== 'undefined') {
        localStorage.removeItem(`moovx-sets-${todayStr}-${ex.name}`)
        localStorage.removeItem(`moovx-inputs-${todayStr}-${ex.name}`)
      }
    })
    setCompletedSets({})
    setSetInputs({})
    setWorkoutStarted(null)
    setRestRunning(false)
    setRestTimer(0)
    setActiveRestExName(null)
    setRestingSet(null)
    setWorkoutFinished(true)
    setTimeout(() => setWorkoutFinished(false), 4000)
    fetchAll()
  }

  function handleExerciseInfo(ex: any) {
    loadExerciseInfo(ex.name)
  }

  const runtime: TrainingTabRuntime = {
    supabase, session, profile, coachProgram, todayKey, todaySessionDone, startProgramWorkout, fetchAll,
    scheduledSessions, calendarSelectedDate, setCalendarSelectedDate, markSessionCompleted, checkForPR, lastCompletedByIndex, setModal, t,
    locale, dateLocale, T, aiAllowed, exerciseInfo, setExerciseInfo, loadExerciseInfo, trainingDay, setTrainingDay, completedSets, setInputs, setSetInputs,
    showExDbModal, setShowExDbModal, exerciseDetail, setExerciseDetail, exercisesCache, showProgramManager, setShowProgramManager, weekOffset,
    setWeekOffset, weekDir, setWeekDir, calTouchStart, expandedProgram, setExpandedProgram, confirmDelete, setConfirmDelete,
    workoutHistory, workoutFinished, workoutStarted, videoExercise, setVideoExercise, activeRestExName, restingSet, restTimer,
    restRunning, elapsedSecs, setElapsedSecs, showTimerAlert, setShowTimerAlert, motivationalMsg, customPrograms,
    setCustomPrograms, showProgramBuilder, setShowProgramBuilder, activeCustomProgram, setActiveCustomProgram, editingProgram, setEditingProgram, addedExercises,
    showAddExercise, setShowAddExercise, exerciseSearchQ, setExerciseSearchQ, exerciseSearchResults, showSaveChoice, setShowSaveChoice,
    selectedWorkout, setSelectedWorkout, workoutDetail, loadingDetail, editMode, setEditMode, editedDays, setEditedDays,
    variantPopup, setVariantPopup, techniqueTooltip, setTechniqueTooltip, importPreview, setImportPreview, importSkipped, setImportSkipped,
    importName, setImportName, importFileRef, startModalProgram, setStartModalProgram, startModalImportData, setStartModalImportData, scheduledBannerDismissed,
    setScheduledBannerDismissed, showSessionModal, setShowSessionModal, todayStr, trainingIsToday, activeDayResolution, trainingDayData, trainingExercises,
    trainingTotalSets, trainingDoneSets, doneDates, weekSessions, activateProgram, handleStartProgram, deactivateProgram, deleteProgram,
    refreshPrograms, fmtElapsed, fmtRest, updateInput, addSet, toggleSet, cancelRest, startEditMode,
    editExField, editRemoveEx, editMoveEx, editAddEx, loadEditVariants, selectEditVariant, saveEditedProgram, addExerciseToSession, handleFinishWithCheck, saveWithModifications, saveOriginal,
    handleExerciseInfo, openWorkoutDetail,
  }

  return <TrainingTabView runtime={runtime} />
}
