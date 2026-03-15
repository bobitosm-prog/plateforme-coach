'use client'
import { useState, useEffect, useRef } from 'react'
import { Check, ChevronDown, ChevronUp, Trophy, RotateCcw, Plus, ArrowLeft, Search, X, Play, Dumbbell } from 'lucide-react'
import { createBrowserClient } from '@supabase/ssr'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

interface ExSet { id: string; num: number; weight: number | ''; reps: number | ''; done: boolean }
interface Exo { id: string; name: string; muscle: string; targetSets: number; targetReps: string; rest: number; tempo?: string; rir?: number | null; notes?: string; videoUrl?: string; sets: ExSet[]; open: boolean }
interface WorkoutSessionProps { sessionName: string; exercises: any[]; onFinish: (data: any) => void; onClose: () => void }

const uid = () => Math.random().toString(36).slice(2)
const makeSets = (n: number): ExSet[] => Array.from({ length: n }, (_, i) => ({ id: uid(), num: i + 1, weight: '', reps: '', done: false }))
const fmt = (s: number) => s >= 60 ? `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}` : `${s}s`
const dur = (ms: number) => { const s = Math.floor(ms / 1000), h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60; if (h > 0) return `${h}h ${m}min`; if (m > 0) return `${m}min ${sec}s`; return `${sec}s` }
const GOLD = '#C9A84C', BG = '#0a0a0a', CARD = '#141414', BORDER = 'rgba(255,255,255,0.07)'

function RestOverlay({ secs, max, onSkip }: { secs: number; max: number; onSkip: () => void }) {
  const r = 52, c = 2 * Math.PI * r, offset = c * (1 - secs / max), hot = secs <= 10
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center px-6" style={{ background: 'rgba(0,0,0,0.9)', backdropFilter: 'blur(16px)' }}>
      <div className="flex flex-col items-center gap-5 p-8 rounded-[36px] border w-full max-w-xs relative overflow-hidden"
        style={{ background: hot ? '#1a0800' : '#141414', borderColor: hot ? 'rgba(251,146,60,0.5)' : 'rgba(201,168,76,0.3)' }}>
        <div className="absolute inset-0 pointer-events-none rounded-[36px]"
          style={{ background: hot ? 'radial-gradient(circle at 50% 0%, rgba(251,146,60,0.2) 0%, transparent 60%)' : 'radial-gradient(circle at 50% 0%, rgba(201,168,76,0.12) 0%, transparent 60%)' }} />
        <p className="text-[11px] font-black uppercase tracking-[0.25em] relative z-10" style={{ color: 'rgba(255,255,255,0.4)' }}>REPOS</p>
        <div className="relative z-10">
          <svg width="136" height="136" viewBox="0 0 136 136" style={{ transform: 'rotate(-90deg)' }}>
            <circle cx="68" cy="68" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="8" />
            <circle cx="68" cy="68" r={r} fill="none" stroke={hot ? '#fb923c' : GOLD} strokeWidth="8"
              strokeLinecap="round" strokeDasharray={c} strokeDashoffset={offset}
              style={{ transition: 'stroke-dashoffset 1s linear, stroke 0.4s ease' }} />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="font-black text-[52px] leading-none" style={{ color: hot ? '#fb923c' : GOLD, fontFamily: "'Bebas Neue', sans-serif" }}>{fmt(secs)}</span>
            {hot && <span className="text-[10px] font-black uppercase tracking-widest animate-pulse mt-1" style={{ color: 'rgba(251,146,60,0.7)' }}>GO !</span>}
          </div>
        </div>
        <button onClick={onSkip} className="relative z-10 w-full py-4 rounded-[18px] text-black font-black uppercase tracking-wider text-sm active:scale-95"
          style={{ background: hot ? '#fb923c' : GOLD }}>Passer →</button>
        <p className="text-[10px] relative z-10" style={{ color: 'rgba(255,255,255,0.2)' }}>Recommandé : {fmt(max)}</p>
      </div>
    </div>
  )
}

function CustomBuilder({ onStart, onCancel }: { onStart: (name: string, exos: any[]) => void; onCancel: () => void }) {
  const supabase = createBrowserClient(SUPABASE_URL, SUPABASE_KEY)
  const [name, setName] = useState('Ma Séance')
  const [search, setSearch] = useState('')
  const [dbExos, setDbExos] = useState<any[]>([])
  const [selected, setSelected] = useState<any[]>([])
  const [filter, setFilter] = useState('')
  const [step, setStep] = useState<'build' | 'config'>('build')
  const [cfg, setCfg] = useState<any[]>([])
  const ref = useRef<any>(null)
  const muscles = ['Poitrine', 'Dos Large', 'Dos Épais', 'Épaules', 'Biceps', 'Triceps', 'Quadriceps', 'Ischio-Jambiers', 'Fessiers', 'Mollets', 'Abdos', 'Cardio']

  useEffect(() => {
    clearTimeout(ref.current)
    ref.current = setTimeout(async () => {
      let q = supabase.from('exercises_db').select('*')
      if (search.length >= 2) q = q.ilike('name', `%${search}%`)
      if (filter) q = q.eq('muscle_group', filter)
      const { data } = await q.limit(40).order('name')
      setDbExos(data || [])
    }, 250)
  }, [search, filter])

  useEffect(() => { supabase.from('exercises_db').select('*').order('name').limit(40).then(({ data }) => setDbExos(data || [])) }, [])

  const toggle = (e: any) => setSelected(p => p.find(x => x.id === e.id) ? p.filter(x => x.id !== e.id) : [...p, e])
  const goConfig = () => { setCfg(selected.map(e => ({ ...e, targetSets: 3, targetReps: '10-12', rest: 90 }))); setStep('config') }
  const launch = () => onStart(name, cfg.map(e => ({ exercise_name: e.name, muscle_group: e.muscle_group, sets: e.targetSets, reps: e.targetReps, rest_seconds: e.rest, notes: e.description, video_url: e.video_url })))
  const dc = (d: string) => d === 'debutant' ? '#22c55e' : d === 'intermediaire' ? GOLD : '#ef4444'

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" style={{ background: BG, fontFamily: "'DM Sans', sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@400;500;700;900&display=swap'); input[type=number]::-webkit-inner-spin-button{-webkit-appearance:none}`}</style>
      <div className="sticky top-0 z-10 px-4 pt-10 pb-4 border-b" style={{ background: 'rgba(10,10,10,0.97)', borderColor: BORDER, backdropFilter: 'blur(20px)' }}>
        <div className="flex items-center justify-between mb-4">
          <button onClick={onCancel} className="flex items-center gap-1.5 text-xs font-bold" style={{ color: 'rgba(255,255,255,0.3)' }}><ArrowLeft size={14} /> Retour</button>
          <h2 className="text-sm font-black uppercase tracking-wider text-white">{step === 'build' ? 'Choisir les exercices' : 'Configurer'}</h2>
          {step === 'build'
            ? <button onClick={goConfig} disabled={!selected.length} className="text-[11px] font-black uppercase px-4 py-2 rounded-xl active:scale-95"
                style={{ background: selected.length ? GOLD : 'rgba(255,255,255,0.05)', color: selected.length ? '#000' : 'rgba(255,255,255,0.2)' }}>Suite ({selected.length})</button>
            : <button onClick={launch} className="text-[11px] font-black uppercase px-4 py-2 rounded-xl active:scale-95" style={{ background: GOLD, color: '#000' }}>Lancer !</button>}
        </div>
        {step === 'build' && <>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="Nom de la séance..."
            className="w-full px-4 py-3 rounded-xl text-sm font-bold mb-3 outline-none text-white"
            style={{ background: 'rgba(255,255,255,0.05)', border: `1px solid ${BORDER}` }} />
          <div className="relative mb-3">
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: 'rgba(255,255,255,0.25)' }} />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher un exercice..."
              className="w-full pl-9 pr-4 py-3 rounded-xl text-sm outline-none text-white"
              style={{ background: 'rgba(255,255,255,0.05)', border: `1px solid ${BORDER}` }} />
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {['Tous', ...muscles].map(m => (
              <button key={m} onClick={() => setFilter(m === 'Tous' ? '' : (filter === m ? '' : m))}
                className="flex-shrink-0 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase"
                style={{ background: (m === 'Tous' && !filter) || filter === m ? GOLD : 'rgba(255,255,255,0.05)', color: (m === 'Tous' && !filter) || filter === m ? '#000' : 'rgba(255,255,255,0.4)', border: `1px solid ${BORDER}` }}>
                {m}
              </button>
            ))}
          </div>
        </>}
      </div>

      <div className="px-4 py-4 pb-20 space-y-2">
        {step === 'build' && <>
          {selected.length > 0 && (
            <div className="rounded-[16px] p-3 mb-3" style={{ background: 'rgba(201,168,76,0.07)', border: '1px solid rgba(201,168,76,0.25)' }}>
              <p className="text-[10px] font-black uppercase tracking-widest mb-2" style={{ color: GOLD }}>Sélectionnés ({selected.length})</p>
              <div className="flex flex-wrap gap-1.5">
                {selected.map(e => (
                  <button key={e.id} onClick={() => toggle(e)} className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold"
                    style={{ background: 'rgba(201,168,76,0.15)', color: GOLD, border: '1px solid rgba(201,168,76,0.3)' }}>
                    {e.name} <X size={9} />
                  </button>
                ))}
              </div>
            </div>
          )}
          {dbExos.map((e: any) => {
            const sel = !!selected.find(x => x.id === e.id)
            return (
              <button key={e.id} onClick={() => toggle(e)} className="w-full text-left rounded-[16px] p-4 active:scale-[0.98] transition-all"
                style={{ background: sel ? 'rgba(201,168,76,0.08)' : 'rgba(255,255,255,0.02)', border: `1px solid ${sel ? 'rgba(201,168,76,0.35)' : BORDER}` }}>
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
                    style={{ background: sel ? GOLD : 'rgba(255,255,255,0.06)' }}>
                    {sel ? <Check size={16} className="text-black" strokeWidth={3} /> : <Dumbbell size={15} style={{ color: 'rgba(255,255,255,0.3)' }} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-black text-sm text-white">{e.name}</div>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg" style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.5)' }}>{e.muscle_group}</span>
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-lg" style={{ color: dc(e.difficulty), background: `${dc(e.difficulty)}18` }}>
                        {e.difficulty === 'debutant' ? 'Débutant' : e.difficulty === 'intermediaire' ? 'Intermédiaire' : 'Avancé'}
                      </span>
                      {e.equipment && <span className="text-[9px]" style={{ color: 'rgba(255,255,255,0.25)' }}>{e.equipment}</span>}
                    </div>
                    {e.description && <p className="text-[10px] mt-1.5 leading-relaxed" style={{ color: 'rgba(255,255,255,0.35)' }}>{e.description}</p>}
                  </div>
                </div>
              </button>
            )
          })}
        </>}

        {step === 'config' && <>
          <p className="text-[11px] font-bold uppercase tracking-widest mb-3" style={{ color: 'rgba(255,255,255,0.3)' }}>Configure chaque exercice</p>
          {cfg.map((e, i) => (
            <div key={e.id} className="rounded-[18px] p-4" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: GOLD }}>
                  <span className="text-xs font-black text-black">{i + 1}</span>
                </div>
                <div>
                  <div className="font-black text-sm text-white">{e.name}</div>
                  <div className="text-[10px]" style={{ color: 'rgba(255,255,255,0.35)' }}>{e.muscle_group}</div>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[['SETS', 'targetSets', 'number'], ['REPS', 'targetReps', 'text'], ['REPOS s', 'rest', 'number']].map(([label, key, type]) => (
                  <div key={key} className="rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.04)', border: `1px solid ${BORDER}` }}>
                    <div className="text-[9px] font-black uppercase tracking-widest mb-1.5" style={{ color: 'rgba(255,255,255,0.3)' }}>{label}</div>
                    <input type={type} value={(e as any)[key]}
                      onChange={ev => setCfg(p => p.map((x, j) => j !== i ? x : { ...x, [key]: type === 'number' ? parseInt(ev.target.value) || 0 : ev.target.value }))}
                      className="w-full bg-transparent text-base font-black outline-none"
                      style={{ color: GOLD }} />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </>}
      </div>
    </div>
  )
}

export default function WorkoutSession({ sessionName, exercises: raw, onFinish, onClose }: WorkoutSessionProps) {
  const [mode, setMode] = useState<'session' | 'custom'>('session')
  const [exos, setExos] = useState<Exo[]>(() => raw.map(e => ({ id: uid(), name: e.exercise_name, muscle: e.muscle_group || '', targetSets: e.sets || 3, targetReps: e.reps || '10-12', rest: e.rest_seconds || 90, tempo: e.tempo, rir: e.rir ?? null, notes: e.notes, videoUrl: e.video_url, sets: makeSets(e.sets || 3), open: true })))
  const [restOn, setRestOn] = useState(false)
  const [restSecs, setRestSecs] = useState(0)
  const [restMax, setRestMax] = useState(90)
  const restT = useRef<NodeJS.Timeout | null>(null)
  const [t0] = useState(Date.now())
  const [elapsed, setElapsed] = useState(0)
  const elT = useRef<NodeJS.Timeout | null>(null)
  const [done, setDone] = useState(false)
  const [showVideo, setShowVideo] = useState<string | null>(null)

  useEffect(() => { elT.current = setInterval(() => setElapsed(Date.now() - t0), 1000); return () => { if (elT.current) clearInterval(elT.current) } }, [])
  useEffect(() => {
    if (restOn && restSecs > 0) { restT.current = setTimeout(() => setRestSecs(s => s - 1), 1000) }
    else if (restOn && restSecs === 0) { setRestOn(false); if (navigator.vibrate) navigator.vibrate([300, 100, 300]) }
    return () => { if (restT.current) clearTimeout(restT.current) }
  }, [restOn, restSecs])
  useEffect(() => {
    let wl: any = null
    const tryWL = async () => { try { if ('wakeLock' in navigator) wl = await (navigator as any).wakeLock.request('screen') } catch {} }
    tryWL()
    const onVis = () => { if (document.visibilityState === 'visible') tryWL() }
    document.addEventListener('visibilitychange', onVis)
    return () => { document.removeEventListener('visibilitychange', onVis); if (wl) wl.release() }
  }, [])

  const startRest = (s: number) => { if (restT.current) clearTimeout(restT.current); setRestMax(s); setRestSecs(s); setRestOn(true) }
  const skipRest = () => { setRestOn(false); setRestSecs(0) }
  const setField = (eid: string, sid: string, f: 'weight' | 'reps', v: string) =>
    setExos(p => p.map(e => e.id !== eid ? e : { ...e, sets: e.sets.map(s => s.id !== sid ? s : { ...s, [f]: v === '' ? '' : Number(v) }) }))
  const validate = (eid: string, sid: string) => {
    let r = 90
    setExos(p => p.map(e => { if (e.id !== eid) return e; r = e.rest; return { ...e, sets: e.sets.map(s => s.id !== sid ? s : { ...s, done: true }) } }))
    startRest(r)
  }
  const unvalidate = (eid: string, sid: string) => { skipRest(); setExos(p => p.map(e => e.id !== eid ? e : { ...e, sets: e.sets.map(s => s.id !== sid ? s : { ...s, done: false }) })) }
  const addSet = (eid: string) => setExos(p => p.map(e => e.id !== eid ? e : { ...e, sets: [...e.sets, { id: uid(), num: e.sets.length + 1, weight: e.sets.at(-1)?.weight ?? '', reps: e.sets.at(-1)?.reps ?? '', done: false }] }))

  const total = exos.reduce((s, e) => s + e.sets.length, 0)
  const completed = exos.reduce((s, e) => s + e.sets.filter(s => s.done).length, 0)
  const volume = exos.reduce((v, e) => v + e.sets.filter(s => s.done && s.weight && s.reps).reduce((sv, s) => sv + Number(s.weight) * Number(s.reps), 0), 0)
  const pct = total > 0 ? (completed / total) * 100 : 0
  const allDone = completed === total && total > 0

  const finish = () => { if (elT.current) clearInterval(elT.current); setDone(true); onFinish({ duration: elapsed, completedSets: completed, totalSets: total, totalVolume: volume, exercises: exos.map(e => ({ name: e.name, sets: e.sets.filter(s => s.done).map(s => ({ weight: s.weight, reps: s.reps })) })) }) }

  if (mode === 'custom') return <CustomBuilder onStart={(n, exercises) => { setExos(exercises.map(e => ({ id: uid(), name: e.exercise_name, muscle: e.muscle_group || '', targetSets: e.sets || 3, targetReps: e.reps || '10-12', rest: e.rest_seconds || 90, tempo: undefined, rir: null, notes: e.notes, videoUrl: e.video_url, sets: makeSets(e.sets || 3), open: true }))); setMode('session') }} onCancel={() => setMode('session')} />

  if (done) return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center p-6 text-center" style={{ background: BG, fontFamily: "'DM Sans', sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@400;700;900&display=swap');`}</style>
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-72 h-72 pointer-events-none rounded-full" style={{ background: 'radial-gradient(circle, rgba(201,168,76,0.2) 0%, transparent 70%)', filter: 'blur(40px)' }} />
      <div className="relative z-10 flex flex-col items-center w-full max-w-xs">
        <div className="w-20 h-20 rounded-[28px] flex items-center justify-center mb-5" style={{ background: `linear-gradient(135deg, ${GOLD}, #8B6914)`, boxShadow: '0 20px 60px rgba(201,168,76,0.35)' }}>
          <Trophy size={36} className="text-white" />
        </div>
        <h1 className="text-white mb-1 text-5xl" style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: '0.06em' }}>TERMINÉ 🔥</h1>
        <p className="text-sm mb-7" style={{ color: 'rgba(255,255,255,0.4)' }}>{sessionName}</p>
        <div className="grid grid-cols-3 gap-3 mb-5 w-full">
          {[['⏱', dur(elapsed), 'Durée'], ['✅', `${completed}/${total}`, 'Sets'], ['💪', `${Math.round(volume)}kg`, 'Volume']].map(([ico, v, l]) => (
            <div key={String(l)} className="rounded-[18px] p-4 text-center" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
              <div className="text-2xl mb-1">{ico}</div>
              <div className="text-xl font-black text-white" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>{v}</div>
              <div className="text-[9px] font-bold uppercase tracking-widest mt-0.5" style={{ color: 'rgba(255,255,255,0.3)' }}>{l}</div>
            </div>
          ))}
        </div>
        <div className="w-full space-y-2 mb-7">
          {exos.map(e => { const d = e.sets.filter(s => s.done); if (!d.length) return null; const best = Math.max(...d.map(s => Number(s.weight) || 0)); return (<div key={e.id} className="rounded-[14px] px-4 py-3 flex justify-between items-center" style={{ background: CARD, border: `1px solid ${BORDER}` }}><div><div className="text-sm font-bold text-white">{e.name}</div><div className="text-[10px]" style={{ color: 'rgba(255,255,255,0.3)' }}>{d.length} sets · {e.muscle}</div></div><div className="text-right"><div className="text-sm font-black" style={{ color: GOLD }}>{best > 0 ? `${best} kg` : '—'}</div><div className="text-[9px]" style={{ color: 'rgba(255,255,255,0.25)' }}>max</div></div></div>) })}
        </div>
        <button onClick={onClose} className="w-full py-4 rounded-[18px] text-black font-black uppercase tracking-widest text-sm active:scale-[0.98]" style={{ background: GOLD }}>Dashboard</button>
      </div>
    </div>
  )

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" style={{ background: BG, fontFamily: "'DM Sans', sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@300;400;500;700;900&display=swap'); .fd{font-family:'Bebas Neue',sans-serif;letter-spacing:.05em} input[type=number]::-webkit-inner-spin-button{-webkit-appearance:none} input[type=number]{-moz-appearance:textfield}`}</style>
      {restOn && <RestOverlay secs={restSecs} max={restMax} onSkip={skipRest} />}
      {showVideo && (<div className="fixed inset-0 z-[70] flex items-center justify-center p-5" style={{ background: 'rgba(0,0,0,0.95)' }}><div className="w-full max-w-sm"><div className="flex justify-between items-center mb-4"><span className="text-white font-bold text-sm">Démonstration</span><button onClick={() => setShowVideo(null)} className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.1)' }}><X size={16} className="text-white" /></button></div><video src={showVideo} controls autoPlay className="w-full rounded-[20px]" /></div></div>)}

      {/* HEADER */}
      <div className="sticky top-0 z-40 px-4 pt-10 pb-4 border-b" style={{ background: 'rgba(10,10,10,0.97)', borderColor: BORDER, backdropFilter: 'blur(20px)' }}>
        <div className="flex items-center justify-between mb-3">
          <button onClick={onClose} className="flex items-center gap-1.5 text-xs font-bold" style={{ color: 'rgba(255,255,255,0.3)' }}><ArrowLeft size={14} /> Abandonner</button>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
            <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#22c55e' }} />
            <span className="fd text-sm text-white">{dur(elapsed)}</span>
          </div>
          <button onClick={finish} className="text-[11px] font-black uppercase px-4 py-2 rounded-[12px] active:scale-95" style={{ background: GOLD, color: '#000' }}>Terminer</button>
        </div>
        <h1 className="fd text-xl text-white mb-2 truncate">{sessionName}</h1>
        <div className="flex justify-between items-center mb-1.5">
          <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.3)' }}>Progression</span>
          <span className="text-[11px] font-black" style={{ color: GOLD }}>{completed}/{total} sets</span>
        </div>
        <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
          <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${GOLD}, #e8c060)`, boxShadow: pct > 0 ? `0 0 12px ${GOLD}50` : 'none' }} />
        </div>
      </div>

      {/* EXERCICES */}
      <div className="px-4 py-4 space-y-3 pb-36">
        <button onClick={() => setMode('custom')} className="w-full flex items-center gap-3 p-4 rounded-[16px] active:scale-[0.98]"
          style={{ background: 'rgba(201,168,76,0.05)', border: '1px dashed rgba(201,168,76,0.3)' }}>
          <Plus size={18} style={{ color: GOLD }} />
          <div className="text-left">
            <div className="text-sm font-black text-white">Séance personnalisée</div>
            <div className="text-[10px]" style={{ color: 'rgba(255,255,255,0.3)' }}>Choisir dans la base d'exercices</div>
          </div>
        </button>

        {exos.map((exo, idx) => {
          const cnt = exo.sets.filter(s => s.done).length
          const isDone = cnt === exo.sets.length
          const last = exo.sets.filter(s => s.done).at(-1)
          return (
            <div key={exo.id} className="rounded-[20px] overflow-hidden transition-all"
              style={{ background: isDone ? 'rgba(201,168,76,0.06)' : CARD, border: `1px solid ${isDone ? 'rgba(201,168,76,0.4)' : BORDER}` }}>
              <button onClick={() => setExos(p => p.map(e => e.id === exo.id ? { ...e, open: !e.open } : e))} className="w-full flex items-center gap-3 p-4 text-left">
                <div className="w-9 h-9 rounded-[12px] flex items-center justify-center flex-shrink-0"
                  style={{ background: isDone ? GOLD : 'rgba(255,255,255,0.06)', border: `1px solid ${isDone ? 'transparent' : BORDER}` }}>
                  {isDone ? <Check size={16} className="text-black" strokeWidth={3} /> : <span className="fd text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>{idx + 1}</span>}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-black text-sm text-white truncate">{exo.name}</div>
                  <div className="text-[10px] truncate mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>{exo.muscle}</div>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <span className="text-[9px] font-bold px-2 py-1 rounded-lg" style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.45)' }}>{exo.targetSets}×{exo.targetReps}</span>
                  <span className="text-[9px] font-bold px-2 py-1 rounded-lg" style={{ background: 'rgba(201,168,76,0.1)', color: GOLD }}>⏱{fmt(exo.rest)}</span>
                  {exo.videoUrl && <button onClick={e => { e.stopPropagation(); setShowVideo(exo.videoUrl!) }} className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.3)' }}><Play size={10} style={{ color: '#60a5fa' }} /></button>}
                  <span className="text-[10px] font-black" style={{ color: cnt > 0 ? GOLD : 'rgba(255,255,255,0.2)' }}>{cnt}/{exo.sets.length}</span>
                  {exo.open ? <ChevronUp size={14} style={{ color: 'rgba(255,255,255,0.2)' }} /> : <ChevronDown size={14} style={{ color: 'rgba(255,255,255,0.2)' }} />}
                </div>
              </button>

              {exo.open && (
                <div className="px-4 pb-4">
                  {(exo.notes || exo.tempo || exo.rir != null) && (
                    <div className="rounded-[12px] px-3 py-2.5 mb-3 flex flex-wrap gap-1.5" style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${BORDER}` }}>
                      {exo.tempo && <span className="text-[9px] font-bold px-2 py-0.5 rounded-lg" style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.45)' }}>Tempo {exo.tempo}</span>}
                      {exo.rir != null && <span className="text-[9px] font-bold px-2 py-0.5 rounded-lg" style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.45)' }}>RIR {exo.rir}</span>}
                      {exo.notes && <p className="text-[10px] w-full mt-0.5 italic leading-relaxed" style={{ color: 'rgba(255,255,255,0.35)' }}>{exo.notes}</p>}
                    </div>
                  )}
                  <div className="grid gap-2 mb-2 px-1" style={{ gridTemplateColumns: '32px 1fr 1fr 40px' }}>
                    {['SET', 'KG', 'REPS', '✓'].map(h => <span key={h} className="text-[9px] font-black uppercase text-center" style={{ color: 'rgba(255,255,255,0.3)' }}>{h}</span>)}
                  </div>
                  <div className="space-y-2">
                    {exo.sets.map((set: ExSet) => {
                      const ok = !set.done && (set.weight !== '' || set.reps !== '')
                      return (
                        <div key={set.id} className="grid gap-2 items-center rounded-[14px] px-2 py-2 transition-all"
                          style={{ gridTemplateColumns: '32px 1fr 1fr 40px', background: set.done ? 'rgba(201,168,76,0.09)' : 'rgba(255,255,255,0.03)', border: `1px solid ${set.done ? 'rgba(201,168,76,0.25)' : 'rgba(255,255,255,0.06)'}` }}>
                          <div className="w-7 h-7 rounded-lg flex items-center justify-center mx-auto text-xs font-black"
                            style={{ background: set.done ? 'rgba(201,168,76,0.25)' : 'rgba(255,255,255,0.06)', color: set.done ? GOLD : 'rgba(255,255,255,0.4)' }}>
                            {set.done ? <Check size={12} strokeWidth={3} style={{ color: GOLD }} /> : set.num}
                          </div>
                          <div className="rounded-xl overflow-hidden" style={{ background: set.done ? 'rgba(201,168,76,0.07)' : 'rgba(0,0,0,0.4)', border: `1px solid ${set.done ? 'rgba(201,168,76,0.25)' : 'rgba(255,255,255,0.09)'}` }}>
                            <input type="number" inputMode="decimal" step="0.5" value={set.weight}
                              onChange={e => setField(exo.id, set.id, 'weight', e.target.value)} disabled={set.done}
                              placeholder={last?.weight ? String(last.weight) : '0'}
                              className="w-full py-2.5 text-sm font-black text-center bg-transparent outline-none"
                              style={{ color: set.done ? GOLD : 'white', caretColor: GOLD }} />
                          </div>
                          <div className="rounded-xl overflow-hidden" style={{ background: set.done ? 'rgba(201,168,76,0.07)' : 'rgba(0,0,0,0.4)', border: `1px solid ${set.done ? 'rgba(201,168,76,0.25)' : 'rgba(255,255,255,0.09)'}` }}>
                            <input type="number" inputMode="numeric" value={set.reps}
                              onChange={e => setField(exo.id, set.id, 'reps', e.target.value)} disabled={set.done}
                              placeholder={exo.targetReps.split('-')[0] || '0'}
                              className="w-full py-2.5 text-sm font-black text-center bg-transparent outline-none"
                              style={{ color: set.done ? GOLD : 'white', caretColor: GOLD }} />
                          </div>
                          {set.done
                            ? <button onClick={() => unvalidate(exo.id, set.id)} className="w-9 h-9 mx-auto rounded-xl flex items-center justify-center active:scale-90" style={{ background: 'rgba(201,168,76,0.15)', border: '1px solid rgba(201,168,76,0.35)' }}><RotateCcw size={13} style={{ color: GOLD }} /></button>
                            : <button onClick={() => ok ? validate(exo.id, set.id) : undefined} className="w-9 h-9 mx-auto rounded-xl flex items-center justify-center active:scale-90 transition-all"
                                style={{ background: ok ? GOLD : 'rgba(255,255,255,0.04)', border: `1px solid ${ok ? 'transparent' : 'rgba(255,255,255,0.08)'}`, boxShadow: ok ? `0 4px 18px ${GOLD}45` : 'none' }}>
                                <Check size={15} strokeWidth={3} style={{ color: ok ? '#000' : 'rgba(255,255,255,0.15)' }} />
                              </button>}
                        </div>
                      )
                    })}
                  </div>
                  <button onClick={() => addSet(exo.id)} className="mt-2.5 w-full py-2.5 rounded-[12px] flex items-center justify-center gap-1.5 text-xs font-bold active:opacity-70"
                    style={{ border: '1px dashed rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.25)' }}>
                    <Plus size={12} /> Ajouter un set
                  </button>
                </div>
              )}
            </div>
          )
        })}

        {allDone && (
          <div className="rounded-[24px] p-6 text-center" style={{ background: 'rgba(201,168,76,0.07)', border: '1px solid rgba(201,168,76,0.3)' }}>
            <Trophy size={32} className="mx-auto mb-2" style={{ color: GOLD }} />
            <p className="text-white font-black text-base mb-1">Séance complète ! 🔥</p>
            <p className="text-sm mb-4" style={{ color: 'rgba(255,255,255,0.4)' }}>{dur(elapsed)} · {Math.round(volume)} kg</p>
            <button onClick={finish} className="w-full py-4 rounded-[18px] text-black font-black uppercase tracking-widest text-sm active:scale-[0.98]" style={{ background: GOLD }}>🏆 Terminer</button>
          </div>
        )}
      </div>

      {/* BARRE BAS */}
      <div className="fixed bottom-0 left-0 right-0 px-5 py-4 z-30 border-t" style={{ background: 'rgba(10,10,10,0.97)', backdropFilter: 'blur(20px)', borderColor: BORDER }}>
        <div className="flex justify-between items-center">
          <div className="flex gap-5">
            {[['Volume', `${Math.round(volume)}kg`], ['Sets', `${completed}/${total}`], ['Durée', dur(elapsed)]].map(([l, v]) => (
              <div key={l}>
                <div className="text-[9px] font-black uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.25)' }}>{l}</div>
                <div className="fd text-lg" style={{ color: l === 'Sets' ? GOLD : 'white' }}>{v}</div>
              </div>
            ))}
          </div>
          {!allDone && <button onClick={finish} className="text-[10px] font-bold px-4 py-2.5 rounded-xl uppercase" style={{ background: 'rgba(255,255,255,0.05)', border: `1px solid ${BORDER}`, color: 'rgba(255,255,255,0.35)' }}>Terminer quand même</button>}
        </div>
      </div>
    </div>
  )
}