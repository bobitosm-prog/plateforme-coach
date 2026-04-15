'use client'
import { useState, useEffect, useRef } from 'react'
import { Play, Pause, Square, SkipForward, ChevronDown, ChevronUp } from 'lucide-react'
import { HIIT_WORKOUTS, LISS_WORKOUTS, estimateCalories, type CardioWorkout, type HiitExercise } from '../../lib/cardio-data'
import { toast } from 'sonner'
import {
  BG_BASE, BG_CARD, BG_CARD_2, BORDER, GOLD, GOLD_DIM, GOLD_RULE,
  GREEN, RED, TEXT_PRIMARY, TEXT_MUTED, TEXT_DIM, RADIUS_CARD,
  FONT_DISPLAY, FONT_ALT, FONT_BODY
} from '../../lib/design-tokens'

interface CardioProps {
  supabase: any
  userId: string
  weight: number
}

export default function CardioSection({ supabase, userId, weight }: CardioProps) {
  const [expanded, setExpanded] = useState(false)
  const [filter, setFilter] = useState<'all' | 'hiit' | 'liss'>('all')
  const [activeWorkout, setActiveWorkout] = useState<CardioWorkout | null>(null)
  const [showLibrary, setShowLibrary] = useState(false)

  const allWorkouts = [...HIIT_WORKOUTS, ...LISS_WORKOUTS]
  const filtered = filter === 'all' ? allWorkouts : allWorkouts.filter(w => w.type === filter)

  // Suggest today's cardio (rotate based on day of week)
  const dayIdx = new Date().getDay()
  const suggestedHiit = HIIT_WORKOUTS[dayIdx % HIIT_WORKOUTS.length]
  const suggestedLiss = LISS_WORKOUTS[dayIdx % LISS_WORKOUTS.length]

  if (activeWorkout) {
    return activeWorkout.type === 'hiit' && activeWorkout.exercises?.length
      ? <HiitTimer workout={activeWorkout} weight={weight} supabase={supabase} userId={userId} onFinish={() => setActiveWorkout(null)} />
      : <LissTimer workout={activeWorkout} weight={weight} supabase={supabase} userId={userId} onFinish={() => setActiveWorkout(null)} />
  }

  return (
    <div style={{ background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: RADIUS_CARD, overflow: 'hidden' }}>
      {/* Header */}
      <button onClick={() => setExpanded(!expanded)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: '14px 16px', background: 'none', border: 'none', cursor: 'pointer' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: '1.1rem' }}>🏃</span>
          <span style={{ fontFamily: FONT_ALT, fontSize: '0.92rem', fontWeight: 700, color: TEXT_PRIMARY, letterSpacing: '2px', textTransform: 'uppercase' }}>Cardio</span>
          <span style={{ fontSize: '0.6rem', fontWeight: 700, color: GOLD, background: GOLD_DIM, borderRadius: 12, padding: '2px 7px', fontFamily: FONT_ALT, letterSpacing: '1px', textTransform: 'uppercase' }}>HIIT</span>
          <span style={{ fontSize: '0.6rem', fontWeight: 700, color: GOLD, background: GOLD_DIM, borderRadius: 12, padding: '2px 7px', fontFamily: FONT_ALT, letterSpacing: '1px', textTransform: 'uppercase' }}>LISS</span>
        </div>
        {expanded ? <ChevronUp size={16} color={TEXT_MUTED} /> : <ChevronDown size={16} color={TEXT_MUTED} />}
      </button>

      {expanded && (
        <div style={{ padding: '0 16px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Suggested workouts */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <WorkoutCard workout={suggestedHiit} weight={weight} onStart={() => setActiveWorkout(suggestedHiit)} />
            <WorkoutCard workout={suggestedLiss} weight={weight} onStart={() => setActiveWorkout(suggestedLiss)} />
          </div>

          {/* Library toggle */}
          <button onClick={() => setShowLibrary(!showLibrary)} style={{ fontSize: '0.72rem', fontWeight: 600, color: GOLD, background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', padding: 0, fontFamily: FONT_BODY }}>
            {showLibrary ? 'Masquer la bibliothèque' : `Voir les ${allWorkouts.length} séances`}
          </button>

          {/* Library */}
          {showLibrary && (
            <>
              <div style={{ display: 'flex', gap: 6 }}>
                {[['all', 'Tout'], ['hiit', 'HIIT'], ['liss', 'LISS']].map(([k, l]) => (
                  <button key={k} onClick={() => setFilter(k as any)} style={{ padding: '6px 12px', borderRadius: 12, border: `1px solid ${filter === k ? GOLD_RULE : BORDER}`, cursor: 'pointer', fontSize: '0.68rem', fontWeight: 700, background: filter === k ? GOLD_DIM : BG_BASE, color: filter === k ? GOLD : TEXT_MUTED, fontFamily: FONT_ALT, letterSpacing: '1px', textTransform: 'uppercase' }}>{l}</button>
                ))}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {filtered.map(w => <WorkoutCard key={w.name} workout={w} weight={weight} onStart={() => setActiveWorkout(w)} />)}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}

function WorkoutCard({ workout, weight, onStart }: { workout: CardioWorkout; weight: number; onStart: () => void }) {
  const cal = estimateCalories(workout, weight)
  return (
    <button onClick={onStart} style={{ background: BG_BASE, border: `1px solid ${BORDER}`, borderRadius: RADIUS_CARD, padding: '12px 10px', textAlign: 'left', cursor: 'pointer', transition: 'all 150ms', display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ fontSize: '0.55rem', fontWeight: 700, color: GOLD, background: GOLD_DIM, borderRadius: 12, padding: '1px 5px', textTransform: 'uppercase', fontFamily: FONT_ALT, letterSpacing: '1px' }}>{workout.type}</span>
        <span style={{ fontSize: '0.6rem', color: TEXT_MUTED, fontFamily: FONT_BODY }}>🕐 {workout.duration_min} min</span>
      </div>
      <div style={{ fontSize: '0.82rem', fontWeight: 700, color: TEXT_PRIMARY, lineHeight: 1.2, fontFamily: FONT_ALT }}>{workout.name}</div>
      <div style={{ fontSize: '0.62rem', color: GOLD, fontFamily: FONT_DISPLAY }}>~{cal} kcal</div>
    </button>
  )
}

/* ═══════════════════════════════════ HIIT TIMER ═══════════════════════════════════ */
function HiitTimer({ workout, weight, supabase, userId, onFinish }: { workout: CardioWorkout; weight: number; supabase: any; userId: string; onFinish: () => void }) {
  const exercises = workout.exercises || []
  // Flatten all intervals
  const intervals = exercises.flatMap(ex =>
    Array.from({ length: ex.rounds }, () => ({ name: ex.name, work: ex.work_seconds, rest: ex.rest_seconds }))
  )

  const [currentIdx, setCurrentIdx] = useState(0)
  const [phase, setPhase] = useState<'work' | 'rest'>('work')
  const [timeLeft, setTimeLeft] = useState(intervals[0]?.work || 30)
  const [paused, setPaused] = useState(false)
  const [finished, setFinished] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const timerRef = useRef<ReturnType<typeof setInterval>>(null)

  useEffect(() => {
    if (paused || finished) return
    timerRef.current = setInterval(() => {
      setElapsed(e => e + 1)
      setTimeLeft(t => {
        if (t <= 1) {
          // Transition
          if (phase === 'work') {
            const restTime = intervals[currentIdx]?.rest || 0
            if (restTime > 0) { setPhase('rest'); return restTime }
            // No rest — next interval
            return advanceInterval()
          } else {
            return advanceInterval()
          }
        }
        // Vibrate at 3 seconds
        if (t === 4) try { navigator.vibrate?.([100]) } catch {}
        return t - 1
      })
    }, 1000)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [currentIdx, phase, paused, finished])

  function advanceInterval(): number {
    const nextIdx = currentIdx + 1
    if (nextIdx >= intervals.length) {
      setFinished(true)
      try { navigator.vibrate?.([200, 100, 200]) } catch {}
      return 0
    }
    setCurrentIdx(nextIdx)
    setPhase('work')
    return intervals[nextIdx]?.work || 30
  }

  function skip() {
    const next = currentIdx + 1
    if (next >= intervals.length) { setFinished(true); return }
    setCurrentIdx(next)
    setPhase('work')
    setTimeLeft(intervals[next]?.work || 30)
  }

  async function saveAndFinish() {
    const cal = estimateCalories(workout, weight)
    await supabase.from('cardio_sessions').insert({
      user_id: userId, type: 'hiit', name: workout.name,
      duration_min: Math.round(elapsed / 60), calories_burned: cal,
      exercises: workout.exercises, completed: true, completed_at: new Date().toISOString(),
      scheduled_date: new Date().toISOString().split('T')[0],
    })
    toast.success(`${workout.name} terminé ! ~${cal} kcal`)
    onFinish()
  }

  const current = intervals[currentIdx]
  const isWork = phase === 'work'
  const progress = currentIdx / intervals.length
  const accent = isWork ? GREEN : RED

  if (finished) {
    const cal = estimateCalories(workout, weight)
    return (
      <div style={{ position: 'fixed', inset: 0, background: BG_BASE, zIndex: 1200, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20, padding: 24 }}>
        <span style={{ fontSize: '3rem' }}>🎉</span>
        <h2 style={{ fontFamily: FONT_DISPLAY, fontSize: '2.4rem', fontWeight: 700, color: TEXT_PRIMARY, textAlign: 'center', letterSpacing: '2px' }}>{workout.name} TERMINÉ</h2>
        <div style={{ display: 'flex', gap: 24 }}>
          <div style={{ textAlign: 'center' }}><div style={{ fontFamily: FONT_DISPLAY, fontSize: '2rem', fontWeight: 700, color: GOLD }}>{Math.round(elapsed / 60)}</div><div style={{ fontSize: '0.65rem', color: TEXT_MUTED, fontFamily: FONT_ALT, fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase' }}>MINUTES</div></div>
          <div style={{ textAlign: 'center' }}><div style={{ fontFamily: FONT_DISPLAY, fontSize: '2rem', fontWeight: 700, color: GOLD }}>~{cal}</div><div style={{ fontSize: '0.65rem', color: TEXT_MUTED, fontFamily: FONT_ALT, fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase' }}>KCAL</div></div>
        </div>
        <button onClick={saveAndFinish} style={{ padding: '14px 40px', borderRadius: 12, border: 'none', background: GOLD, color: '#0D0B08', fontFamily: FONT_ALT, fontSize: '1rem', fontWeight: 800, cursor: 'pointer', letterSpacing: '2px', textTransform: 'uppercase' }}>Sauvegarder</button>
      </div>
    )
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: BG_BASE, zIndex: 1200, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      {/* Progress bar */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: BORDER }}>
        <div style={{ height: '100%', width: `${progress * 100}%`, background: GOLD, transition: 'width 0.3s' }} />
      </div>

      {/* Phase label */}
      <div style={{ fontFamily: FONT_ALT, fontSize: '1.2rem', fontWeight: 700, color: accent, letterSpacing: '0.2em', marginBottom: 8, textTransform: 'uppercase' }}>
        {isWork ? 'WORK' : 'REST'}
      </div>

      {/* Timer */}
      <div style={{ fontFamily: FONT_DISPLAY, fontSize: 'clamp(80px, 20vw, 140px)', fontWeight: 700, color: accent, lineHeight: 1 }}>
        {timeLeft}
      </div>

      {/* Exercise name */}
      <div style={{ fontFamily: FONT_ALT, fontSize: '1.4rem', fontWeight: 700, color: TEXT_PRIMARY, textAlign: 'center', marginTop: 12, textTransform: 'uppercase', letterSpacing: '2px' }}>
        {current?.name || ''}
      </div>

      {/* Round counter */}
      <div style={{ fontSize: '0.82rem', color: TEXT_MUTED, marginTop: 8, fontFamily: FONT_BODY }}>
        Intervalle {currentIdx + 1} / {intervals.length}
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', gap: 16, marginTop: 32 }}>
        <button onClick={() => setPaused(!paused)} style={{ width: 56, height: 56, borderRadius: '50%', background: BG_CARD, border: `1px solid ${BORDER}`, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {paused ? <Play size={24} color={TEXT_PRIMARY} /> : <Pause size={24} color={TEXT_PRIMARY} />}
        </button>
        <button onClick={skip} style={{ width: 56, height: 56, borderRadius: '50%', background: BG_CARD, border: `1px solid ${BORDER}`, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <SkipForward size={24} color={TEXT_PRIMARY} />
        </button>
        <button onClick={onFinish} style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(239,68,68,0.15)', border: `1px solid ${RED}`, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Square size={20} color={RED} fill={RED} />
        </button>
      </div>

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}

/* ═══════════════════════════════════ LISS TIMER ═══════════════════════════════════ */
function LissTimer({ workout, weight, supabase, userId, onFinish }: { workout: CardioWorkout; weight: number; supabase: any; userId: string; onFinish: () => void }) {
  const [elapsed, setElapsed] = useState(0)
  const [paused, setPaused] = useState(false)
  const [finished, setFinished] = useState(false)
  const timerRef = useRef<ReturnType<typeof setInterval>>(null)
  const targetSec = workout.duration_min * 60

  useEffect(() => {
    if (paused || finished) return
    timerRef.current = setInterval(() => {
      setElapsed(e => {
        if (e + 1 >= targetSec) { setFinished(true); try { navigator.vibrate?.([200, 100, 200]) } catch {}; return targetSec }
        return e + 1
      })
    }, 1000)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [paused, finished])

  const mins = Math.floor(elapsed / 60)
  const secs = elapsed % 60
  const pct = Math.min(100, (elapsed / targetSec) * 100)
  const cal = Math.round(workout.calories_per_min * (elapsed / 60) * (weight / 75))

  async function saveAndFinish() {
    await supabase.from('cardio_sessions').insert({
      user_id: userId, type: 'liss', name: workout.name,
      duration_min: mins, calories_burned: cal,
      notes: workout.notes, completed: true, completed_at: new Date().toISOString(),
      scheduled_date: new Date().toISOString().split('T')[0],
    })
    toast.success(`${workout.name} terminé ! ~${cal} kcal`)
    onFinish()
  }

  if (finished) {
    return (
      <div style={{ position: 'fixed', inset: 0, background: BG_BASE, zIndex: 1200, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20, padding: 24 }}>
        <span style={{ fontSize: '3rem' }}>🎉</span>
        <h2 style={{ fontFamily: FONT_DISPLAY, fontSize: '2.4rem', fontWeight: 700, color: TEXT_PRIMARY, textAlign: 'center', letterSpacing: '2px' }}>{workout.name} TERMINÉ</h2>
        <div style={{ display: 'flex', gap: 24 }}>
          <div style={{ textAlign: 'center' }}><div style={{ fontFamily: FONT_DISPLAY, fontSize: '2rem', fontWeight: 700, color: GOLD }}>{mins}</div><div style={{ fontSize: '0.65rem', color: TEXT_MUTED, fontFamily: FONT_ALT, fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase' }}>MINUTES</div></div>
          <div style={{ textAlign: 'center' }}><div style={{ fontFamily: FONT_DISPLAY, fontSize: '2rem', fontWeight: 700, color: GOLD }}>~{cal}</div><div style={{ fontSize: '0.65rem', color: TEXT_MUTED, fontFamily: FONT_ALT, fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase' }}>KCAL</div></div>
        </div>
        <button onClick={saveAndFinish} style={{ padding: '14px 40px', borderRadius: 12, border: 'none', background: GOLD, color: '#0D0B08', fontFamily: FONT_ALT, fontSize: '1rem', fontWeight: 800, cursor: 'pointer', letterSpacing: '2px', textTransform: 'uppercase' }}>Sauvegarder</button>
      </div>
    )
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: BG_BASE, zIndex: 1200, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      {/* Progress */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: BORDER }}>
        <div style={{ height: '100%', width: `${pct}%`, background: GOLD, transition: 'width 1s linear' }} />
      </div>

      <span style={{ fontSize: '0.82rem', color: GOLD, fontWeight: 700, letterSpacing: '0.1em', marginBottom: 8, fontFamily: FONT_ALT, textTransform: 'uppercase' }}>LISS — ZONE 2</span>

      {/* Timer */}
      <div style={{ fontFamily: FONT_DISPLAY, fontSize: 'clamp(60px, 15vw, 100px)', fontWeight: 700, color: TEXT_PRIMARY, lineHeight: 1 }}>
        {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
      </div>

      <div style={{ fontSize: '1.1rem', fontWeight: 700, color: TEXT_PRIMARY, marginTop: 12, fontFamily: FONT_ALT, textTransform: 'uppercase', letterSpacing: '2px' }}>{workout.name}</div>
      {workout.notes && <p style={{ fontSize: '0.78rem', color: TEXT_MUTED, textAlign: 'center', maxWidth: 300, marginTop: 8, lineHeight: 1.5, fontFamily: FONT_BODY }}>{workout.notes}</p>}

      <div style={{ display: 'flex', gap: 16, marginTop: 12, fontSize: '0.75rem', color: TEXT_MUTED, fontFamily: FONT_BODY }}>
        <span>FC cible : <strong style={{ color: GOLD }}>120-140 bpm</strong></span>
        <span>~{cal} kcal</span>
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', gap: 16, marginTop: 32 }}>
        <button onClick={() => setPaused(!paused)} style={{ width: 56, height: 56, borderRadius: '50%', background: BG_CARD, border: `1px solid ${BORDER}`, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {paused ? <Play size={24} color={TEXT_PRIMARY} /> : <Pause size={24} color={TEXT_PRIMARY} />}
        </button>
        <button onClick={onFinish} style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(239,68,68,0.15)', border: `1px solid ${RED}`, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Square size={20} color={RED} fill={RED} />
        </button>
      </div>
    </div>
  )
}
