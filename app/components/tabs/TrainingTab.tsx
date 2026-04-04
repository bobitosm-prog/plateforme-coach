'use client'
import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
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
import TrainingDayChips from './training/TrainingDayChips'
import TrainingRestDay from './training/TrainingRestDay'
import TrainingSessionDone from './training/TrainingSessionDone'
import TrainingExerciseCard from './training/TrainingExerciseCard'
import VideoFeedbackModal from '../VideoFeedbackModal'
import VideoFeedbackHistory from '../VideoFeedbackHistory'

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
  const restIntervalRef  = useRef<any>(null)
  const elapsedIntervalRef = useRef<any>(null)
  const exSearchRef      = useRef<any>(null)

  const todayStr         = new Date().toISOString().split('T')[0]
  const trainingIsToday  = trainingDay === todayKey
  const trainingDayData  = coachProgram ? (coachProgram[trainingDay] ?? { repos: false, exercises: [] }) : null
  const trainingExercises: any[] = trainingDayData?.exercises || []

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

  // ── Load exercises_db cache ──
  useEffect(() => {
    if (exercisesCacheLoaded.current) return
    exercisesCacheLoaded.current = true
    supabase.from('exercises_db').select('*').order('name').limit(200).then(({ data }: any) => {
      setExercisesCache(data || [])
    })
  }, [])

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
              background: GOLD, color: '#080808', border: 'none',
              fontFamily: FONT_ALT, fontWeight: 800, fontSize: 16, letterSpacing: 2,
              padding: '14px 48px', textTransform: 'uppercase', cursor: 'pointer',
              clipPath: 'polygon(8px 0%, 100% 0%, calc(100% - 8px) 100%, 0% 100%)',
            }}>
              C&apos;EST PARTI !
            </button>
          </div>
        </div>
      )}

      {/* ── WORKOUT FINISHED CELEBRATION ── */}
      <WorkoutCelebration visible={workoutFinished} />

      {/* ── PAGE HEADER ── */}
      <div style={{ padding: '20px 16px 0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h1 style={{ fontFamily: FONT_DISPLAY, fontSize: 40, fontWeight: 700, letterSpacing: '2px', margin: 0, color: TEXT_PRIMARY, textTransform: 'uppercase' }}>ENTRAÎNEMENT</h1>
          <span style={{ fontSize: '0.68rem', fontFamily: FONT_BODY, color: TEXT_MUTED, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{format(new Date(), 'EEE d MMM', { locale: fr })}</span>
        </div>
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
                      padding: '2px 10px', borderRadius: 0,
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
        onFinish={finishTrainingWorkout}
        fmtElapsed={fmtElapsed}
      />

      {/* ── NO PROGRAM ── */}
      {!coachProgram ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, padding: '80px 20px', textAlign: 'center' }}>
          <Dumbbell size={56} color={TEXT_MUTED} strokeWidth={1.5} />
          <p style={{ fontFamily: FONT_ALT, fontSize: '1.2rem', fontWeight: 800, letterSpacing: '2px', textTransform: 'uppercase', color: TEXT_PRIMARY, margin: 0 }}>Programme en préparation</p>
          <p style={{ fontSize: '0.85rem', fontFamily: FONT_BODY, color: TEXT_MUTED, margin: 0, maxWidth: 260 }}>Ton coach prépare ton programme. Tu seras notifié dès qu'il est prêt.</p>
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
                    width: '100%', background: GOLD, color: '#080808',
                    fontWeight: 400, padding: '18px', borderRadius: 0, border: 'none',
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
                  onClick={finishTrainingWorkout}
                  style={{
                    width: '100%', background: GREEN, color: '#080808',
                    fontWeight: 700, padding: '16px', borderRadius: RADIUS_CARD, border: 'none',
                    cursor: 'pointer',
                    fontFamily: FONT_ALT, fontSize: 13, letterSpacing: '2px', textTransform: 'uppercase',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                  }}
                >
                  <Award size={18} color="#080808" />
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
    </div>
  )
}
