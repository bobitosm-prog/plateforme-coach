'use client'
import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import {
  Dumbbell, CheckCircle2, Award, Search, Check, Moon,
  Timer, Plus, MoreHorizontal,
} from 'lucide-react'
import {
  BG_BASE, BG_CARD, BORDER, ORANGE, GREEN, TEXT_PRIMARY, TEXT_MUTED, RADIUS_CARD,
  MUSCLE_COLORS, WEEK_DAYS, JS_DAYS_FR,
} from '../../../lib/design-tokens'
import ExerciseSearchModal from '../modals/ExerciseSearchModal'
import ExerciseDetailModal from '../modals/ExerciseDetailModal'

// Hevy-style design tokens
const BLUE        = '#3B82F6'
const BG_WORKOUT  = '#0F0F0F'
const INPUT_BG    = '#262626'

interface TrainingTabProps {
  supabase: any
  session: any
  coachProgram: any
  todayKey: string
  todaySessionDone: boolean
  startProgramWorkout: (day: any, exercises: any[]) => void
  fetchAll: () => Promise<void>
}

export default function TrainingTab({
  supabase, session, coachProgram, todayKey, todaySessionDone, startProgramWorkout, fetchAll,
}: TrainingTabProps) {
  const [trainingDay, setTrainingDay]   = useState<string>(() => JS_DAYS_FR[new Date().getDay()])
  const [completedSets, setCompletedSets] = useState<Record<string, boolean[]>>({})
  const [setInputs, setSetInputs]       = useState<Record<string, { kg: string; reps: string }[]>>({})
  const [showExDbModal, setShowExDbModal] = useState(false)
  const [exerciseDetail, setExerciseDetail] = useState<any>(null)
  const [exercisesCache, setExercisesCache] = useState<any[]>([])
  const exercisesCacheLoaded = useRef(false)
  const [workoutFinished, setWorkoutFinished] = useState(false)
  const [workoutStarted, setWorkoutStarted]   = useState<number | null>(null)
  const [activeRestExName, setActiveRestExName] = useState<string | null>(null)
  const [restingSet, setRestingSet]     = useState<{ exName: string; setIdx: number } | null>(null)
  const [restTimer, setRestTimer]       = useState<number>(0)
  const [restMax, setRestMax]           = useState<number>(90)
  const [restRunning, setRestRunning]   = useState(false)
  const [elapsedSecs, setElapsedSecs]   = useState(0)
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

  // ── Rest timer expiry: handled in a separate effect to stay pure ──
  useEffect(() => {
    if (restRunning && restTimer === 0) {
      clearInterval(restIntervalRef.current)
      setRestRunning(false)
      setRestingSet(null)
      setActiveRestExName(null)
      if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate([200, 100, 200])
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
    supabase.from('exercises_db').select('*').order('name').then(({ data }: any) => {
      setExercisesCache(data || [])
    })
  }, [])

  function findExercise(name: string) {
    if (!name || exercisesCache.length === 0) return null
    const n = name.trim().toLowerCase()
    // Exact match
    let found = exercisesCache.find((e: any) => e.name?.toLowerCase() === n)
    if (found) return found
    // Partial match
    found = exercisesCache.find((e: any) => e.name?.toLowerCase().includes(n) || n.includes(e.name?.toLowerCase()))
    if (found) return found
    // First 3 words
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
    // Use functional updaters to always read current state, never stale closure
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

  // ══════════════════════════════════════════
  return (
    <div style={{ minHeight: '100vh', background: BG_WORKOUT, paddingBottom: 100, overflowX: 'hidden', maxWidth: '100%' }}>
      <style>{`
        .set-input { -webkit-appearance: none; appearance: none; }
        .set-input::-webkit-inner-spin-button,
        .set-input::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
        .set-input:focus { border-color: #3B82F6 !important; }
        .add-set-btn:active { opacity: 0.7; }
        @media(max-width:480px){
          .set-grid{grid-template-columns:28px 1fr 56px 52px 36px!important;gap:2px!important;padding-left:8px!important;padding-right:8px!important}
          .set-grid .prev-col{font-size:0.55rem!important}
        }
      `}</style>

      {/* ── WORKOUT FINISHED CELEBRATION ── */}
      <AnimatePresence>
        {workoutFinished && (
          <motion.div
            key="confetti-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.92)', backdropFilter: 'blur(12px)', zIndex: 55, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, overflow: 'hidden' }}
          >
            {Array.from({ length: 24 }).map((_, i) => (
              <motion.div key={i}
                initial={{ y: -40, x: (i % 2 === 0 ? 1 : -1) * (30 + (i * 17) % 180), opacity: 1, rotate: 0 }}
                animate={{ y: 700, x: (i % 2 === 0 ? 1 : -1) * (60 + (i * 23) % 200), opacity: 0, rotate: (i % 2 === 0 ? 1 : -1) * 540 }}
                transition={{ duration: 2.2 + (i % 4) * 0.4, delay: (i % 6) * 0.08 }}
                style={{ position: 'absolute', top: '10%', width: 10, height: 10, borderRadius: i % 3 === 0 ? '50%' : 2, background: [ORANGE, GREEN, BLUE, '#F59E0B', '#EF4444', '#8B5CF6'][i % 6] }}
              />
            ))}
            <motion.div initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 300, damping: 18 }}>
              <Award size={72} color={GREEN} strokeWidth={1.5} />
            </motion.div>
            <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '2.8rem', fontWeight: 700, color: TEXT_PRIMARY, textAlign: 'center', letterSpacing: '0.04em', lineHeight: 1.1 }}>SÉANCE<br />TERMINÉE</div>
            <span style={{ fontSize: '0.9rem', color: TEXT_MUTED }}>Excellent travail !</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── PAGE HEADER ── */}
      <div style={{ padding: '20px 16px 0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h1 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '1.6rem', fontWeight: 700, letterSpacing: '0.05em', margin: 0, color: TEXT_PRIMARY }}>ENTRAÎNEMENT</h1>
          <span style={{ fontSize: '0.72rem', color: TEXT_MUTED, textTransform: 'capitalize' }}>{format(new Date(), 'EEE d MMM', { locale: fr })}</span>
        </div>
      </div>

      {/* ── ACTIVE SESSION TOP BAR ── */}
      <AnimatePresence>
        {workoutStarted && (
          <motion.div
            key="session-bar"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            style={{ position: 'sticky', top: 0, zIndex: 30, background: '#111111', borderBottom: '1px solid #1E1E1E', padding: '10px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
          >
            {/* Timer left */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <Timer size={14} color={BLUE} />
                <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '1.45rem', fontWeight: 700, color: TEXT_PRIMARY, letterSpacing: '0.08em', lineHeight: 1 }}>{fmtElapsed(elapsedSecs)}</span>
              </div>
              <span style={{ fontSize: '0.62rem', color: TEXT_MUTED, paddingLeft: 21 }}>
                {format(new Date(), 'EEE d MMM', { locale: fr })} · {trainingDoneSets}/{trainingTotalSets} séries
              </span>
            </div>
            {/* Terminer right */}
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={finishTrainingWorkout}
              style={{ background: GREEN, color: '#000', border: 'none', borderRadius: 10, padding: '10px 20px', fontFamily: "'Barlow Condensed', sans-serif", fontSize: '0.95rem', fontWeight: 700, letterSpacing: '0.06em', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <Check size={15} strokeWidth={3} /> Terminer
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── NO PROGRAM ── */}
      {!coachProgram ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, padding: '80px 20px', textAlign: 'center' }}>
          <Dumbbell size={56} color={TEXT_MUTED} strokeWidth={1.5} />
          <p style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '1.2rem', fontWeight: 700, color: TEXT_PRIMARY, margin: 0 }}>Programme en préparation</p>
          <p style={{ fontSize: '0.85rem', color: TEXT_MUTED, margin: 0, maxWidth: 260 }}>Ton coach prépare ton programme. Tu seras notifié dès qu'il est prêt.</p>
        </div>
      ) : (
        <>
          {/* ── WEEK DAY CHIPS ── */}
          <div style={{ padding: '0 16px', marginBottom: 16 }}>
            <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 4 }}>
              {WEEK_DAYS.map(day => {
                const d = coachProgram[day] ?? { repos: false, exercises: [] }
                const isActive  = trainingDay === day
                const isToday   = day === todayKey
                const hasWork   = !d.repos && (d.exercises?.length || 0) > 0
                return (
                  <button key={day} onClick={() => setTrainingDay(day)} style={{
                    flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5,
                    padding: '10px 14px', borderRadius: 12, border: 'none', cursor: 'pointer',
                    background: isActive ? ORANGE : BG_CARD,
                    outline: isToday && !isActive ? `2px solid ${ORANGE}` : 'none',
                    transition: 'all 200ms',
                  }}>
                    <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '0.82rem', fontWeight: 700, color: isActive ? '#000' : isToday ? ORANGE : TEXT_MUTED, textTransform: 'capitalize' }}>
                      {day.slice(0, 3)}
                    </span>
                    <div style={{ width: 5, height: 5, borderRadius: '50%', background: hasWork ? (isActive ? '#00000060' : ORANGE) : 'transparent', transition: 'background 200ms' }} />
                  </button>
                )
              })}
            </div>
          </div>

          {/* ── REST DAY ── */}
          {trainingDayData?.repos ? (
            <div style={{ padding: '0 16px' }}>
              <div style={{ background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: RADIUS_CARD, padding: '40px 24px', textAlign: 'center' }}>
                <Moon size={44} color={TEXT_MUTED} style={{ marginBottom: 16 }} />
                <p style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '1.5rem', fontWeight: 700, color: TEXT_PRIMARY, margin: '0 0 6px', letterSpacing: '0.04em' }}>JOUR DE REPOS</p>
                <p style={{ fontSize: '0.8rem', color: TEXT_MUTED, margin: '0 0 24px' }}>La récupération fait partie du progrès.</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, textAlign: 'left' }}>
                  {['Marche légère 20–30 min', 'Étirements statiques 15 min', 'Hydratation optimale (2L+)', 'Sommeil 7–9 heures'].map((tip, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: BG_BASE, borderRadius: 10 }}>
                      <CheckCircle2 size={16} color={GREEN} />
                      <span style={{ fontSize: '0.85rem', color: TEXT_MUTED }}>{tip}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

          ) : trainingExercises.length === 0 ? (
            /* ── NO EXERCISES ── */
            <div style={{ padding: '0 16px' }}>
              <div style={{ background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: RADIUS_CARD, padding: '40px 24px', textAlign: 'center' }}>
                <Dumbbell size={32} color={TEXT_MUTED} style={{ marginBottom: 12 }} />
                <p style={{ fontSize: '0.85rem', color: TEXT_MUTED, margin: 0 }}>Aucun exercice pour ce jour.</p>
              </div>
            </div>

          ) : trainingIsToday && todaySessionDone ? (
            /* ── SESSION ALREADY DONE TODAY ── */
            <div style={{ padding: '0 16px' }}>
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                style={{ background: BG_CARD, border: `1px solid ${GREEN}40`, borderRadius: RADIUS_CARD, padding: '40px 24px', textAlign: 'center' }}
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 280, damping: 18, delay: 0.1 }}
                  style={{ width: 72, height: 72, borderRadius: '50%', background: `${GREEN}20`, border: `2px solid ${GREEN}`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}
                >
                  <CheckCircle2 size={36} color={GREEN} strokeWidth={1.5} />
                </motion.div>
                <p style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '1.6rem', fontWeight: 700, color: GREEN, margin: '0 0 6px', letterSpacing: '0.04em' }}>SÉANCE TERMINÉE ✓</p>
                <p style={{ fontSize: '0.85rem', color: TEXT_MUTED, margin: '0 0 28px' }}>Bravo ! Tu as complété la séance du jour.</p>
                {(() => {
                  const currentIdx = WEEK_DAYS.indexOf(todayKey)
                  let nextDay: string | null = null
                  for (let i = 1; i <= 7; i++) {
                    const nd = WEEK_DAYS[(currentIdx + i) % 7]
                    const dd = coachProgram?.[nd] ?? { repos: false, exercises: [] }
                    if (!dd.repos && (dd.exercises?.length || 0) > 0) { nextDay = nd; break }
                  }
                  return nextDay ? (
                    <div style={{ background: BG_BASE, border: `1px solid ${BORDER}`, borderRadius: 12, padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div>
                        <div style={{ fontSize: '0.62rem', color: TEXT_MUTED, fontWeight: 700, textTransform: 'uppercase', marginBottom: 3 }}>Prochaine séance</div>
                        <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '1rem', fontWeight: 700, color: TEXT_PRIMARY, textTransform: 'capitalize' }}>{nextDay}</div>
                      </div>
                      <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '0.75rem', fontWeight: 700, color: ORANGE, background: `${ORANGE}18`, borderRadius: 8, padding: '4px 10px' }}>
                        {(coachProgram?.[nextDay]?.exercises || []).length} exercices
                      </div>
                    </div>
                  ) : null
                })()}
              </motion.div>
            </div>

          ) : (
            /* ══════════════ HEVY-STYLE EXERCISE CARDS ══════════════ */
            <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>

              {trainingExercises.map((ex: any, exIdx: number) => {
                const restSecs   = Number(ex.rest) || 90
                const storageKey = `moovx-sets-${todayStr}-${ex.name}`
                const n = Number(ex.sets) || 3
                const setsArr: boolean[] = completedSets[storageKey] || Array.from({ length: n }, () => false)
                const numSets    = setsArr.length
                const inputs     = setInputs[ex.name] || Array.from({ length: numSets }, () => ({ kg: '', reps: String(ex.reps || '') }))
                const doneCount  = setsArr.filter(Boolean).length
                const allDone    = doneCount === numSets && numSets > 0
                const isRestingHere = restRunning && restingSet?.exName === ex.name

                return (
                  <motion.div
                    key={ex.name}
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: exIdx * 0.05, duration: 0.28 }}
                    style={{
                      background: '#1A1A1A',
                      border: `1px solid ${allDone ? GREEN + '50' : '#242424'}`,
                      borderRadius: 18,
                      overflow: 'hidden',
                      transition: 'border-color 0.4s ease',
                    }}
                  >
                    {/* ── Card Header ── */}
                    <div style={{ padding: '14px 14px 10px', borderBottom: '1px solid #222' }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          {/* Exercise name in blue */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                            <span onClick={() => { const found = findExercise(ex.name); if (found) setExerciseDetail({ ...found, _sets: ex.sets, _reps: ex.reps, _rest: ex.rest }) }} style={{
                              fontFamily: "'Barlow Condensed', sans-serif",
                              fontWeight: 700, fontSize: '1.05rem',
                              color: allDone ? GREEN : BLUE,
                              textTransform: 'uppercase', letterSpacing: '0.04em',
                              transition: 'color 0.3s', cursor: 'pointer',
                            }}>{ex.name} <span style={{ fontSize: '0.7rem', opacity: 0.5 }}>ℹ️</span></span>

                            {/* Muscle group badge */}
                            {ex.muscle_group && (
                              <span style={{
                                fontSize: '0.58rem', fontWeight: 700, textTransform: 'uppercase',
                                color: MUSCLE_COLORS[ex.muscle_group] || ORANGE,
                                background: `${MUSCLE_COLORS[ex.muscle_group] || ORANGE}20`,
                                borderRadius: 6, padding: '2px 7px', flexShrink: 0,
                              }}>{ex.muscle_group}</span>
                            )}

                            {/* Done badge */}
                            {allDone && (
                              <motion.span
                                initial={{ scale: 0, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                style={{ fontSize: '0.58rem', fontWeight: 700, color: GREEN, background: `${GREEN}20`, borderRadius: 6, padding: '2px 7px', flexShrink: 0 }}
                              >✓ TERMINÉ</motion.span>
                            )}
                          </div>

                          {/* Subtitle: sets × reps · rest */}
                          <div style={{ display: 'flex', gap: 6, marginTop: 5, alignItems: 'center' }}>
                            <span style={{ fontSize: '0.65rem', color: TEXT_MUTED, fontFamily: "'Barlow', sans-serif" }}>
                              {numSets} × {ex.reps} reps
                            </span>
                            {restSecs > 0 && (
                              <>
                                <span style={{ fontSize: '0.55rem', color: '#333' }}>·</span>
                                <span style={{ fontSize: '0.65rem', color: '#374151', fontFamily: "'Barlow', sans-serif" }}>
                                  {fmtRest(restSecs)} repos
                                </span>
                              </>
                            )}
                          </div>
                        </div>

                        {/* ⋯ menu button */}
                        <button style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '4px', color: '#3A3A3A', display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: 32, minHeight: 32, borderRadius: 8, flexShrink: 0 }}>
                          <MoreHorizontal size={16} />
                        </button>
                      </div>
                    </div>

                    {/* ── Table Header ── */}
                    <div className="set-grid" style={{
                      display: 'grid',
                      gridTemplateColumns: '36px 1fr 72px 64px 44px',
                      gap: 4, padding: '8px 14px 4px', alignItems: 'center',
                    }}>
                      {['SÉRIE', 'PRÉCÉDENT', 'KG', 'REPS', ''].map((col, ci) => (
                        <span key={ci} style={{
                          fontFamily: "'Barlow Condensed', sans-serif",
                          fontSize: '0.58rem', fontWeight: 700,
                          color: '#2E2E2E', textTransform: 'uppercase', letterSpacing: '0.08em',
                          textAlign: (ci === 0 || ci >= 2) ? 'center' : 'left',
                        }}>{col}</span>
                      ))}
                    </div>

                    {/* ── Set Rows ── */}
                    <div style={{ paddingBottom: 4 }}>
                      {setsArr.map((done, si) => {
                        const inp = inputs[si] || { kg: '', reps: String(ex.reps || '') }
                        const isRestingThisSet = isRestingHere && restingSet?.setIdx === si

                        return (
                          <div key={si}>
                            {/* Set row */}
                            <motion.div
                              animate={{ background: done ? 'rgba(34,197,94,0.06)' : 'transparent' }}
                              transition={{ duration: 0.35 }}
                              className="set-grid"
                              style={{
                                display: 'grid',
                                gridTemplateColumns: '36px 1fr 72px 64px 44px',
                                gap: 4, padding: '5px 14px', alignItems: 'center',
                              }}
                            >
                              {/* Series number pill */}
                              <div style={{ display: 'flex', justifyContent: 'center' }}>
                                <div style={{
                                  width: 26, height: 26, borderRadius: 7,
                                  background: done ? `${GREEN}28` : '#262626',
                                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  transition: 'background 300ms',
                                }}>
                                  <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '0.82rem', fontWeight: 700, color: done ? GREEN : '#555' }}>{si + 1}</span>
                                </div>
                              </div>

                              {/* Previous performance */}
                              <span style={{
                                fontSize: '0.72rem', color: '#2E2E2E',
                                fontFamily: "'Barlow', sans-serif",
                                paddingLeft: 2,
                                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                textDecoration: done ? 'line-through' : 'none',
                              }}>—</span>

                              {/* KG input */}
                              <input
                                type="number"
                                inputMode="decimal"
                                className="set-input"
                                value={inp.kg}
                                onChange={e => updateInput(ex.name, si, 'kg', e.target.value)}
                                placeholder="0"
                                disabled={!trainingIsToday}
                                style={{
                                  background: done ? 'rgba(34,197,94,0.1)' : INPUT_BG,
                                  border: `1px solid ${done ? GREEN + '40' : 'transparent'}`,
                                  borderRadius: 10, padding: '7px 4px',
                                  fontSize: '0.95rem', fontFamily: "'Barlow Condensed', sans-serif",
                                  fontWeight: 700, color: done ? GREEN : TEXT_PRIMARY,
                                  textAlign: 'center', width: '100%', outline: 'none',
                                  transition: 'background 300ms, border-color 200ms',
                                  cursor: trainingIsToday ? 'text' : 'default',
                                }}
                              />

                              {/* Reps input */}
                              <input
                                type="number"
                                inputMode="numeric"
                                className="set-input"
                                value={inp.reps}
                                onChange={e => updateInput(ex.name, si, 'reps', e.target.value)}
                                placeholder="0"
                                disabled={!trainingIsToday}
                                style={{
                                  background: done ? 'rgba(34,197,94,0.1)' : INPUT_BG,
                                  border: `1px solid ${done ? GREEN + '40' : 'transparent'}`,
                                  borderRadius: 10, padding: '7px 4px',
                                  fontSize: '0.95rem', fontFamily: "'Barlow Condensed', sans-serif",
                                  fontWeight: 700, color: done ? GREEN : TEXT_PRIMARY,
                                  textAlign: 'center', width: '100%', outline: 'none',
                                  transition: 'background 300ms, border-color 200ms',
                                  cursor: trainingIsToday ? 'text' : 'default',
                                }}
                              />

                              {/* Check button */}
                              <div style={{ display: 'flex', justifyContent: 'center' }}>
                                <motion.button
                                  whileTap={{ scale: 0.8 }}
                                  onClick={() => trainingIsToday ? toggleSet(ex.name, si, numSets, restSecs) : undefined}
                                  style={{
                                    width: 34, height: 34, borderRadius: 10, border: 'none',
                                    background: done ? GREEN : '#262626',
                                    cursor: trainingIsToday ? 'pointer' : 'default',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    transition: 'background 200ms', flexShrink: 0,
                                  }}
                                >
                                  <Check size={16} color={done ? '#000' : '#333'} strokeWidth={2.5} />
                                </motion.button>
                              </div>
                            </motion.div>

                            {/* ── Inline rest timer between rows ── */}
                            <AnimatePresence>
                              {isRestingThisSet && (
                                <motion.div
                                  key={`rest-${si}`}
                                  initial={{ opacity: 0, height: 0 }}
                                  animate={{ opacity: 1, height: 34 }}
                                  exit={{ opacity: 0, height: 0 }}
                                  style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0 14px', overflow: 'hidden' }}
                                >
                                  <div style={{ flex: 1, height: 1, background: '#1F1F1F' }} />
                                  <button
                                    onClick={() => { setRestRunning(false); setRestTimer(0); setRestingSet(null); setActiveRestExName(null) }}
                                    style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'transparent', border: 'none', cursor: 'pointer', padding: '0 8px' }}
                                  >
                                    <Timer size={12} color={BLUE} />
                                    <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '1.1rem', fontWeight: 700, color: BLUE, letterSpacing: '0.08em' }}>{fmtRest(restTimer)}</span>
                                  </button>
                                  <div style={{ flex: 1, height: 1, background: '#1F1F1F' }} />
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        )
                      })}
                    </div>

                    {/* ── Add Set Button ── */}
                    {trainingIsToday && (
                      <motion.button
                        className="add-set-btn"
                        whileTap={{ scale: 0.98 }}
                        onClick={() => addSet(ex.name)}
                        style={{
                          width: '100%', background: 'transparent', border: 'none',
                          borderTop: '1px solid #222',
                          padding: '11px 14px', cursor: 'pointer',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                          transition: 'background 150ms',
                        }}
                      >
                        <Plus size={13} color={BLUE} strokeWidth={2.5} />
                        <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '0.8rem', fontWeight: 700, color: BLUE, letterSpacing: '0.06em' }}>
                          + Ajouter une série ({fmtRest(restSecs)})
                        </span>
                      </motion.button>
                    )}
                  </motion.div>
                )
              })}

              {/* ── Browse Exercise DB ── */}
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={() => setShowExDbModal(true)}
                style={{ width: '100%', background: BG_CARD, border: `2px dashed #222`, borderRadius: 14, padding: '16px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}
              >
                <Search size={16} color={BLUE} />
                <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '0.95rem', fontWeight: 700, color: BLUE, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Découvrir les exercices</span>
              </motion.button>

              {/* ── Bottom Finish Button (when session not yet started but sets done) ── */}
              {trainingIsToday && !workoutStarted && trainingDoneSets > 0 && (
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={finishTrainingWorkout}
                  style={{
                    width: '100%', background: GREEN, color: '#000',
                    fontWeight: 700, padding: '16px', borderRadius: 14, border: 'none',
                    cursor: 'pointer',
                    fontFamily: "'Barlow Condensed', sans-serif", fontSize: '1rem', letterSpacing: '0.08em', textTransform: 'uppercase',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                  }}
                >
                  <Award size={18} color="#000" />
                  Terminer la séance
                </motion.button>
              )}

              <div style={{ height: 8 }} />
            </div>
          )}
        </>
      )}

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
    </div>
  )
}
