'use client'
import { useState, useEffect, useRef } from 'react'
import { Check, ChevronDown, ChevronUp, Trophy, RotateCcw, Plus, ArrowLeft, Search, X, Play, Dumbbell, MoreHorizontal } from 'lucide-react'
import { createBrowserClient } from '@supabase/ssr'
import {
  BG_BASE, BG_CARD, BG_CARD_2, BORDER, GOLD, GOLD_DIM, GOLD_RULE,
  GREEN, RED, TEXT_PRIMARY, TEXT_MUTED, TEXT_DIM, RADIUS_CARD,
  FONT_DISPLAY, FONT_ALT, FONT_BODY
} from '../../lib/design-tokens'
import { playBeep, playWarningTick, vibrateDevice, getRandomMessage } from '../../lib/timer-audio'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

interface ExSet { id: string; num: number; weight: number | ''; reps: number | ''; done: boolean }
interface Exo { id: string; name: string; muscle: string; targetSets: number; targetReps: string; rest: number; tempo?: string; rir?: number | null; notes?: string; videoUrl?: string; sets: ExSet[]; open: boolean }
interface WorkoutSessionProps { sessionName: string; exercises: any[]; onFinish: (data: any) => void; onClose: () => void }

const uid = () => Math.random().toString(36).slice(2)
const makeSets = (n: number): ExSet[] => Array.from({ length: n }, (_, i) => ({ id: uid(), num: i + 1, weight: '', reps: '', done: false }))
const fmt = (s: number) => s >= 60 ? `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}` : `${s}s`
const dur = (ms: number) => { const s = Math.floor(ms / 1000), h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60; if (h > 0) return `${h}h ${m}min`; if (m > 0) return `${m}min ${sec}s`; return `${sec}s` }

function RestOverlay({ secs, max, onSkip }: { secs: number; max: number; onSkip: () => void }) {
  const r = 52, c = 2 * Math.PI * r, offset = c * (1 - secs / max), hot = secs <= 10
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center px-6" style={{ background: 'rgba(0,0,0,0.9)', backdropFilter: 'blur(16px)' }}>
      <div className="flex flex-col items-center gap-5 p-8 w-full max-w-xs relative overflow-hidden"
        style={{ background: BG_CARD, borderRadius: RADIUS_CARD, border: `1px solid ${GOLD_RULE}` }}>
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: hot ? `radial-gradient(circle at 50% 0%, rgba(201,168,76,0.25) 0%, transparent 60%)` : `radial-gradient(circle at 50% 0%, rgba(201,168,76,0.12) 0%, transparent 60%)` }} />
        <p className="text-[11px] relative z-10" style={{ color: TEXT_MUTED, fontFamily: FONT_ALT, fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase' }}>REPOS</p>
        <div className="relative z-10">
          <svg width="136" height="136" viewBox="0 0 136 136" style={{ transform: 'rotate(-90deg)' }}>
            <circle cx="68" cy="68" r={r} fill="none" stroke={TEXT_DIM} strokeWidth="2" />
            <circle cx="68" cy="68" r={r} fill="none" stroke={GOLD} strokeWidth="2"
              strokeLinecap="round" strokeDasharray={c} strokeDashoffset={offset}
              style={{ transition: 'stroke-dashoffset 1s linear, stroke 0.4s ease' }} />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="leading-none" style={{ color: GOLD, fontFamily: FONT_DISPLAY, fontSize: 64, fontWeight: 700 }}>{fmt(secs)}</span>
            {hot && <span className="text-[10px] uppercase tracking-widest animate-pulse mt-1" style={{ color: GOLD, fontFamily: FONT_ALT, fontWeight: 700 }}>GO !</span>}
          </div>
        </div>
        <button onClick={onSkip} className="relative z-10 w-full py-4 active:scale-95"
          style={{ background: GOLD, color: '#050505', fontFamily: FONT_ALT, fontWeight: 800, borderRadius: 0, border: 'none', cursor: 'pointer', letterSpacing: '2px', textTransform: 'uppercase', fontSize: '0.875rem' }}>Passer →</button>
        <p className="text-[10px] relative z-10" style={{ color: TEXT_DIM, fontFamily: FONT_BODY }}>Recommandé : {fmt(max)}</p>
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
  const dc = (d: string) => d === 'debutant' ? GREEN : d === 'intermediaire' ? GOLD : RED

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" style={{ background: BG_BASE, fontFamily: FONT_BODY }}>
      <div className="sticky top-0 z-10 px-4 pt-10 pb-4 border-b" style={{ background: 'rgba(5,5,5,0.97)', borderColor: BORDER, backdropFilter: 'blur(20px)' }}>
        <div className="flex items-center justify-between mb-4">
          <button onClick={onCancel} className="flex items-center gap-1.5 text-xs" style={{ color: TEXT_MUTED, fontFamily: FONT_ALT, fontWeight: 700 }}><ArrowLeft size={14} /> Retour</button>
          <h2 className="text-sm uppercase tracking-wider" style={{ color: TEXT_PRIMARY, fontFamily: FONT_ALT, fontWeight: 700, letterSpacing: '2px' }}>{step === 'build' ? 'Choisir les exercices' : 'Configurer'}</h2>
          {step === 'build'
            ? <button onClick={goConfig} disabled={!selected.length} className="text-[11px] uppercase px-4 py-2 active:scale-95"
                style={{ background: selected.length ? GOLD : BG_CARD, color: selected.length ? '#050505' : TEXT_DIM, fontFamily: FONT_ALT, fontWeight: 800, borderRadius: 0, border: selected.length ? 'none' : `1px solid ${BORDER}` }}>Suite ({selected.length})</button>
            : <button onClick={launch} className="text-[11px] uppercase px-4 py-2 active:scale-95" style={{ background: GOLD, color: '#050505', fontFamily: FONT_ALT, fontWeight: 800, borderRadius: 0, border: 'none' }}>Lancer !</button>}
        </div>
        {step === 'build' && <>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="Nom de la séance..."
            className="w-full px-4 py-3 text-sm font-bold mb-3 outline-none"
            style={{ background: BG_BASE, border: `1px solid ${BORDER}`, borderRadius: 0, color: TEXT_PRIMARY, fontFamily: FONT_BODY }} />
          <div className="relative mb-3">
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: TEXT_DIM }} />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher un exercice..."
              className="w-full pl-9 pr-4 py-3 text-sm outline-none"
              style={{ background: BG_BASE, border: `1px solid ${BORDER}`, borderRadius: 0, color: TEXT_PRIMARY, fontFamily: FONT_BODY }} />
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {['Tous', ...muscles].map(m => (
              <button key={m} onClick={() => setFilter(m === 'Tous' ? '' : (filter === m ? '' : m))}
                className="flex-shrink-0 px-3 py-1.5 text-[10px] uppercase"
                style={{ background: (m === 'Tous' && !filter) || filter === m ? GOLD : BG_BASE, color: (m === 'Tous' && !filter) || filter === m ? '#050505' : TEXT_MUTED, border: `1px solid ${BORDER}`, fontFamily: FONT_ALT, fontWeight: 700, letterSpacing: '1px', borderRadius: 0 }}>
                {m}
              </button>
            ))}
          </div>
        </>}
      </div>

      <div className="px-4 py-4 pb-20 space-y-2">
        {step === 'build' && <>
          {selected.length > 0 && (
            <div className="p-3 mb-3" style={{ background: GOLD_DIM, border: `1px solid ${GOLD_RULE}`, borderRadius: RADIUS_CARD }}>
              <p className="text-[10px] mb-2" style={{ color: GOLD, fontFamily: FONT_ALT, fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase' }}>Sélectionnés ({selected.length})</p>
              <div className="flex flex-wrap gap-1.5">
                {selected.map(e => (
                  <button key={e.id} onClick={() => toggle(e)} className="flex items-center gap-1 px-2.5 py-1 text-[10px]"
                    style={{ background: GOLD_DIM, color: GOLD, border: `1px solid ${GOLD_RULE}`, borderRadius: 0, fontFamily: FONT_ALT, fontWeight: 700 }}>
                    {e.name} <X size={9} />
                  </button>
                ))}
              </div>
            </div>
          )}
          {dbExos.map((e: any) => {
            const sel = !!selected.find(x => x.id === e.id)
            return (
              <button key={e.id} onClick={() => toggle(e)} className="w-full text-left p-4 active:scale-[0.98] transition-all"
                style={{ background: sel ? GOLD_DIM : BG_CARD, border: `1px solid ${sel ? GOLD_RULE : BORDER}`, borderRadius: RADIUS_CARD }}>
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 flex items-center justify-center flex-shrink-0 mt-0.5"
                    style={{ background: sel ? GOLD : BG_BASE, border: `1px solid ${sel ? 'transparent' : BORDER}`, borderRadius: RADIUS_CARD }}>
                    {sel ? <Check size={16} className="text-black" strokeWidth={3} /> : <Dumbbell size={15} style={{ color: TEXT_DIM }} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm" style={{ color: TEXT_PRIMARY, fontFamily: FONT_ALT, fontWeight: 700 }}>{e.name}</div>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <span className="text-[10px] px-2 py-0.5" style={{ background: BG_BASE, color: TEXT_MUTED, border: `1px solid ${BORDER}`, borderRadius: 0, fontFamily: FONT_ALT, fontWeight: 700 }}>{e.muscle_group}</span>
                      <span className="text-[9px] px-1.5 py-0.5" style={{ color: dc(e.difficulty), background: `${dc(e.difficulty)}18`, borderRadius: 0, fontFamily: FONT_ALT, fontWeight: 700 }}>
                        {e.difficulty === 'debutant' ? 'Débutant' : e.difficulty === 'intermediaire' ? 'Intermédiaire' : 'Avancé'}
                      </span>
                      {e.equipment && <span className="text-[9px]" style={{ color: TEXT_DIM, fontFamily: FONT_BODY }}>{e.equipment}</span>}
                    </div>
                    {e.description && <p className="text-[10px] mt-1.5 leading-relaxed" style={{ color: TEXT_MUTED, fontFamily: FONT_BODY }}>{e.description}</p>}
                  </div>
                </div>
              </button>
            )
          })}
        </>}

        {step === 'config' && <>
          <p className="text-[11px] uppercase tracking-widest mb-3" style={{ color: TEXT_MUTED, fontFamily: FONT_ALT, fontWeight: 700, letterSpacing: '2px' }}>Configure chaque exercice</p>
          {cfg.map((e, i) => (
            <div key={e.id} className="p-4" style={{ background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: RADIUS_CARD }}>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 flex items-center justify-center" style={{ background: GOLD, borderRadius: RADIUS_CARD }}>
                  <span className="text-xs" style={{ color: '#050505', fontFamily: FONT_DISPLAY, fontWeight: 700 }}>{i + 1}</span>
                </div>
                <div>
                  <div className="text-sm" style={{ color: TEXT_PRIMARY, fontFamily: FONT_ALT, fontWeight: 700 }}>{e.name}</div>
                  <div className="text-[10px]" style={{ color: TEXT_MUTED, fontFamily: FONT_BODY }}>{e.muscle_group}</div>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[['SETS', 'targetSets', 'number'], ['REPS', 'targetReps', 'text'], ['REPOS s', 'rest', 'number']].map(([label, key, type]) => (
                  <div key={key} className="p-3" style={{ background: BG_BASE, border: `1px solid ${BORDER}`, borderRadius: 0 }}>
                    <div className="text-[9px] mb-1.5" style={{ color: TEXT_MUTED, fontFamily: FONT_ALT, fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase' }}>{label}</div>
                    <input type={type} value={(e as any)[key]}
                      onChange={ev => setCfg(p => p.map((x, j) => j !== i ? x : { ...x, [key]: type === 'number' ? parseInt(ev.target.value) || 0 : ev.target.value }))}
                      className="w-full bg-transparent text-base outline-none"
                      style={{ color: GOLD, fontFamily: FONT_DISPLAY, fontWeight: 700 }} />
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
  const supabase = createBrowserClient(SUPABASE_URL, SUPABASE_KEY)
  const [mode, setMode] = useState<'session' | 'custom'>('session')
  const [exos, setExos] = useState<Exo[]>(() => raw.map(e => ({ id: uid(), name: e.exercise_name, muscle: e.muscle_group || '', targetSets: e.sets || 3, targetReps: String(e.reps || '10-12'), rest: e.rest_seconds || 90, tempo: e.tempo, rir: e.rir ?? null, notes: e.notes, videoUrl: e.video_url, sets: makeSets(e.sets || 3), open: true })))
  const [restOn, setRestOn] = useState(false)
  const [restSecs, setRestSecs] = useState(0)
  const [restMax, setRestMax] = useState(90)
  const restT = useRef<NodeJS.Timeout | null>(null)
  const [t0] = useState(Date.now())
  const [elapsed, setElapsed] = useState(0)
  const elT = useRef<NodeJS.Timeout | null>(null)
  const [done, setDone] = useState(false)
  const [showVideo, setShowVideo] = useState<string | null>(null)
  const [previousData, setPreviousData] = useState<Record<string, { weight: number; reps: number }[]>>({})
  const [showTimerAlert, setShowTimerAlert] = useState(false)
  const [motivationalMsg, setMotivationalMsg] = useState('')

  // Fetch previous performance for all exercises
  useEffect(() => {
    const names = raw.map(e => e.exercise_name).filter(Boolean)
    if (!names.length) return
    const fetchPrev = async () => {
      const prev: Record<string, { weight: number; reps: number }[]> = {}
      for (const name of names) {
        const { data } = await supabase
          .from('workout_sets')
          .select('weight, reps, created_at')
          .eq('exercise_name', name)
          .order('created_at', { ascending: false })
          .limit(20)
        if (data?.length) {
          const first = new Date(data[0].created_at).getTime()
          prev[name] = data
            .filter((d: any) => Math.abs(new Date(d.created_at).getTime() - first) < 7200000)
            .map((s: any) => ({ weight: s.weight || 0, reps: s.reps || 0 }))
        }
      }
      setPreviousData(prev)
    }
    fetchPrev()
  }, [raw])

  useEffect(() => { elT.current = setInterval(() => setElapsed(Date.now() - t0), 1000); return () => { if (elT.current) clearInterval(elT.current) } }, [])
  useEffect(() => {
    if (restOn && restSecs > 0) {
      restT.current = setTimeout(() => setRestSecs(s => s - 1), 1000)
      // Warning tick at 5 seconds
      if (restSecs === 5) playWarningTick()
    } else if (restOn && restSecs === 0) {
      setRestOn(false)
      playBeep()
      vibrateDevice()
      setMotivationalMsg(getRandomMessage())
      setShowTimerAlert(true)
      setTimeout(() => setShowTimerAlert(false), 3000)
    }
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

  if (mode === 'custom') return <CustomBuilder onStart={(n, exercises) => { setExos(exercises.map(e => ({ id: uid(), name: e.exercise_name, muscle: e.muscle_group || '', targetSets: e.sets || 3, targetReps: String(e.reps || '10-12'), rest: e.rest_seconds || 90, tempo: undefined, rir: null, notes: e.notes, videoUrl: e.video_url, sets: makeSets(e.sets || 3), open: true }))); setMode('session') }} onCancel={() => setMode('session')} />

  if (done) return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center p-6 text-center" style={{ background: BG_BASE, fontFamily: FONT_BODY }}>
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-72 h-72 pointer-events-none rounded-full" style={{ background: `radial-gradient(circle, ${GOLD_DIM} 0%, transparent 70%)`, filter: 'blur(40px)' }} />
      <div className="relative z-10 flex flex-col items-center w-full max-w-xs">
        <div className="w-20 h-20 flex items-center justify-center mb-5" style={{ background: GOLD, borderRadius: RADIUS_CARD }}>
          <Trophy size={36} className="text-white" />
        </div>
        <h1 className="mb-1 text-5xl" style={{ fontFamily: FONT_DISPLAY, letterSpacing: '0.06em', color: TEXT_PRIMARY }}>TERMINÉ 🔥</h1>
        <p className="text-sm mb-7" style={{ color: TEXT_MUTED, fontFamily: FONT_BODY }}>{sessionName}</p>
        <div className="grid grid-cols-3 gap-3 mb-5 w-full">
          {[['⏱', dur(elapsed), 'Durée'], ['✅', `${completed}/${total}`, 'Sets'], ['💪', `${Math.round(volume)}kg`, 'Volume']].map(([ico, v, l]) => (
            <div key={String(l)} className="p-4 text-center" style={{ background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: RADIUS_CARD }}>
              <div className="text-2xl mb-1">{ico}</div>
              <div className="text-xl" style={{ fontFamily: FONT_DISPLAY, color: GOLD }}>{v}</div>
              <div className="text-[9px] mt-0.5" style={{ color: TEXT_MUTED, fontFamily: FONT_ALT, fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase' }}>{l}</div>
            </div>
          ))}
        </div>
        <div className="w-full space-y-2 mb-7">
          {exos.map(e => { const d = e.sets.filter(s => s.done); if (!d.length) return null; const best = Math.max(...d.map(s => Number(s.weight) || 0)); return (<div key={e.id} className="px-4 py-3 flex justify-between items-center" style={{ background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: RADIUS_CARD }}><div><div className="text-sm" style={{ color: TEXT_PRIMARY, fontFamily: FONT_ALT, fontWeight: 700 }}>{e.name}</div><div className="text-[10px]" style={{ color: TEXT_MUTED, fontFamily: FONT_BODY }}>{d.length} sets · {e.muscle}</div></div><div className="text-right"><div className="text-sm" style={{ color: GOLD, fontFamily: FONT_DISPLAY }}>{best > 0 ? `${best} kg` : '—'}</div><div className="text-[9px]" style={{ color: TEXT_DIM, fontFamily: FONT_ALT, fontWeight: 700 }}>max</div></div></div>) })}
        </div>
        <button onClick={onClose} className="w-full py-4 active:scale-[0.98]" style={{ background: GOLD, color: '#050505', fontFamily: FONT_ALT, fontWeight: 800, borderRadius: 0, border: 'none', cursor: 'pointer', letterSpacing: '2px', textTransform: 'uppercase', fontSize: '0.875rem' }}>Dashboard</button>
      </div>
    </div>
  )

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" style={{ background: BG_BASE, fontFamily: FONT_BODY }}>
      <style>{`
        .ws-input { -webkit-appearance: none; appearance: none; }
        .ws-input::-webkit-inner-spin-button,
        .ws-input::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
        .ws-input:focus { border-color: ${GOLD} !important; }
        @media(max-width:420px){
          .ws-grid { grid-template-columns: 28px 1fr 64px 56px 36px !important; }
        }
        @keyframes wsTimerFade {
          0% { opacity: 0; transform: scale(0.95); }
          10% { opacity: 1; transform: scale(1); }
          80% { opacity: 1; }
          100% { opacity: 0; }
        }
        @keyframes wsTimerPulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.15); }
        }
      `}</style>
      {restOn && <RestOverlay secs={restSecs} max={restMax} onSkip={skipRest} />}

      {/* Timer complete alert */}
      {showTimerAlert && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(201,168,76,0.12)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          zIndex: 9999, pointerEvents: 'none',
          animation: 'wsTimerFade 3s ease-in-out forwards',
        }}>
          <div style={{
            width: 80, height: 80, border: `2px solid ${GOLD}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            marginBottom: 24, animation: 'wsTimerPulse 0.5s ease-in-out 3',
          }}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
              <path d="M13 2L3 14H12L11 22L21 10H12L13 2Z" fill={GOLD} />
            </svg>
          </div>
          <p style={{ fontFamily: FONT_DISPLAY, fontSize: 42, color: GOLD, letterSpacing: 4, margin: '0 0 12px', textAlign: 'center' }}>
            REPOS TERMINÉ
          </p>
          <p style={{ fontFamily: FONT_ALT, fontWeight: 800, fontSize: 24, color: TEXT_PRIMARY, letterSpacing: 2, textTransform: 'uppercase', textAlign: 'center', margin: 0 }}>
            {motivationalMsg}
          </p>
        </div>
      )}
      {showVideo && (<div className="fixed inset-0 z-[70] flex items-center justify-center p-5" style={{ background: 'rgba(0,0,0,0.95)' }}><div className="w-full max-w-sm"><div className="flex justify-between items-center mb-4"><span style={{ color: TEXT_PRIMARY, fontFamily: FONT_ALT, fontWeight: 700, fontSize: '0.875rem' }}>Démonstration</span><button onClick={() => setShowVideo(null)} className="w-9 h-9 flex items-center justify-center" style={{ background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: '50%' }}><X size={16} style={{ color: TEXT_PRIMARY }} /></button></div><video src={showVideo} controls autoPlay className="w-full" style={{ borderRadius: RADIUS_CARD }} /></div></div>)}

      {/* HEADER */}
      <div className="sticky top-0 z-40 px-4 pt-10 pb-4 border-b" style={{ background: 'rgba(5,5,5,0.97)', borderColor: BORDER, backdropFilter: 'blur(20px)' }}>
        <div className="flex items-center justify-between mb-3">
          <button onClick={onClose} className="flex items-center gap-1.5 text-xs" style={{ color: TEXT_MUTED, fontFamily: FONT_ALT, fontWeight: 700 }}><ArrowLeft size={14} /> Abandonner</button>
          <div className="flex items-center gap-2 px-3 py-1.5" style={{ background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: RADIUS_CARD }}>
            <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: GREEN }} />
            <span className="text-sm" style={{ color: TEXT_PRIMARY, fontFamily: FONT_DISPLAY }}>{dur(elapsed)}</span>
          </div>
          <button onClick={finish} className="text-[11px] uppercase px-4 py-2 active:scale-95" style={{ background: GOLD, color: '#050505', fontFamily: FONT_ALT, fontWeight: 800, borderRadius: 0, border: 'none', cursor: 'pointer', letterSpacing: '1px' }}>Terminer</button>
        </div>
        <h1 className="text-xl mb-2 truncate" style={{ color: TEXT_PRIMARY, fontFamily: FONT_DISPLAY, letterSpacing: '2px' }}>{sessionName}</h1>
        <div className="flex justify-between items-center mb-1.5">
          <span className="text-[10px]" style={{ color: TEXT_MUTED, fontFamily: FONT_ALT, fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase' }}>Progression</span>
          <span className="text-[11px]" style={{ color: GOLD, fontFamily: FONT_DISPLAY }}>{completed}/{total} sets</span>
        </div>
        <div className="overflow-hidden" style={{ height: 2, background: TEXT_DIM }}>
          <div className="h-full transition-all duration-500" style={{ width: `${pct}%`, background: GOLD }} />
        </div>
      </div>

      {/* EXERCICES */}
      <div className="px-4 py-4 pb-36" style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
        <button onClick={() => setMode('custom')} className="w-full flex items-center gap-3 p-4 active:scale-[0.98]"
          style={{ background: GOLD_DIM, border: `1px dashed ${GOLD_RULE}`, borderRadius: RADIUS_CARD, marginBottom: 24 }}>
          <Plus size={18} style={{ color: GOLD }} />
          <div className="text-left">
            <div className="text-sm" style={{ color: TEXT_PRIMARY, fontFamily: FONT_ALT, fontWeight: 700 }}>Séance personnalisée</div>
            <div className="text-[10px]" style={{ color: TEXT_MUTED, fontFamily: FONT_BODY }}>Choisir dans la base d'exercices</div>
          </div>
        </button>

        {exos.map((exo, idx) => {
          const cnt = exo.sets.filter(s => s.done).length
          const isDone = cnt === exo.sets.length
          const last = exo.sets.filter(s => s.done).at(-1)
          return (
            <div key={exo.id} style={{ borderBottom: `1px solid ${BORDER}`, paddingBottom: 24, marginBottom: 24 }}>
              {/* ── Accordion Header ── */}
              <button onClick={() => setExos(p => p.map(e => e.id === exo.id ? { ...e, open: !e.open } : e))} className="w-full flex items-center gap-3 text-left" style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 0, marginBottom: exo.open ? 16 : 0 }}>
                <div style={{
                  width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  background: isDone ? GOLD : BG_BASE, border: `1px solid ${isDone ? 'transparent' : BORDER}`,
                }}>
                  {isDone ? <Check size={14} color="#050505" strokeWidth={3} /> : <span style={{ fontFamily: FONT_DISPLAY, fontSize: 20, color: TEXT_MUTED }}>{idx + 1}</span>}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 style={{ fontFamily: FONT_ALT, fontWeight: 800, fontSize: 15, color: TEXT_PRIMARY, letterSpacing: '1px', textTransform: 'uppercase', margin: 0, lineHeight: 1.2 }}>{exo.name}</h3>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <span style={{ fontSize: 9, padding: '2px 8px', background: BG_CARD, color: TEXT_MUTED, border: `1px solid ${BORDER}`, fontFamily: FONT_ALT, fontWeight: 700 }}>{exo.targetSets}×{exo.targetReps}</span>
                  <span style={{ fontSize: 9, padding: '2px 8px', background: GOLD_DIM, color: GOLD, fontFamily: FONT_ALT, fontWeight: 700 }}>⏱{fmt(exo.rest)}</span>
                  <span style={{ fontSize: 10, color: cnt > 0 ? GOLD : TEXT_DIM, fontFamily: FONT_DISPLAY }}>{cnt}/{exo.sets.length}</span>
                  {exo.open ? <ChevronUp size={14} style={{ color: TEXT_DIM }} /> : <ChevronDown size={14} style={{ color: TEXT_DIM }} />}
                </div>
              </button>

              {/* ── Expanded Content ── */}
              {exo.open && (
                <div>
                  {/* Exercise name in gold + description + action icons */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 12 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <h3 style={{ fontFamily: FONT_ALT, fontWeight: 800, fontSize: 18, color: GOLD, letterSpacing: '1px', textTransform: 'uppercase', margin: '0 0 4px', lineHeight: 1.2 }}>{exo.name}</h3>
                      {(exo.notes || exo.muscle) && (
                        <p style={{ fontFamily: FONT_BODY, fontWeight: 300, fontSize: 12, color: TEXT_MUTED, margin: 0, fontStyle: 'italic' }}>
                          {exo.notes || exo.muscle}
                        </p>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: 12, flexShrink: 0, paddingTop: 2 }}>
                      {exo.videoUrl && (
                        <button onClick={() => setShowVideo(exo.videoUrl!)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 0 }}>
                          <Play size={20} style={{ color: TEXT_MUTED }} />
                        </button>
                      )}
                      <button style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 0 }}>
                        <MoreHorizontal size={20} style={{ color: TEXT_MUTED }} />
                      </button>
                    </div>
                  </div>

                  {/* Tempo/RIR badges */}
                  {(exo.tempo || exo.rir != null) && (
                    <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
                      {exo.tempo && <span style={{ fontSize: 9, padding: '2px 8px', background: BG_CARD, color: TEXT_MUTED, border: `1px solid ${BORDER}`, fontFamily: FONT_ALT, fontWeight: 700 }}>Tempo {exo.tempo}</span>}
                      {exo.rir != null && <span style={{ fontSize: 9, padding: '2px 8px', background: BG_CARD, color: TEXT_MUTED, border: `1px solid ${BORDER}`, fontFamily: FONT_ALT, fontWeight: 700 }}>RIR {exo.rir}</span>}
                    </div>
                  )}

                  {/* Table header */}
                  <div className="ws-grid" style={{ display: 'grid', gridTemplateColumns: '32px 1fr 70px 70px 36px', gap: 2, padding: '0 0 6px', alignItems: 'center' }}>
                    {['SET', 'PRÉCÉDENT', 'KG', 'REPS', ''].map(h => (
                      <span key={h} style={{ fontSize: 10, textAlign: 'center', color: TEXT_MUTED, fontFamily: FONT_ALT, fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase' as const }}>{h}</span>
                    ))}
                  </div>

                  {/* Set rows */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {exo.sets.map((set: ExSet) => {
                      const ok = !set.done && (set.weight !== '' || set.reps !== '')
                      return (
                        <div key={set.id} className="ws-grid" style={{
                          display: 'grid', gridTemplateColumns: '32px 1fr 70px 70px 36px', gap: 2,
                          alignItems: 'center', padding: '4px 0',
                          background: set.done ? `${GOLD}08` : 'transparent',
                          transition: 'background 0.3s',
                        }}>
                          {/* Set number */}
                          <div style={{ display: 'flex', justifyContent: 'center' }}>
                            <div style={{
                              width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center',
                              border: `1px solid ${set.done ? GOLD_RULE : TEXT_DIM}`,
                              background: set.done ? GOLD_DIM : 'transparent',
                            }}>
                              {set.done
                                ? <Check size={12} strokeWidth={3} style={{ color: GREEN }} />
                                : <span style={{ fontFamily: FONT_DISPLAY, fontSize: 18, color: TEXT_MUTED }}>{set.num}</span>
                              }
                            </div>
                          </div>

                          {/* Previous */}
                          <span style={{ textAlign: 'center', fontSize: 13, color: TEXT_MUTED, fontFamily: FONT_BODY, fontWeight: 400 }}>
                            {previousData[exo.name]?.[set.num - 1]
                              ? `${previousData[exo.name][set.num - 1].weight}×${previousData[exo.name][set.num - 1].reps}`
                              : '—'}
                          </span>

                          {/* KG input */}
                          <input
                            type="number" inputMode="decimal" step="0.5"
                            className="ws-input"
                            value={set.weight}
                            onChange={e => setField(exo.id, set.id, 'weight', e.target.value)}
                            disabled={set.done}
                            placeholder={last?.weight ? String(last.weight) : '0'}
                            style={{
                              width: 70, height: 44, textAlign: 'center',
                              background: set.done ? GOLD_DIM : BG_BASE,
                              border: `1px solid ${set.done ? GOLD_RULE : TEXT_DIM}`,
                              borderRadius: 0, fontSize: 16, fontFamily: FONT_BODY, fontWeight: 500,
                              color: set.done ? GOLD : TEXT_PRIMARY, caretColor: GOLD, outline: 'none',
                              transition: 'border-color 0.2s',
                            }}
                          />

                          {/* Reps input */}
                          <input
                            type="number" inputMode="numeric"
                            className="ws-input"
                            value={set.reps}
                            onChange={e => setField(exo.id, set.id, 'reps', e.target.value)}
                            disabled={set.done}
                            placeholder={String(exo.targetReps || '0').split('-')[0] || '0'}
                            style={{
                              width: 70, height: 44, textAlign: 'center',
                              background: set.done ? GOLD_DIM : BG_BASE,
                              border: `1px solid ${set.done ? GOLD_RULE : TEXT_DIM}`,
                              borderRadius: 0, fontSize: 16, fontFamily: FONT_BODY, fontWeight: 500,
                              color: set.done ? GOLD : TEXT_PRIMARY, caretColor: GOLD, outline: 'none',
                              transition: 'border-color 0.2s',
                            }}
                          />

                          {/* Check button */}
                          <div style={{ display: 'flex', justifyContent: 'center' }}>
                            {set.done ? (
                              <button onClick={() => unvalidate(exo.id, set.id)} style={{
                                width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                background: GOLD_DIM, border: `1px solid ${GOLD_RULE}`, borderRadius: 0, cursor: 'pointer',
                              }}><RotateCcw size={14} style={{ color: GOLD }} /></button>
                            ) : (
                              <button onClick={() => ok ? validate(exo.id, set.id) : undefined} style={{
                                width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                background: ok ? GOLD : 'transparent', border: `1px solid ${ok ? 'transparent' : TEXT_DIM}`,
                                borderRadius: 0, cursor: ok ? 'pointer' : 'default',
                                transition: 'all 0.2s', transform: 'scale(1)',
                              }}
                              onMouseDown={e => { if (ok) (e.currentTarget.style.transform = 'scale(1.05)') }}
                              onMouseUp={e => { e.currentTarget.style.transform = 'scale(1)' }}
                              ><Check size={16} strokeWidth={3} style={{ color: ok ? '#050505' : TEXT_DIM }} /></button>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  {/* Add set button */}
                  <button onClick={() => addSet(exo.id)} style={{
                    width: '100%', marginTop: 10, padding: '12px 0', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                    background: 'transparent', border: `1px solid ${TEXT_DIM}`, borderRadius: 0, cursor: 'pointer',
                    fontFamily: FONT_ALT, fontWeight: 700, fontSize: 13, color: TEXT_MUTED, letterSpacing: '1px', textTransform: 'uppercase' as const,
                    transition: 'background 0.15s, border-color 0.15s', minHeight: 44,
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = BG_CARD_2; e.currentTarget.style.borderColor = GOLD_RULE }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = TEXT_DIM }}
                  >
                    <Plus size={13} /> + Ajouter un set
                  </button>
                </div>
              )}
            </div>
          )
        })}

        {allDone && (
          <div className="p-6 text-center" style={{ background: GOLD_DIM, border: `1px solid ${GOLD_RULE}`, borderRadius: RADIUS_CARD }}>
            <Trophy size={32} className="mx-auto mb-2" style={{ color: GOLD }} />
            <p className="text-base mb-1" style={{ color: TEXT_PRIMARY, fontFamily: FONT_DISPLAY, letterSpacing: '2px' }}>Séance complète ! 🔥</p>
            <p className="text-sm mb-4" style={{ color: TEXT_MUTED, fontFamily: FONT_BODY }}>{dur(elapsed)} · {Math.round(volume)} kg</p>
            <button onClick={finish} className="w-full py-4 active:scale-[0.98]" style={{ background: GOLD, color: '#050505', fontFamily: FONT_ALT, fontWeight: 800, borderRadius: 0, border: 'none', cursor: 'pointer', letterSpacing: '2px', textTransform: 'uppercase', fontSize: '0.875rem' }}>🏆 Terminer</button>
          </div>
        )}
      </div>

      {/* BARRE BAS */}
      <div className="fixed bottom-0 left-0 right-0 px-5 py-4 z-30 border-t" style={{ background: 'rgba(5,5,5,0.97)', backdropFilter: 'blur(20px)', borderColor: BORDER }}>
        <div className="flex justify-between items-center">
          <div className="flex gap-5">
            {[['Volume', `${Math.round(volume)}kg`], ['Sets', `${completed}/${total}`], ['Durée', dur(elapsed)]].map(([l, v]) => (
              <div key={l}>
                <div className="text-[9px]" style={{ color: TEXT_MUTED, fontFamily: FONT_ALT, fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase' }}>{l}</div>
                <div className="text-lg" style={{ color: l === 'Sets' ? GOLD : TEXT_PRIMARY, fontFamily: FONT_DISPLAY }}>{v}</div>
              </div>
            ))}
          </div>
          {!allDone && <button onClick={finish} className="text-[10px] uppercase px-4 py-2.5" style={{ background: 'transparent', border: `1px solid ${GOLD_RULE}`, color: TEXT_MUTED, borderRadius: 0, fontFamily: FONT_ALT, fontWeight: 700, letterSpacing: '1px', cursor: 'pointer' }}>Terminer quand même</button>}
        </div>
      </div>
    </div>
  )
}
