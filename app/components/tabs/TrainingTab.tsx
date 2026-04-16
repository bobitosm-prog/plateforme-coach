'use client'
import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { addXP, updateStreak } from '../../../lib/gamification'
import { getSessionForDay, frDayToIndex } from '../../../lib/get-today-session'
import { useWakeLock } from '../../hooks/useWakeLock'
import {
  Dumbbell, Search, Award, Moon, ChevronRight, ArrowRightLeft, X, Play,
} from 'lucide-react'
import {
  fonts, colors, JS_DAYS_FR, titleStyle, titleLineStyle, subtitleStyle, statStyle, statSmallStyle, bodyStyle, labelStyle, mutedStyle, pageTitleStyle, cardStyle, cardTitleAbove, btnPrimary, btnSecondary,
} from '../../../lib/design-tokens'
import { initAudio, playBeep, playWarningTick, vibrateDevice, getRandomMessage } from '../../../lib/timer-audio'
import { toast } from 'sonner'
import ExerciseSearchModal from '../modals/ExerciseSearchModal'
import ExerciseDetailModal from '../modals/ExerciseDetailModal'
import CardioSection from '../CardioSection'
import WeekCalendar from '../WeekCalendar'
import MonthCalendar from '../MonthCalendar'
import { ScheduledSession, SESSION_COLORS, SESSION_LABELS, getSessionsForDate, toDateStr } from '../../../lib/schedule-utils'

import WorkoutCelebration from './training/WorkoutCelebration'
import TrainingActiveBar from './training/TrainingActiveBar'
import AddExercisePopup from './training/AddExercisePopup'
import SaveChoicePopup from './training/SaveChoicePopup'
import TrainingDayChips from './training/TrainingDayChips'
import TrainingRestDay from './training/TrainingRestDay'
import TrainingSessionDone from './training/TrainingSessionDone'
import TrainingExerciseCard from './training/TrainingExerciseCard'
import { TechniqueTooltip } from './training/TechniquePopup'
import StartProgramModal from './training/StartProgramModal'
import VideoFeedbackModal from '../VideoFeedbackModal'
import VideoFeedbackHistory from '../VideoFeedbackHistory'
import ProgramBuilder, { padTo7Days } from '../training/ProgramBuilder'
import ExerciseInfoPopup from '../ExerciseInfoPopup'
import { useExerciseInfo } from '../../hooks/useExerciseInfo'
import { resolveSessionType, HISTORY_FILTERS } from '../../../lib/session-types'
import { exportProgramToXlsx, parseProgramFromXlsx, downloadBlankTemplate, type ImportResult } from '../../../lib/program-excel'

interface TrainingTabProps {
  supabase: any
  session: any
  profile?: any
  coachProgram: any
  todayKey: string
  todaySessionDone: boolean
  startProgramWorkout: (day: any, exercises: any[]) => void
  fetchAll: () => Promise<void>
  scheduledSessions: ScheduledSession[]
  calendarSelectedDate: Date
  setCalendarSelectedDate: (d: Date) => void
  markSessionCompleted: (id: string) => Promise<void>
  checkForPR: (exerciseName: string, weight: number, reps: number) => Promise<{ newPR: boolean; exercise?: string; value?: number; previous?: number }>
}

export default function TrainingTab({
  supabase, session, profile, coachProgram, todayKey, todaySessionDone, startProgramWorkout, fetchAll,
  scheduledSessions, calendarSelectedDate, setCalendarSelectedDate, markSessionCompleted, checkForPR,
}: TrainingTabProps) {
  const T = titleStyle
  const aiAllowed = profile?.subscription_type !== 'invited'
  const { exerciseInfo, setExerciseInfo, loadExerciseInfo } = useExerciseInfo(supabase)
  const [trainingDay, setTrainingDay]   = useState<string>(() => JS_DAYS_FR[new Date().getDay()])
  const [dayExpanded, setDayExpanded] = useState(false)
  const [completedSets, setCompletedSets] = useState<Record<string, boolean[]>>({})
  const [setInputs, setSetInputs]       = useState<Record<string, { kg: string; reps: string }[]>>({})
  const [showExDbModal, setShowExDbModal] = useState(false)
  const [exerciseDetail, setExerciseDetail] = useState<any>(null)
  const [exercisesCache, setExercisesCache] = useState<any[]>([])
  const exercisesCacheLoaded = useRef(false)
  const [showMonthCalendar, setShowMonthCalendar] = useState(false)
  const [showProgramManager, setShowProgramManager] = useState(false)
  const [weekOffset, setWeekOffset] = useState(0)
  const calTouchStart = useRef<number | null>(null)
  const [expandedProgram, setExpandedProgram] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [showFullHistory, setShowFullHistory] = useState(false)
  const [workoutHistory, setWorkoutHistory] = useState<any[]>([])
  const [historyFilter, setHistoryFilter] = useState('all')
  const [workoutFinished, setWorkoutFinished] = useState(false)
  const [workoutStarted, setWorkoutStarted]   = useState<number | null>(null)
  const [videoExercise, setVideoExercise]     = useState<string | null>(null)
  const [activeRestExName, setActiveRestExName] = useState<string | null>(null)
  const [restingSet, setRestingSet]     = useState<{ exName: string; setIdx: number } | null>(null)
  const [restTimer, setRestTimer]       = useState<number>(0)
  const [restMax, setRestMax]           = useState<number>(90)
  const [restRunning, setRestRunning]   = useState(false)
  const [elapsedSecs, setElapsedSecs]   = useState(0)
  const [showTimerAlert, setShowTimerAlert] = useState(false)
  const [motivationalMsg, setMotivationalMsg] = useState('')
  const [customPrograms, setCustomPrograms] = useState<any[]>([])
  const [showProgramBuilder, setShowProgramBuilder] = useState(false)
  const [activeCustomProgram, setActiveCustomProgram] = useState<any>(null)
  const [editingProgram, setEditingProgram] = useState<any>(null)
  // Feature: add exercise in session
  const [addedExercises, setAddedExercises] = useState<any[]>([])
  const [showAddExercise, setShowAddExercise] = useState(false)
  const [exerciseSearchQ, setExerciseSearchQ] = useState('')
  const [exerciseSearchResults, setExerciseSearchResults] = useState<any[]>([])
  // Feature: save choice popup
  const [showSaveChoice, setShowSaveChoice] = useState(false)
  const [swapping, setSwapping] = useState<string | null>(null)
  // Workout detail
  const [selectedWorkout, setSelectedWorkout] = useState<any>(null)
  const [workoutDetail, setWorkoutDetail] = useState<any[]>([])
  const [loadingDetail, setLoadingDetail] = useState(false)
  // Program edit mode
  const [editMode, setEditMode] = useState(false)
  const [editedDays, setEditedDays] = useState<any[] | null>(null)
  const [variantPopup, setVariantPopup] = useState<{dayIdx: number, exIdx: number, variants: any[]} | null>(null)
  // Exercise library state
  const [libSearch, setLibSearch] = useState('')
  const [libMuscle, setLibMuscle] = useState('Tous')
  const [libShowAll, setLibShowAll] = useState(false)
  const [libDetail, setLibDetail] = useState<any>(null)
  // Alternatives state
  const [altSearch, setAltSearch] = useState('')
  const [altSelected, setAltSelected] = useState<any>(null)
  const [altResults, setAltResults] = useState<any[]>([])
  const [techniqueTooltip, setTechniqueTooltip] = useState<string | null>(null)
  const [importPreview, setImportPreview] = useState<ImportResult['program'] | null>(null)
  const [importSkipped, setImportSkipped] = useState<string[]>([])
  const [importName, setImportName] = useState('')
  const importFileRef = useRef<HTMLInputElement>(null)
  // Start program modal: holds the program to activate/schedule + optional import data
  const [startModalProgram, setStartModalProgram] = useState<any>(null)
  const [startModalImportData, setStartModalImportData] = useState<any>(null)
  const [scheduledBannerDismissed, setScheduledBannerDismissed] = useState(false)
  const restIntervalRef  = useRef<any>(null)
  const elapsedIntervalRef = useRef<any>(null)
  const exSearchRef      = useRef<any>(null)

  // Use local date (not UTC) to avoid timezone issues
  const _now = new Date()
  const todayStr = `${_now.getFullYear()}-${String(_now.getMonth() + 1).padStart(2, '0')}-${String(_now.getDate()).padStart(2, '0')}`
  const trainingIsToday  = trainingDay === todayKey

  // Keep screen awake during workout + rest timer
  useWakeLock(!!workoutStarted || restRunning)
  // Priorité : programme custom actif > programme coach — using shared utility
  const customDayData = (() => {
    if (!activeCustomProgram?.days?.length) return null
    const dayIndex = frDayToIndex(trainingDay)
    if (dayIndex < 0) return null
    const session = getSessionForDay(activeCustomProgram.days, dayIndex)
    if (session.type === 'rest') return { repos: true, exercises: [] }
    return { repos: false, exercises: session.exercises }
  })()
  const trainingDayData = customDayData || (coachProgram ? (coachProgram[trainingDay] ?? { repos: false, exercises: [] }) : null)
  const baseExercises: any[] = trainingDayData?.exercises || []

  // Resolve exercises for current phase (periodized programs)
  const resolvedExercises: any[] = baseExercises.map((ex: any) => {
    if (!ex.phases || !activeCustomProgram?.current_week) return ex
    const week = activeCustomProgram.current_week || 1
    const phaseKey = week <= 4 ? 'p1' : week <= 8 ? 'p2' : 'p3'
    const phaseData = ex.phases[phaseKey] || ex.phases.p1 || {}
    return {
      ...ex,
      sets: phaseData.sets ?? ex.sets,
      reps: typeof phaseData.reps === 'string' ? parseInt(phaseData.reps) || ex.reps : phaseData.reps ?? ex.reps,
      tempo: phaseData.tempo ?? ex.tempo,
      technique: phaseData.technique ?? ex.technique,
      technique_details: phaseData.technique_details ?? ex.technique_details,
      rest_seconds: phaseData.rest_seconds ?? ex.rest_seconds,
    }
  })

  const trainingExercises: any[] = [...resolvedExercises, ...addedExercises].map((ex: any) => {
    const dbMatch = exercisesCache.find((d: any) => d.name?.toLowerCase() === ex.name?.toLowerCase())
    return dbMatch?.gif_url ? { ...ex, gif_url: dbMatch.gif_url } : ex
  })

  const trainingTotalSets = trainingExercises.reduce((s: number, ex: any) => {
    const key = `moovx-sets-${todayStr}-${ex.name}`
    return s + (completedSets[key]?.length || Number(ex.sets) || 0)
  }, 0)
  const trainingDoneSets = trainingExercises.reduce((s: number, ex: any) => {
    const key = `moovx-sets-${todayStr}-${ex.name}`
    return s + (completedSets[key] || []).filter(Boolean).length
  }, 0)

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
      const dateStr = date.toISOString().split('T')[0]
      const existing = scheduledSessions.find((s: any) => s.scheduled_date === dateStr)
      const isRest = day.is_rest
      return {
        id: existing?.id || `custom-${i}`,
        user_id: session?.user?.id || '',
        title: isRest ? 'Repos' : (day.name || day.weekday || `Jour ${i + 1}`),
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

  // ── Rest timer: pure decrement only (no side-effects inside updater) ──
  useEffect(() => {
    if (!restRunning || restTimer <= 0) return
    restIntervalRef.current = setInterval(() => {
      setRestTimer(prev => Math.max(0, prev - 1))
    }, 1000)
    return () => clearInterval(restIntervalRef.current)
  }, [restRunning])

  // ── Rest timer expiry + warning tick ──
  useEffect(() => {
    if (restRunning && restTimer === 5) playWarningTick()
    if (restRunning && restTimer === 0) {
      clearInterval(restIntervalRef.current)
      setRestRunning(false)
      setRestingSet(null)
      setActiveRestExName(null)
      playBeep()
      vibrateDevice()
      setMotivationalMsg(getRandomMessage())
      setShowTimerAlert(true)
      setTimeout(() => setShowTimerAlert(false), 3000)
    }
  }, [restTimer, restRunning])

  // ── Elapsed workout timer ──
  useEffect(() => {
    if (workoutStarted) {
      elapsedIntervalRef.current = setInterval(() => {
        setElapsedSecs(Math.round((Date.now() - workoutStarted) / 1000))
      }, 1000)
    } else {
      clearInterval(elapsedIntervalRef.current)
      setElapsedSecs(0)
    }
    return () => clearInterval(elapsedIntervalRef.current)
  }, [workoutStarted])

  // ── Load sets + inputs from localStorage ──
  useEffect(() => {
    if (!coachProgram || !trainingDay) return
    const dayData = coachProgram[trainingDay]
    if (!dayData?.exercises) { setCompletedSets({}); setSetInputs({}); return }
    const loadedSets: Record<string, boolean[]> = {}
    const loadedInputs: Record<string, { kg: string; reps: string }[]> = {}
    ;(dayData.exercises as any[]).forEach((ex: any) => {
      const key       = `moovx-sets-${todayStr}-${ex.name}`
      const inputKey  = `moovx-inputs-${todayStr}-${ex.name}`
      const stored       = typeof window !== 'undefined' ? localStorage.getItem(key) : null
      const storedInputs = typeof window !== 'undefined' ? localStorage.getItem(inputKey) : null
      const n = Number(ex.sets) || 3
      loadedSets[key]       = stored ? JSON.parse(stored) : Array.from({ length: n }, () => false)
      loadedInputs[ex.name] = storedInputs
        ? JSON.parse(storedInputs)
        : Array.from({ length: n }, () => ({ kg: ex.weight ? String(ex.weight) : '', reps: String(ex.reps || '') }))
    })
    setCompletedSets(loadedSets)
    setSetInputs(loadedInputs)
  }, [trainingDay, coachProgram])

  // ── Load custom programs + auto-activate scheduled ──
  useEffect(() => {
    if (!session?.user?.id) return
    supabase.from('custom_programs').select('*').eq('user_id', session.user.id).order('updated_at', { ascending: false })
      .then(async ({ data }: any) => {
        const programs = data || []
        // Auto-activate scheduled programs that are due
        const today = new Date().toISOString().split('T')[0]
        const dueToStart = programs.filter((p: any) => p.scheduled && p.start_date && p.start_date <= today)
        if (dueToStart.length > 0) {
          await supabase.from('custom_programs').update({ is_active: false }).eq('user_id', session.user.id).eq('is_active', true)
          await supabase.from('custom_programs').update({ is_active: true, scheduled: false }).eq('id', dueToStart[0].id)
          dueToStart[0].is_active = true
          dueToStart[0].scheduled = false
          programs.forEach((p: any) => { if (p.id !== dueToStart[0].id) p.is_active = false })
          toast.success(`Ton nouveau programme démarre aujourd'hui !`)
        }
        setCustomPrograms(programs)
        const active = programs.find((p: any) => p.is_active)
        if (active) setActiveCustomProgram(active)
      })
  }, [session?.user?.id])

  // ── Load workout history ──
  useEffect(() => {
    if (!session?.user?.id) return
    supabase.from('workout_sessions').select('id, name, completed, duration_minutes, notes, created_at')
      .eq('user_id', session.user.id).eq('completed', true).order('created_at', { ascending: false }).limit(50)
      .then(({ data }: any) => setWorkoutHistory(data || []))
  }, [session?.user?.id])

  // ── Load exercises_db cache ──
  useEffect(() => {
    if (exercisesCacheLoaded.current) return
    exercisesCacheLoaded.current = true
    supabase.from('exercises_db').select('*').order('name').limit(200).then(({ data }: any) => {
      setExercisesCache(data || [])
    })
  }, [])

  // Open start modal instead of activating directly
  function activateProgram(programId: string) {
    const prog = customPrograms.find(p => p.id === programId)
    if (prog) setStartModalProgram(prog)
  }

  async function doActivateProgram(programId: string) {
    await supabase.from('custom_programs').update({ is_active: false }).eq('user_id', session.user.id).neq('id', programId)
    const { error } = await supabase.from('custom_programs').update({ is_active: true, scheduled: false, current_week: 1 }).eq('id', programId).eq('user_id', session.user.id)
    if (error) { toast.error('Erreur: ' + error.message); return }
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
        const mondayStr = monday.toISOString().split('T')[0]
        const sundayStr = sunday.toISOString().split('T')[0]
        await supabase.from('scheduled_sessions').delete().eq('user_id', session.user.id).gte('scheduled_date', mondayStr).lte('scheduled_date', sundayStr).eq('completed', false)
        const paddedDays = padTo7Days(activeProg.days)
        const DAY_LABELS_FULL = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche']
        const newSessions: any[] = []
        for (let i = 0; i < 7; i++) {
          const day = paddedDays[i]; if (!day || day.is_rest) continue
          const date = new Date(monday); date.setDate(monday.getDate() + i)
          newSessions.push({ user_id: session.user.id, title: day.name || day.weekday || DAY_LABELS_FULL[i], session_type: 'custom', scheduled_date: date.toISOString().split('T')[0], scheduled_time: '08:00', duration_min: 60, completed: false })
        }
        if (newSessions.length > 0) await supabase.from('scheduled_sessions').insert(newSessions)
      } catch (e) { console.error('[activateProgram] sync error:', e) }
    }
    toast.success('Programme activé !')
  }

  async function scheduleProgram(programId: string, startDate: string) {
    await supabase.from('custom_programs').update({ scheduled: true, start_date: startDate, current_week: 1 }).eq('id', programId)
    const updated = customPrograms.map(p => p.id === programId ? { ...p, scheduled: true, start_date: startDate } : p)
    setCustomPrograms(updated)
    toast.success(`Programme planifié pour le ${new Date(startDate + 'T00:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}`)
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
      if (error) { toast.error('Erreur: ' + error.message); return }
      if (option === 'now') toast.success('Programme importé et activé !')
      else toast.success(`Programme importé — démarre le ${new Date(date + 'T00:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}`)
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
    toast.success('Programme désactivé')
  }

  async function advanceWeek() {
    if (!activeCustomProgram?.total_weeks) return
    const currentWeek = (activeCustomProgram.current_week || 1)
    if (currentWeek >= activeCustomProgram.total_weeks) { toast('Programme terminé !'); return }
    const newWeek = currentWeek + 1

    // Update in local state
    const updated = { ...activeCustomProgram, current_week: newWeek }
    setActiveCustomProgram(updated)

    // Persist to DB
    await supabase.from('custom_programs').update({ current_week: newWeek }).eq('id', activeCustomProgram.id)

    // Check phase transition
    const oldPhase = currentWeek <= 4 ? 1 : currentWeek <= 8 ? 2 : 3
    const newPhase = newWeek <= 4 ? 1 : newWeek <= 8 ? 2 : 3
    if (newPhase > oldPhase) {
      const phaseName = activeCustomProgram.phases?.[newPhase - 1]?.name || `Phase ${newPhase}`
      toast.success(`Tu passes en ${phaseName} !`)
    }
  }

  async function deleteProgram(programId: string) {
    await supabase.from('custom_programs').delete().eq('id', programId).eq('user_id', session.user.id)
    setCustomPrograms(prev => prev.filter(p => p.id !== programId))
    if (activeCustomProgram?.id === programId) setActiveCustomProgram(null)
    toast.success('Programme supprimé')
  }

  function refreshPrograms() {
    supabase.from('custom_programs').select('*').eq('user_id', session.user.id).order('updated_at', { ascending: false })
      .then(({ data }: any) => {
        setCustomPrograms(data || [])
        const active = (data || []).find((p: any) => p.is_active)
        setActiveCustomProgram(active || null)
      })
  }

  function findExercise(name: string) {
    if (!name || exercisesCache.length === 0) return null
    const n = name.trim().toLowerCase()
    let found = exercisesCache.find((e: any) => e.name?.toLowerCase() === n)
    if (found) return found
    found = exercisesCache.find((e: any) => e.name?.toLowerCase().includes(n) || n.includes(e.name?.toLowerCase()))
    if (found) return found
    const words = n.split(' ').slice(0, 3).join(' ')
    return exercisesCache.find((e: any) => e.name?.toLowerCase().includes(words)) || null
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

  function updateInput(exName: string, setIdx: number, field: 'kg' | 'reps', value: string) {
    const inputKey = `moovx-inputs-${todayStr}-${exName}`
    setSetInputs(prev => {
      const arr = prev[exName] ? [...prev[exName]] : []
      arr[setIdx] = { ...(arr[setIdx] || { kg: '', reps: '' }), [field]: value }
      if (typeof window !== 'undefined') localStorage.setItem(inputKey, JSON.stringify(arr))
      return { ...prev, [exName]: arr }
    })
  }

  function addSet(exName: string) {
    const key      = `moovx-sets-${todayStr}-${exName}`
    const inputKey = `moovx-inputs-${todayStr}-${exName}`
    setCompletedSets(p => {
      const prev = p[key] || []
      const next = [...prev, false]
      localStorage.setItem(key, JSON.stringify(next))
      return { ...p, [key]: next }
    })
    setSetInputs(p => {
      const arr  = p[exName] ? [...p[exName]] : []
      const last = arr.length > 0 ? { ...arr[arr.length - 1] } : { kg: '', reps: '' }
      const next = [...arr, last]
      localStorage.setItem(inputKey, JSON.stringify(next))
      return { ...p, [exName]: next }
    })
  }

  function toggleSet(exName: string, setIdx: number, totalSetsCount: number, restSecs: number) {
    initAudio() // Unlock audio on iOS at user interaction
    const key  = `moovx-sets-${todayStr}-${exName}`
    const prev = completedSets[key] || Array.from({ length: totalSetsCount }, () => false)
    const next = [...prev]
    next[setIdx] = !next[setIdx]
    localStorage.setItem(key, JSON.stringify(next))
    setCompletedSets(p => ({ ...p, [key]: next }))
    if (!workoutStarted && next[setIdx]) setWorkoutStarted(Date.now())
    if (next[setIdx]) {
      const allDone = next.every(Boolean)
      if (!allDone && restSecs > 0) {
        setRestingSet({ exName, setIdx })
        setActiveRestExName(exName)
        setRestMax(restSecs)
        setRestTimer(restSecs)
        setRestRunning(true)
        if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(50)
      }
    } else {
      if (activeRestExName === exName) {
        setRestRunning(false)
        setRestTimer(0)
        setActiveRestExName(null)
        setRestingSet(null)
      }
    }
  }

  function cancelRest() {
    setRestRunning(false)
    setRestTimer(0)
    setRestingSet(null)
    setActiveRestExName(null)
  }

  // ── Search exercises for add-to-session popup ──
  useEffect(() => {
    if (!showAddExercise) return
    if (exerciseSearchQ.length < 1) {
      supabase.from('exercises_db').select('id, name, muscle_group').order('name').limit(50)
        .then(({ data }: any) => setExerciseSearchResults(data || []))
      return
    }
    const t = setTimeout(async () => {
      const { data } = await supabase.from('exercises_db').select('id, name, muscle_group').ilike('name', `%${exerciseSearchQ}%`).limit(30)
      setExerciseSearchResults(data || [])
    }, 200)
    return () => clearTimeout(t)
  }, [showAddExercise, exerciseSearchQ])

  // ── Program edit functions ──
  function startEditMode() {
    if (!activeCustomProgram?.days) return
    setEditedDays(JSON.parse(JSON.stringify(activeCustomProgram.days)))
    setEditMode(true)
  }
  function editExField(dayIdx: number, exIdx: number, field: string, val: any) {
    if (!editedDays) return
    const d = [...editedDays]
    d[dayIdx].exercises[exIdx][field] = val
    setEditedDays(d)
  }
  function editRemoveEx(dayIdx: number, exIdx: number) {
    if (!editedDays) return
    const d = [...editedDays]
    d[dayIdx].exercises.splice(exIdx, 1)
    setEditedDays([...d])
  }
  function editMoveEx(dayIdx: number, exIdx: number, dir: -1 | 1) {
    if (!editedDays) return
    const d = [...editedDays]
    const exs = d[dayIdx].exercises
    const ni = exIdx + dir
    if (ni < 0 || ni >= exs.length) return
    ;[exs[exIdx], exs[ni]] = [exs[ni], exs[exIdx]]
    setEditedDays([...d])
  }
  function editAddEx(dayIdx: number, ex: any) {
    if (!editedDays) return
    const d = [...editedDays]
    d[dayIdx].exercises.push({ exercise_name: ex.name, custom_name: ex.name, name: ex.name, sets: 3, reps: 12, rest_seconds: 90, muscle_group: ex.muscle_group || '' })
    setEditedDays([...d])
  }
  async function loadEditVariants(exerciseName: string, dayIdx: number, exIdx: number) {
    const { data: current } = await supabase
      .from('exercises_db').select('variant_group')
      .ilike('name', exerciseName).limit(1).maybeSingle()
    if (current?.variant_group) {
      const { data } = await supabase
        .from('exercises_db').select('name, equipment, muscle_group')
        .eq('variant_group', current.variant_group)
        .neq('name', exerciseName).order('equipment').limit(10)
      setVariantPopup({ dayIdx, exIdx, variants: data || [] })
    } else {
      const baseName = exerciseName.split(' ').slice(0, 2).join(' ')
      const { data } = await supabase
        .from('exercises_db').select('name, equipment, muscle_group')
        .ilike('name', `%${baseName}%`).neq('name', exerciseName).limit(8)
      setVariantPopup({ dayIdx, exIdx, variants: data || [] })
    }
  }
  function selectEditVariant(v: any) {
    if (!variantPopup || !editedDays) return
    const d = [...editedDays]
    const ex = d[variantPopup.dayIdx].exercises[variantPopup.exIdx]
    ex.exercise_name = v.name
    ex.custom_name = v.name
    ex.name = v.name
    setEditedDays([...d])
    setVariantPopup(null)
  }
  async function saveEditedProgram() {
    if (!editedDays || !activeCustomProgram?.id) return
    await supabase.from('custom_programs').update({ days: editedDays, updated_at: new Date().toISOString() }).eq('id', activeCustomProgram.id)
    setActiveCustomProgram({ ...activeCustomProgram, days: editedDays })
    setEditMode(false)
    setEditedDays(null)
    toast.success('Programme mis a jour')
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

  async function handleSwapExercise(ex: any) {
    setSwapping(ex.name)
    try {
      const res = await fetch('/api/suggest-exercise', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ exerciseName: ex.name, muscleGroup: ex.muscle_group || '', reason: 'Remplacement rapide', availableEquipment: 'Salle complète' }),
      })
      const data = await res.json()
      if (data.suggestions?.[0]) {
        const suggestion = data.suggestions[0]
        // Replace in added exercises if it was added
        setAddedExercises(prev => prev.map(e => e.name === ex.name ? { ...e, name: suggestion.name } : e))
        toast.success(`Remplacé par : ${suggestion.name}`)
      }
    } catch { toast.error('Erreur de remplacement') }
    finally { setSwapping(null) }
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
    await supabase.from('workout_sessions').insert({
      user_id: session.user.id,
      name: sessionTitle,
      completed: true,
      duration_minutes: Math.max(duration, 1),
      notes: `${doneSetsCount}/${totalSetsCount} séries · ${exs.length} exercices`,
    })

    // Gamification: +100 XP for completing a workout
    try { await addXP(session.user.id, 100, supabase); await updateStreak(session.user.id, supabase) } catch {}

    for (const ex of exs) {
      const inputs = setInputs[ex.name] || []
      for (const input of inputs) {
        const weight = parseFloat(input.kg)
        const reps = parseInt(input.reps)
        if (weight > 0 && reps > 0) {
          const result = await checkForPR(ex.name, weight, reps)
          if (result.newPR) {
            toast.success(`🏆 NOUVEAU RECORD ! ${result.exercise} — ${result.value} kg (1RM)`, { duration: 5000 })
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

  async function openWorkoutDetail(workout: any) {
    setSelectedWorkout(workout)
    setLoadingDetail(true)
    const { data } = await supabase
      .from('workout_sets')
      .select('exercise_name, set_number, weight, reps, completed')
      .eq('session_id', workout.id)
      .order('exercise_name').order('set_number', { ascending: true })
    // Group by exercise
    const grouped: Record<string, any[]> = {}
    for (const row of (data || [])) {
      if (!grouped[row.exercise_name]) grouped[row.exercise_name] = []
      grouped[row.exercise_name].push(row)
    }
    setWorkoutDetail(Object.entries(grouped).map(([name, sets]) => ({ name, sets })))
    setLoadingDetail(false)
  }

  // ══════════════════════════════════════════
  return (
    <div style={{ minHeight: '100vh', background: colors.background, paddingBottom: 100, overflowX: 'hidden', maxWidth: '100%' }}>
      <style>{`
        .set-input { -webkit-appearance: none; appearance: none; }
        .set-input::-webkit-inner-spin-button,
        .set-input::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
        .set-input:focus { border-color: ${colors.gold} !important; }
        @keyframes ttPopIn {
          0% { opacity: 0; transform: scale(0.8); }
          100% { opacity: 1; transform: scale(1); }
        }
        @media(max-width:480px){
          .set-grid{grid-template-columns:28px 1fr 70px 52px 28px!important;gap:2px!important;padding-left:8px!important;padding-right:8px!important}
          .set-grid .prev-col{font-size:11px!important}
        }
      `}</style>

      {/* ── TIMER COMPLETE POPUP ── */}
      {showTimerAlert && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 9999, padding: 24,
        }}>
          <div style={{
            background: colors.surface, border: `2px solid ${colors.gold}`,
            borderRadius: 16, padding: '40px 32px', textAlign: 'center', maxWidth: 340, width: '100%',
            animation: 'ttPopIn 0.3s ease-out', boxShadow: '0 4px 24px rgba(0,0,0,0.6)',
          }}>
            <div style={{
              width: 64, height: 64, border: `2px solid ${colors.gold}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 20px',
            }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill={colors.gold}>
                <path d="M13 2L3 14H12L11 22L21 10H12L13 2Z" />
              </svg>
            </div>
            <h2 style={{ ...statStyle, fontSize: 36, color: colors.gold, letterSpacing: 3, margin: '0 0 8px' }}>
              REPOS TERMINÉ
            </h2>
            <p style={{ ...subtitleStyle, fontWeight: 800, fontSize: 20, color: colors.text, letterSpacing: 2, margin: '0 0 24px' }}>
              {motivationalMsg}
            </p>
            <button onClick={() => setShowTimerAlert(false)} style={{
              background: colors.gold, color: '#0D0B08', border: 'none',
              fontFamily: fonts.body, fontWeight: 800, fontSize: 16, letterSpacing: 2,
              padding: '14px 48px', textTransform: 'uppercase', cursor: 'pointer',

            }}>
              C&apos;EST PARTI !
            </button>
          </div>
        </div>
      )}

      {/* ── WORKOUT FINISHED CELEBRATION ── */}
      <WorkoutCelebration visible={workoutFinished} />

      {/* ═══ SECTION 1 — HEADER ═══ */}
      <div style={{ padding: '8px 24px 0', marginBottom: 16 }}>
        <span style={pageTitleStyle}>TRAINING</span>
        {activeCustomProgram && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 }}>
            <div>
              <div style={{ fontFamily: fonts.headline, fontSize: 13, fontWeight: 500, color: 'rgba(255,255,255,0.6)' }}>{activeCustomProgram.name}</div>
              <div style={{ fontFamily: fonts.body, fontSize: 10, color: colors.textDim }}>{(activeCustomProgram.days || []).length} jours · Actif</div>
            </div>
            <button onClick={() => setShowProgramManager(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
              <span style={{ fontSize: 18, color: colors.gold }}>✏️</span>
            </button>
          </div>
        )}
      </div>

      {/* ═══ SECTION 2 — CALENDRIER HORIZONTAL ═══ */}
      {(() => {
        // Compute the displayed week based on weekOffset
        const today = new Date()
        const dow = today.getDay()
        const baseMonday = new Date(today)
        baseMonday.setDate(today.getDate() - (dow === 0 ? 6 : dow - 1) + weekOffset * 7)
        baseMonday.setHours(0, 0, 0, 0)

        const displayDays = Array.from({ length: 7 }, (_, i) => {
          const d = new Date(baseMonday)
          d.setDate(baseMonday.getDate() + i)
          const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
          const ws = weekSessions.find((s: any) => s.scheduled_date === dateStr)
          // Also check if this day is rest in the active program
          const progSession = activeCustomProgram?.days?.length ? getSessionForDay(activeCustomProgram.days, i) : null
          const isProgRest = progSession?.type === 'rest'
          return { date: d, dateStr, ws, isProgRest }
        })

        const monthLabel = displayDays[3].date.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }).toUpperCase()

        const arrowBtn: React.CSSProperties = {
          width: 32, height: 32, borderRadius: 10,
          background: colors.goldDim,
          border: `0.5px solid ${colors.goldBorder}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', transition: 'background 0.2s',
        }

        return (
          <div
            style={{ margin: '8px 24px 0', ...cardStyle, padding: '20px 16px 16px' }}
            onTouchStart={e => { calTouchStart.current = e.touches[0].clientX }}
            onTouchEnd={e => {
              if (calTouchStart.current === null) return
              const diff = e.changedTouches[0].clientX - calTouchStart.current
              if (diff > 60) setWeekOffset(o => o - 1)
              else if (diff < -60) setWeekOffset(o => o + 1)
              calTouchStart.current = null
            }}
          >
            {/* Month label + styled nav arrows */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <span style={mutedStyle}>{monthLabel}</span>
              <div style={{ display: 'flex', gap: 6 }}>
                <button onClick={() => setWeekOffset(o => o - 1)} style={arrowBtn}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={colors.gold} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
                </button>
                <button onClick={() => setWeekOffset(o => o + 1)} style={arrowBtn}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={colors.gold} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg>
                </button>
                {weekOffset !== 0 && (
                  <button onClick={() => setWeekOffset(0)} style={{ ...arrowBtn, fontSize: 10, color: colors.gold, fontWeight: 700 }}>
                    ●
                  </button>
                )}
              </div>
            </div>

            {/* 7-day grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, transition: 'opacity 0.2s' }}>
              {displayDays.map(({ date, dateStr, ws, isProgRest }, i) => {
                const dayNum = date.getDate()
                const dayName = ['LUN', 'MAR', 'MER', 'JEU', 'VEN', 'SAM', 'DIM'][i]
                const isToday = dateStr === todayStr
                const isRest = isProgRest || ws?.session_type === 'rest' || ws?.title === 'Repos'
                const isDone = ws?.completed && !isRest
                const isMissed = !isDone && !isToday && !isRest && ws && date < new Date(todayStr)
                const dotColor = isRest ? 'rgba(255,255,255,0.1)' : isDone ? colors.success : isMissed ? colors.error : isToday ? colors.gold : `${colors.goldContainer}4d`

                return (
                  <button
                    key={i}
                    onClick={() => {
                      const dayKey = ['lundi','mardi','mercredi','jeudi','vendredi','samedi','dimanche'][i]
                      setTrainingDay(dayKey)
                      setDayExpanded(true)
                      setCalendarSelectedDate(date)
                    }}
                    style={{
                      background: isToday ? `${colors.goldContainer}33` : `${colors.goldContainer}0d`,
                      border: isToday ? `1.5px solid ${colors.gold}80` : `0.5px solid ${colors.goldContainer}14`,
                      borderRadius: 10, padding: '8px 2px', cursor: 'pointer',
                      display: 'flex', flexDirection: 'column' as const, alignItems: 'center', gap: 4,
                      transition: 'all 0.2s',
                    }}
                  >
                    <span style={{ fontSize: 9, fontWeight: 700, color: isToday ? colors.gold : colors.textDim, textTransform: 'uppercase' as const, letterSpacing: '0.05em' }}>{dayName}</span>
                    <span style={{ fontSize: 16, fontWeight: 700, color: isToday ? colors.gold : colors.text }}>{dayNum}</span>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: dotColor, boxShadow: isToday ? `0 0 8px ${colors.gold}80` : 'none' }} />
                  </button>
                )
              })}
            </div>

            {/* Legend */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: 16, marginTop: 10 }}>
              {[
                { color: colors.success, label: 'Fait' },
                { color: colors.error, label: 'Manqué' },
                { color: colors.gold, label: "Aujourd'hui" },
                { color: 'rgba(255,255,255,0.1)', label: 'Repos' },
              ].map(l => (
                <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <div style={{ width: 5, height: 5, borderRadius: '50%', background: l.color }} />
                  <span style={{ fontSize: 9, color: colors.textDim }}>{l.label}</span>
                </div>
              ))}
            </div>
          </div>
        )
      })()}

      {/* Scheduled program banner */}
      {!scheduledBannerDismissed && (() => {
        const scheduled = customPrograms.find((p: any) => p.scheduled && p.start_date)
        if (!scheduled) return null
        const startDate = new Date(scheduled.start_date + 'T00:00:00')
        const now = new Date(); now.setHours(0, 0, 0, 0)
        const diffDays = Math.ceil((startDate.getTime() - now.getTime()) / 86400000)
        if (diffDays < 1) return null
        return (
          <div style={{ margin: '0 24px 8px', padding: '10px 14px', background: colors.goldDim, border: `1px solid ${colors.goldRule}`, borderRadius: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontFamily: fonts.body, fontSize: 12, color: colors.gold }}>
              Prochain : <span style={{ fontWeight: 700 }}>{scheduled.name}</span> — dans {diffDays} jour{diffDays > 1 ? 's' : ''}
            </div>
            <button onClick={() => setScheduledBannerDismissed(true)} style={{ background: 'none', border: 'none', color: colors.textMuted, cursor: 'pointer', fontSize: 14, padding: 4 }}>✕</button>
          </div>
        )
      })()}

      {/* ═══ SECTION 3 — SÉANCE DU JOUR ═══ */}
      <div style={{ margin: '16px 24px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
          <span style={T}>SÉANCE DU JOUR</span>
          <div style={titleLineStyle} />
          <span style={{ ...mutedStyle, flexShrink: 0 }}>{new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}</span>
        </div>
        <div style={{ ...cardStyle, padding: 20 }}>

          {/* Phase banner for periodized programs */}
          {activeCustomProgram?.phases && activeCustomProgram?.total_weeks && (
            <div style={{ marginBottom: 12 }}>
              {(() => {
                const week = activeCustomProgram.current_week || 1
                const totalWeeks = activeCustomProgram.total_weeks
                const phase = (activeCustomProgram.phases || []).find((p: any) => week >= p.weeks[0] && week <= p.weeks[1])
                const progress = week / totalWeeks
                return (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <span style={{ fontFamily: fonts.headline, fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', color: colors.gold, background: colors.goldDim, padding: '3px 10px', borderRadius: 999 }}>
                        {phase?.name || `Phase ${week <= 4 ? 1 : week <= 8 ? 2 : 3}`}
                      </span>
                      <span style={{ fontFamily: fonts.body, fontSize: 11, color: colors.textMuted }}>
                        Semaine {week}/{totalWeeks}
                      </span>
                    </div>
                    <div style={{ height: 4, background: colors.goldDim, borderRadius: 2, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${progress * 100}%`, background: colors.gold, borderRadius: 2, transition: 'width 0.5s ease' }} />
                    </div>
                  </>
                )
              })()}
              {activeCustomProgram.total_weeks && (activeCustomProgram.current_week || 1) < activeCustomProgram.total_weeks && (
                <button onClick={advanceWeek} style={{ fontFamily: fonts.body, fontSize: 10, color: colors.textMuted, background: 'none', border: `1px solid ${colors.goldBorder}`, borderRadius: 8, padding: '4px 10px', cursor: 'pointer', marginTop: 6 }}>
                  Semaine suivante →
                </button>
              )}
            </div>
          )}

          {/* Session content */}
          {!coachProgram && !activeCustomProgram ? (
            /* Empty state — no active program */
            <div style={{ textAlign: 'center', padding: '24px 0' }}>
              <Dumbbell size={40} color={colors.textDim} strokeWidth={1.5} />
              <p style={{ ...bodyStyle, marginTop: 12 }}>
                {customPrograms.length > 0 ? 'Aucun programme actif — active un programme' : 'Aucun programme actif'}
              </p>
              <button onClick={() => setShowProgramManager(true)} style={{ ...btnPrimary, width: '100%', padding: 14, marginTop: 16 }}>
                {customPrograms.length > 0 ? 'MES PROGRAMMES' : 'CRÉER UN PROGRAMME'}
              </button>
            </div>
          ) : trainingDayData?.repos ? (
            /* Rest day — enhanced */
            <div style={{ textAlign: 'center', padding: '24px 0' }}>
              <div style={{ width: 56, height: 56, borderRadius: 16, background: colors.goldDim, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                <Moon size={28} color={colors.gold} />
              </div>
              <div style={{ ...statStyle, fontSize: 22, marginBottom: 6 }}>JOUR DE REPOS</div>
              <div style={{ ...bodyStyle, maxWidth: 260, margin: '0 auto' }}>Récupération — ton corps construit du muscle au repos 💪</div>
            </div>
          ) : trainingExercises.length === 0 ? (
            /* No exercises for this day */
            <p style={{ ...bodyStyle, padding: '12px 0' }}>Aucun exercice prévu pour ce jour.</p>
          ) : todaySessionDone && trainingIsToday ? (
            /* Session already done */
            <TrainingSessionDone todayKey={todayKey} coachProgram={coachProgram} />
          ) : (
            /* Active session with exercises */
            <>
              {/* Session name */}
              <div style={{ ...statStyle, fontSize: 28, marginBottom: 8 }}>{(() => {
                if (activeCustomProgram?.days?.length) {
                  const idx = ['lundi','mardi','mercredi','jeudi','vendredi','samedi','dimanche'].indexOf(trainingDay)
                  const paddedDays = padTo7Days(activeCustomProgram.days)
                  const day = paddedDays[idx]
                  if (day?.name && day.name !== 'Repos') return day.name.toUpperCase()
                }
                const todaySession = weekSessions.find((s: any) => s.scheduled_date === todayStr && s.session_type !== 'rest')
                if (todaySession?.title) return todaySession.title.toUpperCase()
                return trainingDay.toUpperCase()
              })()}</div>

              {/* Badge pills — exercises + duration + muscle groups */}
              {(() => {
                const pillStyle: React.CSSProperties = { fontSize: 10, color: colors.gold, background: `${colors.goldContainer}1a`, border: `0.5px solid ${colors.goldContainer}33`, borderRadius: 999, padding: '3px 10px' }
                const muscles = [...new Set(trainingExercises.map((e: any) => e.muscle_group).filter(Boolean))]
                return (
                  <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 6, marginBottom: 12 }}>
                    <span style={pillStyle}>{trainingExercises.length} exercices</span>
                    <span style={pillStyle}>~{Math.round(trainingExercises.length * 10)}min</span>
                    {muscles.map((m: string) => <span key={m} style={pillStyle}>{m}</span>)}
                  </div>
                )
              })()}

              {/* Mini-stats row: SETS · VOLUME · REPOS */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 16 }}>
                {[
                  { label: 'SETS', value: trainingExercises.reduce((s: number, e: any) => s + (Number(e.sets) || 3), 0) },
                  { label: 'EXERCICES', value: trainingExercises.length },
                  { label: 'REPOS', value: `${Math.round(trainingExercises.reduce((s: number, e: any) => s + (Number(e.rest_seconds) || 90), 0) / 60)}min` },
                ].map(s => (
                  <div key={s.label} style={{ background: colors.goldDim, borderRadius: 10, padding: 10, textAlign: 'center' }}>
                    <div style={{ fontFamily: fonts.headline, fontSize: 18, fontWeight: 700, color: colors.text }}>{s.value}</div>
                    <div style={{ fontFamily: fonts.body, fontSize: 8, fontWeight: 700, letterSpacing: '0.1em', color: colors.textMuted, textTransform: 'uppercase' }}>{s.label}</div>
                  </div>
                ))}
              </div>

              {/* Action buttons — DÉMARRER + MODIFIER */}
              <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                {trainingIsToday && !todaySessionDone && !workoutStarted && (
                  <button onClick={() => startProgramWorkout(trainingDayData, trainingExercises)} style={{ ...btnPrimary, flex: 1, padding: 16, borderRadius: 14 }}>
                    DÉMARRER LA SÉANCE
                  </button>
                )}
                {activeCustomProgram && !editMode && !workoutStarted && (
                  <button onClick={startEditMode} style={{ ...btnSecondary, padding: '16px 20px', borderRadius: 14, fontSize: 12, fontWeight: 700, letterSpacing: '0.08em' }}>
                    MODIFIER
                  </button>
                )}
              </div>

              {/* Exercise cards — edit mode */}
              {editMode && editedDays && (() => {
                const dayIdx = ['lundi','mardi','mercredi','jeudi','vendredi','samedi','dimanche'].indexOf(trainingDay)
                const day = editedDays[dayIdx]
                if (!day?.exercises) return null
                return (
                  <div style={{ background: colors.surface, border: `1px solid ${colors.goldRule}`, borderRadius: 16, padding: 16, marginBottom: 8, boxShadow: '0 4px 24px rgba(0,0,0,0.6)' }}>
                    <div style={{ ...labelStyle, fontSize: 10, letterSpacing: 2, marginBottom: 12 }}>MODE EDITION</div>
                    {day.exercises.map((ex: any, i: number) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 0', borderBottom: i < day.exercises.length - 1 ? `1px solid ${colors.goldDim}` : 'none' }}>
                        <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 2 }}>
                          <button onClick={() => editMoveEx(dayIdx, i, -1)} disabled={i === 0} style={{ background: 'none', border: 'none', color: i === 0 ? colors.textDim : colors.gold, fontSize: 12, cursor: 'pointer', padding: '2px 4px' }}>▲</button>
                          <button onClick={() => editMoveEx(dayIdx, i, 1)} disabled={i === day.exercises.length - 1} style={{ background: 'none', border: 'none', color: i === day.exercises.length - 1 ? colors.textDim : colors.gold, fontSize: 12, cursor: 'pointer', padding: '2px 4px' }}>▼</button>
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ ...bodyStyle, color: colors.text, fontWeight: 500 }}>{ex.exercise_name || ex.custom_name || ex.name}</div>
                          <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                              <span style={{ fontFamily: fonts.body, fontSize: 10, color: colors.textMuted }}>Sets</span>
                              <input type="number" min={1} max={10} value={ex.sets ?? ''} onChange={e => { const v=e.target.value; if(v===''){editExField(dayIdx,i,'sets','');return} const n=parseInt(v); if(!isNaN(n))editExField(dayIdx,i,'sets',n) }} style={{ width: 36, padding: '3px 4px', textAlign: 'center' as const, background: colors.background, border: `1px solid ${colors.goldBorder}`, borderRadius: 6, color: colors.gold, fontFamily: fonts.headline, fontSize: 14, outline: 'none' }} />
                            </div>
                            <span style={{ color: colors.textDim, alignSelf: 'center', fontSize: 10 }}>x</span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                              <span style={{ fontFamily: fonts.body, fontSize: 10, color: colors.textMuted }}>Reps</span>
                              <input type="number" min={1} max={50} value={ex.reps ?? ''} onChange={e => { const v=e.target.value; if(v===''){editExField(dayIdx,i,'reps','');return} const n=parseInt(v); if(!isNaN(n))editExField(dayIdx,i,'reps',n) }} style={{ width: 36, padding: '3px 4px', textAlign: 'center' as const, background: colors.background, border: `1px solid ${colors.goldBorder}`, borderRadius: 6, color: colors.gold, fontFamily: fonts.headline, fontSize: 14, outline: 'none' }} />
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                              <span style={{ fontFamily: fonts.body, fontSize: 10, color: colors.textMuted }}>Repos</span>
                              <input type="number" min={0} max={300} step={15} value={ex.rest_seconds ?? ''} onChange={e => { const v=e.target.value; if(v===''){editExField(dayIdx,i,'rest_seconds','');return} const n=parseInt(v); if(!isNaN(n))editExField(dayIdx,i,'rest_seconds',n) }} style={{ width: 42, padding: '3px 4px', textAlign: 'center' as const, background: colors.background, border: `1px solid ${colors.goldBorder}`, borderRadius: 6, color: colors.gold, fontFamily: fonts.headline, fontSize: 14, outline: 'none' }} />
                              <span style={{ fontFamily: fonts.body, fontSize: 10, color: colors.textMuted }}>s</span>
                            </div>
                          </div>
                          {/* Tempo */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: 3, marginTop: 6 }}>
                            <span style={{ fontFamily: fonts.body, fontSize: 10, color: colors.textMuted }}>Tempo</span>
                            {[0, 1, 2].map(idx => {
                              const parts = (ex.tempo || '2-0-2').split('-')
                              return (
                                <span key={idx} style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                  <input type="number" min={0} max={9} value={parts[idx] || (idx === 1 ? '0' : '2')} onChange={e => { const p = [...parts]; p[idx] = e.target.value; editExField(dayIdx, i, 'tempo', p.join('-')) }} style={{ width: 28, padding: '3px 2px', textAlign: 'center' as const, background: colors.background, border: `1px solid ${colors.goldBorder}`, borderRadius: 6, color: colors.gold, fontFamily: fonts.headline, fontSize: 12, outline: 'none' }} />
                                  {idx < 2 && <span style={{ color: colors.textDim, fontSize: 10 }}>-</span>}
                                </span>
                              )
                            })}
                          </div>
                        </div>
                        <button onClick={() => loadExerciseInfo(ex.exercise_name || ex.custom_name || ex.name)} style={{ background: 'rgba(212,168,67,0.06)', border: `1px solid ${colors.goldBorder}`, borderRadius: 8, width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, cursor: 'pointer', flexShrink: 0 }}>ℹ️</button>
                        <button onClick={() => loadEditVariants(ex.exercise_name || ex.custom_name || ex.name, dayIdx, i)} style={{ background: 'rgba(212,168,67,0.08)', border: '1px solid rgba(212,168,67,0.2)', borderRadius: 8, width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, cursor: 'pointer', flexShrink: 0 }}>🔄</button>
                        <button onClick={() => editRemoveEx(dayIdx, i)} style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 8, width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', color: colors.error, fontSize: 14, cursor: 'pointer', flexShrink: 0 }}>✕</button>
                      </div>
                    ))}
                    <button onClick={() => { setShowAddExercise(true); setExerciseSearchQ('') }} style={{ width: '100%', padding: 10, marginTop: 8, background: 'transparent', border: `1.5px dashed ${colors.goldRule}`, borderRadius: 16, color: colors.gold, fontFamily: fonts.body, fontSize: 12, fontWeight: 700, letterSpacing: 2, cursor: 'pointer' }}>+ AJOUTER UN EXERCICE</button>
                    {/* Save / Cancel edit buttons */}
                    <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                      <button onClick={saveEditedProgram} style={{ ...btnPrimary, flex: 1, padding: 12, borderRadius: 12 }}>SAUVEGARDER</button>
                      <button onClick={() => { setEditMode(false); setEditedDays(null) }} style={{ ...btnSecondary, flex: 1, padding: 12, borderRadius: 12 }}>ANNULER</button>
                    </div>
                  </div>
                )
              })()}

              {/* Normal exercise cards (with superset grouping) */}
              {trainingExercises.map((ex: any, exIdx: number) => {
                const storageKey = `moovx-sets-${todayStr}-${ex.name}`
                const n = Number(ex.sets) || 3
                const setsArr: boolean[] = completedSets[storageKey] || Array.from({ length: n }, () => false)
                const numSets = setsArr.length
                const inputs = setInputs[ex.name] || Array.from({ length: numSets }, () => ({ kg: '', reps: String(ex.reps || '') }))
                // Check if this exercise is part of a superset pair
                const nextEx = trainingExercises[exIdx + 1]
                const isSupersetStart = ex.technique === 'superset' && ex.technique_details && nextEx
                const prevEx = exIdx > 0 ? trainingExercises[exIdx - 1] : null
                const isSupersetEnd = prevEx?.technique === 'superset' && prevEx?.technique_details?.toLowerCase() === ex.name?.toLowerCase()

                return (
                  <div key={ex.name}>
                    {/* Superset grouping bar */}
                    {isSupersetStart && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '4px 0' }}>
                        <div style={{ width: 3, height: 20, background: colors.gold, borderRadius: 2 }} />
                        <span style={{ fontFamily: fonts.headline, fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: colors.gold }}>SUPERSET</span>
                        <div style={{ flex: 1, height: 1, background: `${colors.gold}30` }} />
                      </div>
                    )}
                    <div style={isSupersetStart || isSupersetEnd ? { borderLeft: `3px solid ${colors.gold}`, paddingLeft: 8 } : {}}>
                      <TrainingExerciseCard
                        ex={ex}
                        exIdx={exIdx}
                        setsArr={setsArr}
                        inputs={inputs}
                        trainingIsToday={trainingIsToday}
                        restRunning={restRunning}
                        restingSet={restingSet}
                        restTimer={restTimer}
                        onToggleSet={toggleSet}
                        onAddSet={addSet}
                        onUpdateInput={updateInput}
                        onExerciseInfo={handleExerciseInfo}
                        fmtRest={fmtRest}
                        onCancelRest={cancelRest}
                        onVideoFeedback={(name: string) => setVideoExercise(name)}
                        onTechniqueInfo={(t: string) => setTechniqueTooltip(t)}
                        supabase={supabase}
                        userId={session?.user?.id}
                      />
                    </div>
                    {isSupersetEnd && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '4px 0' }}>
                        <div style={{ width: 3, height: 10, background: colors.gold, borderRadius: 2 }} />
                        <div style={{ flex: 1, height: 1, background: `${colors.gold}30` }} />
                      </div>
                    )}
                  </div>
                )
              })}

              {/* ── Add Exercise to Session ── */}
              {trainingIsToday && (workoutStarted || trainingDoneSets > 0) && (
                <button onClick={() => { setShowAddExercise(true); setExerciseSearchQ('') }} style={{ width: '100%', padding: 14, background: 'transparent', border: `1.5px dashed rgba(212,168,67,0.4)`, borderRadius: 16, color: colors.gold, fontFamily: fonts.headline, fontSize: 16, letterSpacing: 2, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                  + AJOUTER UN EXERCICE
                </button>
              )}

              {/* ── Browse Exercise DB ── */}
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={() => setShowExDbModal(true)}
                style={{ width: '100%', background: colors.surface, border: `2px dashed ${colors.goldBorder}`, borderRadius: 16, padding: '16px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, boxShadow: '0 4px 24px rgba(0,0,0,0.6)' }}
              >
                <Search size={16} color={colors.gold} />
                <span style={{ ...labelStyle, fontSize: 13, fontWeight: 800, letterSpacing: '2px' }}>Découvrir les exercices</span>
              </motion.button>

              {/* ── Start Workout Button ── */}
              {trainingIsToday && !todaySessionDone && (
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={() => startProgramWorkout(trainingDayData, trainingExercises)}
                  style={{
                    width: '100%', background: colors.gold, color: '#0D0B08',
                    fontWeight: 400, padding: '18px', borderRadius: 16, border: 'none',
                    cursor: 'pointer',
                    fontFamily: fonts.headline, fontSize: 20, letterSpacing: '0.15em',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                  }}
                >
                  DÉMARRER LA SÉANCE
                </motion.button>
              )}

              {/* ── Bottom Finish Button (when session not yet started but sets done) ── */}
              {trainingIsToday && !workoutStarted && trainingDoneSets > 0 && (
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={handleFinishWithCheck}
                  style={{
                    width: '100%', background: colors.success, color: '#0D0B08',
                    fontWeight: 700, padding: '16px', borderRadius: 16, border: 'none',
                    cursor: 'pointer',
                    fontFamily: fonts.body, fontSize: 13, letterSpacing: '2px', textTransform: 'uppercase' as const,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                  }}
                >
                  <Award size={18} color="#0D0B08" />
                  Terminer la séance
                </motion.button>
              )}
            </>
          )}
        </div>

        {/* Séance libre button — always visible */}
        <button
          onClick={() => startProgramWorkout({ day_name: 'Séance libre' }, [])}
          style={{
            ...btnSecondary, width: '100%', padding: 14, marginTop: 10,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          }}
        >
          + SÉANCE LIBRE
        </button>
      </div>

      {/* ═══ SECTION 4 — ACTIVE SESSION BAR ═══ */}
      <TrainingActiveBar
        workoutStarted={workoutStarted}
        elapsedSecs={elapsedSecs}
        trainingDoneSets={trainingDoneSets}
        trainingTotalSets={trainingTotalSets}
        onFinish={handleFinishWithCheck}
        fmtElapsed={fmtElapsed}
      />

      {/* ═══ SECTION 5 — DERNIÈRES SÉANCES ═══ */}
      <div style={{ padding: '0 24px', marginTop: 24, marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
          <span style={{ ...statSmallStyle, color: colors.text, letterSpacing: 3 }}>DERNIÈRES SÉANCES</span>
          <div style={{ flex: 1, height: 1, background: 'linear-gradient(90deg, rgba(212,168,67,0.25), transparent)' }} />
          <span style={mutedStyle}>{workoutHistory.length} seances</span>
        </div>
        <div style={{ display: 'flex', gap: 6, overflowX: 'auto', marginBottom: 14, paddingBottom: 4, WebkitOverflowScrolling: 'touch' as any }}>
          {HISTORY_FILTERS.map(f => (
            <button key={f.key} onClick={() => setHistoryFilter(f.key)} style={{ padding: '7px 14px', borderRadius: 16, whiteSpace: 'nowrap', border: historyFilter === f.key ? `1px solid ${colors.gold}` : `1px solid ${colors.goldDim}`, background: historyFilter === f.key ? colors.goldDim : 'transparent', color: historyFilter === f.key ? colors.gold : colors.textMuted, fontFamily: fonts.body, fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', cursor: 'pointer', flexShrink: 0 }}>{f.label}</button>
          ))}
        </div>
        {(() => {
          const filtered = workoutHistory.filter(s => {
            if (historyFilter === 'all') return true
            const resolved = resolveSessionType(s.name)
            return resolved.key === historyFilter
          })
          if (filtered.length === 0) return <div style={{ textAlign: 'center', padding: '24px 0', ...bodyStyle, color: colors.textDim }}>Aucune séance</div>
          const limit = showFullHistory ? 20 : 3
          return (
            <>
              {filtered.slice(0, limit).map((s: any) => {
                const d = new Date(s.created_at)
                const typeInfo = resolveSessionType(s.name)
                return (
                  <div key={s.id} onClick={() => openWorkoutDetail(s)} style={{ background: colors.surface, border: `1px solid ${colors.goldDim}`, borderRadius: 16, padding: 16, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer', boxShadow: '0 4px 24px rgba(0,0,0,0.6)' }}>
                    <div style={{ width: 44, height: 44, borderRadius: 12, background: `${typeInfo.color}15`, border: `1px solid ${typeInfo.color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>{typeInfo.emoji}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ ...statSmallStyle, fontSize: 17, color: colors.text, letterSpacing: 1 }}>{typeInfo.label.toUpperCase()}</div>
                      {s.name && s.name.toLowerCase() !== typeInfo.label.toLowerCase() && s.name.includes('—') && (
                        <div style={{ ...mutedStyle, fontSize: 11, color: colors.gold, marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {s.name.split('—').slice(1).join('—').trim()}
                        </div>
                      )}
                      <div style={{ ...mutedStyle, fontSize: 11, marginTop: 2 }}>
                        {d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
                        {s.duration_minutes ? ` · ${s.duration_minutes}min` : ''}
                        {s.notes ? ` · ${s.notes}` : ''}
                      </div>
                    </div>
                  </div>
                )
              })}
              {filtered.length > 3 && !showFullHistory && (
                <button onClick={() => setShowFullHistory(true)} style={{ width: '100%', padding: 12, background: 'transparent', border: `1px solid ${colors.goldDim}`, borderRadius: 16, color: colors.gold, fontFamily: fonts.body, fontSize: 12, fontWeight: 700, letterSpacing: 2, cursor: 'pointer', textAlign: 'center', marginTop: 4 }}>
                  Voir tout →
                </button>
              )}
              {showFullHistory && filtered.length > 3 && (
                <button onClick={() => setShowFullHistory(false)} style={{ width: '100%', padding: 12, background: 'transparent', border: `1px solid ${colors.goldDim}`, borderRadius: 16, color: colors.textMuted, fontFamily: fonts.body, fontSize: 12, fontWeight: 700, letterSpacing: 2, cursor: 'pointer', textAlign: 'center', marginTop: 4 }}>
                  Réduire
                </button>
              )}
            </>
          )
        })()}
      </div>

      {/* ═══ SECTION — BIBLIOTHÈQUE D'EXERCICES ═══ */}
      <div style={{ padding: '0 24px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
          <span style={titleStyle}>EXERCICES</span>
          <div style={titleLineStyle} />
          <button onClick={() => setLibShowAll(true)} style={{ ...labelStyle, fontSize: 10, letterSpacing: 1, flexShrink: 0 }}>Voir tout →</button>
        </div>
        <div style={{ ...cardStyle, padding: 16 }}>
          {/* Search */}
          <div style={{ position: 'relative', marginBottom: 12 }}>
            <Search size={14} color={colors.textDim} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
            <input
              value={libSearch} onChange={e => setLibSearch(e.target.value)}
              placeholder="Rechercher un exercice..."
              style={{ width: '100%', background: colors.background, border: `1px solid ${colors.goldBorder}`, borderRadius: 12, padding: '10px 12px 10px 34px', color: colors.text, fontFamily: fonts.body, fontSize: 13, outline: 'none' }}
            />
          </div>
          {/* Muscle filter pills */}
          <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 8, marginBottom: 12, scrollbarWidth: 'none' }}>
            {['Tous', 'Pectoraux', 'Dos', 'Épaules', 'Biceps', 'Triceps', 'Jambes', 'Abdos', 'Fessiers', 'Mollets'].map(m => (
              <button key={m} onClick={() => setLibMuscle(m)} style={{
                fontSize: 9, fontFamily: fonts.body, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em',
                padding: '4px 10px', borderRadius: 999, whiteSpace: 'nowrap', cursor: 'pointer', border: 'none',
                background: libMuscle === m ? `${colors.goldContainer}33` : colors.goldDim,
                color: libMuscle === m ? colors.gold : colors.textMuted,
                ...(libMuscle === m ? { boxShadow: `inset 0 0 0 1px ${colors.goldContainer}66` } : { boxShadow: `inset 0 0 0 1px ${colors.goldBorder}` }),
              }}>{m}</button>
            ))}
          </div>
          {/* Exercise list */}
          {(() => {
            const filtered = exercisesCache.filter(e => {
              if (libMuscle !== 'Tous' && e.muscle_group?.toLowerCase() !== libMuscle.toLowerCase()) return false
              if (libSearch && !e.name?.toLowerCase().includes(libSearch.toLowerCase())) return false
              return true
            })
            const shown = filtered.slice(0, 5)
            return shown.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {shown.map((ex: any) => (
                  <button key={ex.id} onClick={() => setLibDetail(ex)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 4px', background: 'transparent', border: 'none', cursor: 'pointer', width: '100%', textAlign: 'left', borderBottom: `1px solid ${colors.goldDim}` }}>
                    <div style={{ width: 48, height: 48, borderRadius: 8, overflow: 'hidden', background: colors.surfaceHigh, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {ex.gif_url ? (
                        <img src={ex.gif_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <Dumbbell size={20} color={colors.textDim} />
                      )}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: colors.text, fontFamily: fonts.body, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ex.name}</div>
                      <div style={{ display: 'flex', gap: 4, marginTop: 2, flexWrap: 'wrap' }}>
                        {ex.muscle_group && <span style={{ fontSize: 9, fontFamily: fonts.body, fontWeight: 700, color: colors.gold, background: colors.goldDim, padding: '1px 6px', borderRadius: 999, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{ex.muscle_group}</span>}
                      </div>
                      {ex.equipment && <div style={{ fontSize: 10, color: colors.textDim, fontFamily: fonts.body, marginTop: 2 }}>{ex.equipment}</div>}
                    </div>
                    <ChevronRight size={16} color={colors.textDim} style={{ flexShrink: 0 }} />
                  </button>
                ))}
                {filtered.length > 5 && (
                  <button onClick={() => setLibShowAll(true)} style={{ padding: '8px 0', background: 'transparent', border: 'none', color: colors.gold, fontFamily: fonts.body, fontSize: 11, fontWeight: 700, letterSpacing: 1, cursor: 'pointer', textAlign: 'center' }}>
                    +{filtered.length - 5} exercices · Voir tout
                  </button>
                )}
              </div>
            ) : (
              <div style={{ ...bodyStyle, textAlign: 'center', padding: 16, fontStyle: 'italic' }}>Aucun exercice trouvé.</div>
            )
          })()}
        </div>
      </div>

      {/* Exercise detail modal */}
      {libDetail && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
          <div style={{ background: colors.background, border: `1px solid ${colors.goldBorder}`, borderRadius: '20px 20px 0 0', width: '100%', maxWidth: 480, maxHeight: '85vh', overflow: 'auto', padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <span style={{ ...titleStyle, fontSize: 16 }}>{libDetail.name}</span>
              <button onClick={() => setLibDetail(null)} style={{ background: colors.surfaceHigh, border: 'none', borderRadius: '50%', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><X size={16} color={colors.text} /></button>
            </div>
            {/* Video */}
            {libDetail.video_url && (
              <video src={libDetail.video_url} controls autoPlay loop muted playsInline style={{ width: '100%', borderRadius: 12, marginBottom: 16, maxHeight: 240, objectFit: 'cover' }} />
            )}
            {!libDetail.video_url && libDetail.gif_url && (
              <img src={libDetail.gif_url} alt="" style={{ width: '100%', borderRadius: 12, marginBottom: 16, maxHeight: 240, objectFit: 'cover' }} />
            )}
            {/* Info */}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
              {libDetail.muscle_group && <span style={{ fontSize: 10, fontFamily: fonts.body, fontWeight: 700, color: colors.gold, background: colors.goldDim, padding: '3px 10px', borderRadius: 999, textTransform: 'uppercase' }}>{libDetail.muscle_group}</span>}
              {libDetail.difficulty && <span style={{ fontSize: 10, fontFamily: fonts.body, fontWeight: 700, color: colors.textMuted, background: colors.surfaceHigh, padding: '3px 10px', borderRadius: 999, textTransform: 'uppercase' }}>{libDetail.difficulty}</span>}
              {libDetail.equipment && <span style={{ fontSize: 10, fontFamily: fonts.body, fontWeight: 700, color: colors.textMuted, background: colors.surfaceHigh, padding: '3px 10px', borderRadius: 999, textTransform: 'uppercase' }}>{libDetail.equipment}</span>}
            </div>
            {libDetail.description && <p style={{ ...bodyStyle, lineHeight: 1.6, marginBottom: 16 }}>{libDetail.description}</p>}
            {libDetail.execution_tips && <p style={{ ...mutedStyle, lineHeight: 1.5, marginBottom: 16 }}>{libDetail.execution_tips}</p>}
            <button onClick={() => {
              startProgramWorkout({ day_name: 'Séance libre' }, [{ exercise_name: libDetail.name, muscle_group: libDetail.muscle_group, sets: 3, reps: 10, rest_seconds: 90, video_url: libDetail.video_url, gif_url: libDetail.gif_url }])
              setLibDetail(null)
            }} style={{ ...btnPrimary, width: '100%', padding: '14px 0', fontSize: 13, textAlign: 'center' }}>
              AJOUTER À MA SÉANCE
            </button>
          </div>
        </div>
      )}

      {/* Exercise library fullscreen modal */}
      {libShowAll && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 200, background: colors.background, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', paddingTop: 'max(16px, env(safe-area-inset-top))', borderBottom: `1px solid ${colors.goldBorder}`, display: 'flex', alignItems: 'center', gap: 12 }}>
            <button onClick={() => setLibShowAll(false)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 4 }}><X size={22} color={colors.text} /></button>
            <span style={{ ...titleStyle, fontSize: 16, flex: 1 }}>BIBLIOTHÈQUE</span>
          </div>
          <div style={{ padding: '12px 20px' }}>
            <div style={{ position: 'relative' }}>
              <Search size={14} color={colors.textDim} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
              <input value={libSearch} onChange={e => setLibSearch(e.target.value)} placeholder="Rechercher..." style={{ width: '100%', background: colors.surface, border: `1px solid ${colors.goldBorder}`, borderRadius: 12, padding: '10px 12px 10px 34px', color: colors.text, fontFamily: fonts.body, fontSize: 13, outline: 'none' }} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 6, padding: '0 20px 8px', overflowX: 'auto', scrollbarWidth: 'none' }}>
            {['Tous', 'Pectoraux', 'Dos', 'Épaules', 'Biceps', 'Triceps', 'Jambes', 'Abdos', 'Fessiers', 'Mollets'].map(m => (
              <button key={m} onClick={() => setLibMuscle(m)} style={{
                fontSize: 9, fontFamily: fonts.body, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em',
                padding: '4px 10px', borderRadius: 999, whiteSpace: 'nowrap', cursor: 'pointer', border: 'none',
                background: libMuscle === m ? `${colors.goldContainer}33` : colors.goldDim,
                color: libMuscle === m ? colors.gold : colors.textMuted,
                ...(libMuscle === m ? { boxShadow: `inset 0 0 0 1px ${colors.goldContainer}66` } : { boxShadow: `inset 0 0 0 1px ${colors.goldBorder}` }),
              }}>{m}</button>
            ))}
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: '0 20px 100px' }}>
            {exercisesCache.filter(e => {
              if (libMuscle !== 'Tous' && e.muscle_group?.toLowerCase() !== libMuscle.toLowerCase()) return false
              if (libSearch && !e.name?.toLowerCase().includes(libSearch.toLowerCase())) return false
              return true
            }).map((ex: any) => (
              <button key={ex.id} onClick={() => { setLibDetail(ex); setLibShowAll(false) }} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', background: 'transparent', border: 'none', cursor: 'pointer', width: '100%', textAlign: 'left', borderBottom: `1px solid ${colors.goldDim}` }}>
                <div style={{ width: 48, height: 48, borderRadius: 8, overflow: 'hidden', background: colors.surfaceHigh, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {ex.gif_url ? <img src={ex.gif_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <Dumbbell size={20} color={colors.textDim} />}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: colors.text, fontFamily: fonts.body }}>{ex.name}</div>
                  <div style={{ display: 'flex', gap: 4, marginTop: 2 }}>
                    {ex.muscle_group && <span style={{ fontSize: 9, fontFamily: fonts.body, fontWeight: 700, color: colors.gold, background: colors.goldDim, padding: '1px 6px', borderRadius: 999, textTransform: 'uppercase' }}>{ex.muscle_group}</span>}
                  </div>
                  {ex.equipment && <div style={{ fontSize: 10, color: colors.textDim, fontFamily: fonts.body, marginTop: 2 }}>{ex.equipment}</div>}
                </div>
                <ChevronRight size={16} color={colors.textDim} />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ═══ SECTION — ALTERNATIVES ═══ */}
      <div style={{ padding: '0 24px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
          <span style={titleStyle}>ALTERNATIVES</span>
          <div style={titleLineStyle} />
          <ArrowRightLeft size={14} color={colors.gold} style={{ flexShrink: 0 }} />
        </div>
        <div style={{ ...cardStyle, padding: 16 }}>
          <p style={{ ...bodyStyle, marginTop: 0, marginBottom: 12, lineHeight: 1.5 }}>
            Tu n&apos;as pas la machine ? Trouve un exercice équivalent qui cible les mêmes muscles.
          </p>
          {/* Search input */}
          <div style={{ position: 'relative', marginBottom: 12 }}>
            <Search size={14} color={colors.textDim} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
            <input
              value={altSearch}
              onChange={e => {
                setAltSearch(e.target.value)
                setAltSelected(null)
                setAltResults([])
              }}
              placeholder="Quel exercice veux-tu remplacer ?"
              style={{ width: '100%', background: colors.background, border: `1px solid ${colors.goldBorder}`, borderRadius: 12, padding: '10px 12px 10px 34px', color: colors.text, fontFamily: fonts.body, fontSize: 13, outline: 'none' }}
            />
          </div>
          {/* Suggestions dropdown */}
          {altSearch.length >= 2 && !altSelected && (
            <div style={{ maxHeight: 160, overflowY: 'auto', marginBottom: 8, borderRadius: 12, border: `1px solid ${colors.goldBorder}`, background: colors.surface }}>
              {exercisesCache.filter(e => e.name?.toLowerCase().includes(altSearch.toLowerCase())).slice(0, 8).map((ex: any) => (
                <button key={ex.id} onClick={async () => {
                  setAltSelected(ex)
                  setAltSearch(ex.name)
                  // Find alternatives: same muscle_group, different name
                  const alts = exercisesCache.filter(a =>
                    a.id !== ex.id &&
                    a.muscle_group?.toLowerCase() === ex.muscle_group?.toLowerCase() &&
                    a.name !== ex.name
                  ).slice(0, 3)
                  setAltResults(alts)
                }} style={{ display: 'block', width: '100%', padding: '8px 12px', background: 'transparent', border: 'none', borderBottom: `1px solid ${colors.goldDim}`, cursor: 'pointer', textAlign: 'left' }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: colors.text, fontFamily: fonts.body }}>{ex.name}</div>
                  <div style={{ fontSize: 9, color: colors.textDim, fontFamily: fonts.body }}>{ex.muscle_group} · {ex.equipment || 'N/A'}</div>
                </button>
              ))}
            </div>
          )}
          {/* Quick pills from active program */}
          {!altSelected && activeCustomProgram?.days && (
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
              {(() => {
                const exNames: string[] = []
                activeCustomProgram.days.forEach((d: any) => {
                  (d.exercises || []).forEach((e: any) => {
                    const n = e.exercise_name || e.name
                    if (n && !exNames.includes(n)) exNames.push(n)
                  })
                })
                return exNames.slice(0, 6).map(n => {
                  const match = exercisesCache.find(e => e.name === n)
                  return (
                    <button key={n} onClick={() => {
                      if (match) {
                        setAltSelected(match)
                        setAltSearch(match.name)
                        const alts = exercisesCache.filter(a => a.id !== match.id && a.muscle_group?.toLowerCase() === match.muscle_group?.toLowerCase() && a.name !== match.name).slice(0, 3)
                        setAltResults(alts)
                      }
                    }} style={{ fontSize: 9, fontFamily: fonts.body, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', padding: '4px 10px', borderRadius: 999, whiteSpace: 'nowrap', cursor: 'pointer', border: 'none', background: colors.goldDim, color: colors.textMuted, boxShadow: `inset 0 0 0 1px ${colors.goldBorder}` }}>
                      {n}
                    </button>
                  )
                })
              })()}
            </div>
          )}
          {/* Alternatives results */}
          {altSelected && altResults.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {altResults.map((alt: any) => (
                <div key={alt.id} style={{ background: colors.surfaceHigh, border: `1px solid ${colors.goldBorder}`, borderRadius: 12, padding: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: colors.text, fontFamily: fonts.body }}>{alt.name}</div>
                    <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
                      <span style={{ fontSize: 9, fontFamily: fonts.body, fontWeight: 700, color: colors.success, background: 'rgba(74,222,128,0.1)', padding: '1px 6px', borderRadius: 999, textTransform: 'uppercase' }}>MÊME CIBLAGE</span>
                      {alt.equipment && <span style={{ fontSize: 9, fontFamily: fonts.body, color: colors.textDim, background: colors.goldDim, padding: '1px 6px', borderRadius: 999 }}>{alt.equipment}</span>}
                    </div>
                  </div>
                  <button onClick={async () => {
                    if (!activeCustomProgram?.id) return
                    const updated = activeCustomProgram.days.map((d: any) => ({
                      ...d,
                      exercises: (d.exercises || []).map((e: any) => {
                        const n = e.exercise_name || e.name
                        if (n === altSelected.name) return { ...e, exercise_name: alt.name, name: alt.name, muscle_group: alt.muscle_group }
                        return e
                      })
                    }))
                    await supabase.from('custom_programs').update({ days: updated }).eq('id', activeCustomProgram.id)
                    setActiveCustomProgram({ ...activeCustomProgram, days: updated })
                    setAltSelected(null)
                    setAltSearch('')
                    setAltResults([])
                    toast.success(`${altSelected.name} → ${alt.name}`)
                  }} style={{ ...btnPrimary, padding: '8px 14px', fontSize: 10, flexShrink: 0 }}>
                    REMPLACER
                  </button>
                </div>
              ))}
            </div>
          )}
          {altSelected && altResults.length === 0 && (
            <div style={{ ...mutedStyle, textAlign: 'center', padding: 12, fontStyle: 'italic' }}>Aucune alternative trouvée pour ce muscle.</div>
          )}
        </div>
      </div>

      {/* ═══ SECTION 6 — CARDIO ═══ */}
      <div style={{ padding: '0 24px 16px' }}>
        <CardioSection supabase={supabase} userId={session?.user?.id || ''} weight={80} />
      </div>

      {/* ═══ SECTION 7 — PROGRAM MANAGER MODAL (fullscreen) ═══ */}
      {showProgramManager && (
        <div style={{ position: 'fixed', inset: 0, background: colors.background, zIndex: 300, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* Header */}
          <div style={{ padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `1px solid ${colors.goldBorder}`, flexShrink: 0 }}>
            <span style={pageTitleStyle}>MES PROGRAMMES</span>
            <button onClick={() => { setShowProgramManager(false); setExpandedProgram(null); setConfirmDelete(null) }} style={{ width: 36, height: 36, borderRadius: 12, background: colors.surface, border: `1px solid ${colors.goldBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: colors.textMuted, fontSize: 16 }}>✕</button>
          </div>

          {/* Hidden file input for import */}
          <input ref={importFileRef} type="file" accept=".xlsx,.xls" style={{ display: 'none' }} onChange={async (e) => {
            const file = e.target.files?.[0]
            if (!file) return
            const result = await parseProgramFromXlsx(file)
            if (!result.success) { toast.error(result.error || 'Erreur'); return }
            if (result.program) {
              setImportPreview(result.program)
              setImportName(result.program.name)
              setImportSkipped(result.skippedSheets || [])
            }
            e.target.value = ''
          }} />

          {/* Scrollable content */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '16px 24px 100px' }}>
            {/* Create + Import buttons */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
              <button onClick={() => { setEditingProgram(null); setShowProgramBuilder(true); setShowProgramManager(false) }} style={{ ...btnPrimary, flex: 1, padding: 16 }}>
                + CRÉER
              </button>
              <button onClick={() => importFileRef.current?.click()} style={{ ...btnSecondary, flex: 1, padding: 16 }}>
                IMPORTER (.XLSX)
              </button>
            </div>

            {/* Program list */}
            {customPrograms.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 0' }}>
                <Dumbbell size={48} color={colors.textDim} strokeWidth={1.5} />
                <p style={{ ...bodyStyle, marginTop: 12 }}>Aucun programme créé</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {customPrograms.map((prog: any) => {
                  const isExpanded = expandedProgram === prog.id
                  const days = prog.days || []

                  return (
                    <div key={prog.id} style={{ ...cardStyle, padding: 0, overflow: 'hidden', opacity: prog.is_active ? 1 : 0.7 }}>
                      {/* Program header — always visible */}
                      <button
                        onClick={() => setExpandedProgram(isExpanded ? null : prog.id)}
                        style={{ width: '100%', padding: 20, background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}
                      >
                        <div>
                          <div style={{ fontFamily: fonts.headline, fontSize: 16, fontWeight: 700, color: prog.is_active ? colors.gold : colors.text, letterSpacing: '0.05em' }}>{prog.name}</div>
                          <div style={{ ...mutedStyle, marginTop: 4 }}>
                            {days.length} jours · {prog.source === 'ai' ? '🤖 IA' : prog.source === 'import' ? '📥 Import' : '📋 Manuel'}
                            {prog.total_weeks && ` · ${prog.total_weeks} sem.`}
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          {prog.total_weeks && (
                            <span style={{ fontSize: 10, fontWeight: 700, color: colors.gold, background: colors.goldDim, padding: '3px 8px', borderRadius: 999 }}>
                              {prog.total_weeks} SEM
                            </span>
                          )}
                          {prog.is_active ? (
                            <span style={{ fontSize: 10, fontWeight: 700, color: colors.success, background: 'rgba(74,222,128,0.1)', padding: '3px 10px', borderRadius: 999 }}>● Actif</span>
                          ) : prog.scheduled ? (
                            <span style={{ fontSize: 10, fontWeight: 700, color: colors.gold, background: colors.goldDim, padding: '3px 10px', borderRadius: 999 }}>📅 {new Date(prog.start_date + 'T00:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }).toUpperCase()}</span>
                          ) : (
                            <span style={{ fontSize: 10, fontWeight: 700, color: colors.textMuted, background: 'rgba(255,255,255,0.05)', padding: '3px 10px', borderRadius: 999 }}>○ Inactif</span>
                          )}
                          <span style={{ color: colors.textMuted, fontSize: 14, transition: 'transform 0.2s', transform: isExpanded ? 'rotate(180deg)' : 'rotate(0)' }}>▼</span>
                        </div>
                      </button>

                      {/* Expanded content — accordion */}
                      {isExpanded && (
                        <div style={{ padding: '0 20px 20px', borderTop: `1px solid ${colors.goldBorder}` }}>
                          {/* Action buttons */}
                          <div style={{ display: 'flex', gap: 8, marginTop: 16, marginBottom: 16 }}>
                            {prog.is_active ? (
                              <button onClick={() => deactivateProgram(prog.id)} style={{ flex: 1, padding: '10px 0', background: 'rgba(74,222,128,0.08)', border: `1px solid rgba(74,222,128,0.3)`, borderRadius: 12, color: colors.success, fontFamily: fonts.body, fontSize: 12, fontWeight: 700, cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.08em' }}>DÉSACTIVER</button>
                            ) : (
                              <button onClick={() => activateProgram(prog.id)} style={{ flex: 1, padding: '10px 0', background: colors.goldDim, border: `1px solid ${colors.gold}`, borderRadius: 12, color: colors.gold, fontFamily: fonts.body, fontSize: 12, fontWeight: 700, cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.08em' }}>ACTIVER</button>
                            )}
                            <button onClick={() => { setEditingProgram(prog); setShowProgramBuilder(true); setShowProgramManager(false) }} style={{ flex: 1, padding: '10px 0', background: 'transparent', border: `1px solid ${colors.goldBorder}`, borderRadius: 12, color: colors.textMuted, fontFamily: fonts.body, fontSize: 12, fontWeight: 700, cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.08em' }}>✏️ ÉDITER</button>
                            <button onClick={() => exportProgramToXlsx(prog)} style={{ padding: '10px 14px', background: 'transparent', border: `1px solid ${colors.goldBorder}`, borderRadius: 12, color: colors.textMuted, fontFamily: fonts.body, fontSize: 12, fontWeight: 700, cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.08em' }}>⬇️</button>
                          </div>

                          {/* Days list */}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            {padTo7Days(days).map((day: any, di: number) => {
                              const exList = day.exercises || []
                              return (
                                <div key={di} style={{ background: colors.surfaceHigh, border: `1px solid ${colors.goldBorder}`, borderRadius: 12, padding: 16 }}>
                                  {/* Day header */}
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: day.is_rest ? 0 : 8 }}>
                                    <div style={{ ...titleStyle, fontSize: 12 }}>
                                      Jour {di + 1} : {day.is_rest ? 'Repos' : (day.name || day.weekday || `Séance ${di + 1}`)}
                                      {!day.is_rest && day.focus && <span style={{ color: colors.textMuted, fontWeight: 400, marginLeft: 6 }}>({day.focus})</span>}
                                    </div>
                                    {day.is_rest ? (
                                      <Moon size={14} color={colors.textDim} />
                                    ) : (
                                      <span style={{ ...mutedStyle, fontSize: 10 }}>{exList.length} ex.</span>
                                    )}
                                  </div>

                                  {/* Exercise list (if not rest) */}
                                  {!day.is_rest && exList.length > 0 && (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                      {exList.map((ex: any, ei: number) => {
                                        const exName = ex.exercise_name || ex.custom_name || ex.name || ex.exerciseName || `Exercice ${ei + 1}`
                                        return (
                                          <div key={ei} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                            <span style={{ color: colors.gold, fontSize: 10 }}>•</span>
                                            <span style={{ ...bodyStyle, fontSize: 13, flex: 1, minWidth: 0 }}>{exName}</span>
                                            <span style={{ ...mutedStyle, fontSize: 11, flexShrink: 0 }}>{ex.sets || 3}×{ex.reps || 10}</span>
                                          </div>
                                        )
                                      })}
                                    </div>
                                  )}
                                  {!day.is_rest && exList.length === 0 && (
                                    <span style={{ ...mutedStyle, fontSize: 12 }}>Aucun exercice</span>
                                  )}
                                </div>
                              )
                            })}
                          </div>

                          {/* Delete button with confirmation */}
                          <div style={{ marginTop: 16, borderTop: `1px solid ${colors.goldBorder}`, paddingTop: 16 }}>
                            {confirmDelete === prog.id ? (
                              <div style={{ display: 'flex', gap: 8 }}>
                                <button onClick={() => { deleteProgram(prog.id); setConfirmDelete(null); setExpandedProgram(null) }} style={{ flex: 1, padding: 12, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.4)', borderRadius: 12, color: colors.error, fontFamily: fonts.body, fontSize: 12, fontWeight: 700, cursor: 'pointer', textTransform: 'uppercase' }}>CONFIRMER SUPPRESSION</button>
                                <button onClick={() => setConfirmDelete(null)} style={{ padding: '12px 20px', background: 'transparent', border: `1px solid ${colors.goldBorder}`, borderRadius: 12, color: colors.textMuted, fontFamily: fonts.body, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>ANNULER</button>
                              </div>
                            ) : (
                              <button onClick={() => setConfirmDelete(prog.id)} style={{ width: '100%', padding: 12, background: 'transparent', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 12, color: colors.error, fontFamily: fonts.body, fontSize: 12, fontWeight: 700, cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.08em' }}>SUPPRIMER CE PROGRAMME</button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}

            {/* Blank template link */}
            <div style={{ textAlign: 'center', marginTop: 24 }}>
              <button onClick={downloadBlankTemplate} style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: fonts.body, fontSize: 12, color: colors.textMuted, textDecoration: 'underline', padding: 8 }}>
                Télécharger le modèle vierge (.xlsx)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ IMPORT PREVIEW MODAL ═══ */}
      {importPreview && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }} onClick={() => setImportPreview(null)}>
          <div onClick={e => e.stopPropagation()} style={{ background: colors.background, border: `1px solid ${colors.goldBorder}`, borderRadius: 16, width: '100%', maxWidth: 420, maxHeight: 'calc(100vh - 120px)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {/* Scrollable content */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '24px 20px 0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={pageTitleStyle}>APERÇU IMPORT</span>
                {importPreview.total_weeks && (
                  <span style={{ fontSize: 10, fontWeight: 700, color: colors.gold, background: colors.goldDim, padding: '3px 8px', borderRadius: 999 }}>
                    {importPreview.total_weeks} SEM
                  </span>
                )}
              </div>

              <div style={{ marginTop: 16 }}>
                <div style={{ ...labelStyle, marginBottom: 4 }}>Nom du programme</div>
                <input value={importName} onChange={e => setImportName(e.target.value)} style={{ width: '100%', padding: 12, background: colors.background, border: `1px solid ${colors.goldBorder}`, borderRadius: 8, color: colors.text, fontFamily: fonts.body, fontSize: 14, outline: 'none' }} />
              </div>

              {/* Phase summary for periodized programs */}
              {importPreview.phases && (
                <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {importPreview.phases.map((phase, i) => (
                    <div key={i} style={{ padding: '6px 10px', background: colors.goldDim, borderRadius: 6, display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontFamily: fonts.headline, fontSize: 11, color: colors.gold }}>{phase.name}</span>
                      <span style={{ fontFamily: fonts.body, fontSize: 10, color: colors.textMuted }}>Sem. {phase.weeks[0]}-{phase.weeks[1]}</span>
                    </div>
                  ))}
                </div>
              )}

              <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 6, paddingBottom: 16 }}>
                {importPreview.days.map((day, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: colors.background, borderRadius: 8, border: `1px solid ${colors.goldBorder}` }}>
                    <span style={{ ...bodyStyle, fontSize: 13 }}>
                      {day.is_rest ? `Jour ${i + 1} — Repos` : `Jour ${i + 1} — ${day.name}`}
                    </span>
                    <span style={{ ...mutedStyle, fontSize: 12 }}>
                      {day.is_rest ? '🌙' : `${(day.exercises || []).length} ex. ✓`}
                    </span>
                  </div>
                ))}
                {importSkipped.map((name, i) => (
                  <div key={`skip-${i}`} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: colors.background, borderRadius: 8, border: `1px solid rgba(239,68,68,0.2)`, opacity: 0.6 }}>
                    <span style={{ ...bodyStyle, fontSize: 13 }}>{name}</span>
                    <span style={{ ...mutedStyle, fontSize: 12 }}>ignorée</span>
                  </div>
                ))}
                {importSkipped.length > 0 && (
                  <div style={{ ...mutedStyle, fontSize: 11, marginTop: 4 }}>
                    {importPreview.days.length} jour{importPreview.days.length > 1 ? 's' : ''} importé{importPreview.days.length > 1 ? 's' : ''} sur {importPreview.days.length + importSkipped.length} feuilles ({importSkipped.length} ignorée{importSkipped.length > 1 ? 's' : ''})
                  </div>
                )}
              </div>
            </div>

            {/* Footer FIXE — toujours visible */}
            <div style={{ flexShrink: 0, padding: '16px 20px', paddingBottom: 'calc(20px + env(safe-area-inset-bottom, 0px))', borderTop: `0.5px solid ${colors.goldBorder}`, background: colors.background, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <button onClick={() => {
                const insertData: any = {
                  name: importName.trim() || 'Programme importé',
                  description: importPreview.description || '',
                  days: importPreview.days,
                  source: 'import',
                }
                if (importPreview.total_weeks) {
                  insertData.total_weeks = importPreview.total_weeks
                  insertData.current_week = importPreview.current_week || 1
                  insertData.phases = importPreview.phases || null
                }
                setStartModalImportData(insertData)
                setStartModalProgram({ name: importName.trim() || 'Programme importé' })
                setImportPreview(null)
              }} style={{ ...btnPrimary, padding: 14 }}>IMPORTER</button>
              <button onClick={() => setImportPreview(null)} style={{ ...btnSecondary, padding: 14 }}>ANNULER</button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ ALL EXISTING MODALS (unchanged) ═══ */}

      {/* Exercise DB Modal */}
      {showExDbModal && (
        <ExerciseSearchModal
          supabase={supabase}
          onClose={() => setShowExDbModal(false)}
          onAdd={(ex) => addExerciseToSession(ex)}
        />
      )}

      {/* Exercise Detail Modal */}
      {exerciseDetail && (
        <ExerciseDetailModal
          exercise={exerciseDetail}
          sets={exerciseDetail._sets}
          reps={exerciseDetail._reps}
          rest={exerciseDetail._rest}
          onClose={() => setExerciseDetail(null)}
          onAdd={(ex) => { addExerciseToSession(ex); setExerciseDetail(null) }}
        />
      )}

      {/* Video Feedback Modal */}
      {videoExercise && session?.user?.id && (
        <VideoFeedbackModal
          exerciseName={videoExercise}
          userId={session.user.id}
          onClose={() => setVideoExercise(null)}
        />
      )}

      {/* Video Feedback History */}
      {session?.user?.id && (
        <VideoFeedbackHistory userId={session.user.id} />
      )}

      {showProgramBuilder && (
        <ProgramBuilder
          supabase={supabase}
          session={session}
          aiAllowed={aiAllowed}
          onClose={() => { setShowProgramBuilder(false); setEditingProgram(null) }}
          onSave={refreshPrograms}
          editProgram={editingProgram}
        />
      )}

      {showAddExercise && (
        <AddExercisePopup searchQ={exerciseSearchQ} onSearchChange={setExerciseSearchQ} results={exerciseSearchResults} onSelect={(ex) => {
          if (editMode && editedDays) {
            const dayIdx = ['lundi','mardi','mercredi','jeudi','vendredi','samedi','dimanche'].indexOf(trainingDay)
            editAddEx(dayIdx, ex)
          } else {
            addExerciseToSession(ex)
          }
          setShowAddExercise(false)
        }} onClose={() => setShowAddExercise(false)} />
      )}
      {showSaveChoice && (
        <SaveChoicePopup onSaveModified={async () => { await saveWithModifications(); setShowSaveChoice(false) }} onSaveOriginal={async () => { await saveOriginal(); setShowSaveChoice(false) }} onClose={() => setShowSaveChoice(false)} />
      )}

      {/* Exercise info popup */}
      {exerciseInfo && <ExerciseInfoPopup info={exerciseInfo} onClose={() => setExerciseInfo(null)} />}

      {/* Technique tooltip */}
      {techniqueTooltip && <TechniqueTooltip technique={techniqueTooltip} onClose={() => setTechniqueTooltip(null)} />}

      {/* Start program modal */}
      {startModalProgram && (
        <StartProgramModal
          programName={startModalProgram.name}
          onStart={handleStartProgram}
          onClose={() => { setStartModalProgram(null); setStartModalImportData(null) }}
        />
      )}

      {/* Variant popup */}
      {variantPopup && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.75)',backdropFilter:'blur(8px)',zIndex:200,display:'flex',alignItems:'flex-end',justifyContent:'center'}} onClick={()=>setVariantPopup(null)}>
          <div onClick={e=>e.stopPropagation()} style={{background:colors.surface,border:`1px solid ${colors.goldRule}`,borderRadius:'16px 16px 0 0',width:'100%',maxWidth:480,maxHeight:'60vh',overflow:'hidden'}}>
            <div style={{padding:'16px 20px',borderBottom:`1px solid ${colors.goldBorder}`,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <span style={{fontFamily:fonts.headline,fontSize:20,letterSpacing:2,color:colors.text}}>VARIANTES</span>
              <button onClick={()=>setVariantPopup(null)} style={{background:'none',border:'none',color:colors.textMuted,fontSize:20,cursor:'pointer'}}>✕</button>
            </div>
            <div style={{overflowY:'auto',maxHeight:'calc(60vh - 60px)',padding:'8px 12px 30px'}}>
              {variantPopup.variants.length===0?(
                <div style={{textAlign:'center',padding:32,color:colors.textMuted,fontSize:14,fontFamily:fonts.body}}>Aucune variante trouvée</div>
              ):variantPopup.variants.map((v: any,i: number)=>(
                <button key={i} onClick={()=>selectEditVariant(v)} style={{width:'100%',display:'flex',alignItems:'center',gap:12,padding:'14px 16px',marginBottom:4,borderRadius: 16,background:colors.background,border:`1px solid ${colors.goldBorder}`,cursor:'pointer',textAlign:'left'}}>
                  <div style={{width:40,height:40,borderRadius:10,background:colors.goldDim,display:'flex',alignItems:'center',justifyContent:'center',fontSize:16,flexShrink:0}}>
                    {v.equipment==='Barre'?'🏋️':v.equipment==='Haltères'?'💪':v.equipment==='Machine'?'⚙️':v.equipment==='Poulie'?'🔗':'🤸'}
                  </div>
                  <div>
                    <div style={{fontFamily:fonts.body,fontSize:14,color:colors.text,fontWeight:500}}>{v.name}</div>
                    <div style={{fontFamily:fonts.body,fontSize:10,color:colors.gold,fontWeight:700,letterSpacing:1,marginTop:2}}>{v.equipment||''}{v.muscle_group?` · ${v.muscle_group}`:''}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Workout detail popup */}
      {selectedWorkout && (
        <div style={{position:'fixed',inset:0,zIndex:200,background:'rgba(0,0,0,0.8)',backdropFilter:'blur(8px)',display:'flex',alignItems:'flex-end',justifyContent:'center'}} onClick={()=>setSelectedWorkout(null)}>
          <div onClick={e=>e.stopPropagation()} style={{background:colors.surface,border:`1px solid ${colors.goldRule}`,borderRadius:'16px 16px 0 0',width:'100%',maxWidth:500,maxHeight:'85vh',display:'flex',flexDirection:'column',overflow:'hidden'}}>
            <div style={{padding:'16px 20px',borderBottom:`1px solid ${colors.goldBorder}`,display:'flex',justifyContent:'space-between',alignItems:'center',flexShrink:0}}>
              <div>
                <div style={{fontFamily:fonts.headline,fontSize:22,letterSpacing:2,color:colors.text}}>{selectedWorkout.name||'Séance'}</div>
                <div style={{fontFamily:fonts.body,fontSize:12,color:colors.textMuted,marginTop:2}}>
                  {new Date(selectedWorkout.created_at).toLocaleDateString('fr-FR',{weekday:'long',day:'numeric',month:'long'})}
                  {selectedWorkout.duration_minutes?` · ${selectedWorkout.duration_minutes} min`:''}
                </div>
              </div>
              <button onClick={()=>setSelectedWorkout(null)} style={{width:36,height:36,borderRadius:12,background:colors.goldDim,border:`1px solid ${colors.goldBorder}`,display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',color:colors.textMuted,fontSize:16}}>✕</button>
            </div>
            <div style={{flex:1,overflowY:'auto',padding:'12px 16px 32px',WebkitOverflowScrolling:'touch' as any}}>
              {loadingDetail?(
                <div style={{textAlign:'center',padding:40,color:colors.textMuted}}>Chargement...</div>
              ):workoutDetail.length===0?(
                <div style={{textAlign:'center',padding:40,color:colors.textDim,fontSize:14,fontFamily:fonts.body}}>Aucun détail enregistré</div>
              ):(
                workoutDetail.map((ex,i)=>(
                  <div key={i} style={{marginBottom:16,paddingBottom:16,borderBottom:i<workoutDetail.length-1?`1px solid ${colors.goldBorder}`:'none'}}>
                    <div style={{fontFamily:fonts.body,fontSize:16,fontWeight:700,color:colors.text,letterSpacing:1,textTransform:'uppercase',marginBottom:8}}>{ex.name}</div>
                    <div style={{display:'grid',gridTemplateColumns:'40px 1fr 1fr 1fr',gap:8,padding:'4px 0',marginBottom:4}}>
                      <span style={{fontFamily:fonts.body,fontSize:9,fontWeight:700,color:colors.textDim,letterSpacing:1}}>SET</span>
                      <span style={{fontFamily:fonts.body,fontSize:9,fontWeight:700,color:colors.textDim,letterSpacing:1}}>KG</span>
                      <span style={{fontFamily:fonts.body,fontSize:9,fontWeight:700,color:colors.textDim,letterSpacing:1}}>REPS</span>
                      <span style={{fontFamily:fonts.body,fontSize:9,fontWeight:700,color:colors.textDim,letterSpacing:1}}>VOLUME</span>
                    </div>
                    {ex.sets.map((set:any,si:number)=>(
                      <div key={si} style={{display:'grid',gridTemplateColumns:'40px 1fr 1fr 1fr',gap:8,padding:'6px 0',borderBottom:`1px solid ${colors.goldBorder}`}}>
                        <span style={{fontFamily:fonts.headline,fontSize:16,color:colors.gold,width:28,height:28,borderRadius:8,background:colors.goldDim,display:'flex',alignItems:'center',justifyContent:'center'}}>{si+1}</span>
                        <span style={{fontFamily:fonts.headline,fontSize:18,color:colors.text}}>{set.weight||0}</span>
                        <span style={{fontFamily:fonts.headline,fontSize:18,color:colors.text}}>{set.reps||0}</span>
                        <span style={{fontFamily:fonts.body,fontSize:13,color:colors.textMuted}}>{((set.weight||0)*(set.reps||0))} kg</span>
                      </div>
                    ))}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
