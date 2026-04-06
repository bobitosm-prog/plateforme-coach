'use client'
import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { addXP, updateStreak } from '../../../lib/gamification'
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
import ProgramBuilder from '../training/ProgramBuilder'

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
  const [trainingDay, setTrainingDay]   = useState<string>(() => JS_DAYS_FR[new Date().getDay()])
  const [completedSets, setCompletedSets] = useState<Record<string, boolean[]>>({})
  const [setInputs, setSetInputs]       = useState<Record<string, { kg: string; reps: string }[]>>({})
  const [showExDbModal, setShowExDbModal] = useState(false)
  const [exerciseDetail, setExerciseDetail] = useState<any>(null)
  const [exercisesCache, setExercisesCache] = useState<any[]>([])
  const exercisesCacheLoaded = useRef(false)
  const [showMonthCalendar, setShowMonthCalendar] = useState(false)
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
  // Feature: swap exercise
  const [swapping, setSwapping] = useState<string | null>(null)
  const restIntervalRef  = useRef<any>(null)
  const elapsedIntervalRef = useRef<any>(null)
  const exSearchRef      = useRef<any>(null)

  const todayStr         = new Date().toISOString().split('T')[0]
  const trainingIsToday  = trainingDay === todayKey
  // Priorité : programme custom actif > programme coach
  const customDayData = (() => {
    if (!activeCustomProgram?.days?.length) return null
    const dayIndex = ['lundi','mardi','mercredi','jeudi','vendredi','samedi','dimanche'].indexOf(trainingDay)
    const customDay = activeCustomProgram.days[dayIndex] || activeCustomProgram.days.find((d: any) => d.day_number === dayIndex + 1)
    if (!customDay) return null
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
    setActiveCustomProgram(updated.find(p => p.id === programId) || null)
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
    await supabase.from('workout_sessions').insert({
      user_id: session.user.id,
      name: trainingDay,
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
    const found = findExercise(ex.name)
    if (found) setExerciseDetail({ ...found, _sets: ex.sets, _reps: ex.reps, _rest: ex.rest })
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
          <button onClick={() => { setEditingProgram(null); setShowProgramBuilder(true) }}
            style={{ fontFamily: FONT_BODY, fontSize: 11, color: GOLD, background: 'transparent', border: `1px solid ${GOLD}`, padding: '6px 14px', cursor: 'pointer', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            + CRÉER
          </button>
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
      {scheduledSessions.length > 0 && (
        <div style={{ padding: '0 16px' }}>
          <WeekCalendar
            sessions={scheduledSessions}
            selectedDate={calendarSelectedDate}
            onSelectDate={(d) => {
              setCalendarSelectedDate(d)
              const dayNames = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi']
              setTrainingDay(dayNames[d.getDay()])
            }}
            onToggleMonth={() => setShowMonthCalendar(v => !v)}
          />
          <AnimatePresence>
            {showMonthCalendar && (
              <MonthCalendar
                sessions={scheduledSessions}
                selectedDate={calendarSelectedDate}
                onSelectDate={(d) => {
                  setCalendarSelectedDate(d)
                  const dayNames = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi']
                  setTrainingDay(dayNames[d.getDay()])
                }}
                onClose={() => setShowMonthCalendar(false)}
              />
            )}
          </AnimatePresence>

          {/* ── Selected Day Program Summary ── */}
          {(() => {
            const daySessions = getSessionsForDate(scheduledSessions, calendarSelectedDate)
            if (daySessions.length === 0) return null
            const isRest = daySessions.every(s => s.session_type === 'rest')
            if (isRest) {
              return (
                <div style={{
                  background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: RADIUS_CARD,
                  padding: '12px 16px', marginBottom: 12, textAlign: 'center',
                }}>
                  <span style={{ fontSize: '0.85rem', fontFamily: FONT_BODY, color: TEXT_MUTED }}>Jour de repos 💤 Récupération active recommandée</span>
                </div>
              )
            }
            return (
              <div style={{
                background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: RADIUS_CARD,
                padding: '12px 16px', marginBottom: 12,
              }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {daySessions.filter(s => s.session_type !== 'rest').map(s => (
                    <div key={s.id} style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      padding: '2px 10px', borderRadius: 12,
                      background: GOLD_DIM,
                      border: `1px solid ${GOLD_RULE}`,
                    }}>
                      <div style={{ width: 6, height: 6, borderRadius: '50%', background: GOLD }} />
                      <span style={{ fontFamily: FONT_ALT, fontSize: 13, fontWeight: 800, letterSpacing: '1px', color: GOLD }}>
                        {s.title}
                      </span>
                      {s.completed && <span style={{ fontSize: '0.65rem', color: GREEN }}>✓</span>}
                      {s.duration_min > 0 && (
                        <span style={{ fontSize: '0.6rem', fontFamily: FONT_BODY, color: TEXT_MUTED }}>{s.duration_min}min</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )
          })()}
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
          {/* ── WEEK DAY CHIPS ── */}
          <TrainingDayChips
            trainingDay={trainingDay}
            todayKey={todayKey}
            coachProgram={coachProgram}
            onSelectDay={setTrainingDay}
          />

          {/* ── REST DAY ── */}
          {trainingDayData?.repos ? (
            <TrainingRestDay />

          ) : trainingExercises.length === 0 ? (
            /* ── NO EXERCISES ── */
            <div style={{ padding: '0 16px' }}>
              <div style={{ background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: RADIUS_CARD, padding: '40px 24px', textAlign: 'center' }}>
                <Dumbbell size={32} color={TEXT_MUTED} style={{ marginBottom: 12 }} />
                <p style={{ fontSize: '0.85rem', fontFamily: FONT_BODY, color: TEXT_MUTED, margin: 0 }}>Aucun exercice pour ce jour.</p>
              </div>
            </div>

          ) : trainingIsToday && todaySessionDone ? (
            /* ── SESSION ALREADY DONE TODAY ── */
            <TrainingSessionDone todayKey={todayKey} coachProgram={coachProgram} />

          ) : (
            /* ══════════════ EXERCISE CARDS ══════════════ */
            <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 16 }}>

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
          )}
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
          onClose={() => { setShowProgramBuilder(false); setEditingProgram(null) }}
          onSave={refreshPrograms}
          editProgram={editingProgram}
        />
      )}

      {showAddExercise && (
        <AddExercisePopup searchQ={exerciseSearchQ} onSearchChange={setExerciseSearchQ} results={exerciseSearchResults} onSelect={(ex) => { addExerciseToSession(ex); setShowAddExercise(false) }} onClose={() => setShowAddExercise(false)} />
      )}
      {showSaveChoice && (
        <SaveChoicePopup onSaveModified={async () => { await saveWithModifications(); setShowSaveChoice(false) }} onSaveOriginal={async () => { await saveOriginal(); setShowSaveChoice(false) }} onClose={() => setShowSaveChoice(false)} />
      )}
    </div>
  )
}
