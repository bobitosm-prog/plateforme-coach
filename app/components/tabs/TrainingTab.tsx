'use client'
import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import {
  Dumbbell, CheckCircle2, Award, Search, Check, Moon,
} from 'lucide-react'
import {
  BG_BASE, BG_CARD, BORDER, ORANGE, GREEN, TEXT_PRIMARY, TEXT_MUTED, RADIUS_CARD,
  MUSCLE_COLORS, WEEK_DAYS, JS_DAYS_FR,
} from '../../../lib/design-tokens'
import ExerciseSearchModal from '../modals/ExerciseSearchModal'

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
  supabase,
  session,
  coachProgram,
  todayKey,
  todaySessionDone,
  startProgramWorkout,
  fetchAll,
}: TrainingTabProps) {
  const [trainingDay, setTrainingDay] = useState<string>(() => JS_DAYS_FR[new Date().getDay()])
  const [completedSets, setCompletedSets] = useState<Record<string, boolean[]>>({})
  const [showExDbModal, setShowExDbModal] = useState(false)
  const [workoutFinished, setWorkoutFinished] = useState(false)
  const [workoutStarted, setWorkoutStarted] = useState<number | null>(null)
  const [activeRestExName, setActiveRestExName] = useState<string | null>(null)
  const [restTimer, setRestTimer] = useState<number>(0)
  const [restMax, setRestMax] = useState<number>(90)
  const [restRunning, setRestRunning] = useState(false)
  const restIntervalRef = useRef<any>(null)
  const exSearchRef = useRef<any>(null)

  const todayStr = new Date().toISOString().split('T')[0]
  const trainingIsToday = trainingDay === todayKey
  const trainingDayData = coachProgram ? (coachProgram[trainingDay] ?? { repos: false, exercises: [] }) : null
  const trainingExercises: any[] = trainingDayData?.exercises || []
  const trainingTotalSets = trainingExercises.reduce((s: number, ex: any) => s + Number(ex.sets), 0)
  const trainingDoneSets = trainingExercises.reduce((s: number, ex: any) => {
    const key = `fitpro-sets-${todayStr}-${ex.name}`
    return s + (completedSets[key] || []).filter(Boolean).length
  }, 0)

  // Rest timer interval
  useEffect(() => {
    if (restRunning && restTimer > 0) {
      restIntervalRef.current = setInterval(() => {
        setRestTimer(t => {
          if (t <= 1) {
            setRestRunning(false)
            clearInterval(restIntervalRef.current)
            if (navigator.vibrate) navigator.vibrate([200, 100, 200])
            return 0
          }
          return t - 1
        })
      }, 1000)
    }
    return () => clearInterval(restIntervalRef.current)
  }, [restRunning])

  // Load completed sets from localStorage when day or program changes
  useEffect(() => {
    if (!coachProgram || !trainingDay) return
    const dayData = coachProgram[trainingDay]
    if (!dayData?.exercises) { setCompletedSets({}); return }
    const loaded: Record<string, boolean[]> = {}
    ;(dayData.exercises as any[]).forEach((ex: any) => {
      const key = `fitpro-sets-${todayStr}-${ex.name}`
      const stored = typeof window !== 'undefined' ? localStorage.getItem(key) : null
      loaded[key] = stored ? JSON.parse(stored) : Array(Number(ex.sets)).fill(false)
    })
    setCompletedSets(loaded)
  }, [trainingDay, coachProgram])

  function toggleSet(exName: string, setIdx: number, totalSetsCount: number, restSecs: number) {
    const key = `fitpro-sets-${todayStr}-${exName}`
    const prev = completedSets[key] || Array(totalSetsCount).fill(false)
    const next = [...prev]
    next[setIdx] = !next[setIdx]
    localStorage.setItem(key, JSON.stringify(next))
    setCompletedSets(p => ({ ...p, [key]: next }))
    if (!workoutStarted && next[setIdx]) setWorkoutStarted(Date.now())
    if (next[setIdx]) {
      const allDone = next.every(Boolean)
      if (!allDone && restSecs > 0) {
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
      }
    }
  }

  async function finishTrainingWorkout() {
    const duration = workoutStarted ? Math.round((Date.now() - workoutStarted) / 60000) : 1
    const exs: any[] = (coachProgram?.[trainingDay]?.exercises as any[]) || []
    const totalSetsCount = exs.reduce((s: number, ex: any) => s + Number(ex.sets), 0)
    const doneSetsCount = exs.reduce((s: number, ex: any) => {
      const key = `fitpro-sets-${todayStr}-${ex.name}`
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
      if (typeof window !== 'undefined') localStorage.removeItem(`fitpro-sets-${todayStr}-${ex.name}`)
    })
    setCompletedSets({})
    setWorkoutStarted(null)
    setRestRunning(false)
    setRestTimer(0)
    setActiveRestExName(null)
    setWorkoutFinished(true)
    setTimeout(() => setWorkoutFinished(false), 4000)
    fetchAll()
  }

  return (
    <div style={{ minHeight: '100vh' }}>

      {/* ── REST TIMER OVERLAY ── */}
      <AnimatePresence>
        {restRunning && restTimer > 0 && (
          <motion.div
            key="rest-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.93)', backdropFilter: 'blur(16px)', zIndex: 60, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 24 }}
          >
            <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.25em', color: TEXT_MUTED }}>REPOS</span>
            {(() => {
              const r = 70; const circ = 2 * Math.PI * r
              const offset = circ * (1 - restTimer / Math.max(restMax, 1))
              return (
                <div style={{ position: 'relative', width: 180, height: 180 }}>
                  <svg width={180} height={180} viewBox="0 0 180 180">
                    <circle cx={90} cy={90} r={r} fill="none" stroke="#1A1A1A" strokeWidth={10} />
                    <circle cx={90} cy={90} r={r} fill="none" stroke={ORANGE} strokeWidth={10}
                      strokeDasharray={circ} strokeDashoffset={offset}
                      strokeLinecap="round" transform="rotate(-90 90 90)"
                      style={{ transition: 'stroke-dashoffset 1s linear' }} />
                  </svg>
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '4rem', fontWeight: 700, color: TEXT_PRIMARY, lineHeight: 1 }}>{restTimer}</span>
                    <span style={{ fontSize: '0.65rem', color: TEXT_MUTED, fontWeight: 700, marginTop: 4 }}>secondes</span>
                  </div>
                </div>
              )
            })()}
            {activeRestExName && (
              <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '0.85rem', color: TEXT_MUTED, textTransform: 'capitalize' }}>après · {activeRestExName}</span>
            )}
            <button
              onClick={() => { setRestRunning(false); setRestTimer(0); setActiveRestExName(null) }}
              style={{ background: 'transparent', border: `1px solid ${BORDER}`, borderRadius: 14, padding: '12px 32px', color: TEXT_MUTED, fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer', fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: '0.1em', textTransform: 'uppercase', transition: 'border-color 200ms' }}
            >
              Passer le repos
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── WORKOUT FINISHED CELEBRATION ── */}
      <AnimatePresence>
        {workoutFinished && (
          <motion.div
            key="confetti-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.88)', backdropFilter: 'blur(12px)', zIndex: 55, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, overflow: 'hidden' }}
          >
            {Array.from({ length: 24 }).map((_, i) => (
              <motion.div key={i}
                initial={{ y: -40, x: (i % 2 === 0 ? 1 : -1) * (30 + (i * 17) % 180), opacity: 1, rotate: 0 }}
                animate={{ y: 700, x: (i % 2 === 0 ? 1 : -1) * (60 + (i * 23) % 200), opacity: 0, rotate: (i % 2 === 0 ? 1 : -1) * 540 }}
                transition={{ duration: 2.2 + (i % 4) * 0.4, delay: (i % 6) * 0.08 }}
                style={{ position: 'absolute', top: '10%', width: 10, height: 10, borderRadius: i % 3 === 0 ? '50%' : 2, background: [ORANGE, GREEN, '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6'][i % 6] }}
              />
            ))}
            <motion.div initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 300, damping: 18 }}>
              <Award size={72} color={ORANGE} strokeWidth={1.5} />
            </motion.div>
            <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '2.8rem', fontWeight: 700, color: TEXT_PRIMARY, textAlign: 'center', letterSpacing: '0.04em', lineHeight: 1.1 }}>SÉANCE<br />TERMINÉE</div>
            <span style={{ fontSize: '0.9rem', color: TEXT_MUTED }}>Excellent travail !</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── HEADER ── */}
      <div style={{ padding: '20px 20px 0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h1 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '1.6rem', fontWeight: 700, letterSpacing: '0.05em', margin: 0 }}>ENTRAÎNEMENT</h1>
          <span style={{ fontSize: '0.72rem', color: TEXT_MUTED, textTransform: 'capitalize' }}>{format(new Date(), 'EEE d MMM', { locale: fr })}</span>
        </div>
      </div>

      {!coachProgram ? (
        /* ── NO PROGRAM ── */
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, padding: '80px 20px', textAlign: 'center' }}>
          <Dumbbell size={56} color={TEXT_MUTED} strokeWidth={1.5} />
          <p style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '1.2rem', fontWeight: 700, color: TEXT_PRIMARY, margin: 0 }}>Programme en préparation</p>
          <p style={{ fontSize: '0.85rem', color: TEXT_MUTED, margin: 0, maxWidth: 260 }}>Ton coach prépare ton programme. Tu seras notifié dès qu'il est prêt.</p>
        </div>
      ) : (
        <>
          {/* ── WEEK DAY TABS ── */}
          <div style={{ padding: '0 20px', marginBottom: 16 }}>
            <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 4 }}>
              {WEEK_DAYS.map(day => {
                const d = coachProgram[day] ?? { repos: false, exercises: [] }
                const isActive = trainingDay === day
                const isT = day === todayKey
                const hasWork = !d.repos && (d.exercises?.length || 0) > 0
                return (
                  <button key={day} onClick={() => setTrainingDay(day)} style={{
                    flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5,
                    padding: '10px 14px', borderRadius: 12, border: 'none', cursor: 'pointer',
                    background: isActive ? ORANGE : BG_CARD,
                    outline: isT && !isActive ? `2px solid ${ORANGE}` : 'none',
                    transition: 'all 200ms',
                  }}>
                    <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '0.82rem', fontWeight: 700, color: isActive ? '#000' : isT ? ORANGE : TEXT_MUTED, textTransform: 'capitalize' }}>
                      {day.slice(0, 3)}
                    </span>
                    <div style={{ width: 5, height: 5, borderRadius: '50%', background: hasWork ? (isActive ? '#00000060' : ORANGE) : 'transparent', transition: 'background 200ms' }} />
                  </button>
                )
              })}
            </div>
          </div>

          {trainingDayData?.repos ? (
            /* ── REST DAY ── */
            <div style={{ padding: '0 20px' }}>
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
            <div style={{ padding: '0 20px' }}>
              <div style={{ background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: RADIUS_CARD, padding: '40px 24px', textAlign: 'center' }}>
                <Dumbbell size={32} color={TEXT_MUTED} style={{ marginBottom: 12 }} />
                <p style={{ fontSize: '0.85rem', color: TEXT_MUTED, margin: 0 }}>Aucun exercice pour ce jour.</p>
              </div>
            </div>
          ) : trainingIsToday && todaySessionDone ? (
            /* ── SESSION ALREADY DONE TODAY ── */
            <div style={{ padding: '0 20px' }}>
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
                  const nextDay = (() => {
                    const currentIdx = WEEK_DAYS.indexOf(todayKey)
                    for (let i = 1; i <= 7; i++) {
                      const nd = WEEK_DAYS[(currentIdx + i) % 7]
                      const dd = coachProgram?.[nd] ?? { repos: false, exercises: [] }
                      if (!dd.repos && (dd.exercises?.length || 0) > 0) return nd
                    }
                    return null
                  })()
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
            /* ── EXERCISES ── */
            <div style={{ padding: '0 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>

              {/* Séance progress bar (today only) */}
              {trainingIsToday && trainingTotalSets > 0 && (
                <div style={{ background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: 14, padding: '12px 16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '0.7rem', fontWeight: 700, color: TEXT_MUTED, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Progression séance</span>
                    <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '0.9rem', fontWeight: 700, color: trainingDoneSets === trainingTotalSets ? GREEN : ORANGE }}>{trainingDoneSets}/{trainingTotalSets} séries</span>
                  </div>
                  <div style={{ height: 4, background: BORDER, borderRadius: 2, overflow: 'hidden' }}>
                    <motion.div
                      animate={{ width: `${trainingTotalSets > 0 ? (trainingDoneSets / trainingTotalSets) * 100 : 0}%` }}
                      style={{ height: '100%', background: trainingDoneSets === trainingTotalSets ? GREEN : ORANGE, borderRadius: 2 }}
                      transition={{ duration: 0.4 }}
                    />
                  </div>
                </div>
              )}

              {/* Exercise cards */}
              {trainingExercises.map((ex: any) => {
                const numSets = Number(ex.sets) || 3
                const restSecs = Number(ex.rest) || 60
                const storageKey = `fitpro-sets-${todayStr}-${ex.name}`
                const setsArr: boolean[] = completedSets[storageKey] || Array(numSets).fill(false)
                const doneCount = setsArr.filter(Boolean).length
                const allDone = doneCount === numSets && numSets > 0

                return (
                  <motion.div
                    key={ex.name}
                    layout
                    style={{
                      background: BG_CARD,
                      border: `1px solid ${allDone ? GREEN : BORDER}`,
                      borderRadius: RADIUS_CARD,
                      overflow: 'hidden',
                      transition: 'border-color 0.3s ease',
                    }}
                  >
                    {/* Card header */}
                    <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12, borderBottom: `1px solid ${BORDER}` }}>
                      <div style={{ width: 38, height: 38, borderRadius: 10, background: allDone ? `${GREEN}20` : `${ORANGE}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'background 300ms' }}>
                        {allDone ? <Check size={20} color={GREEN} /> : <Dumbbell size={20} color={ORANGE} />}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: '1rem', color: allDone ? GREEN : TEXT_PRIMARY, textTransform: 'uppercase', letterSpacing: '0.04em', transition: 'color 300ms' }}>{ex.name}</div>
                        <div style={{ display: 'flex', gap: 4, marginTop: 5, flexWrap: 'wrap' }}>
                          {ex.muscle_group && (
                            <span style={{ fontSize: '0.6rem', fontWeight: 700, textTransform: 'uppercase', color: MUSCLE_COLORS[ex.muscle_group] || ORANGE, background: `${MUSCLE_COLORS[ex.muscle_group] || ORANGE}20`, borderRadius: 6, padding: '2px 7px' }}>{ex.muscle_group}</span>
                          )}
                          {ex.equipment && (
                            <span style={{ fontSize: '0.6rem', fontWeight: 700, color: TEXT_MUTED, background: '#252525', borderRadius: 6, padding: '2px 7px' }}>{ex.equipment}</span>
                          )}
                        </div>
                      </div>
                      <AnimatePresence>
                        {allDone && (
                          <motion.div
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0, opacity: 0 }}
                            style={{ width: 26, height: 26, borderRadius: '50%', background: GREEN, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
                          >
                            <Check size={14} color="#000" strokeWidth={3} />
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    {/* Chips: sets / reps / rest */}
                    <div style={{ padding: '10px 16px', display: 'flex', gap: 8, borderBottom: `1px solid ${BORDER}` }}>
                      {[`${numSets} séries`, `${ex.reps} reps`, `${restSecs}s repos`].map(label => (
                        <span key={label} style={{ fontSize: '0.68rem', fontWeight: 700, color: ORANGE, background: `${ORANGE}18`, borderRadius: 8, padding: '4px 10px' }}>{label}</span>
                      ))}
                    </div>

                    {/* Set checkboxes + progress */}
                    <div style={{ padding: '14px 16px' }}>
                      <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
                        {Array.from({ length: numSets }).map((_, si) => (
                          <motion.button
                            key={si}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => trainingIsToday ? toggleSet(ex.name, si, numSets, restSecs) : undefined}
                            style={{
                              width: 46, height: 46, borderRadius: 12,
                              border: `2px solid ${setsArr[si] ? GREEN : BORDER}`,
                              background: setsArr[si] ? `${GREEN}20` : BG_BASE,
                              cursor: trainingIsToday ? 'pointer' : 'default',
                              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2,
                              transition: 'all 200ms', flexShrink: 0,
                            }}
                          >
                            {setsArr[si]
                              ? <Check size={18} color={GREEN} strokeWidth={2.5} />
                              : <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '0.85rem', fontWeight: 700, color: TEXT_MUTED }}>{si + 1}</span>
                            }
                          </motion.button>
                        ))}
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                        <span style={{ fontSize: '0.62rem', color: TEXT_MUTED, fontWeight: 700 }}>{doneCount}/{numSets} séries</span>
                        {allDone && <span style={{ fontSize: '0.62rem', color: GREEN, fontWeight: 700, letterSpacing: '0.05em' }}>TERMINÉ</span>}
                      </div>
                      <div style={{ height: 3, background: BORDER, borderRadius: 2, overflow: 'hidden' }}>
                        <motion.div
                          animate={{ width: `${numSets > 0 ? (doneCount / numSets) * 100 : 0}%` }}
                          style={{ height: '100%', background: allDone ? GREEN : ORANGE, borderRadius: 2 }}
                          transition={{ duration: 0.35 }}
                        />
                      </div>
                    </div>
                  </motion.div>
                )
              })}

              {/* Browse exercise DB */}
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={() => setShowExDbModal(true)}
                style={{ width: '100%', background: BG_CARD, border: `2px dashed ${BORDER}`, borderRadius: 14, padding: '16px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}
              >
                <Search size={16} color={ORANGE} />
                <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '0.95rem', fontWeight: 700, color: ORANGE, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Découvrir les exercices</span>
              </motion.button>

              {/* Finish workout button */}
              {trainingIsToday && (
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={finishTrainingWorkout}
                  style={{
                    width: '100%', background: trainingDoneSets > 0 ? GREEN : BORDER,
                    color: trainingDoneSets > 0 ? '#000' : TEXT_MUTED,
                    fontWeight: 700, padding: '16px', borderRadius: 14, border: 'none',
                    cursor: trainingDoneSets > 0 ? 'pointer' : 'not-allowed',
                    fontFamily: "'Barlow Condensed', sans-serif", fontSize: '1rem', letterSpacing: '0.08em', textTransform: 'uppercase',
                    transition: 'all 300ms', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                  }}
                >
                  <Award size={18} color={trainingDoneSets > 0 ? '#000' : TEXT_MUTED} />
                  Terminer la séance
                </motion.button>
              )}

              <div style={{ height: 8 }} />
            </div>
          )}
        </>
      )}

      {/* Exercise DB Modal (self-contained) */}
      {showExDbModal && (
        <ExerciseSearchModal
          supabase={supabase}
          onClose={() => setShowExDbModal(false)}
        />
      )}
    </div>
  )
}
