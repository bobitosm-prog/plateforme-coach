'use client'
import { useState, useEffect, useRef } from 'react'
import { Check, ChevronDown, ChevronUp, Trophy, RotateCcw, Plus, ArrowLeft, Search, X, Play, Dumbbell } from 'lucide-react'
import { createBrowserClient } from '@supabase/ssr'
import {
  BG_BASE, BG_CARD, BG_CARD_2, BORDER, GOLD, GOLD_DIM, GOLD_RULE,
  GREEN, RED, TEXT_PRIMARY, TEXT_MUTED, TEXT_DIM, RADIUS_CARD,
  FONT_DISPLAY, FONT_ALT, FONT_BODY
} from '../../lib/design-tokens'
import { initAudio, playBeep, playWarningTick, vibrateDevice, getRandomMessage } from '../../lib/timer-audio'
import ExercisePreview from './ExercisePreview'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

interface ExSet { id: string; num: number; weight: number | ''; reps: number | ''; done: boolean }
interface Exo { id: string; name: string; muscle: string; targetSets: number; targetReps: string; rest: number; tempo?: string; rir?: number | null; notes?: string; videoUrl?: string; imageUrl?: string; sets: ExSet[]; open: boolean }
interface WorkoutSessionProps { sessionName: string; exercises: any[]; startedAt?: string; onFinish: (data: any) => void; onClose: () => void }

const uid = () => Math.random().toString(36).slice(2)
const makeSets = (n: number): ExSet[] => Array.from({ length: n }, (_, i) => ({ id: uid(), num: i + 1, weight: '', reps: '', done: false }))
const fmt = (s: number | string) => { const n = typeof s === 'string' ? parseInt(s) || 0 : s; return n >= 60 ? `${Math.floor(n / 60)}:${(n % 60).toString().padStart(2, '0')}` : `${n}s` }
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
          style={{ background: GOLD, color: '#0D0B08', fontFamily: FONT_ALT, fontWeight: 800, borderRadius: 12, border: 'none', cursor: 'pointer', letterSpacing: '2px', textTransform: 'uppercase', fontSize: '0.875rem' }}>Passer →</button>
        <p className="text-[10px] relative z-10" style={{ color: TEXT_DIM, fontFamily: FONT_BODY }}>Recommandé : {fmt(max)}</p>
      </div>
    </div>
  )
}

const WORKOUT_MUSCLE_FILTERS = ['Tous', 'Pectoraux', 'Dos', 'Épaules', 'Biceps', 'Triceps', 'Quadriceps', 'Ischio-jambiers', 'Fessiers', 'Mollets', 'Abdos', 'Cardio']

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

  useEffect(() => {
    clearTimeout(ref.current)
    ref.current = setTimeout(async () => {
      let q = supabase.from('exercises_db').select('id, name, muscle_group, equipment, difficulty, description')
      if (search.length >= 2) q = q.ilike('name', `%${search}%`)
      if (filter && filter !== 'Tous') q = q.eq('muscle_group', filter)
      const { data } = await q.limit(60).order('name')
      // Deduplicate by name
      const unique = (data || []).filter((ex: any, i: number, arr: any[]) => arr.findIndex((e: any) => e.name.toLowerCase() === ex.name.toLowerCase()) === i)
      setDbExos(unique)
    }, 250)
  }, [search, filter])

  useEffect(() => {
    supabase.from('exercises_db').select('id, name, muscle_group, equipment, difficulty, description').order('name').limit(60)
      .then(({ data }: any) => {
        const unique = (data || []).filter((ex: any, i: number, arr: any[]) => arr.findIndex((e: any) => e.name.toLowerCase() === ex.name.toLowerCase()) === i)
        setDbExos(unique)
      })
  }, [])

  const toggle = (e: any) => setSelected(p => p.find(x => x.id === e.id) ? p.filter(x => x.id !== e.id) : [...p, e])
  const goConfig = () => { setCfg(selected.map(e => ({ ...e, targetSets: 3, targetReps: '10-12', rest: 90 }))); setStep('config') }
  const launch = () => onStart(name, cfg.map(e => ({ exercise_name: e.name, muscle_group: e.muscle_group, sets: e.targetSets, reps: e.targetReps, rest_seconds: e.rest, notes: e.description, video_url: e.video_url })))
  const dc = (d: string) => d === 'debutant' ? GREEN : d === 'intermediaire' ? GOLD : RED

  if (step === 'config') return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, background: BG_BASE, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
      <div style={{ flexShrink: 0, padding: '16px', paddingTop: 'max(16px, env(safe-area-inset-top, 16px))', borderBottom: `1px solid ${BORDER}`, background: BG_BASE, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button onClick={() => setStep('build')} style={{ background: 'none', border: 'none', color: TEXT_MUTED, cursor: 'pointer', fontFamily: FONT_BODY, fontSize: 14, display: 'flex', alignItems: 'center', gap: 4 }}>
          <ArrowLeft size={14} /> Retour
        </button>
        <span style={{ fontFamily: FONT_DISPLAY, fontSize: 18, letterSpacing: 2, color: TEXT_PRIMARY }}>CONFIGURER</span>
        <button onClick={launch} style={{ background: GOLD, color: '#0D0B08', border: 'none', borderRadius: 12, padding: '8px 16px', fontFamily: FONT_ALT, fontWeight: 800, fontSize: 11, letterSpacing: 1, cursor: 'pointer' }}>LANCER</button>
      </div>
      <div style={{ flex: 1, padding: '16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {cfg.map((e, i) => (
          <div key={e.id} style={{ background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: 14, padding: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
              <div style={{ width: 32, height: 32, borderRadius: 10, background: GOLD, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ color: '#0D0B08', fontFamily: FONT_DISPLAY, fontSize: 14 }}>{i + 1}</span>
              </div>
              <div>
                <div style={{ fontFamily: FONT_ALT, fontSize: 14, fontWeight: 700, color: TEXT_PRIMARY }}>{e.name}</div>
                {e.muscle_group && <div style={{ fontFamily: FONT_BODY, fontSize: 10, color: TEXT_MUTED }}>{e.muscle_group}</div>}
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
              {[['SETS', 'targetSets', 'number'], ['REPS', 'targetReps', 'text'], ['REPOS s', 'rest', 'number']].map(([label, key, type]) => (
                <div key={key} style={{ background: BG_BASE, border: `1px solid ${BORDER}`, borderRadius: 12, padding: 12 }}>
                  <div style={{ fontFamily: FONT_ALT, fontSize: 9, fontWeight: 700, letterSpacing: 2, color: TEXT_MUTED, textTransform: 'uppercase' as const, marginBottom: 6 }}>{label}</div>
                  <input type={type} value={(e as any)[key]}
                    onChange={ev => setCfg(p => p.map((x, j) => j !== i ? x : { ...x, [key]: type === 'number' ? parseInt(ev.target.value) || 0 : ev.target.value }))}
                    style={{ width: '100%', background: 'transparent', border: 'none', outline: 'none', color: GOLD, fontFamily: FONT_DISPLAY, fontSize: 18 }} />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, background: BG_BASE, display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div style={{ flexShrink: 0, background: BG_BASE, padding: '16px 16px 10px', paddingTop: 'max(16px, env(safe-area-inset-top, 16px))', borderBottom: `1px solid ${BORDER}` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <button onClick={onCancel} style={{ background: 'none', border: 'none', color: TEXT_MUTED, cursor: 'pointer', fontFamily: FONT_BODY, fontSize: 14, display: 'flex', alignItems: 'center', gap: 4 }}>
            <ArrowLeft size={14} /> Retour
          </button>
          <span style={{ fontFamily: FONT_DISPLAY, fontSize: 18, letterSpacing: 2, color: TEXT_PRIMARY }}>AJOUTER</span>
          {selected.length > 0 ? (
            <button onClick={goConfig} style={{ background: GOLD, color: '#0D0B08', border: 'none', borderRadius: 12, padding: '8px 16px', fontFamily: FONT_ALT, fontWeight: 800, fontSize: 11, letterSpacing: 1, cursor: 'pointer' }}>SUITE ({selected.length})</button>
          ) : <div style={{ width: 60 }} />}
        </div>

        {/* Selected tags */}
        {selected.length > 0 && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
            {selected.map(e => (
              <span key={e.id} onClick={() => toggle(e)} style={{ padding: '4px 10px', borderRadius: 10, background: GOLD_DIM, border: `1px solid ${GOLD_RULE}`, color: GOLD, fontFamily: FONT_ALT, fontSize: 11, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                {e.name} <X size={9} />
              </span>
            ))}
          </div>
        )}

        {/* Search */}
        <div style={{ position: 'relative', marginBottom: 10 }}>
          <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: TEXT_MUTED, pointerEvents: 'none' }} />
          <input autoFocus autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck={false} inputMode="search" enterKeyHint="search"
            value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher un exercice..."
            style={{ width: '100%', padding: '14px 44px 14px 36px', background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: 12, color: TEXT_PRIMARY, fontSize: 16, fontFamily: FONT_BODY, outline: 'none' }} />
          {search && (
            <button onClick={() => setSearch('')} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', width: 28, height: 28, borderRadius: '50%', background: GOLD_DIM, border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              <X size={12} color={GOLD} />
            </button>
          )}
        </div>

        {/* Muscle filters */}
        <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 4, WebkitOverflowScrolling: 'touch' as any }}>
          {WORKOUT_MUSCLE_FILTERS.map(f => (
            <button key={f} onClick={() => setFilter(f === 'Tous' ? '' : f)} style={{
              flexShrink: 0, padding: '6px 14px', borderRadius: 10,
              border: `1px solid ${(!filter && f === 'Tous') || filter === f ? GOLD : BORDER}`,
              background: (!filter && f === 'Tous') || filter === f ? GOLD_DIM : BG_CARD,
              color: (!filter && f === 'Tous') || filter === f ? GOLD : TEXT_MUTED,
              fontFamily: FONT_ALT, fontSize: 11, fontWeight: 700, letterSpacing: 1, cursor: 'pointer',
            }}>{f}</button>
          ))}
        </div>
      </div>

      {/* Exercise list */}
      <div style={{ flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch' as any, padding: '8px 16px 120px' }}>
        {dbExos.map((e: any) => {
          const sel = !!selected.find(x => x.id === e.id)
          return (
            <button key={e.id} onClick={() => toggle(e)} style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: 14,
              padding: '14px 0', borderBottom: `1px solid ${BORDER}`,
              background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left',
              opacity: sel ? 0.5 : 1,
            }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, flexShrink: 0, background: sel ? GOLD : GOLD_DIM, border: `1px solid ${sel ? 'transparent' : BORDER}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {sel ? <Check size={16} color="#0D0B08" strokeWidth={3} /> : <Dumbbell size={15} color={TEXT_DIM} />}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: FONT_ALT, fontSize: 14, fontWeight: 700, color: TEXT_PRIMARY }}>{e.name}</div>
                <div style={{ display: 'flex', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
                  {e.muscle_group && <span style={{ fontFamily: FONT_ALT, fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 6, background: GOLD_DIM, color: GOLD, letterSpacing: 1, textTransform: 'uppercase' as const }}>{e.muscle_group}</span>}
                  {e.difficulty && <span style={{ fontFamily: FONT_ALT, fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 6, background: `${dc(e.difficulty)}18`, color: dc(e.difficulty), letterSpacing: 1 }}>{e.difficulty === 'debutant' ? 'Débutant' : e.difficulty === 'intermediaire' ? 'Intermédiaire' : 'Avancé'}</span>}
                  {e.equipment && <span style={{ fontFamily: FONT_BODY, fontSize: 10, color: TEXT_DIM }}>{e.equipment}</span>}
                </div>
              </div>
            </button>
          )
        })}
        {dbExos.length === 0 && <div style={{ textAlign: 'center', padding: 40, color: TEXT_MUTED, fontSize: 14 }}>Aucun exercice trouvé</div>}
      </div>

      {/* Bottom button */}
      {selected.length > 0 && (
        <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, padding: '12px 16px', paddingBottom: 'max(12px, env(safe-area-inset-bottom, 12px))', background: 'rgba(13,11,8,0.9)', backdropFilter: 'blur(16px)', borderTop: `1px solid ${BORDER}` }}>
          <button onClick={goConfig} style={{ width: '100%', padding: 16, borderRadius: 14, background: GOLD, border: 'none', color: '#0D0B08', fontFamily: FONT_DISPLAY, fontSize: 18, letterSpacing: 2, cursor: 'pointer' }}>
            AJOUTER {selected.length} EXERCICE{selected.length > 1 ? 'S' : ''}
          </button>
        </div>
      )}
    </div>
  )
}

export default function WorkoutSession({ sessionName, exercises: raw, startedAt, onFinish, onClose }: WorkoutSessionProps) {
  const supabase = createBrowserClient(SUPABASE_URL, SUPABASE_KEY)
  const [mode, setMode] = useState<'session' | 'custom'>('session')
  const [exos, setExos] = useState<Exo[]>(() => raw.map(e => ({ id: uid(), name: e.exercise_name || e.name || 'Exercice', muscle: e.muscle_group || '', targetSets: e.sets || 3, targetReps: String(e.reps || '10-12'), rest: e.rest_seconds || e.rest || 90, tempo: e.tempo, rir: e.rir ?? null, notes: e.notes || e.description || e.tips || '', videoUrl: e.video_url, imageUrl: e.image_url || e.gif_url, sets: makeSets(e.sets || 3), open: true })))
  const [restOn, setRestOn] = useState(false)
  const [restSecs, setRestSecs] = useState(0)
  const [restMax, setRestMax] = useState(90)
  const restT = useRef<NodeJS.Timeout | null>(null)
  const [t0] = useState(() => startedAt ? new Date(startedAt).getTime() : Date.now())
  const [elapsed, setElapsed] = useState(() => startedAt ? Date.now() - new Date(startedAt).getTime() : 0)
  const elT = useRef<NodeJS.Timeout | null>(null)
  const [done, setDone] = useState(false)
  const [showVideo, setShowVideo] = useState<string | null>(null)
  const [sessionModified, setSessionModified] = useState(false)
  const [showSavePopup, setShowSavePopup] = useState(false)
  const [exerciseMenu, setExerciseMenu] = useState<number | null>(null)
  const [variantPopup, setVariantPopup] = useState<{exIdx: number, variants: any[], originalName: string} | null>(null)
  const [exerciseInfo, setExerciseInfo] = useState<any>(null)
  const [previousData, setPreviousData] = useState<Record<string, { weight: number; reps: number }[]>>({})
  const [showTimerAlert, setShowTimerAlert] = useState(false)
  const [motivationalMsg, setMotivationalMsg] = useState('')

  // Fetch previous performance for all exercises
  useEffect(() => {
    const names = raw.map(e => e.exercise_name || e.name).filter(Boolean)
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
    let videoEl: HTMLVideoElement | null = null
    const tryWL = async () => {
      try {
        if ('wakeLock' in navigator) {
          wl = await (navigator as any).wakeLock.request('screen')
          console.log('[WakeLock] Screen lock acquired')
        }
      } catch (err) { console.warn('[WakeLock] Not supported:', err) }
    }
    tryWL().then(() => {
      // Fallback iOS: invisible looping video prevents sleep
      if (!wl) {
        try {
          videoEl = document.createElement('video')
          videoEl.setAttribute('playsinline', '')
          videoEl.setAttribute('muted', '')
          videoEl.muted = true
          videoEl.setAttribute('loop', '')
          videoEl.style.cssText = 'position:fixed;top:-1px;left:-1px;width:1px;height:1px;opacity:0.01'
          videoEl.src = 'data:video/mp4;base64,AAAAIGZ0eXBpc29tAAACAGlzb21pc28yYXZjMW1wNDEAAAAIZnJlZQAAAAhmcmVlAAAAGm1kYXQAAABhBgX//13QRNi9VAV2iu1ciRckAAACMm1vb3YAAABsbXZoZAAAAADcFAAN3BQADQAAu4AAAEAAAAEAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAAAAAQAAAAAAAAAAAAAAAAAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACAAABWG10cmFrAAAAXHRraGQAAAAD3BQADdwUAA0AAAABAAAAAAAAu4AAAAAAAAAAAAAAAAAAAAAAAAEAAAAAAAAAAAAAAAAAAAAAQAAAAAAAAAAAAAAAAAAQAAAAAAAAAAAAAAAAAAA'
          document.body.appendChild(videoEl)
          videoEl.play().catch(() => {})
          console.log('[WakeLock] Fallback video activated')
        } catch {}
      }
    })
    const onVis = () => { if (document.visibilityState === 'visible') tryWL() }
    document.addEventListener('visibilitychange', onVis)
    return () => {
      document.removeEventListener('visibilitychange', onVis)
      if (wl) { wl.release().catch(() => {}); console.log('[WakeLock] Released') }
      if (videoEl) { videoEl.pause(); videoEl.remove(); console.log('[WakeLock] Fallback video removed') }
    }
  }, [])

  const startRest = (s: number) => { if (restT.current) clearTimeout(restT.current); setRestMax(s); setRestSecs(s); setRestOn(true) }
  const skipRest = () => { setRestOn(false); setRestSecs(0) }
  const setField = (eid: string, sid: string, f: 'weight' | 'reps', v: string) =>
    setExos(p => p.map(e => e.id !== eid ? e : { ...e, sets: e.sets.map(s => s.id !== sid ? s : { ...s, [f]: v === '' ? '' : Number(v) }) }))
  const validate = (eid: string, sid: string) => {
    initAudio() // Unlock audio on iOS at user interaction
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

  function moveExercise(index: number, dir: number) {
    const ni = index + dir
    if (ni < 0 || ni >= exos.length) return
    setExos(prev => { const a = [...prev]; const t = a[index]; a[index] = a[ni]; a[ni] = t; return a })
    setSessionModified(true)
  }
  function removeExerciseDuringSession(exIdx: number) {
    setExos(prev => prev.filter((_, i) => i !== exIdx))
    setSessionModified(true)
    setExerciseMenu(null)
  }
  async function loadVariantsForSession(exo: Exo, exIdx: number) {
    setExerciseMenu(null)
    const { data: current } = await supabase.from('exercises_db').select('variant_group').ilike('name', exo.name).limit(1).maybeSingle()
    let variants: any[] = []
    if (current?.variant_group) {
      const { data } = await supabase.from('exercises_db').select('name, equipment, muscle_group').eq('variant_group', current.variant_group).neq('name', exo.name).order('equipment').limit(10)
      variants = data || []
    } else {
      const baseName = exo.name.split(' ').slice(0, 2).join(' ')
      const { data } = await supabase.from('exercises_db').select('name, equipment, muscle_group').ilike('name', `%${baseName}%`).neq('name', exo.name).limit(8)
      variants = data || []
    }
    setVariantPopup({ exIdx, variants, originalName: exo.name })
  }
  async function openExerciseInfo(exo: Exo) {
    const { data } = await supabase.from('exercises_db')
      .select('name, muscle_group, equipment, difficulty, description, execution_tips, instructions, tips, gif_url, video_url')
      .ilike('name', exo.name).limit(1).maybeSingle()
    setExerciseInfo(data || { name: exo.name })
  }
  function selectSessionVariant(v: any) {
    if (!variantPopup) return
    setExos(prev => prev.map((e, i) => i === variantPopup.exIdx ? { ...e, name: v.name, muscle: v.muscle_group || e.muscle } : e))
    setSessionModified(true)
    setVariantPopup(null)
  }

  if (mode === 'custom') return <CustomBuilder onStart={(n, exercises) => { setExos(prev => [...prev, ...exercises.map(e => ({ id: uid(), name: e.exercise_name || e.name || 'Exercice', muscle: e.muscle_group || '', targetSets: e.sets || 3, targetReps: String(e.reps || '10-12'), rest: e.rest_seconds || e.rest || 90, tempo: undefined, rir: null, notes: e.notes || '', videoUrl: e.video_url, sets: makeSets(e.sets || 3), open: true }))]); setSessionModified(true); setMode('session') }} onCancel={() => setMode('session')} />

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
        <button onClick={onClose} className="w-full py-4 active:scale-[0.98]" style={{ background: GOLD, color: '#0D0B08', fontFamily: FONT_ALT, fontWeight: 800, borderRadius: 12, border: 'none', cursor: 'pointer', letterSpacing: '2px', textTransform: 'uppercase', fontSize: '0.875rem' }}>Dashboard</button>
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
          .ws-grid { grid-template-columns: 30px 60px 1fr 1fr 36px !important; }
        }
        @keyframes wsPopIn {
          0% { opacity: 0; transform: scale(0.8); }
          100% { opacity: 1; transform: scale(1); }
        }
      `}</style>
      {restOn && <RestOverlay secs={restSecs} max={restMax} onSkip={skipRest} />}

      {/* Timer complete popup */}
      {showTimerAlert && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 9999, padding: 24,
        }}>
          <div style={{
            background: BG_CARD, border: `2px solid ${GOLD}`,
            padding: '40px 32px', textAlign: 'center', maxWidth: 340, width: '100%',
            animation: 'wsPopIn 0.3s ease-out',
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
      {showVideo && (<div className="fixed inset-0 z-[70] flex items-center justify-center p-5" style={{ background: 'rgba(0,0,0,0.95)' }}><div className="w-full max-w-sm"><div className="flex justify-between items-center mb-4"><span style={{ color: TEXT_PRIMARY, fontFamily: FONT_ALT, fontWeight: 700, fontSize: '0.875rem' }}>Démonstration</span><button onClick={() => setShowVideo(null)} className="w-9 h-9 flex items-center justify-center" style={{ background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: '50%' }}><X size={16} style={{ color: TEXT_PRIMARY }} /></button></div><video src={showVideo} controls autoPlay className="w-full" style={{ borderRadius: RADIUS_CARD }} /></div></div>)}

      {/* HEADER */}
      <div className="sticky top-0 z-40 border-b" style={{ background: '#0D0B08', borderColor: BORDER, backdropFilter: 'blur(20px)', padding: '40px 16px 12px', position: 'relative' }}>
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'url(/images/stitch-barbell.jpg)', backgroundSize: 'cover', backgroundPosition: 'center', opacity: 0.08, pointerEvents: 'none' }} />
        <div className="flex items-center justify-between mb-2" style={{ position: 'relative', zIndex: 1 }}>
          <h1 className="text-xl truncate" style={{ color: TEXT_PRIMARY, fontFamily: FONT_DISPLAY, letterSpacing: '2px', margin: 0 }}>{sessionName}</h1>
          <div className="flex items-center gap-2 px-3 py-1.5" style={{ background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: RADIUS_CARD }}>
            <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: GREEN }} />
            <span className="text-sm" style={{ color: TEXT_PRIMARY, fontFamily: FONT_DISPLAY }}>{dur(elapsed)}</span>
          </div>
        </div>
        <div className="flex justify-between items-center mb-1.5" style={{ position: 'relative', zIndex: 1 }}>
          <span className="text-[10px]" style={{ color: TEXT_MUTED, fontFamily: FONT_ALT, fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase' }}>Progression</span>
          <span className="text-[11px]" style={{ color: GOLD, fontFamily: FONT_DISPLAY }}>{completed}/{total} sets</span>
        </div>
        <div className="overflow-hidden" style={{ height: 2, background: TEXT_DIM, position: 'relative', zIndex: 1 }}>
          <div className="h-full transition-all duration-500" style={{ width: `${pct}%`, background: GOLD }} />
        </div>
      </div>

      {/* EXERCICES */}
      <div className="py-4" style={{ display: 'flex', flexDirection: 'column', gap: 0, padding: '16px 12px 200px' }}>
        {/* Add exercise button */}
        <div style={{ margin: '0 4px 16px', width: 'calc(100% - 8px)' }}>
          <button onClick={() => setMode('custom')} style={{
            width: '100%', padding: 10, borderRadius: 12,
            background: BG_CARD, border: `1px solid ${BORDER}`,
            color: GOLD,
            fontFamily: FONT_ALT, fontSize: 11, fontWeight: 700,
            letterSpacing: 2, cursor: 'pointer',
          }}>+ AJOUTER UN EXERCICE</button>
        </div>

        {exos.map((exo, idx) => {
          const cnt = exo.sets.filter(s => s.done).length
          const isDone = cnt === exo.sets.length
          const last = exo.sets.filter(s => s.done).at(-1)
          return (
            <div key={exo.id} className="border-l-2" style={{ borderLeftColor: '#60A5FA', borderBottom: `1px solid ${BORDER}`, paddingBottom: 24, marginBottom: 24, paddingLeft: 12 }}>
              {/* ── Accordion Header ── */}
              <button onClick={() => setExos(p => p.map(e => e.id === exo.id ? { ...e, open: !e.open } : e))} className="w-full flex items-center gap-3 text-left" style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 0, marginBottom: exo.open ? 16 : 0 }}>
                <div style={{ position: 'relative', flexShrink: 0, borderRadius: 8, overflow: 'hidden', width: 80, height: 80 }}>
                  <ExercisePreview name={exo.name} size={80} animate={false} />
                  {isDone && <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(201,168,76,0.4)', borderRadius: 8 }}><Check size={22} color="#0D0B08" strokeWidth={3} /></div>}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 style={{ fontFamily: FONT_DISPLAY, fontWeight: 400, fontSize: 20, color: '#60A5FA', letterSpacing: '1px', textTransform: 'uppercase', margin: 0, lineHeight: 1.1 }}>{exo.name}</h3>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <span style={{ fontSize: 9, padding: '2px 8px', background: BG_CARD, color: TEXT_MUTED, border: `1px solid ${BORDER}`, fontFamily: FONT_ALT, fontWeight: 700 }}>{exo.targetSets}×{exo.targetReps}</span>
                  <span style={{ fontSize: 9, padding: '2px 8px', background: GOLD_DIM, color: GOLD, fontFamily: FONT_ALT, fontWeight: 700 }}>⏱{fmt(exo.rest)}</span>
                  <span style={{ fontSize: 10, color: cnt > 0 ? GOLD : TEXT_DIM, fontFamily: FONT_DISPLAY }}>{cnt}/{exo.sets.length}</span>
                  {exo.open ? <ChevronUp size={14} style={{ color: TEXT_DIM }} /> : <ChevronDown size={14} style={{ color: TEXT_DIM }} />}
                </div>
              </button>

              {/* ℹ️ + ⋯ menu buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 4, gap: 4 }}>
                <button onClick={() => openExerciseInfo(exo)} style={{ background: 'none', border: 'none', color: TEXT_DIM, cursor: 'pointer', padding: '4px 8px', minWidth: 36, minHeight: 32, fontSize: 16 }}>ℹ️</button>
                <button onClick={() => setExerciseMenu(exerciseMenu === idx ? null : idx)} style={{ background: 'none', border: 'none', color: TEXT_MUTED, fontSize: 20, cursor: 'pointer', padding: '4px 8px', minWidth: 44, minHeight: 32 }}>⋯</button>
              </div>
              {exerciseMenu === idx && (
                <div style={{ display: 'flex', gap: 6, padding: '0 0 12px', flexWrap: 'wrap' }}>
                  <button disabled={idx === 0} onClick={() => { moveExercise(idx, -1); setExerciseMenu(null) }} style={{ flex: 1, padding: 10, borderRadius: 12, minWidth: 70, background: idx === 0 ? BG_BASE : GOLD_DIM, border: `1px solid ${idx === 0 ? BORDER : GOLD_RULE}`, color: idx === 0 ? TEXT_DIM : GOLD, fontFamily: FONT_ALT, fontSize: 11, fontWeight: 700, letterSpacing: 1.5, cursor: idx === 0 ? 'default' : 'pointer' }}>↑ MONTER</button>
                  <button disabled={idx === exos.length - 1} onClick={() => { moveExercise(idx, 1); setExerciseMenu(null) }} style={{ flex: 1, padding: 10, borderRadius: 12, minWidth: 70, background: idx === exos.length - 1 ? BG_BASE : GOLD_DIM, border: `1px solid ${idx === exos.length - 1 ? BORDER : GOLD_RULE}`, color: idx === exos.length - 1 ? TEXT_DIM : GOLD, fontFamily: FONT_ALT, fontSize: 11, fontWeight: 700, letterSpacing: 1.5, cursor: idx === exos.length - 1 ? 'default' : 'pointer' }}>↓ DESCENDRE</button>
                  <button onClick={() => { setExerciseMenu(null); loadVariantsForSession(exo, idx) }} style={{ flex: 1, padding: 10, borderRadius: 12, minWidth: 70, background: GOLD_DIM, border: `1px solid ${GOLD_RULE}`, color: GOLD, fontFamily: FONT_ALT, fontSize: 11, fontWeight: 700, letterSpacing: 1.5, cursor: 'pointer' }}>🔄 REMPLACER</button>
                  <button onClick={() => removeExerciseDuringSession(idx)} style={{ flex: 1, padding: 10, borderRadius: 12, minWidth: 70, background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)', color: '#EF4444', fontFamily: FONT_ALT, fontSize: 11, fontWeight: 700, letterSpacing: 1.5, cursor: 'pointer' }}>🗑 SUPPRIMER</button>
                </div>
              )}

              {/* ── Expanded Content ── */}
              {exo.open && (
                <div>
                  {/* Description + action icons */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 12 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      {(exo.notes || exo.muscle) && (
                        <p style={{ fontFamily: FONT_BODY, fontWeight: 300, fontSize: 13, color: TEXT_MUTED, margin: 0, fontStyle: 'italic' }}>
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
                  <div className="ws-grid" style={{ display: 'grid', gridTemplateColumns: '30px 60px 1fr 1fr 36px', gap: 2, padding: '0 0 6px', alignItems: 'center' }}>
                    {['SET', 'PRÉC.', 'KG', 'REPS', ''].map(h => (
                      <span key={h} style={{ fontSize: 9, textAlign: 'center', color: TEXT_MUTED, fontFamily: FONT_ALT, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase' as const }}>{h}</span>
                    ))}
                  </div>

                  {/* Set rows */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {exo.sets.map((set: ExSet) => {
                      const ok = !set.done && (set.weight !== '' || set.reps !== '')
                      return (
                        <div key={set.id} className="ws-grid" style={{
                          display: 'grid', gridTemplateColumns: '30px 60px 1fr 1fr 36px', gap: 2,
                          alignItems: 'center', padding: '4px 0',
                          background: set.done ? `${GOLD}08` : 'transparent',
                          transition: 'background 0.3s',
                        }}>
                          {/* Set number */}
                          <div style={{ display: 'flex', justifyContent: 'center' }}>
                            <div style={{
                              width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center',
                              border: `1px solid ${set.done ? GREEN : TEXT_DIM}`,
                              background: set.done ? GREEN : 'transparent',
                              transition: 'all 0.2s',
                            }}>
                              {set.done
                                ? <Check size={12} strokeWidth={3} style={{ color: '#fff' }} />
                                : <span style={{ fontFamily: FONT_DISPLAY, fontSize: 18, color: TEXT_MUTED }}>{set.num}</span>
                              }
                            </div>
                          </div>

                          {/* Previous */}
                          <span style={{ textAlign: 'center', fontSize: 11, color: TEXT_MUTED, fontFamily: FONT_BODY, fontWeight: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
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
                              width: '100%', height: 44, textAlign: 'center',
                              background: set.done ? GOLD_DIM : BG_BASE,
                              border: `1px solid ${set.done ? GOLD_RULE : TEXT_DIM}`,
                              borderRadius: 12, fontSize: 16, fontFamily: FONT_BODY, fontWeight: 500,
                              color: set.done ? GOLD : TEXT_PRIMARY, caretColor: GOLD, outline: 'none',
                              opacity: set.done ? 0.7 : 1, transition: 'border-color 0.2s, opacity 0.3s',
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
                              width: '100%', height: 44, textAlign: 'center',
                              background: set.done ? GOLD_DIM : BG_BASE,
                              border: `1px solid ${set.done ? GOLD_RULE : TEXT_DIM}`,
                              borderRadius: 12, fontSize: 16, fontFamily: FONT_BODY, fontWeight: 500,
                              color: set.done ? GOLD : TEXT_PRIMARY, caretColor: GOLD, outline: 'none',
                              opacity: set.done ? 0.7 : 1, transition: 'border-color 0.2s, opacity 0.3s',
                            }}
                          />

                          {/* Check button */}
                          <div style={{ display: 'flex', justifyContent: 'center' }}>
                            {set.done ? (
                              <button onClick={() => unvalidate(exo.id, set.id)} style={{
                                width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                background: GOLD_DIM, border: `1px solid ${GOLD_RULE}`, borderRadius: 12, cursor: 'pointer',
                              }}><RotateCcw size={14} style={{ color: GOLD }} /></button>
                            ) : (
                              <button onClick={() => ok ? validate(exo.id, set.id) : undefined} style={{
                                width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                background: ok ? GOLD : 'transparent', border: `1px solid ${ok ? 'transparent' : TEXT_DIM}`,
                                borderRadius: 12, cursor: ok ? 'pointer' : 'default',
                                transition: 'all 0.2s', transform: 'scale(1)',
                              }}
                              onMouseDown={e => { if (ok) (e.currentTarget.style.transform = 'scale(1.05)') }}
                              onMouseUp={e => { e.currentTarget.style.transform = 'scale(1)' }}
                              ><Check size={16} strokeWidth={3} style={{ color: ok ? '#0D0B08' : TEXT_DIM }} /></button>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  {/* Add set button */}
                  <button onClick={() => addSet(exo.id)} style={{
                    width: '100%', marginTop: 10, padding: '12px 0', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                    background: 'transparent', border: `1px solid ${TEXT_DIM}`, borderRadius: 12, cursor: 'pointer',
                    fontFamily: FONT_ALT, fontWeight: 700, fontSize: 13, color: TEXT_MUTED, letterSpacing: '1px', textTransform: 'uppercase' as const,
                    transition: 'background 0.15s, border-color 0.15s', minHeight: 44,
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = BG_CARD_2; e.currentTarget.style.borderColor = GOLD_RULE }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = TEXT_DIM }}
                  >
                    <Plus size={13} /> Ajouter un set
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
            <button onClick={() => sessionModified ? setShowSavePopup(true) : finish()} className="w-full py-4 active:scale-[0.98]" style={{ background: GOLD, color: '#0D0B08', fontFamily: FONT_ALT, fontWeight: 800, borderRadius: 12, border: 'none', cursor: 'pointer', letterSpacing: '2px', textTransform: 'uppercase', fontSize: '0.875rem' }}>🏆 Terminer</button>
          </div>
        )}
      </div>

      {/* BARRE BAS */}
      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 200, background: '#0D0B08', borderTop: `1px solid ${BORDER}`, minHeight: 70, padding: '12px 16px', paddingBottom: 'calc(72px + env(safe-area-inset-bottom))' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto', gap: 12, alignItems: 'center' }}>
          <button onClick={onClose} className="active:scale-95" style={{ background: 'transparent', border: '1px solid rgba(239,68,68,0.4)', borderRadius: 8, padding: '10px 16px', color: '#EF4444', fontSize: 13, fontWeight: 500, fontFamily: FONT_BODY, cursor: 'pointer' }}>Abandonner</button>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
            <span style={{ fontSize: 10, color: GOLD, fontFamily: FONT_ALT, fontWeight: 700, letterSpacing: '3px', textTransform: 'uppercase' as const }}>TEMPS</span>
            <span style={{ fontSize: 24, color: TEXT_PRIMARY, fontFamily: FONT_DISPLAY, letterSpacing: '2px', lineHeight: 1 }}>{dur(elapsed)}</span>
          </div>
          <button onClick={() => sessionModified ? setShowSavePopup(true) : finish()} className="active:scale-95" style={{ background: GOLD, border: 'none', borderRadius: 8, padding: '10px 20px', color: '#0D0B08', fontFamily: FONT_DISPLAY, fontSize: 16, letterSpacing: '1px', cursor: 'pointer' }}>TERMINER</button>
        </div>
      </div>

      {/* Exercise info popup */}
      {exerciseInfo && (
        <div style={{position:'fixed',inset:0,zIndex:300,background:'rgba(0,0,0,0.85)',backdropFilter:'blur(8px)',display:'flex',alignItems:'flex-end',justifyContent:'center'}} onClick={()=>setExerciseInfo(null)}>
          <div onClick={e=>e.stopPropagation()} style={{background:BG_CARD,border:`1px solid ${GOLD_RULE}`,borderRadius:'20px 20px 0 0',width:'100%',maxWidth:500,maxHeight:'85vh',display:'flex',flexDirection:'column',overflow:'hidden'}}>
            <div style={{padding:'16px 20px',borderBottom:`1px solid ${BORDER}`,display:'flex',justifyContent:'space-between',alignItems:'center',flexShrink:0}}>
              <div>
                <div style={{fontFamily:FONT_DISPLAY,fontSize:22,letterSpacing:2,color:TEXT_PRIMARY}}>{exerciseInfo.name}</div>
                <div style={{display:'flex',gap:6,marginTop:4,flexWrap:'wrap'}}>
                  {exerciseInfo.muscle_group&&<span style={{fontFamily:FONT_ALT,fontSize:10,fontWeight:700,padding:'2px 8px',borderRadius:6,background:GOLD_DIM,color:GOLD,letterSpacing:1,textTransform:'uppercase' as const}}>{exerciseInfo.muscle_group}</span>}
                  {exerciseInfo.equipment&&<span style={{fontFamily:FONT_BODY,fontSize:10,padding:'2px 8px',borderRadius:6,background:BG_CARD_2,color:TEXT_MUTED}}>{exerciseInfo.equipment}</span>}
                  {exerciseInfo.difficulty&&<span style={{fontFamily:FONT_ALT,fontSize:10,fontWeight:700,padding:'2px 8px',borderRadius:6,background:exerciseInfo.difficulty==='avance'?'rgba(239,68,68,0.1)':exerciseInfo.difficulty==='intermediaire'?GOLD_DIM:'rgba(74,222,128,0.1)',color:exerciseInfo.difficulty==='avance'?'#EF4444':exerciseInfo.difficulty==='intermediaire'?GOLD:'#4ade80',letterSpacing:1,textTransform:'uppercase' as const}}>{exerciseInfo.difficulty==='debutant'?'Débutant':exerciseInfo.difficulty==='intermediaire'?'Intermédiaire':'Avancé'}</span>}
                </div>
              </div>
              <button onClick={()=>setExerciseInfo(null)} style={{width:36,height:36,borderRadius:12,background:GOLD_DIM,border:`1px solid ${BORDER}`,display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',color:TEXT_MUTED,fontSize:16}}>✕</button>
            </div>
            <div style={{flex:1,overflowY:'auto',padding:'16px 20px 32px',WebkitOverflowScrolling:'touch' as any}}>
              {exerciseInfo.gif_url?(
                <div style={{marginBottom:20,borderRadius:14,overflow:'hidden',border:`1px solid ${BORDER}`}}>
                  <img src={exerciseInfo.gif_url} alt={exerciseInfo.name} style={{width:'100%',height:'auto',display:'block'}}/>
                </div>
              ):(
                <div style={{marginBottom:20,borderRadius:14,border:`1px dashed ${BORDER}`,padding:'40px 20px',textAlign:'center',background:GOLD_DIM}}>
                  <div style={{fontSize:32,marginBottom:8}}>🎬</div>
                  <div style={{fontFamily:FONT_ALT,fontSize:12,fontWeight:700,color:TEXT_DIM,letterSpacing:1}}>ANIMATION À VENIR</div>
                </div>
              )}
              {exerciseInfo.video_url&&(
                <div style={{marginBottom:20,borderRadius:14,overflow:'hidden',border:`1px solid ${BORDER}`}}>
                  <video src={exerciseInfo.video_url} controls playsInline style={{width:'100%',height:'auto',display:'block'}}/>
                </div>
              )}
              {(exerciseInfo.description||exerciseInfo.instructions)&&(
                <div style={{marginBottom:20}}>
                  <div style={{fontFamily:FONT_ALT,fontSize:11,fontWeight:700,color:GOLD,letterSpacing:2,textTransform:'uppercase' as const,marginBottom:8}}>EXÉCUTION</div>
                  <div style={{fontFamily:FONT_BODY,fontSize:14,color:TEXT_PRIMARY,lineHeight:1.6}}>{exerciseInfo.description||exerciseInfo.instructions}</div>
                </div>
              )}
              {(exerciseInfo.execution_tips||exerciseInfo.tips)&&(
                <div style={{marginBottom:20}}>
                  <div style={{fontFamily:FONT_ALT,fontSize:11,fontWeight:700,color:GOLD,letterSpacing:2,textTransform:'uppercase' as const,marginBottom:8}}>CONSEILS</div>
                  <div style={{fontFamily:FONT_BODY,fontSize:13,color:TEXT_MUTED,lineHeight:1.6,padding:'12px 14px',background:GOLD_DIM,border:`1px solid ${GOLD_RULE}`,borderRadius:12}}>{exerciseInfo.execution_tips||exerciseInfo.tips}</div>
                </div>
              )}
              {!exerciseInfo.description&&!exerciseInfo.instructions&&!exerciseInfo.execution_tips&&!exerciseInfo.tips&&!exerciseInfo.gif_url&&!exerciseInfo.video_url&&(
                <div style={{textAlign:'center',padding:'20px 0',color:TEXT_DIM,fontFamily:FONT_BODY,fontSize:14}}>Aucune information disponible.<br/>Descriptions et animations à venir.</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Variant popup */}
      {variantPopup && (
        <div style={{position:'fixed',inset:0,zIndex:300,background:'rgba(0,0,0,0.8)',backdropFilter:'blur(8px)',display:'flex',alignItems:'flex-end'}} onClick={()=>setVariantPopup(null)}>
          <div onClick={e=>e.stopPropagation()} style={{background:BG_CARD,border:`1px solid ${GOLD_RULE}`,borderRadius:'20px 20px 0 0',width:'100%',maxHeight:'60vh',display:'flex',flexDirection:'column'}}>
            <div style={{padding:'16px 20px',borderBottom:`1px solid ${BORDER}`,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <div>
                <div style={{fontFamily:FONT_DISPLAY,fontSize:20,letterSpacing:2,color:TEXT_PRIMARY}}>REMPLACER</div>
                <div style={{fontFamily:FONT_BODY,fontSize:12,color:TEXT_MUTED,marginTop:2}}>{variantPopup.originalName}</div>
              </div>
              <button onClick={()=>setVariantPopup(null)} style={{background:'none',border:'none',color:TEXT_MUTED,fontSize:20,cursor:'pointer'}}>✕</button>
            </div>
            <div style={{overflowY:'auto',padding:'8px 12px 32px'}}>
              {variantPopup.variants.length===0?(
                <div style={{textAlign:'center',padding:32,color:TEXT_MUTED,fontSize:14}}>Aucune variante trouvée</div>
              ):variantPopup.variants.map((v: any,i: number)=>(
                <button key={i} onClick={()=>selectSessionVariant(v)} style={{width:'100%',display:'flex',alignItems:'center',gap:12,padding:'14px 16px',marginBottom:4,borderRadius:14,background:BG_BASE,border:`1px solid ${BORDER}`,cursor:'pointer',textAlign:'left'}}>
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

      {/* Save changes popup */}
      {showSavePopup && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: BG_CARD, border: `1px solid ${GOLD_RULE}`, borderRadius: 20, padding: 24, maxWidth: 380, width: '100%' }}>
            <div style={{ fontFamily: FONT_DISPLAY, fontSize: 24, letterSpacing: 2, color: TEXT_PRIMARY, marginBottom: 8 }}>PROGRAMME MODIFIÉ</div>
            <div style={{ fontFamily: FONT_BODY, fontSize: 14, color: TEXT_MUTED, lineHeight: 1.6, marginBottom: 24 }}>
              Tu as modifié les exercices. Sauvegarder dans ton programme ?
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <button onClick={() => { setShowSavePopup(false); finish() }} style={{
                width: '100%', padding: 14, borderRadius: 14, background: GOLD, border: 'none', color: '#0D0B08',
                fontFamily: FONT_DISPLAY, fontSize: 17, letterSpacing: 2, cursor: 'pointer',
              }}>SAUVEGARDER LE PROGRAMME</button>
              <button onClick={() => { setSessionModified(false); setShowSavePopup(false); finish() }} style={{
                width: '100%', padding: 14, borderRadius: 14, background: 'transparent',
                border: `1.5px solid ${GOLD_RULE}`, color: GOLD,
                fontFamily: FONT_DISPLAY, fontSize: 16, letterSpacing: 2, cursor: 'pointer',
              }}>JUSTE CETTE SÉANCE</button>
              <button onClick={() => setShowSavePopup(false)} style={{
                width: '100%', padding: 12, background: 'transparent', border: 'none',
                color: TEXT_MUTED, fontFamily: FONT_BODY, fontSize: 13, cursor: 'pointer',
              }}>Annuler</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
