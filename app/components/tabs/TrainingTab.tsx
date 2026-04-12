'use client'
import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { addXP, updateStreak } from '../../../lib/gamification'
import { useWakeLock } from '../../hooks/useWakeLock'
import {
  Dumbbell, Search, Award,
} from 'lucide-react'
import {
  BG_BASE, BG_CARD, BG_CARD_2, BORDER, GOLD, GOLD_DIM, GOLD_RULE,
  GREEN, RADIUS_CARD, TEXT_PRIMARY, TEXT_MUTED, TEXT_DIM,
  FONT_DISPLAY, FONT_ALT, FONT_BODY, JS_DAYS_FR,
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
import VideoFeedbackModal from '../VideoFeedbackModal'
import VideoFeedbackHistory from '../VideoFeedbackHistory'
import ProgramBuilder, { padTo7Days } from '../training/ProgramBuilder'
import ExerciseInfoPopup from '../ExerciseInfoPopup'
import { useExerciseInfo } from '../../hooks/useExerciseInfo'
import { resolveSessionType, HISTORY_FILTERS } from '../../../lib/session-types'

interface TrainingTabProps {
  supabase: any
  session: any
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
  supabase, session, coachProgram, todayKey, todaySessionDone, startProgramWorkout, fetchAll,
  scheduledSessions, calendarSelectedDate, setCalendarSelectedDate, markSessionCompleted, checkForPR,
}: TrainingTabProps) {
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
  const restIntervalRef  = useRef<any>(null)
  const elapsedIntervalRef = useRef<any>(null)
  const exSearchRef      = useRef<any>(null)

  const todayStr         = new Date().toISOString().split('T')[0]
  const trainingIsToday  = trainingDay === todayKey

  // Keep screen awake during workout + rest timer
  useWakeLock(!!workoutStarted || restRunning)
  // Priorité : programme custom actif > programme coach
  const customDayData = (() => {
    if (!activeCustomProgram?.days?.length) return null
    const dayIndex = ['lundi','mardi','mercredi','jeudi','vendredi','samedi','dimanche'].indexOf(trainingDay)
    const paddedDays = padTo7Days(activeCustomProgram.days)
    const customDay = paddedDays[dayIndex]
    if (!customDay) return null
    if (customDay.is_rest) return { repos: true, exercises: [] }
    return { repos: false, exercises: (customDay.exercises || []).map((ex: any) => ({ name: ex.exercise_name || ex.custom_name || ex.name || 'Exercice', sets: ex.sets || 3, reps: ex.reps || 10, rest_seconds: ex.rest_seconds || 90, muscle_group: ex.muscle_group || customDay.focus || '' })) }
  })()
  const trainingDayData = customDayData || (coachProgram ? (coachProgram[trainingDay] ?? { repos: false, exercises: [] }) : null)
  const baseExercises: any[] = trainingDayData?.exercises || []
  const trainingExercises: any[] = [...baseExercises, ...addedExercises]

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

  // ── Load custom programs ──
  useEffect(() => {
    if (!session?.user?.id) return
    supabase.from('custom_programs').select('*').eq('user_id', session.user.id).order('updated_at', { ascending: false })
      .then(({ data }: any) => {
        setCustomPrograms(data || [])
        const active = (data || []).find((p: any) => p.is_active)
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

  async function activateProgram(programId: string) {
    // Désactive tous d'abord
    await supabase.from('custom_programs').update({ is_active: false }).eq('user_id', session.user.id).neq('id', programId)
    // Active celui-ci
    const { error } = await supabase.from('custom_programs').update({ is_active: true }).eq('id', programId).eq('user_id', session.user.id)
    if (error) { toast.error('Erreur: ' + error.message); return }
    const updated = customPrograms.map(p => ({ ...p, is_active: p.id === programId }))
    setCustomPrograms(updated)
    const activeProg = updated.find(p => p.id === programId) || null
    setActiveCustomProgram(activeProg)

    // Regenerate scheduled_sessions with the activated program's day names
    if (activeProg?.days) {
      try {
        const today = new Date()
        const dow = today.getDay()
        const monday = new Date(today)
        monday.setDate(today.getDate() - (dow === 0 ? 6 : dow - 1))
        monday.setHours(0, 0, 0, 0)
        const sunday = new Date(monday)
        sunday.setDate(monday.getDate() + 6)
        const mondayStr = monday.toISOString().split('T')[0]
        const sundayStr = sunday.toISOString().split('T')[0]

        await supabase.from('scheduled_sessions').delete()
          .eq('user_id', session.user.id)
          .gte('scheduled_date', mondayStr).lte('scheduled_date', sundayStr)
          .eq('completed', false)

        const paddedDays = padTo7Days(activeProg.days)
        const DAY_LABELS_FULL = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche']
        const newSessions: any[] = []
        for (let i = 0; i < 7; i++) {
          const day = paddedDays[i]
          if (!day || day.is_rest) continue
          const date = new Date(monday)
          date.setDate(monday.getDate() + i)
          newSessions.push({
            user_id: session.user.id,
            title: day.name || day.weekday || DAY_LABELS_FULL[i],
            session_type: 'custom',
            scheduled_date: date.toISOString().split('T')[0],
            scheduled_time: '08:00',
            duration_min: 60,
            completed: false,
          })
        }
        if (newSessions.length > 0) {
          await supabase.from('scheduled_sessions').insert(newSessions)
        }
      } catch (e) { console.error('[activateProgram] sync error:', e) }
    }

    toast.success('Programme activé !')
  }

  async function deactivateProgram(programId: string) {
    await supabase.from('custom_programs').update({ is_active: false }).eq('id', programId).eq('user_id', session.user.id)
    const updated = customPrograms.map(p => ({ ...p, is_active: false }))
    setCustomPrograms(updated)
    setActiveCustomProgram(null)
    toast.success('Programme désactivé — retour au programme coach')
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
    <div style={{ minHeight: '100vh', background: BG_BASE, paddingBottom: 100, overflowX: 'hidden', maxWidth: '100%' }}>
      <style>{`
        .set-input { -webkit-appearance: none; appearance: none; }
        .set-input::-webkit-inner-spin-button,
        .set-input::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
        .set-input:focus { border-color: ${GOLD} !important; }
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
            background: BG_CARD, border: `2px solid ${GOLD}`,
            padding: '40px 32px', textAlign: 'center', maxWidth: 340, width: '100%',
            animation: 'ttPopIn 0.3s ease-out',
          }}>
            <div style={{
              width: 64, height: 64, border: `2px solid ${GOLD}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 20px',
            }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill={GOLD}>
                <path d="M13 2L3 14H12L11 22L21 10H12L13 2Z" />
              </svg>
            </div>
            <h2 style={{ fontFamily: FONT_DISPLAY, fontSize: 36, color: GOLD, letterSpacing: 3, margin: '0 0 8px' }}>
              REPOS TERMINÉ
            </h2>
            <p style={{ fontFamily: FONT_ALT, fontWeight: 800, fontSize: 20, color: TEXT_PRIMARY, letterSpacing: 2, textTransform: 'uppercase', margin: '0 0 24px' }}>
              {motivationalMsg}
            </p>
            <button onClick={() => setShowTimerAlert(false)} style={{
              background: GOLD, color: '#0D0B08', border: 'none',
              fontFamily: FONT_ALT, fontWeight: 800, fontSize: 16, letterSpacing: 2,
              padding: '14px 48px', textTransform: 'uppercase', cursor: 'pointer',
              
            }}>
              C&apos;EST PARTI !
            </button>
          </div>
        </div>
      )}

      {/* ── WORKOUT FINISHED CELEBRATION ── */}
      <WorkoutCelebration visible={workoutFinished} />

      {/* ── HERO BANNER ── */}
      <div style={{ margin: '0 16px', height: 180, borderRadius: 16, overflow: 'hidden', position: 'relative' }}>
        <img src="/images/hero-athlete.webp" alt="Athlete MoovX" style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'absolute', inset: 0 }} />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, transparent 20%, rgba(13,11,8,0.85) 100%)' }} />
        <div style={{ position: 'absolute', bottom: 20, left: 20, zIndex: 1 }}>
          <h1 style={{ fontFamily: FONT_DISPLAY, fontSize: 24, letterSpacing: 3, margin: 0, color: TEXT_PRIMARY, lineHeight: 1 }}>VOTRE PROGRAMME</h1>
          <span style={{ fontFamily: FONT_ALT, fontSize: 12, color: GOLD, fontWeight: 700, letterSpacing: 2 }}>{format(new Date(), 'EEE d MMM', { locale: fr }).toUpperCase()} — Semaine en cours</span>
        </div>
      </div>

      {/* ── MES PROGRAMMES ── */}
      <div style={{ padding: '0 16px 16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <span style={{ fontFamily: FONT_DISPLAY, fontSize: 18, color: TEXT_PRIMARY, letterSpacing: '1px' }}>MES PROGRAMMES</span>
          <div style={{ display: 'flex', gap: 6 }}>
            {activeCustomProgram && !editMode && (
              <button onClick={startEditMode} style={{ fontFamily: FONT_ALT, fontSize: 11, fontWeight: 700, color: GOLD, background: 'transparent', border: `1px solid ${GOLD_RULE}`, borderRadius: 8, padding: '6px 12px', cursor: 'pointer', letterSpacing: 1, textTransform: 'uppercase' }}>MODIFIER</button>
            )}
            {editMode && (
              <>
                <button onClick={() => { setEditMode(false); setEditedDays(null) }} style={{ fontFamily: FONT_ALT, fontSize: 11, fontWeight: 700, color: TEXT_MUTED, background: 'transparent', border: `1px solid ${BORDER}`, borderRadius: 8, padding: '6px 12px', cursor: 'pointer' }}>ANNULER</button>
                <button onClick={saveEditedProgram} style={{ fontFamily: FONT_ALT, fontSize: 11, fontWeight: 700, color: '#0D0B08', background: GOLD, border: 'none', borderRadius: 8, padding: '6px 12px', cursor: 'pointer', letterSpacing: 1 }}>SAUVEGARDER</button>
              </>
            )}
            {!editMode && (
              <button onClick={() => { setEditingProgram(null); setShowProgramBuilder(true) }} style={{ fontFamily: FONT_BODY, fontSize: 11, color: GOLD, background: 'transparent', border: `1px solid ${GOLD}`, borderRadius: 8, padding: '6px 14px', cursor: 'pointer', letterSpacing: '0.08em', textTransform: 'uppercase' }}>+ CREER</button>
            )}
          </div>
        </div>
        {customPrograms.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {customPrograms.map((prog: any) => (
              <div key={prog.id} style={{ background: BG_CARD, border: `1px solid ${prog.is_active ? GOLD : BORDER}`, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: FONT_DISPLAY, fontSize: 16, color: prog.is_active ? GOLD : TEXT_PRIMARY, letterSpacing: '1px' }}>{prog.name}</div>
                  <div style={{ fontFamily: FONT_BODY, fontSize: 11, color: TEXT_MUTED }}>
                    {(prog.days || []).length} jours · {prog.source === 'ai' ? '🤖 IA' : '📋 Manuel'}
                    {prog.is_active && <span style={{ color: GREEN, marginLeft: 8 }}>● Actif</span>}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  {prog.is_active ? (
                    <button onClick={() => deactivateProgram(prog.id)} style={{ fontSize: 10, padding: '4px 10px', background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.4)', color: GREEN, cursor: 'pointer', fontFamily: FONT_ALT, fontWeight: 700 }}>DÉSACTIVER</button>
                  ) : (
                    <button onClick={() => activateProgram(prog.id)} style={{ fontSize: 10, padding: '4px 10px', background: GOLD_DIM, border: `1px solid ${GOLD}`, color: GOLD, cursor: 'pointer', fontFamily: FONT_ALT, fontWeight: 700 }}>ACTIVER</button>
                  )}
                  <button onClick={() => { setEditingProgram(prog); setShowProgramBuilder(true) }} style={{ fontSize: 10, padding: '4px 10px', background: 'transparent', border: `1px solid ${BORDER}`, color: TEXT_MUTED, cursor: 'pointer', fontFamily: FONT_ALT, fontWeight: 700 }}>ÉDITER</button>
                  <button onClick={() => deleteProgram(prog.id)} style={{ fontSize: 10, padding: '4px 10px', background: 'transparent', border: `1px solid rgba(239,68,68,0.3)`, color: '#EF4444', cursor: 'pointer', fontFamily: FONT_ALT, fontWeight: 700 }}>×</button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <button onClick={() => { setEditingProgram(null); setShowProgramBuilder(true) }}
            style={{ width: '100%', padding: 16, background: GOLD_DIM, border: `1px dashed ${GOLD_RULE}`, color: GOLD, fontFamily: FONT_DISPLAY, fontSize: 16, letterSpacing: '1px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            CRÉER UN PROGRAMME +
          </button>
        )}
      </div>

      {/* ── WEEK CALENDAR ── */}
      {weekSessions.length > 0 && (
        <div style={{ padding: '0 16px' }}>
          <WeekCalendar
            sessions={weekSessions}
            selectedDate={calendarSelectedDate}
            onSelectDate={(d) => {
              const dayNames = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi']
              const newDay = dayNames[d.getDay()]
              if (trainingDay === newDay && dayExpanded) {
                setDayExpanded(false)
              } else {
                setCalendarSelectedDate(d)
                setTrainingDay(newDay)
                setDayExpanded(true)
              }
            }}
            onToggleMonth={() => setShowMonthCalendar(v => !v)}
          />
          <AnimatePresence>
            {showMonthCalendar && (
              <MonthCalendar
                sessions={weekSessions}
                selectedDate={calendarSelectedDate}
                onSelectDate={(d) => {
                  setCalendarSelectedDate(d)
                  const dayNames = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi']
                  setTrainingDay(dayNames[d.getDay()])
                  setDayExpanded(true)
                }}
                onClose={() => setShowMonthCalendar(false)}
              />
            )}
          </AnimatePresence>

          {/* Hint or séance libre — compact */}
          {!dayExpanded && (
            <p style={{ fontFamily: FONT_ALT, fontSize: 12, fontWeight: 700, letterSpacing: 2, color: TEXT_DIM, textTransform: 'uppercase', margin: '8px 0 0', textAlign: 'center' }}>
              Touche un jour pour voir les exercices
            </p>
          )}

          <button
            onClick={() => startProgramWorkout({ day_name: 'Séance libre' }, [])}
            style={{
              width: '100%', padding: 12, borderRadius: 12, marginTop: 10,
              background: 'transparent',
              border: `1px solid ${GOLD_RULE}`,
              color: GOLD, cursor: 'pointer',
              fontFamily: FONT_ALT, fontSize: 12, fontWeight: 700, letterSpacing: 2,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            }}
          >
            + SÉANCE LIBRE
          </button>
        </div>
      )}

      {/* ── ACTIVE SESSION TOP BAR ── */}
      <TrainingActiveBar
        workoutStarted={workoutStarted}
        elapsedSecs={elapsedSecs}
        trainingDoneSets={trainingDoneSets}
        trainingTotalSets={trainingTotalSets}
        onFinish={handleFinishWithCheck}
        fmtElapsed={fmtElapsed}
      />

      {/* ── NO COACH PROGRAM → show custom programs ── */}
      {!coachProgram ? (
        <div style={{ padding: '20px 16px' }}>
          {customPrograms.length > 0 ? (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <span style={{ fontFamily: FONT_DISPLAY, fontSize: 18, color: TEXT_PRIMARY, letterSpacing: '1px' }}>MES PROGRAMMES</span>
                <button onClick={() => { setEditingProgram(null); setShowProgramBuilder(true) }}
                  style={{ fontFamily: FONT_BODY, fontSize: 11, color: GOLD, background: 'transparent', border: `1px solid ${GOLD}`, padding: '6px 14px', cursor: 'pointer', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                  + CREER
                </button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {customPrograms.map((prog: any) => (
                  <div key={prog.id} style={{ background: BG_CARD, border: `1px solid ${prog.is_active ? GOLD : BORDER}`, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontFamily: FONT_DISPLAY, fontSize: 16, color: prog.is_active ? GOLD : TEXT_PRIMARY, letterSpacing: '1px' }}>{prog.name}</div>
                      <div style={{ fontFamily: FONT_BODY, fontSize: 11, color: TEXT_MUTED }}>
                        {(prog.days || []).length} jours · {prog.source === 'ai' ? '🤖 IA' : '📋 Manuel'}
                        {prog.is_active && <span style={{ color: GREEN, marginLeft: 8 }}>● Actif</span>}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {prog.is_active ? (
                        <button onClick={() => deactivateProgram(prog.id)} style={{ fontSize: 10, padding: '4px 10px', background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.4)', color: GREEN, cursor: 'pointer', fontFamily: FONT_ALT, fontWeight: 700 }}>DESACTIVER</button>
                      ) : (
                        <button onClick={() => activateProgram(prog.id)} style={{ fontSize: 10, padding: '4px 10px', background: GOLD_DIM, border: `1px solid ${GOLD}`, color: GOLD, cursor: 'pointer', fontFamily: FONT_ALT, fontWeight: 700 }}>ACTIVER</button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, padding: '60px 20px', textAlign: 'center' }}>
              <Dumbbell size={56} color={TEXT_MUTED} strokeWidth={1.5} />
              <p style={{ fontFamily: FONT_ALT, fontSize: '1.2rem', fontWeight: 800, letterSpacing: '2px', textTransform: 'uppercase', color: TEXT_PRIMARY, margin: 0 }}>Aucun programme</p>
              <p style={{ fontSize: '0.85rem', fontFamily: FONT_BODY, color: TEXT_MUTED, margin: 0, maxWidth: 280 }}>Cree ton premier programme avec l&apos;IA en 2 minutes.</p>
              <button onClick={() => { setEditingProgram(null); setShowProgramBuilder(true) }}
                style={{ padding: '14px 32px', border: 'none', cursor: 'pointer', background: GOLD, fontFamily: FONT_ALT, fontSize: '0.9rem', fontWeight: 800, color: '#0D0B08', letterSpacing: '2px', textTransform: 'uppercase',  }}>
                Creer mon programme
              </button>
            </div>
          )}
        </div>
      ) : (
        <>
          {/* ── REST DAY ── */}
          {dayExpanded && trainingDayData?.repos ? (
            <TrainingRestDay />

          ) : dayExpanded && trainingExercises.length === 0 ? (
            /* ── NO EXERCISES ── */
            <div style={{ padding: '0 16px' }}>
              <div style={{ background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: RADIUS_CARD, padding: '40px 24px', textAlign: 'center' }}>
                <Dumbbell size={32} color={TEXT_MUTED} style={{ marginBottom: 12 }} />
                <p style={{ fontSize: '0.85rem', fontFamily: FONT_BODY, color: TEXT_MUTED, margin: 0 }}>Aucun exercice pour ce jour.</p>
              </div>
            </div>

          ) : dayExpanded && trainingIsToday && todaySessionDone ? (
            /* ── SESSION ALREADY DONE TODAY ── */
            <TrainingSessionDone todayKey={todayKey} coachProgram={coachProgram} />

          ) : dayExpanded ? (
            /* ══════════════ EXERCISE CARDS ══════════════ */
            <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 16 }}>

              {/* Edit mode: show editable exercise list */}
              {editMode && editedDays && (() => {
                const dayIdx = ['lundi','mardi','mercredi','jeudi','vendredi','samedi','dimanche'].indexOf(trainingDay)
                const day = editedDays[dayIdx]
                if (!day?.exercises) return null
                return (
                  <div style={{ background: BG_CARD, border: `1px solid ${GOLD_RULE}`, borderRadius: 16, padding: 16, marginBottom: 8 }}>
                    <div style={{ fontFamily: FONT_ALT, fontSize: 10, fontWeight: 700, letterSpacing: 2, color: GOLD, marginBottom: 12, textTransform: 'uppercase' }}>MODE EDITION</div>
                    {day.exercises.map((ex: any, i: number) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 0', borderBottom: i < day.exercises.length - 1 ? `1px solid ${GOLD_DIM}` : 'none' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                          <button onClick={() => editMoveEx(dayIdx, i, -1)} disabled={i === 0} style={{ background: 'none', border: 'none', color: i === 0 ? TEXT_DIM : GOLD, fontSize: 12, cursor: 'pointer', padding: '2px 4px' }}>▲</button>
                          <button onClick={() => editMoveEx(dayIdx, i, 1)} disabled={i === day.exercises.length - 1} style={{ background: 'none', border: 'none', color: i === day.exercises.length - 1 ? TEXT_DIM : GOLD, fontSize: 12, cursor: 'pointer', padding: '2px 4px' }}>▼</button>
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontFamily: FONT_BODY, fontSize: 14, color: TEXT_PRIMARY, fontWeight: 500 }}>{ex.exercise_name || ex.custom_name || ex.name}</div>
                          <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                              <span style={{ fontFamily: FONT_BODY, fontSize: 10, color: TEXT_MUTED }}>Sets</span>
                              <input type="number" min={1} max={10} value={ex.sets ?? ''} onChange={e => { const v=e.target.value; if(v===''){editExField(dayIdx,i,'sets','');return} const n=parseInt(v); if(!isNaN(n))editExField(dayIdx,i,'sets',n) }} style={{ width: 36, padding: '3px 4px', textAlign: 'center', background: BG_BASE, border: `1px solid ${BORDER}`, borderRadius: 6, color: GOLD, fontFamily: FONT_DISPLAY, fontSize: 14, outline: 'none' }} />
                            </div>
                            <span style={{ color: TEXT_DIM, alignSelf: 'center', fontSize: 10 }}>x</span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                              <span style={{ fontFamily: FONT_BODY, fontSize: 10, color: TEXT_MUTED }}>Reps</span>
                              <input type="number" min={1} max={50} value={ex.reps ?? ''} onChange={e => { const v=e.target.value; if(v===''){editExField(dayIdx,i,'reps','');return} const n=parseInt(v); if(!isNaN(n))editExField(dayIdx,i,'reps',n) }} style={{ width: 36, padding: '3px 4px', textAlign: 'center', background: BG_BASE, border: `1px solid ${BORDER}`, borderRadius: 6, color: GOLD, fontFamily: FONT_DISPLAY, fontSize: 14, outline: 'none' }} />
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                              <span style={{ fontFamily: FONT_BODY, fontSize: 10, color: TEXT_MUTED }}>Repos</span>
                              <input type="number" min={0} max={300} step={15} value={ex.rest_seconds ?? ''} onChange={e => { const v=e.target.value; if(v===''){editExField(dayIdx,i,'rest_seconds','');return} const n=parseInt(v); if(!isNaN(n))editExField(dayIdx,i,'rest_seconds',n) }} style={{ width: 42, padding: '3px 4px', textAlign: 'center', background: BG_BASE, border: `1px solid ${BORDER}`, borderRadius: 6, color: GOLD, fontFamily: FONT_DISPLAY, fontSize: 14, outline: 'none' }} />
                              <span style={{ fontFamily: FONT_BODY, fontSize: 10, color: TEXT_MUTED }}>s</span>
                            </div>
                          </div>
                        </div>
                        <button onClick={() => loadExerciseInfo(ex.exercise_name || ex.custom_name || ex.name)} style={{ background: 'rgba(212,168,67,0.06)', border: `1px solid ${BORDER}`, borderRadius: 8, width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, cursor: 'pointer', flexShrink: 0 }}>ℹ️</button>
                        <button onClick={() => loadEditVariants(ex.exercise_name || ex.custom_name || ex.name, dayIdx, i)} style={{ background: 'rgba(212,168,67,0.08)', border: '1px solid rgba(212,168,67,0.2)', borderRadius: 8, width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, cursor: 'pointer', flexShrink: 0 }}>🔄</button>
                        <button onClick={() => editRemoveEx(dayIdx, i)} style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 8, width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#EF4444', fontSize: 14, cursor: 'pointer', flexShrink: 0 }}>✕</button>
                      </div>
                    ))}
                    <button onClick={() => { setShowAddExercise(true); setExerciseSearchQ('') }} style={{ width: '100%', padding: 10, marginTop: 8, background: 'transparent', border: `1.5px dashed ${GOLD_RULE}`, borderRadius: 10, color: GOLD, fontFamily: FONT_ALT, fontSize: 12, fontWeight: 700, letterSpacing: 2, cursor: 'pointer' }}>+ AJOUTER UN EXERCICE</button>
                  </div>
                )
              })()}

              {trainingExercises.map((ex: any, exIdx: number) => {
                const storageKey = `moovx-sets-${todayStr}-${ex.name}`
                const n = Number(ex.sets) || 3
                const setsArr: boolean[] = completedSets[storageKey] || Array.from({ length: n }, () => false)
                const numSets = setsArr.length
                const inputs = setInputs[ex.name] || Array.from({ length: numSets }, () => ({ kg: '', reps: String(ex.reps || '') }))

                return (
                  <TrainingExerciseCard
                    key={ex.name}
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
                    supabase={supabase}
                    userId={session?.user?.id}
                  />
                )
              })}

              {/* ── Add Exercise to Session ── */}
              {trainingIsToday && (workoutStarted || trainingDoneSets > 0) && (
                <button onClick={() => { setShowAddExercise(true); setExerciseSearchQ('') }} style={{ width: '100%', padding: 14, background: 'transparent', border: `1.5px dashed rgba(212,168,67,0.4)`, borderRadius: 12, color: GOLD, fontFamily: FONT_DISPLAY, fontSize: 16, letterSpacing: 2, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                  + AJOUTER UN EXERCICE
                </button>
              )}

              {/* ── Browse Exercise DB ── */}
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={() => setShowExDbModal(true)}
                style={{ width: '100%', background: BG_CARD, border: `2px dashed ${BORDER}`, borderRadius: RADIUS_CARD, padding: '16px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}
              >
                <Search size={16} color={GOLD} />
                <span style={{ fontFamily: FONT_ALT, fontSize: 13, fontWeight: 800, color: GOLD, letterSpacing: '2px', textTransform: 'uppercase' }}>Découvrir les exercices</span>
              </motion.button>

              {/* ── Start Workout Button ── */}
              {trainingIsToday && !todaySessionDone && (
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={() => startProgramWorkout(trainingDayData, trainingExercises)}
                  style={{
                    width: '100%', background: GOLD, color: '#0D0B08',
                    fontWeight: 400, padding: '18px', borderRadius: 12, border: 'none',
                    cursor: 'pointer',
                    fontFamily: FONT_DISPLAY, fontSize: 20, letterSpacing: '0.15em',
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
                    width: '100%', background: GREEN, color: '#0D0B08',
                    fontWeight: 700, padding: '16px', borderRadius: RADIUS_CARD, border: 'none',
                    cursor: 'pointer',
                    fontFamily: FONT_ALT, fontSize: 13, letterSpacing: '2px', textTransform: 'uppercase',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                  }}
                >
                  <Award size={18} color="#0D0B08" />
                  Terminer la séance
                </motion.button>
              )}

              <div style={{ height: 8 }} />
            </div>
          ) : null}
        </>
      )}

      {/* Cardio Section */}
      <div style={{ padding: '0 16px 16px' }}>
        <CardioSection supabase={supabase} userId={session?.user?.id || ''} weight={80} />
      </div>

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

      {/* ═══ HISTORIQUE DES SÉANCES ═══ */}
      <div style={{ padding: '0 16px', marginTop: 24, marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
          <span style={{ fontFamily: FONT_DISPLAY, fontSize: 18, letterSpacing: 3, color: TEXT_PRIMARY }}>HISTORIQUE</span>
          <div style={{ flex: 1, height: 1, background: 'linear-gradient(90deg, rgba(212,168,67,0.25), transparent)' }} />
          <span style={{ fontFamily: FONT_BODY, fontSize: 12, color: TEXT_MUTED }}>{workoutHistory.length} seances</span>
        </div>
        <div style={{ display: 'flex', gap: 6, overflowX: 'auto', marginBottom: 14, paddingBottom: 4, WebkitOverflowScrolling: 'touch' as any }}>
          {HISTORY_FILTERS.map(f => (
            <button key={f.key} onClick={() => setHistoryFilter(f.key)} style={{ padding: '7px 14px', borderRadius: 20, whiteSpace: 'nowrap', border: historyFilter === f.key ? `1px solid ${GOLD}` : `1px solid ${GOLD_DIM}`, background: historyFilter === f.key ? GOLD_DIM : 'transparent', color: historyFilter === f.key ? GOLD : TEXT_MUTED, fontFamily: FONT_ALT, fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', cursor: 'pointer', flexShrink: 0 }}>{f.label}</button>
          ))}
        </div>
        {(() => {
          const filtered = workoutHistory.filter(s => {
            if (historyFilter === 'all') return true
            const resolved = resolveSessionType(s.name)
            return resolved.key === historyFilter
          })
          if (filtered.length === 0) return <div style={{ textAlign: 'center', padding: '24px 0', fontFamily: FONT_BODY, fontSize: 14, color: TEXT_DIM }}>Aucune séance</div>
          return filtered.slice(0, 20).map((s: any) => {
            const d = new Date(s.created_at)
            const typeInfo = resolveSessionType(s.name)
            return (
              <div key={s.id} onClick={() => openWorkoutDetail(s)} style={{ background: BG_CARD, border: `1px solid ${GOLD_DIM}`, borderRadius: 14, padding: 16, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer' }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: `${typeInfo.color}15`, border: `1px solid ${typeInfo.color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>{typeInfo.emoji}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: FONT_DISPLAY, fontSize: 17, letterSpacing: 1, color: TEXT_PRIMARY }}>{typeInfo.label.toUpperCase()}</div>
                  {s.name && s.name.toLowerCase() !== typeInfo.label.toLowerCase() && s.name.includes('—') && (
                    <div style={{ fontFamily: FONT_BODY, fontSize: 11, color: GOLD, marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {s.name.split('—').slice(1).join('—').trim()}
                    </div>
                  )}
                  <div style={{ fontFamily: FONT_BODY, fontSize: 11, color: TEXT_MUTED, marginTop: 2 }}>
                    {d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
                    {s.duration_minutes ? ` · ${s.duration_minutes}min` : ''}
                    {s.notes ? ` · ${s.notes}` : ''}
                  </div>
                </div>
              </div>
            )
          })
        })()}
      </div>

      {/* Video Feedback History */}
      {session?.user?.id && (
        <VideoFeedbackHistory userId={session.user.id} />
      )}

      {showProgramBuilder && (
        <ProgramBuilder
          supabase={supabase}
          session={session}
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

      {/* Variant popup */}
      {variantPopup && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.75)',backdropFilter:'blur(8px)',zIndex:200,display:'flex',alignItems:'flex-end',justifyContent:'center'}} onClick={()=>setVariantPopup(null)}>
          <div onClick={e=>e.stopPropagation()} style={{background:BG_CARD,border:`1px solid ${GOLD_RULE}`,borderRadius:'20px 20px 0 0',width:'100%',maxWidth:480,maxHeight:'60vh',overflow:'hidden'}}>
            <div style={{padding:'16px 20px',borderBottom:`1px solid ${BORDER}`,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <span style={{fontFamily:FONT_DISPLAY,fontSize:20,letterSpacing:2,color:TEXT_PRIMARY}}>VARIANTES</span>
              <button onClick={()=>setVariantPopup(null)} style={{background:'none',border:'none',color:TEXT_MUTED,fontSize:20,cursor:'pointer'}}>✕</button>
            </div>
            <div style={{overflowY:'auto',maxHeight:'calc(60vh - 60px)',padding:'8px 12px 30px'}}>
              {variantPopup.variants.length===0?(
                <div style={{textAlign:'center',padding:32,color:TEXT_MUTED,fontSize:14,fontFamily:FONT_BODY}}>Aucune variante trouvée</div>
              ):variantPopup.variants.map((v: any,i: number)=>(
                <button key={i} onClick={()=>selectEditVariant(v)} style={{width:'100%',display:'flex',alignItems:'center',gap:12,padding:'14px 16px',marginBottom:4,borderRadius:14,background:BG_BASE,border:`1px solid ${BORDER}`,cursor:'pointer',textAlign:'left'}}>
                  <div style={{width:40,height:40,borderRadius:10,background:GOLD_DIM,display:'flex',alignItems:'center',justifyContent:'center',fontSize:16,flexShrink:0}}>
                    {v.equipment==='Barre'?'🏋️':v.equipment==='Haltères'?'💪':v.equipment==='Machine'?'⚙️':v.equipment==='Poulie'?'🔗':'🤸'}
                  </div>
                  <div>
                    <div style={{fontFamily:FONT_BODY,fontSize:14,color:TEXT_PRIMARY,fontWeight:500}}>{v.name}</div>
                    <div style={{fontFamily:FONT_ALT,fontSize:10,color:GOLD,fontWeight:700,letterSpacing:1,marginTop:2}}>{v.equipment||''}{v.muscle_group?` · ${v.muscle_group}`:''}</div>
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
          <div onClick={e=>e.stopPropagation()} style={{background:BG_CARD,border:`1px solid ${GOLD_RULE}`,borderRadius:'20px 20px 0 0',width:'100%',maxWidth:500,maxHeight:'85vh',display:'flex',flexDirection:'column',overflow:'hidden'}}>
            <div style={{padding:'16px 20px',borderBottom:`1px solid ${BORDER}`,display:'flex',justifyContent:'space-between',alignItems:'center',flexShrink:0}}>
              <div>
                <div style={{fontFamily:FONT_DISPLAY,fontSize:22,letterSpacing:2,color:TEXT_PRIMARY}}>{selectedWorkout.name||'Séance'}</div>
                <div style={{fontFamily:FONT_BODY,fontSize:12,color:TEXT_MUTED,marginTop:2}}>
                  {new Date(selectedWorkout.created_at).toLocaleDateString('fr-FR',{weekday:'long',day:'numeric',month:'long'})}
                  {selectedWorkout.duration_minutes?` · ${selectedWorkout.duration_minutes} min`:''}
                </div>
              </div>
              <button onClick={()=>setSelectedWorkout(null)} style={{width:36,height:36,borderRadius:12,background:GOLD_DIM,border:`1px solid ${BORDER}`,display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',color:TEXT_MUTED,fontSize:16}}>✕</button>
            </div>
            <div style={{flex:1,overflowY:'auto',padding:'12px 16px 32px',WebkitOverflowScrolling:'touch' as any}}>
              {loadingDetail?(
                <div style={{textAlign:'center',padding:40,color:TEXT_MUTED}}>Chargement...</div>
              ):workoutDetail.length===0?(
                <div style={{textAlign:'center',padding:40,color:TEXT_DIM,fontSize:14,fontFamily:FONT_BODY}}>Aucun détail enregistré</div>
              ):(
                workoutDetail.map((ex,i)=>(
                  <div key={i} style={{marginBottom:16,paddingBottom:16,borderBottom:i<workoutDetail.length-1?`1px solid ${BORDER}`:'none'}}>
                    <div style={{fontFamily:FONT_ALT,fontSize:16,fontWeight:700,color:TEXT_PRIMARY,letterSpacing:1,textTransform:'uppercase',marginBottom:8}}>{ex.name}</div>
                    <div style={{display:'grid',gridTemplateColumns:'40px 1fr 1fr 1fr',gap:8,padding:'4px 0',marginBottom:4}}>
                      <span style={{fontFamily:FONT_ALT,fontSize:9,fontWeight:700,color:TEXT_DIM,letterSpacing:1}}>SET</span>
                      <span style={{fontFamily:FONT_ALT,fontSize:9,fontWeight:700,color:TEXT_DIM,letterSpacing:1}}>KG</span>
                      <span style={{fontFamily:FONT_ALT,fontSize:9,fontWeight:700,color:TEXT_DIM,letterSpacing:1}}>REPS</span>
                      <span style={{fontFamily:FONT_ALT,fontSize:9,fontWeight:700,color:TEXT_DIM,letterSpacing:1}}>VOLUME</span>
                    </div>
                    {ex.sets.map((set:any,si:number)=>(
                      <div key={si} style={{display:'grid',gridTemplateColumns:'40px 1fr 1fr 1fr',gap:8,padding:'6px 0',borderBottom:`1px solid ${BORDER}`}}>
                        <span style={{fontFamily:FONT_DISPLAY,fontSize:16,color:GOLD,width:28,height:28,borderRadius:8,background:GOLD_DIM,display:'flex',alignItems:'center',justifyContent:'center'}}>{si+1}</span>
                        <span style={{fontFamily:FONT_DISPLAY,fontSize:18,color:TEXT_PRIMARY}}>{set.weight||0}</span>
                        <span style={{fontFamily:FONT_DISPLAY,fontSize:18,color:TEXT_PRIMARY}}>{set.reps||0}</span>
                        <span style={{fontFamily:FONT_BODY,fontSize:13,color:TEXT_MUTED}}>{((set.weight||0)*(set.reps||0))} kg</span>
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
