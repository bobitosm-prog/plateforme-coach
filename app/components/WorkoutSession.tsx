'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { Check, X, ChevronDown, ChevronUp, Dumbbell, Timer, Trophy, Flame, RotateCcw, Plus, Minus, ArrowLeft, Zap, CheckCircle2 } from 'lucide-react'

// ─── TYPES ───────────────────────────────────────────────
interface ExerciseSet {
  id: string
  setNumber: number
  weight: number | ''
  reps: number | ''
  completed: boolean
  timestamp?: number
}

interface Exercise {
  id: string
  name: string
  muscleGroup: string
  targetSets: number
  targetReps: string
  restSeconds: number
  tempo?: string
  rir?: number | null
  notes?: string
  sets: ExerciseSet[]
  expanded: boolean
}

interface WorkoutSessionProps {
  sessionName: string
  exercises: any[]            // données brutes depuis Supabase (program_exercises)
  onFinish: (data: any) => void
  onClose: () => void
}

// ─── HELPERS ─────────────────────────────────────────────
function generateId() {
  return Math.random().toString(36).slice(2)
}

function buildInitialSets(targetSets: number): ExerciseSet[] {
  return Array.from({ length: targetSets }, (_, i) => ({
    id: generateId(),
    setNumber: i + 1,
    weight: '',
    reps: '',
    completed: false,
  }))
}

function formatTime(sec: number) {
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return m > 0 ? `${m}:${s.toString().padStart(2, '0')}` : `${s}s`
}

function formatDuration(ms: number) {
  const totalSec = Math.floor(ms / 1000)
  const h = Math.floor(totalSec / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  const s = totalSec % 60
  if (h > 0) return `${h}h ${m}min`
  if (m > 0) return `${m}min ${s}s`
  return `${s}s`
}

// ─── REST TIMER OVERLAY ───────────────────────────────────
function RestTimer({ seconds, maxSeconds, onSkip }: { seconds: number; maxSeconds: number; onSkip: () => void }) {
  const radius = 54
  const circumference = 2 * Math.PI * radius
  const progress = seconds / maxSeconds
  const dashOffset = circumference * (1 - progress)
  const urgent = seconds <= 10

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md">
      <div className={`relative flex flex-col items-center gap-6 p-10 rounded-[40px] border transition-colors duration-1000 ${urgent ? 'bg-[#1a0800] border-orange-500/30' : 'bg-[#111] border-white/8'}`}>
        {/* Glow */}
        <div className={`absolute inset-0 rounded-[40px] blur-2xl opacity-20 transition-colors duration-1000 pointer-events-none ${urgent ? 'bg-orange-500' : 'bg-[#C9A84C]'}`} />

        <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-white/30 relative z-10">Temps de Repos</p>

        {/* Circle timer */}
        <div className="relative z-10">
          <svg width="140" height="140" viewBox="0 0 140 140" className="-rotate-90">
            {/* Track */}
            <circle cx="70" cy="70" r={radius} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="8" />
            {/* Progress */}
            <circle
              cx="70" cy="70" r={radius} fill="none"
              stroke={urgent ? '#f97316' : '#C9A84C'}
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={dashOffset}
              style={{ transition: 'stroke-dashoffset 1s linear, stroke 0.5s ease' }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={`font-display text-5xl tracking-wider transition-colors ${urgent ? 'text-orange-400' : 'gold'}`}
              style={{ fontFamily: "'Bebas Neue', sans-serif" }}>
              {formatTime(seconds)}
            </span>
            {urgent && <span className="text-orange-400/60 text-[9px] font-bold uppercase tracking-widest mt-1 animate-pulse">Prépare-toi !</span>}
          </div>
        </div>

        {/* Skip */}
        <button
          onClick={onSkip}
          className={`relative z-10 px-8 py-3 rounded-2xl text-sm font-bold uppercase tracking-wider transition-all active:scale-95 ${urgent ? 'bg-orange-500 text-black' : 'gold-bg text-black'}`}
          style={{ background: urgent ? '#f97316' : '#C9A84C' }}>
          Passer → Exercice suivant
        </button>

        <p className="relative z-10 text-white/15 text-[10px]">Repos recommandé : {formatTime(maxSeconds)}</p>
      </div>
    </div>
  )
}

// ─── MAIN COMPONENT ───────────────────────────────────────
export default function WorkoutSession({ sessionName, exercises: rawExercises, onFinish, onClose }: WorkoutSessionProps) {
  const [exercises, setExercises] = useState<Exercise[]>(() =>
    rawExercises.map(e => ({
      id: generateId(),
      name: e.exercise_name,
      muscleGroup: e.muscle_group || '',
      targetSets: e.sets || 3,
      targetReps: e.reps || '10-12',
      restSeconds: e.rest_seconds || 90,
      tempo: e.tempo || undefined,
      rir: e.rir ?? null,
      notes: e.notes || undefined,
      sets: buildInitialSets(e.sets || 3),
      expanded: true,
    }))
  )

  // Rest timer
  const [restActive, setRestActive] = useState(false)
  const [restSeconds, setRestSeconds] = useState(0)
  const [restMax, setRestMax] = useState(90)
  const restRef = useRef<NodeJS.Timeout | null>(null)

  // Workout clock
  const [startTime] = useState(Date.now())
  const [elapsed, setElapsed] = useState(0)
  const elapsedRef = useRef<NodeJS.Timeout | null>(null)

  // Summary
  const [finished, setFinished] = useState(false)

  // Start elapsed timer
  useEffect(() => {
    elapsedRef.current = setInterval(() => setElapsed(Date.now() - startTime), 1000)
    return () => { if (elapsedRef.current) clearInterval(elapsedRef.current) }
  }, [])

  // Rest countdown
  useEffect(() => {
    if (restActive && restSeconds > 0) {
      restRef.current = setTimeout(() => setRestSeconds(s => s - 1), 1000)
    } else if (restActive && restSeconds === 0) {
      setRestActive(false)
      if (navigator.vibrate) navigator.vibrate([300, 100, 300])
    }
    return () => { if (restRef.current) clearTimeout(restRef.current) }
  }, [restActive, restSeconds])

  function startRest(seconds: number) {
    if (restRef.current) clearTimeout(restRef.current)
    setRestMax(seconds)
    setRestSeconds(seconds)
    setRestActive(true)
  }

  function skipRest() {
    setRestActive(false)
    setRestSeconds(0)
  }

  // Toggle exercise expanded
  function toggleExpand(exoId: string) {
    setExercises(prev => prev.map(e => e.id === exoId ? { ...e, expanded: !e.expanded } : e))
  }

  // Update set field
  function updateSetField(exoId: string, setId: string, field: 'weight' | 'reps', value: string) {
    setExercises(prev => prev.map(e => e.id !== exoId ? e : {
      ...e,
      sets: e.sets.map(s => s.id !== setId ? s : { ...s, [field]: value === '' ? '' : Number(value) })
    }))
  }

  // Validate a set → save + start rest timer
  function validateSet(exoId: string, setId: string) {
    let restSec = 90
    setExercises(prev => prev.map(e => {
      if (e.id !== exoId) return e
      restSec = e.restSeconds
      return {
        ...e,
        sets: e.sets.map(s => s.id !== setId ? s : { ...s, completed: true, timestamp: Date.now() })
      }
    }))
    startRest(restSec)
  }

  // Unvalidate a set
  function unvalidateSet(exoId: string, setId: string) {
    skipRest()
    setExercises(prev => prev.map(e => e.id !== exoId ? e : {
      ...e,
      sets: e.sets.map(s => s.id !== setId ? s : { ...s, completed: false, timestamp: undefined })
    }))
  }

  // Add extra set
  function addSet(exoId: string) {
    setExercises(prev => prev.map(e => e.id !== exoId ? e : {
      ...e,
      sets: [...e.sets, { id: generateId(), setNumber: e.sets.length + 1, weight: e.sets[e.sets.length - 1]?.weight ?? '', reps: e.sets[e.sets.length - 1]?.reps ?? '', completed: false }]
    }))
  }

  // Computed stats
  const totalSets = exercises.reduce((s, e) => s + e.sets.length, 0)
  const completedSets = exercises.reduce((s, e) => s + e.sets.filter(s => s.completed).length, 0)
  const totalVolume = exercises.reduce((vol, e) =>
    vol + e.sets.filter(s => s.completed && s.weight && s.reps).reduce((sv, s) =>
      sv + (Number(s.weight) * Number(s.reps)), 0), 0)
  const progressPct = totalSets > 0 ? (completedSets / totalSets) * 100 : 0
  const allDone = completedSets === totalSets && totalSets > 0

  function finishWorkout() {
    if (elapsedRef.current) clearInterval(elapsedRef.current)
    setFinished(true)
    const data = {
      duration: elapsed,
      completedSets,
      totalSets,
      totalVolume,
      exercises: exercises.map(e => ({
        name: e.name,
        sets: e.sets.filter(s => s.completed).map(s => ({ weight: s.weight, reps: s.reps }))
      }))
    }
    onFinish(data)
  }

  // ── SUMMARY SCREEN ──────────────────────────────────────
  if (finished) {
    return (
      <div className="fixed inset-0 bg-[#080808] z-50 flex flex-col items-center justify-center p-6 text-center"
        style={{ fontFamily: "'DM Sans', sans-serif" }}>
        <style>{`@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@400;500;700&display=swap');`}</style>
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-80 h-80 bg-[#C9A84C]/10 rounded-full blur-[100px] pointer-events-none" />

        <div className="relative z-10 flex flex-col items-center">
          <div className="w-20 h-20 rounded-[28px] flex items-center justify-center mb-6 shadow-[0_20px_60px_rgba(201,168,76,0.3)]"
            style={{ background: 'linear-gradient(135deg, #C9A84C, #8B6914)' }}>
            <Trophy size={36} className="text-white" />
          </div>

          <h1 style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: '0.05em' }}
            className="text-5xl text-white mb-2">SÉANCE TERMINÉE</h1>
          <p className="text-white/30 text-sm mb-10">{sessionName}</p>

          <div className="grid grid-cols-3 gap-4 mb-8 w-full max-w-sm">
            {[
              ['Durée', formatDuration(elapsed), '⏱'],
              ['Sets', `${completedSets}/${totalSets}`, '✅'],
              ['Volume', `${Math.round(totalVolume)} kg`, '💪'],
            ].map(([label, val, icon]) => (
              <div key={label} className="bg-[#111] border border-white/5 rounded-[20px] p-4 text-center">
                <div className="text-2xl mb-1">{icon}</div>
                <div className="text-xl font-bold text-white" style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: '0.05em' }}>{val}</div>
                <div className="text-[9px] text-white/25 uppercase tracking-widest mt-0.5">{label}</div>
              </div>
            ))}
          </div>

          {/* Per exercise summary */}
          <div className="w-full max-w-sm space-y-2 mb-8">
            {exercises.map(e => {
              const done = e.sets.filter(s => s.completed)
              if (done.length === 0) return null
              const bestWeight = Math.max(...done.map(s => Number(s.weight) || 0))
              return (
                <div key={e.id} className="bg-[#111] border border-white/5 rounded-[16px] px-4 py-3 flex justify-between items-center">
                  <div className="text-left">
                    <div className="text-sm font-medium text-white">{e.name}</div>
                    <div className="text-[9px] text-white/25 mt-0.5">{done.length} sets · {e.muscleGroup}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold" style={{ color: '#C9A84C' }}>{bestWeight > 0 ? `${bestWeight} kg` : '—'}</div>
                    <div className="text-[9px] text-white/25">max</div>
                  </div>
                </div>
              )
            })}
          </div>

          <button onClick={onClose}
            className="px-10 py-4 rounded-2xl text-black font-bold uppercase tracking-widest text-sm active:scale-[0.98] transition-all"
            style={{ background: '#C9A84C' }}>
            Retour au dashboard
          </button>
        </div>
      </div>
    )
  }

  // ── MAIN WORKOUT SCREEN ─────────────────────────────────
  return (
    <div className="fixed inset-0 bg-[#080808] z-50 overflow-y-auto" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@300;400;500;700&display=swap');
        .fd { font-family: 'Bebas Neue', sans-serif; letter-spacing: 0.05em; }
        .gold { color: #C9A84C; }
        .gold-bg { background: #C9A84C; }
        input[type=number]::-webkit-inner-spin-button { -webkit-appearance: none; }
        .set-row-enter { animation: slideIn 0.2s ease; }
        @keyframes slideIn { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: none; } }
      `}</style>

      {/* REST TIMER OVERLAY */}
      {restActive && (
        <RestTimer seconds={restSeconds} maxSeconds={restMax} onSkip={skipRest} />
      )}

      {/* ── STICKY HEADER ── */}
      <div className="sticky top-0 z-40 bg-[#080808]/95 backdrop-blur-xl border-b border-white/5 px-5 pt-10 pb-4">
        <div className="flex items-center justify-between mb-3">
          <button onClick={onClose} className="flex items-center gap-1.5 text-white/25 text-xs font-bold active:text-white/50 transition-colors">
            <ArrowLeft size={15} /> Abandonner
          </button>
          <div className="flex items-center gap-2 bg-[#111] border border-white/5 rounded-full px-3 py-1.5">
            <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
            <span className="fd text-sm text-white tracking-wider">{formatDuration(elapsed)}</span>
          </div>
          <button
            onClick={finishWorkout}
            className="gold-bg text-black text-[10px] font-bold px-4 py-2 rounded-xl uppercase tracking-wider active:scale-95 transition-all">
            Terminer
          </button>
        </div>

        {/* Session title */}
        <h1 className="fd text-2xl text-white tracking-wider mb-3">{sessionName}</h1>

        {/* Global progress bar */}
        <div>
          <div className="flex justify-between items-center mb-1.5">
            <span className="text-[9px] font-bold uppercase tracking-widest text-white/25">Progression</span>
            <span className="text-[9px] font-bold gold">{completedSets} / {totalSets} sets</span>
          </div>
          <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
            <div className="h-full gold-bg rounded-full transition-all duration-500"
              style={{ width: `${progressPct}%`, boxShadow: progressPct > 0 ? '0 0 8px rgba(201,168,76,0.5)' : 'none' }} />
          </div>
        </div>
      </div>

      {/* ── EXERCISES ── */}
      <div className="p-5 space-y-4 pb-32">
        {exercises.map((exo, exoIdx) => {
          const exoCompletedSets = exo.sets.filter(s => s.completed).length
          const exoDone = exoCompletedSets === exo.sets.length
          const lastCompletedSet = exo.sets.filter(s => s.completed).slice(-1)[0]

          return (
            <div key={exo.id}
              className={`rounded-[24px] border transition-all duration-300 overflow-hidden ${exoDone ? 'border-[#C9A84C]/30 bg-[#1a1500]' : 'border-white/5 bg-[#111]'}`}>

              {/* Exercise header */}
              <button
                onClick={() => toggleExpand(exo.id)}
                className="w-full flex items-center gap-3 p-5 text-left">
                {/* Number badge */}
                <div className={`w-9 h-9 rounded-[12px] flex items-center justify-center flex-shrink-0 transition-colors ${exoDone ? 'gold-bg' : 'bg-[#1a1a1a] border border-white/8'}`}>
                  {exoDone
                    ? <Check size={16} className="text-black" strokeWidth={3} />
                    : <span className="fd text-sm text-white/40 tracking-wide">{exoIdx + 1}</span>
                  }
                </div>

                <div className="flex-1 min-w-0">
                  <div className={`font-bold text-sm ${exoDone ? 'gold' : 'text-white'}`}>{exo.name}</div>
                  <div className="text-[9px] text-white/25 font-medium mt-0.5 truncate">{exo.muscleGroup}</div>
                </div>

                {/* Tags */}
                <div className="flex items-center gap-1.5 mr-1">
                  <span className="text-[8px] bg-white/5 text-white/25 px-2 py-1 rounded-lg font-bold">{exo.targetSets}×{exo.targetReps}</span>
                  <span className="text-[8px] bg-[#C9A84C]/8 gold px-2 py-1 rounded-lg font-bold">⏱{formatTime(exo.restSeconds)}</span>
                </div>

                {/* Progress + chevron */}
                <div className="flex items-center gap-2">
                  <span className={`text-[9px] font-bold ${exoCompletedSets > 0 ? 'gold' : 'text-white/20'}`}>
                    {exoCompletedSets}/{exo.sets.length}
                  </span>
                  {exo.expanded
                    ? <ChevronUp size={15} className="text-white/20" />
                    : <ChevronDown size={15} className="text-white/20" />
                  }
                </div>
              </button>

              {/* Expanded content */}
              {exo.expanded && (
                <div className="px-5 pb-5">
                  {/* Notes / tempo / RIR */}
                  {(exo.notes || exo.tempo || exo.rir != null) && (
                    <div className="bg-[#1a1a1a] rounded-[14px] px-4 py-3 mb-4 flex flex-wrap gap-2 items-start">
                      {exo.tempo && (
                        <span className="text-[8px] bg-white/5 text-white/30 px-2 py-1 rounded-lg font-bold uppercase">Tempo {exo.tempo}</span>
                      )}
                      {exo.rir != null && (
                        <span className="text-[8px] bg-white/5 text-white/30 px-2 py-1 rounded-lg font-bold uppercase">RIR {exo.rir}</span>
                      )}
                      {exo.notes && (
                        <p className="text-[9px] text-white/25 italic w-full mt-1">{exo.notes}</p>
                      )}
                    </div>
                  )}

                  {/* Column headers */}
                  <div grid-cols-[28px_1fr_1fr_44px] gap-1.5>
                    <span className="text-[8px] text-white/20 font-bold uppercase text-center">Set</span>
                    <span className="text-[8px] text-white/20 font-bold uppercase text-center">Poids (kg)</span>
                    <span className="text-[8px] text-white/20 font-bold uppercase text-center">Reps</span>
                    <span className="text-[8px] text-white/20 font-bold uppercase text-center">✓</span>
                  </div>

                  {/* Sets */}
                  <div className="space-y-2">
                    {exo.sets.map((set) => {
                      const canValidate = !set.completed && (set.weight !== '' || set.reps !== '')
                      const isLastSet = exo.sets.indexOf(set) === exo.sets.length - 1

                      return (
                        <div key={set.id}
                          className={`grid grid-cols-[36px_1fr_1fr_52px] gap-2 items-center rounded-[14px] px-2 py-2 transition-all duration-300 set-row-enter ${set.completed ? 'bg-[#C9A84C]/8 border border-[#C9A84C]/15' : 'bg-[#1a1a1a] border border-white/5'}`}>

                          {/* Set number */}
                          <div className={`flex items-center justify-center w-7 h-7 rounded-lg text-xs font-bold mx-auto transition-colors ${set.completed ? 'bg-[#C9A84C]/20 gold' : 'bg-white/5 text-white/25'}`}>
                            {set.completed ? <Check size={12} strokeWidth={3} className="gold" /> : set.setNumber}
                          </div>

                          {/* Weight */}
                          <div className={`rounded-xl border text-center transition-all ${set.completed ? 'border-[#C9A84C]/20 bg-[#C9A84C]/5' : 'border-white/8 bg-[#111]'}`}>
                            <input
                              type="number"
                              inputMode="decimal"
                              step="0.5"
                              value={set.weight}
                              onChange={e => updateSetField(exo.id, set.id, 'weight', e.target.value)}
                              disabled={set.completed}
                              placeholder={lastCompletedSet?.weight ? String(lastCompletedSet.weight) : '0'}
                              className={`w-full py-2.5 text-sm font-bold text-center bg-transparent outline-none placeholder:text-white/10 transition-colors ${set.completed ? 'gold cursor-default' : 'text-white'}`}
                            />
                          </div>

                          {/* Reps */}
                          <div className={`rounded-xl border text-center transition-all ${set.completed ? 'border-[#C9A84C]/20 bg-[#C9A84C]/5' : 'border-white/8 bg-[#111]'}`}>
                            <input
                              type="number"
                              inputMode="numeric"
                              value={set.reps}
                              onChange={e => updateSetField(exo.id, set.id, 'reps', e.target.value)}
                              disabled={set.completed}
                              placeholder={exo.targetReps.split('-')[0] || '0'}
                              className={`w-full py-2.5 text-sm font-bold text-center bg-transparent outline-none placeholder:text-white/10 transition-colors ${set.completed ? 'gold cursor-default' : 'text-white'}`}
                            />
                          </div>

                          {/* Validate / Undo */}
                          {set.completed ? (
                            <button
                              onClick={() => unvalidateSet(exo.id, set.id)}
                              className="w-11 h-10 mx-auto rounded-xl bg-[#C9A84C]/15 border border-[#C9A84C]/25 flex items-center justify-center active:scale-90 transition-all"
                              title="Annuler">
                              <RotateCcw size={13} className="gold" />
                            </button>
                          ) : (
                            <button
                              onClick={() => canValidate ? validateSet(exo.id, set.id) : undefined}
                              className={`w-11 h-10 mx-auto rounded-xl flex items-center justify-center transition-all active:scale-90 ${canValidate ? 'gold-bg shadow-[0_4px_15px_rgba(201,168,76,0.3)]' : 'bg-[#1a1a1a] border border-white/8'}`}
                              title="Valider">
                              <Check size={15} strokeWidth={3} className={canValidate ? 'text-black' : 'text-white/15'} />
                            </button>
                          )}
                        </div>
                      )
                    })}
                  </div>

                  {/* Add set */}
                  <button
                    onClick={() => addSet(exo.id)}
                    className="mt-3 w-full border border-dashed border-white/8 rounded-[14px] py-2.5 flex items-center justify-center gap-2 text-white/20 text-xs font-bold active:border-[#C9A84C]/20 active:text-[#C9A84C]/50 transition-all">
                    <Plus size={13} /> Ajouter un set
                  </button>
                </div>
              )}
            </div>
          )
        })}

        {/* Finish CTA */}
        {allDone && (
          <div className="bg-gradient-to-br from-[#1a1500] to-[#111] border border-[#C9A84C]/20 rounded-[24px] p-6 text-center">
            <Trophy size={28} className="gold mx-auto mb-2" />
            <p className="text-white font-bold mb-1">Tous les sets complétés ! 🔥</p>
            <p className="text-white/30 text-xs mb-4">{formatDuration(elapsed)} · {Math.round(totalVolume)} kg volume total</p>
            <button onClick={finishWorkout} className="w-full gold-bg text-black font-bold py-4 rounded-2xl uppercase tracking-widest text-sm active:scale-[0.98] transition-all">
              🏆 Terminer la Séance
            </button>
          </div>
        )}
      </div>

      {/* ── BOTTOM SUMMARY BAR ── */}
      <div className="fixed bottom-0 left-0 right-0 bg-[#111]/96 backdrop-blur-xl border-t border-white/5 px-5 py-4 z-30">
        <div className="flex justify-between items-center">
          <div className="flex gap-4">
            <div>
              <div className="text-[8px] text-white/20 uppercase tracking-widest">Volume</div>
              <div className="fd text-lg text-white tracking-wider">{Math.round(totalVolume)} <span className="text-[10px] text-white/30">kg</span></div>
            </div>
            <div>
              <div className="text-[8px] text-white/20 uppercase tracking-widest">Sets</div>
              <div className="fd text-lg gold tracking-wider">{completedSets}<span className="text-[10px] text-white/30">/{totalSets}</span></div>
            </div>
            <div>
              <div className="text-[8px] text-white/20 uppercase tracking-widest">Durée</div>
              <div className="fd text-lg text-white tracking-wider">{formatDuration(elapsed)}</div>
            </div>
          </div>
          {!allDone && (
            <button onClick={finishWorkout}
              className="bg-white/5 border border-white/8 text-white/40 text-[9px] font-bold px-4 py-2.5 rounded-xl uppercase tracking-wider active:scale-95">
              Terminer quand même
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
// Empêcher la mise en veille pendant la séance
useEffect(() => {
  let wakeLock: any = null

  async function requestWakeLock() {
    try {
      if ('wakeLock' in navigator) {
        wakeLock = await (navigator as any).wakeLock.request('screen')
      }
    } catch (err) {
      console.log('Wake Lock non supporté')
    }
  }

  requestWakeLock()

  // Réactiver si l'app revient au premier plan
  document.addEventListener('visibilitychange', async () => {
    if (document.visibilityState === 'visible') {
      await requestWakeLock()
    }
  })

  // Libérer quand la séance se termine
  return () => {
    if (wakeLock) wakeLock.release()
  }
}, [])