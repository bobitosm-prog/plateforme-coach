'use client'
import { useState, useEffect, useRef } from 'react'
import { Check, ChevronDown, ChevronUp, Timer, Trophy, RotateCcw, Plus, ArrowLeft } from 'lucide-react'

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
  exercises: any[]
  onFinish: (data: any) => void
  onClose: () => void
}

function generateId() { return Math.random().toString(36).slice(2) }

function buildInitialSets(targetSets: number): ExerciseSet[] {
  return Array.from({ length: targetSets }, (_, i) => ({
    id: generateId(), setNumber: i + 1, weight: '', reps: '', completed: false,
  }))
}

function formatTime(sec: number) {
  const m = Math.floor(sec / 60), s = sec % 60
  return m > 0 ? `${m}:${s.toString().padStart(2, '0')}` : `${s}s`
}

function formatDuration(ms: number) {
  const totalSec = Math.floor(ms / 1000)
  const h = Math.floor(totalSec / 3600), m = Math.floor((totalSec % 3600) / 60), s = totalSec % 60
  if (h > 0) return `${h}h ${m}min`
  if (m > 0) return `${m}min ${s}s`
  return `${s}s`
}

function RestTimer({ seconds, maxSeconds, onSkip }: { seconds: number; maxSeconds: number; onSkip: () => void }) {
  const radius = 54, circumference = 2 * Math.PI * radius
  const dashOffset = circumference * (1 - seconds / maxSeconds)
  const urgent = seconds <= 10
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md">
      <div className={`relative flex flex-col items-center gap-6 p-10 rounded-[40px] border ${urgent ? 'bg-[#1a0800] border-orange-500/30' : 'bg-[#111] border-white/8'}`}>
        <div className={`absolute inset-0 rounded-[40px] blur-2xl opacity-20 pointer-events-none ${urgent ? 'bg-orange-500' : 'bg-[#C9A84C]'}`} />
        <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-white/30 relative z-10">Temps de Repos</p>
        <div className="relative z-10">
          <svg width="140" height="140" viewBox="0 0 140 140" className="-rotate-90">
            <circle cx="70" cy="70" r={radius} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="8" />
            <circle cx="70" cy="70" r={radius} fill="none" stroke={urgent ? '#f97316' : '#C9A84C'} strokeWidth="8"
              strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={dashOffset}
              style={{ transition: 'stroke-dashoffset 1s linear, stroke 0.5s ease' }} />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={`text-5xl tracking-wider ${urgent ? 'text-orange-400' : 'text-[#C9A84C]'}`}
              style={{ fontFamily: "'Bebas Neue', sans-serif" }}>{formatTime(seconds)}</span>
            {urgent && <span className="text-orange-400/60 text-[9px] font-bold uppercase tracking-widest mt-1 animate-pulse">Prépare-toi !</span>}
          </div>
        </div>
        <button onClick={onSkip} className="relative z-10 px-8 py-3 rounded-2xl text-sm font-bold uppercase tracking-wider active:scale-95 text-black"
          style={{ background: urgent ? '#f97316' : '#C9A84C' }}>
          Passer → Exercice suivant
        </button>
        <p className="relative z-10 text-white/15 text-[10px]">Repos recommandé : {formatTime(maxSeconds)}</p>
      </div>
    </div>
  )
}

export default function WorkoutSession({ sessionName, exercises: rawExercises, onFinish, onClose }: WorkoutSessionProps) {
  const [exercises, setExercises] = useState<Exercise[]>(() =>
    rawExercises.map(e => ({
      id: generateId(), name: e.exercise_name, muscleGroup: e.muscle_group || '',
      targetSets: e.sets || 3, targetReps: e.reps || '10-12', restSeconds: e.rest_seconds || 90,
      tempo: e.tempo || undefined, rir: e.rir ?? null, notes: e.notes || undefined,
      sets: buildInitialSets(e.sets || 3), expanded: true,
    }))
  )
  const [restActive, setRestActive] = useState(false)
  const [restSeconds, setRestSeconds] = useState(0)
  const [restMax, setRestMax] = useState(90)
  const restRef = useRef<NodeJS.Timeout | null>(null)
  const [startTime] = useState(Date.now())
  const [elapsed, setElapsed] = useState(0)
  const elapsedRef = useRef<NodeJS.Timeout | null>(null)
  const [finished, setFinished] = useState(false)

  // Chrono séance
  useEffect(() => {
    elapsedRef.current = setInterval(() => setElapsed(Date.now() - startTime), 1000)
    return () => { if (elapsedRef.current) clearInterval(elapsedRef.current) }
  }, [])

  // Chrono repos
  useEffect(() => {
    if (restActive && restSeconds > 0) {
      restRef.current = setTimeout(() => setRestSeconds(s => s - 1), 1000)
    } else if (restActive && restSeconds === 0) {
      setRestActive(false)
      if (navigator.vibrate) navigator.vibrate([300, 100, 300])
    }
    return () => { if (restRef.current) clearTimeout(restRef.current) }
  }, [restActive, restSeconds])

  // NoSleep — fonctionne sur iPhone Safari
useEffect(() => {
  let noSleep: any = null

  async function enableNoSleep() {
    try {
      const NoSleep = (await import('nosleep.js')).default
      noSleep = new NoSleep()
      // Doit être appelé sur une interaction utilisateur
      document.addEventListener('touchstart', async function enable() {
        await noSleep.enable()
        document.removeEventListener('touchstart', enable)
      }, { once: true })
    } catch (err) {
      console.log('NoSleep non supporté')
    }
  }

  enableNoSleep()

  return () => {
    if (noSleep) noSleep.disable()
  }
}, [])

  // ÉCRAN RÉSUMÉ
  if (finished) return (
    <div className="fixed inset-0 bg-[#080808] z-50 flex flex-col items-center justify-center p-6 text-center"
      style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@400;500;700&display=swap');`}</style>
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-80 h-80 bg-[#C9A84C]/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="relative z-10 flex flex-col items-center w-full max-w-sm">
        <div className="w-20 h-20 rounded-[28px] flex items-center justify-center mb-6 shadow-[0_20px_60px_rgba(201,168,76,0.3)]"
          style={{ background: 'linear-gradient(135deg, #C9A84C, #8B6914)' }}>
          <Trophy size={36} className="text-white" />
        </div>
        <h1 className="text-5xl text-white mb-2" style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: '0.05em' }}>SÉANCE TERMINÉE</h1>
        <p className="text-white/30 text-sm mb-8">{sessionName}</p>
        <div className="grid grid-cols-3 gap-3 mb-6 w-full">
          {[['Durée', formatDuration(elapsed), '⏱'], ['Sets', `${completedSets}/${totalSets}`, '✅'], ['Volume', `${Math.round(totalVolume)} kg`, '💪']].map(([label, val, icon]) => (
            <div key={label} className="bg-[#111] border border-white/5 rounded-[20px] p-4 text-center">
              <div className="text-2xl mb-1">{icon}</div>
              <div className="text-xl font-bold text-white" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>{val}</div>
              <div className="text-[9px] text-white/25 uppercase tracking-widest mt-0.5">{label}</div>
            </div>
          ))}
        </div>
        <div className="w-full space-y-2 mb-8">
          {exercises.map(e => {
            const done = e.sets.filter((s: ExerciseSet) => s.completed)
            if (done.length === 0) return null
            const bestWeight = Math.max(...done.map((s: ExerciseSet) => Number(s.weight) || 0))
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
        <button onClick={onClose} className="w-full py-4 rounded-2xl text-black font-bold uppercase tracking-widest text-sm active:scale-[0.98]"
          style={{ background: '#C9A84C' }}>
          Retour au dashboard
        </button>
      </div>
    </div>
  )

  // ÉCRAN SÉANCE
  return (
    <div className="fixed inset-0 bg-[#080808] z-50 overflow-y-auto" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@300;400;500;700&display=swap');
        .fd { font-family: 'Bebas Neue', sans-serif; letter-spacing: 0.05em; }
        input[type=number]::-webkit-inner-spin-button { -webkit-appearance: none; }
      `}</style>

      {restActive && <RestTimer seconds={restSeconds} maxSeconds={restMax} onSkip={skipRest} />}

      {/* HEADER STICKY */}
      <div className="sticky top-0 z-40 bg-[#080808]/95 backdrop-blur-xl border-b border-white/5 px-4 pt-10 pb-4">
        <div className="flex items-center justify-between mb-3">
          <button onClick={onClose} className="flex items-center gap-1.5 text-white/25 text-xs font-bold active:text-white/50">
            <ArrowLeft size={15} /> Abandonner
          </button>
          <div className="flex items-center gap-2 bg-[#111] border border-white/5 rounded-full px-3 py-1.5">
            <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
            <span className="fd text-sm text-white tracking-wider">{formatDuration(elapsed)}</span>
          </div>
          <button onClick={finishWorkout} className="text-black text-[10px] font-bold px-4 py-2 rounded-xl uppercase tracking-wider active:scale-95"
            style={{ background: '#C9A84C' }}>
            Terminer
          </button>
        </div>
        <h1 className="fd text-xl text-white tracking-wider mb-3 truncate">{sessionName}</h1>
        <div>
          <div className="flex justify-between items-center mb-1.5">
            <span className="text-[9px] font-bold uppercase tracking-widest text-white/25">Progression</span>
            <span className="text-[9px] font-bold text-[#C9A84C]">{completedSets} / {totalSets} sets</span>
          </div>
          <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all duration-500"
              style={{ width: `${progressPct}%`, background: '#C9A84C', boxShadow: progressPct > 0 ? '0 0 8px rgba(201,168,76,0.5)' : 'none' }} />
          </div>
        </div>
      </div>

      {/* EXERCICES */}
      <div className="px-4 py-4 space-y-4 pb-36">
        {exercises.map((exo, exoIdx) => {
          const exoCompletedSets = exo.sets.filter((s: ExerciseSet) => s.completed).length
          const exoDone = exoCompletedSets === exo.sets.length
          const lastCompletedSet = exo.sets.filter((s: ExerciseSet) => s.completed).slice(-1)[0]
          return (
            <div key={exo.id} className={`rounded-[20px] border overflow-hidden ${exoDone ? 'border-[#C9A84C]/30 bg-[#1a1500]' : 'border-white/5 bg-[#111]'}`}>
              <button onClick={() => toggleExpand(exo.id)} className="w-full flex items-center gap-3 p-4 text-left">
                <div className={`w-8 h-8 rounded-[10px] flex items-center justify-center flex-shrink-0 ${exoDone ? '' : 'bg-[#1a1a1a] border border-white/8'}`}
                  style={exoDone ? { background: '#C9A84C' } : {}}>
                  {exoDone ? <Check size={14} className="text-black" strokeWidth={3} />
                    : <span className="fd text-sm text-white/40">{exoIdx + 1}</span>}
                </div>
                <div className="flex-1 min-w-0">
                  <div className={`font-bold text-sm truncate ${exoDone ? 'text-[#C9A84C]' : 'text-white'}`}>{exo.name}</div>
                  <div className="text-[9px] text-white/25 mt-0.5 truncate">{exo.muscleGroup}</div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <span className="text-[8px] bg-white/5 text-white/25 px-1.5 py-0.5 rounded-lg font-bold">{exo.targetSets}×{exo.targetReps}</span>
                  <span className="text-[8px] px-1.5 py-0.5 rounded-lg font-bold text-[#C9A84C]" style={{ background: 'rgba(201,168,76,0.08)' }}>⏱{formatTime(exo.restSeconds)}</span>
                  <span className={`text-[9px] font-bold ml-1 ${exoCompletedSets > 0 ? 'text-[#C9A84C]' : 'text-white/20'}`}>{exoCompletedSets}/{exo.sets.length}</span>
                  {exo.expanded ? <ChevronUp size={14} className="text-white/20" /> : <ChevronDown size={14} className="text-white/20" />}
                </div>
              </button>

              {exo.expanded && (
                <div className="px-4 pb-4">
                  {(exo.notes || exo.tempo || exo.rir != null) && (
                    <div className="bg-[#1a1a1a] rounded-[12px] px-3 py-2.5 mb-3 flex flex-wrap gap-1.5">
                      {exo.tempo && <span className="text-[8px] bg-white/5 text-white/30 px-2 py-0.5 rounded-lg font-bold">Tempo {exo.tempo}</span>}
                      {exo.rir != null && <span className="text-[8px] bg-white/5 text-white/30 px-2 py-0.5 rounded-lg font-bold">RIR {exo.rir}</span>}
                      {exo.notes && <p className="text-[9px] text-white/25 italic w-full mt-0.5">{exo.notes}</p>}
                    </div>
                  )}

                  {/* En-têtes colonnes */}
                  <div className="grid grid-cols-[28px_1fr_1fr_40px] gap-1.5 px-1 mb-1.5">
                    <span className="text-[8px] text-white/20 font-bold uppercase text-center">Set</span>
                    <span className="text-[8px] text-white/20 font-bold uppercase text-center">Kg</span>
                    <span className="text-[8px] text-white/20 font-bold uppercase text-center">Reps</span>
                    <span className="text-[8px] text-white/20 font-bold uppercase text-center">✓</span>
                  </div>

                  <div className="space-y-1.5">
                    {exo.sets.map((set: ExerciseSet) => {
                      const canValidate = !set.completed && (set.weight !== '' || set.reps !== '')
                      return (
                        <div key={set.id}
                          className={`grid grid-cols-[28px_1fr_1fr_40px] gap-1.5 items-center rounded-[12px] px-1.5 py-1.5 transition-all ${set.completed ? 'border border-[#C9A84C]/15' : 'bg-[#1a1a1a] border border-white/5'}`}
                          style={set.completed ? { background: 'rgba(201,168,76,0.08)' } : {}}>
                          <div className={`flex items-center justify-center w-6 h-6 rounded-lg text-xs font-bold mx-auto ${set.completed ? 'text-[#C9A84C]' : 'bg-white/5 text-white/25'}`}
                            style={set.completed ? { background: 'rgba(201,168,76,0.2)' } : {}}>
                            {set.completed ? <Check size={11} strokeWidth={3} className="text-[#C9A84C]" /> : set.setNumber}
                          </div>
                          <div className={`rounded-lg border text-center ${set.completed ? 'border-[#C9A84C]/20' : 'border-white/8 bg-[#080808]'}`}
                            style={set.completed ? { background: 'rgba(201,168,76,0.05)' } : {}}>
                            <input type="number" inputMode="decimal" step="0.5"
                              value={set.weight} onChange={e => updateSetField(exo.id, set.id, 'weight', e.target.value)}
                              disabled={set.completed}
                              placeholder={lastCompletedSet?.weight ? String(lastCompletedSet.weight) : '0'}
                              className={`w-full py-2 text-sm font-bold text-center bg-transparent outline-none placeholder:text-white/10 ${set.completed ? 'cursor-default' : 'text-white'}`}
                              style={set.completed ? { color: '#C9A84C' } : {}}
                            />
                          </div>
                          <div className={`rounded-lg border text-center ${set.completed ? 'border-[#C9A84C]/20' : 'border-white/8 bg-[#080808]'}`}
                            style={set.completed ? { background: 'rgba(201,168,76,0.05)' } : {}}>
                            <input type="number" inputMode="numeric"
                              value={set.reps} onChange={e => updateSetField(exo.id, set.id, 'reps', e.target.value)}
                              disabled={set.completed}
                              placeholder={exo.targetReps.split('-')[0] || '0'}
                              className={`w-full py-2 text-sm font-bold text-center bg-transparent outline-none placeholder:text-white/10 ${set.completed ? 'cursor-default' : 'text-white'}`}
                              style={set.completed ? { color: '#C9A84C' } : {}}
                            />
                          </div>
                          {set.completed ? (
                            <button onClick={() => unvalidateSet(exo.id, set.id)}
                              className="w-9 h-9 mx-auto rounded-xl border border-[#C9A84C]/25 flex items-center justify-center active:scale-90"
                              style={{ background: 'rgba(201,168,76,0.15)' }}>
                              <RotateCcw size={12} className="text-[#C9A84C]" />
                            </button>
                          ) : (
                            <button onClick={() => canValidate ? validateSet(exo.id, set.id) : undefined}
                              className={`w-9 h-9 mx-auto rounded-xl flex items-center justify-center active:scale-90 transition-all ${!canValidate ? 'bg-[#1a1a1a] border border-white/8' : ''}`}
                              style={canValidate ? { background: '#C9A84C', boxShadow: '0 4px 15px rgba(201,168,76,0.3)' } : {}}>
                              <Check size={14} strokeWidth={3} className={canValidate ? 'text-black' : 'text-white/15'} />
                            </button>
                          )}
                        </div>
                      )
                    })}
                  </div>

                  <button onClick={() => addSet(exo.id)}
                    className="mt-2 w-full border border-dashed border-white/8 rounded-[12px] py-2 flex items-center justify-center gap-1.5 text-white/20 text-xs font-bold active:border-[#C9A84C]/20 active:text-[#C9A84C]/50">
                    <Plus size={12} /> Ajouter un set
                  </button>
                </div>
              )}
            </div>
          )
        })}

        {allDone && (
          <div className="border border-[#C9A84C]/20 rounded-[24px] p-6 text-center"
            style={{ background: 'linear-gradient(135deg, #1a1500, #111)' }}>
            <Trophy size={28} className="mx-auto mb-2" style={{ color: '#C9A84C' }} />
            <p className="text-white font-bold mb-1">Tous les sets complétés ! 🔥</p>
            <p className="text-white/30 text-xs mb-4">{formatDuration(elapsed)} · {Math.round(totalVolume)} kg volume total</p>
            <button onClick={finishWorkout} className="w-full text-black font-bold py-4 rounded-2xl uppercase tracking-widest text-sm active:scale-[0.98]"
              style={{ background: '#C9A84C' }}>
              🏆 Terminer la Séance
            </button>
          </div>
        )}
      </div>

      {/* BARRE BAS */}
      <div className="fixed bottom-0 left-0 right-0 bg-[#111]/96 backdrop-blur-xl border-t border-white/5 px-5 py-3 z-30">
        <div className="flex justify-between items-center">
          <div className="flex gap-5">
            {[['Volume', `${Math.round(totalVolume)} kg`], ['Sets', `${completedSets}/${totalSets}`], ['Durée', formatDuration(elapsed)]].map(([label, val]) => (
              <div key={label}>
                <div className="text-[8px] text-white/20 uppercase tracking-widest">{label}</div>
                <div className="fd text-lg tracking-wider" style={{ color: label === 'Sets' ? '#C9A84C' : 'white' }}>{val}</div>
              </div>
            ))}
          </div>
          {!allDone && (
            <button onClick={finishWorkout} className="bg-white/5 border border-white/8 text-white/40 text-[9px] font-bold px-4 py-2.5 rounded-xl uppercase tracking-wider active:scale-95">
              Terminer quand même
            </button>
          )}
        </div>
      </div>
    </div>
  )
}