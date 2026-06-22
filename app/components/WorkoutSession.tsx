'use client'
import { useState, useEffect, useRef, useMemo, Fragment } from 'react'
import { Check, ChevronDown, ChevronUp, Trophy, RotateCcw, Plus, ArrowLeft, Search, X, Play, Dumbbell, Clock, CheckCircle2 } from 'lucide-react'
import { toast } from 'sonner'
import { useTranslations, useLocale } from 'next-intl'
import { getExerciseName } from '../../lib/i18n-exercise'
import { getMuscleLabel } from '../../lib/i18n-muscle'
import { SESSION_TYPES as SESSION_TYPE_OPTIONS } from '../../lib/session-types'
import { createBrowserClient } from '@supabase/ssr'
import { colors, BG_BASE, BG_CARD, BG_CARD_2, BORDER, GOLD, GOLD_DIM, GOLD_RULE, GREEN, RED, TEXT_PRIMARY, TEXT_MUTED, TEXT_DIM, RADIUS_CARD, FONT_DISPLAY, FONT_ALT, FONT_BODY, cardStyle, titleStyle, cardTitleAbove, titleLineStyle, subtitleStyle, statStyle, statSmallStyle, mutedStyle, badgeStyle, btnPrimary, pageTitleStyle, bodyStyle } from '../../lib/design-tokens'
import { Reorder } from 'framer-motion'
import { initAudio, playBeep, playWarningTick, vibrateDevice, getRandomMessage, scheduleRestPeriodSounds, cancelScheduledSounds, type ScheduledSound } from '../../lib/timer-audio'
import ExercisePreview from './ExercisePreview'
import { getRestSeconds } from '../../lib/utils/exercise'
import { TECHNIQUE_LABELS } from '../../lib/technique-labels'
import { useBeforeUnload } from '../hooks/useBeforeUnload'
import { computeProgression, parseRepsTarget, type PrevSessionSet } from '../../lib/training/compute-progression'
import WorkoutCelebration from './tabs/training/WorkoutCelebration'
import TempoModal from './training/TempoModal'
import TempoExecutor from './training/TempoExecutor'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

interface ExSet { id: string; num: number; weight: number | ''; weightRaw: string; reps: number | ''; done: boolean }
interface Exo { id: string; name: string; muscle: string; targetSets: number; targetReps: string; rest: number; tempo?: string; rir?: number | null; notes?: string; videoUrl?: string; imageUrl?: string; technique?: string; techniqueDetails?: string; sets: ExSet[]; open: boolean }
interface WorkoutSessionProps { sessionName: string; exercises: any[]; startedAt?: string; onFinish: (data: any) => void; onClose: () => void }

function fmtStep(n: number): string { return n.toString().replace('.', ',') }

const uid = () => Math.random().toString(36).slice(2)
const makeSets = (n: number): ExSet[] => Array.from({ length: n }, (_, i) => ({ id: uid(), num: i + 1, weight: '', weightRaw: '', reps: '', done: false }))
const fmt = (s: number | string) => { const n = typeof s === 'string' ? parseInt(s) || 0 : s; return n >= 60 ? `${Math.floor(n / 60)}:${(n % 60).toString().padStart(2, '0')}` : `${n}s` }
const dur = (ms: number) => { const s = Math.floor(ms / 1000), h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60; if (h > 0) return `${h}h ${m}min`; if (m > 0) return `${m}min ${sec}s`; return `${sec}s` }
const isDumbbell = (n: string) => /halt[eè]res?|dumbbell|\bDB\b/i.test(n)

function readDraft(name: string): { exos: Exo[] } | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem('moovx_workout_draft')
    if (!raw) return null
    const draft = JSON.parse(raw)
    if (draft.sessionName !== name) return null
    const ageH = (Date.now() - new Date(draft.savedAt).getTime()) / 3600000
    if (ageH > 24) return null
    if (!Array.isArray(draft.exos)) return null
    return { exos: draft.exos }
  } catch {
    return null
  }
}


const WORKOUT_MUSCLE_FILTERS = ['Tous', 'Pectoraux', 'Dos', 'Épaules', 'Biceps', 'Triceps', 'Quadriceps', 'Ischio-jambiers', 'Fessiers', 'Mollets', 'Abdos', 'Cardio']

function CustomBuilder({ onStart, onCancel }: { onStart: (name: string, exos: any[]) => void; onCancel: () => void }) {
  const t = useTranslations('training_tab.ws')
  const locale = useLocale() as 'fr' | 'en' | 'de'
  const tMuscle = useTranslations('muscles')
  const supabase = createBrowserClient(SUPABASE_URL, SUPABASE_KEY)
  const ALL_KEY = '__all__'
  const muscleFilters = [{ key: ALL_KEY, label: tMuscle('all') }, ...WORKOUT_MUSCLE_FILTERS.slice(1).map(m => ({ key: m, label: getMuscleLabel(m, locale, tMuscle) }))]
  const [name, setName] = useState(t('builder.defaultName'))
  const [search, setSearch] = useState('')
  const [dbExos, setDbExos] = useState<any[]>([])
  const [selected, setSelected] = useState<any[]>([])
  const [filter, setFilter] = useState(ALL_KEY)
  const [step, setStep] = useState<'build' | 'config'>('build')
  const [cfg, setCfg] = useState<any[]>([])
  const ref = useRef<any>(null)

  useEffect(() => {
    clearTimeout(ref.current)
    ref.current = setTimeout(async () => {
      let q = supabase.from('exercises_db').select('id, name, muscle_group, equipment, difficulty, description')
      if (search.length >= 2) q = q.ilike('name', `%${search}%`)
      if (filter && filter !== ALL_KEY) q = q.eq('muscle_group', filter)
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
  const goConfig = () => { setCfg(selected.map(e => ({ ...e, targetSets: 3, targetReps: '10-12', rest: getRestSeconds(e) }))); setStep('config') }
  const launch = () => onStart(name, cfg.map(e => ({ exercise_name: e.name, muscle_group: e.muscle_group, sets: e.targetSets, reps: e.targetReps, rest_seconds: e.rest, notes: e.description, video_url: e.video_url })))
  const dc = (d: string) => d === 'debutant' ? GREEN : d === 'intermediaire' ? GOLD : RED

  if (step === 'config') return (
    <div data-no-tab-swipe="true" style={{ position: 'fixed', inset: 0, zIndex: 50, background: BG_BASE, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
      <div style={{ flexShrink: 0, paddingTop: 'max(16px, env(safe-area-inset-top, 16px))', paddingRight: 16, paddingBottom: 16, paddingLeft: 16, borderBottom: `1px solid ${BORDER}`, background: BG_BASE, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button onClick={() => setStep('build')} style={{ background: 'none', border: 'none', color: TEXT_MUTED, cursor: 'pointer', fontFamily: FONT_BODY, fontSize: 14, display: 'flex', alignItems: 'center', gap: 4 }}>
          <ArrowLeft size={14} /> {t('back')}
        </button>
        <span style={{ fontFamily: FONT_DISPLAY, fontSize: 18, letterSpacing: 2, color: TEXT_PRIMARY }}>{t('builder.configure')}</span>
        <button onClick={launch} style={{ background: GOLD, color: colors.onGold, border: 'none', borderRadius: 12, padding: '8px 16px', fontFamily: FONT_ALT, fontWeight: 800, fontSize: 11, letterSpacing: 1, cursor: 'pointer' }}>{t('builder.launch')}</button>
      </div>
      <div style={{ flex: 1, paddingTop: 16, paddingRight: 16, paddingBottom: 'calc(80px + env(safe-area-inset-bottom, 0px))', paddingLeft: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {cfg.map((e, i) => (
          <div key={e.id} style={{ background: colors.surface2, border: `1px solid ${colors.divider}`, borderRadius: 14, padding: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
              <div style={{ width: 32, height: 32, borderRadius: 10, background: GOLD, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ color: colors.onGold, fontFamily: FONT_DISPLAY, fontSize: 14 }}>{i + 1}</span>
              </div>
              <div>
                <div style={{ fontFamily: FONT_ALT, fontSize: 14, fontWeight: 700, color: TEXT_PRIMARY }}>{getExerciseName(e, locale)}</div>
                {e.muscle_group && <div style={{ fontFamily: FONT_BODY, fontSize: 10, color: TEXT_MUTED }}>{getMuscleLabel(e.muscle_group, locale, tMuscle)}</div>}
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
              {[[t('builder.sets'), 'targetSets', 'number', ''], [t('builder.reps'), 'targetReps', 'text', ''], [t('builder.rest'), 'rest', 'number', 's']].map(([label, key, type, unit]) => (
                <div key={key} style={{ background: colors.surface2, border: `1px solid ${colors.divider}`, borderRadius: 12, padding: 12 }}>
                  <div style={{ fontFamily: FONT_ALT, fontSize: 9, fontWeight: 700, letterSpacing: 2, color: TEXT_MUTED, textTransform: 'uppercase' as const, marginBottom: 6 }}>{label}</div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 2 }}>
                    <input type={type} value={(e as any)[key]}
                      onChange={ev => setCfg(p => p.map((x, j) => j !== i ? x : { ...x, [key]: type === 'number' ? parseInt(ev.target.value) || 0 : ev.target.value }))}
                      style={{ width: '100%', background: 'transparent', border: 'none', outline: 'none', color: GOLD, fontFamily: FONT_DISPLAY, fontSize: 18 }} />
                    {unit && <span style={{ fontSize: 11, color: TEXT_DIM, fontFamily: FONT_BODY }}>{unit}</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, paddingTop: 12, paddingRight: 16, paddingBottom: 'max(12px, env(safe-area-inset-bottom, 12px))', paddingLeft: 16, background: 'rgba(13,11,8,0.95)', backdropFilter: 'blur(16px)', borderTop: `1px solid ${GOLD_RULE}`, zIndex: 51 }}>
        <button onClick={launch} style={{ width: '100%', padding: 16, borderRadius: 14, background: GOLD, border: 'none', color: colors.onGold, fontFamily: FONT_DISPLAY, fontSize: 18, letterSpacing: 2, cursor: 'pointer' }}>
          {t('builder.launchSession')}
        </button>
      </div>
    </div>
  )

  return (
    <div data-no-tab-swipe="true" style={{ position: 'fixed', inset: 0, zIndex: 50, background: BG_BASE, display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div style={{ flexShrink: 0, background: BG_BASE, paddingTop: 'max(16px, env(safe-area-inset-top, 16px))', paddingRight: 16, paddingBottom: 10, paddingLeft: 16, borderBottom: `1px solid ${BORDER}` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <button onClick={onCancel} style={{ background: 'none', border: 'none', color: TEXT_MUTED, cursor: 'pointer', fontFamily: FONT_BODY, fontSize: 14, display: 'flex', alignItems: 'center', gap: 4 }}>
            <ArrowLeft size={14} /> {t('back')}
          </button>
          <span style={{ fontFamily: FONT_DISPLAY, fontSize: 18, letterSpacing: 2, color: TEXT_PRIMARY }}>{t('builder.add')}</span>
          {selected.length > 0 ? (
            <button onClick={goConfig} style={{ background: GOLD, color: colors.onGold, border: 'none', borderRadius: 12, padding: '8px 16px', fontFamily: FONT_ALT, fontWeight: 800, fontSize: 11, letterSpacing: 1, cursor: 'pointer' }}>{t('builder.next', { count: selected.length })}</button>
          ) : <div style={{ width: 60 }} />}
        </div>

        {/* Selected tags */}
        {selected.length > 0 && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
            {selected.map(e => (
              <button key={e.id} onClick={() => toggle(e)} style={{ padding: '4px 10px', borderRadius: 10, background: GOLD_DIM, border: `1px solid ${GOLD_RULE}`, color: GOLD, fontFamily: FONT_ALT, fontSize: 11, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                {getExerciseName(e, locale)} <X size={9} />
              </button>
            ))}
          </div>
        )}

        {/* Search */}
        <div style={{ position: 'relative', marginBottom: 10 }}>
          <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: TEXT_MUTED, pointerEvents: 'none' }} />
          <input autoFocus autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck={false} inputMode="search" enterKeyHint="search"
            value={search} onChange={e => setSearch(e.target.value)} placeholder={t('builder.searchPlaceholder')}
            style={{ width: '100%', padding: '14px 44px 14px 36px', background: colors.surface2, border: `1px solid ${colors.divider}`, borderRadius: 12, color: TEXT_PRIMARY, fontSize: 16, fontFamily: FONT_BODY, outline: 'none' }} />
          {search && (
            <button onClick={() => setSearch('')} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', width: 28, height: 28, borderRadius: '50%', background: GOLD_DIM, border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              <X size={12} color={GOLD} />
            </button>
          )}
        </div>

        {/* Muscle filters */}
        <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 4, WebkitOverflowScrolling: 'touch' as any }}>
          {muscleFilters.map(f => (
            <button key={f.key} onClick={() => setFilter(f.key)} style={{
              flexShrink: 0, padding: '6px 14px', borderRadius: 10,
              border: `1px solid ${filter === f.key ? GOLD : BORDER}`,
              background: filter === f.key ? GOLD_DIM : colors.surface2,
              color: filter === f.key ? GOLD : TEXT_MUTED,
              fontFamily: FONT_ALT, fontSize: 11, fontWeight: 700, letterSpacing: 1, cursor: 'pointer',
            }}>{f.label}</button>
          ))}
        </div>
      </div>

      {/* Exercise list */}
      <div style={{ flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch' as any, paddingTop: 8, paddingRight: 16, paddingBottom: 'calc(120px + env(safe-area-inset-bottom, 0px))', paddingLeft: 16 }}>
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
                {sel ? <Check size={16} color={colors.onGold} strokeWidth={3} /> : <Dumbbell size={15} color={TEXT_DIM} />}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: FONT_ALT, fontSize: 14, fontWeight: 700, color: TEXT_PRIMARY }}>{getExerciseName(e, locale)}</div>
                <div style={{ display: 'flex', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
                  {e.muscle_group && <span style={{ fontFamily: FONT_ALT, fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 6, background: GOLD_DIM, color: GOLD, letterSpacing: 1, textTransform: 'uppercase' as const }}>{getMuscleLabel(e.muscle_group, locale, tMuscle)}</span>}
                  {e.difficulty && <span style={{ fontFamily: FONT_ALT, fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 6, background: `${dc(e.difficulty)}18`, color: dc(e.difficulty), letterSpacing: 1 }}>{t(`difficulty.${e.difficulty}`)}</span>}
                  {e.equipment && <span style={{ fontFamily: FONT_BODY, fontSize: 10, color: TEXT_DIM }}>{e.equipment}</span>}
                </div>
              </div>
            </button>
          )
        })}
        {dbExos.length === 0 && <div style={{ textAlign: 'center', padding: 40, color: TEXT_MUTED, fontSize: 14 }}>{t('builder.noResults')}</div>}
      </div>

      {/* Bottom button */}
      {selected.length > 0 && (
        <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, paddingTop: 12, paddingRight: 16, paddingBottom: 'max(12px, env(safe-area-inset-bottom, 12px))', paddingLeft: 16, background: 'rgba(13,11,8,0.9)', backdropFilter: 'blur(16px)', borderTop: `1px solid ${BORDER}` }}>
          <button onClick={goConfig} style={{ width: '100%', padding: 16, borderRadius: 14, background: GOLD, border: 'none', color: colors.onGold, fontFamily: FONT_DISPLAY, fontSize: 18, letterSpacing: 2, cursor: 'pointer' }}>
            {t('builder.addExercises', { count: selected.length })}
          </button>
        </div>
      )}
    </div>
  )
}

const AUTO_REDIRECT_SECONDS = 8

export default function WorkoutSession({ sessionName, exercises: raw, startedAt, onFinish, onClose }: WorkoutSessionProps) {
  const t = useTranslations('training_tab.ws')
  const locale = useLocale() as 'fr' | 'en' | 'de'
  const tMuscle = useTranslations('muscles')
  const supabase = createBrowserClient(SUPABASE_URL, SUPABASE_KEY)
  useBeforeUnload(true)
  const draftCheckedRef = useRef(false)
  const [mode, setMode] = useState<'session' | 'custom'>('session')
  const [exos, setExos] = useState<Exo[]>(() => raw.map(e => ({ id: uid(), name: e.exercise_name || e.name || t('exercise'), muscle: e.muscle_group || '', targetSets: e.sets || 3, targetReps: String(e.reps || '10-12'), rest: getRestSeconds(e), tempo: e.tempo, rir: e.rir ?? null, notes: e.notes || e.description || e.tips || '', videoUrl: e.video_url, imageUrl: e.image_url || e.gif_url, technique: e.technique, techniqueDetails: e.technique_details, sets: makeSets(e.sets || 3), open: true })))
  // Draft resume prompt
  const [draftPrompt, setDraftPrompt] = useState<Exo[] | null>(null)
  // Persist exos to localStorage after each mutation (gated by draftCheckedRef)
  useEffect(() => {
    if (typeof window === 'undefined' || mode !== 'session') return
    if (!draftCheckedRef.current) return
    if (draftPrompt) return
    try {
      const draft = { sessionName, startedAt: startedAt || new Date().toISOString(), savedAt: new Date().toISOString(), exos }
      localStorage.setItem('moovx_workout_draft', JSON.stringify(draft))
    } catch {}
  }, [exos, sessionName, startedAt, mode, draftPrompt])
  useEffect(() => {
    const draft = readDraft(sessionName)
    if (draft && draft.exos.length > 0) {
      const hasProgress = draft.exos.some(e => Array.isArray(e.sets) && e.sets.some((s: any) => s.done))
      if (hasProgress) setDraftPrompt(draft.exos)
    }
    draftCheckedRef.current = true
  }, [sessionName])
  const resumeDraft = () => {
    if (draftPrompt) {
      setExos(draftPrompt.map(e => ({ ...e, sets: e.sets.map(s => ({ ...s, weightRaw: s.weightRaw ?? (s.weight !== '' ? String(s.weight).replace('.', ',') : '') })) })))
    }
    setDraftPrompt(null)
  }
  const discardDraft = () => { cleanupDraft(); setDraftPrompt(null) }

  const [restOn, setRestOn] = useState(false)
  const [restSecs, setRestSecs] = useState(0)
  const [restMax, setRestMax] = useState(90)
  const [restExoId, setRestExoId] = useState<string | null>(null)
  const [restSetId, setRestSetId] = useState<string | null>(null)
  const [restDone, setRestDone] = useState(false)
  const [restNextInfo, setRestNextInfo] = useState('')
  const restT = useRef<NodeJS.Timeout | null>(null)
  const restEndsAtRef = useRef(0)
  const restScheduledSoundsRef = useRef<ScheduledSound[]>([])
  const [t0] = useState(() => startedAt ? new Date(startedAt).getTime() : Date.now())
  const [elapsed, setElapsed] = useState(() => startedAt ? Date.now() - new Date(startedAt).getTime() : 0)
  const elT = useRef<NodeJS.Timeout | null>(null)
  const [done, setDone] = useState(false)
  const [autoRedirectCountdown, setAutoRedirectCountdown] = useState(AUTO_REDIRECT_SECONDS)
  const [summary, setSummary] = useState<{
    previousSessions: { id: string; name: string; date: string; volume: number }[]
    currentWeekVolume: number
    lastWeekVolume: number
  } | null>(null)
  const [summaryLoading, setSummaryLoading] = useState(true)
  const [showVideo, setShowVideo] = useState<string | null>(null)
  const [sessionModified, setSessionModified] = useState(false)
  const [showSavePopup, setShowSavePopup] = useState(false)
  const [exerciseMenu, setExerciseMenu] = useState<number | null>(null)
  const [showSaveTemplate, setShowSaveTemplate] = useState(false)
  const [templateName, setTemplateName] = useState(sessionName || 'Séance libre') // DB value, do not translate
  const [variantPopup, setVariantPopup] = useState<{exIdx: number, variants: any[], originalName: string} | null>(null)
  const [exerciseInfo, setExerciseInfo] = useState<any>(null)
  const [reorderMode, setReorderMode] = useState(false)
  const [previousData, setPreviousData] = useState<Record<string, { weight: number; reps: number }[]>>({})
  const [prevSessionsByExo, setPrevSessionsByExo] = useState<Record<string, PrevSessionSet[][]>>({})
  const [showTimerAlert, setShowTimerAlert] = useState(false)
  const [motivationalMsg, setMotivationalMsg] = useState('')
  const [showEndModal, setShowEndModal] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [repsWarning, setRepsWarning] = useState<{ eid: string; sid: string; reps: number } | null>(null)
  const [tempoModal, setTempoModal] = useState<{ tempo: string; name: string } | null>(null)
  const [tempoExecutor, setTempoExecutor] = useState<{ exoId: string; setIdx: number; tempo: string; name: string; targetReps: number } | null>(null)

  // Parse the target reps for TempoExecutor (e.g. '8-10' → 10, '12' → 12)
  const parseTargetRepsForTempo = (targetReps: string): number => {
    if (!targetReps) return 10
    // If range like '8-10', use the higher number
    const parts = String(targetReps).split('-').map(s => parseInt(s.trim(), 10)).filter(n => !isNaN(n))
    if (parts.length === 0) return 10
    return Math.max(...parts)
  }

  // Check if a tempo string is valid (format X-X-X)
  const isTempoValid = (tempo?: string): boolean => {
    if (!tempo) return false
    const parts = tempo.trim().split('-').map(p => parseInt(p.trim(), 10))
    if (parts.length < 3) return false
    return parts.slice(0, 3).every(n => !isNaN(n) && n >= 0)
  }

  const progressionByExo = useMemo(() => {
    const map: Record<string, ReturnType<typeof computeProgression>> = {}
    for (const exo of exos) {
      map[exo.name] = computeProgression(
        prevSessionsByExo[exo.name] ?? [],
        parseRepsTarget(exo.targetReps),
        exo.name,
      )
    }
    return map
  }, [exos, prevSessionsByExo])

  // Stable key derived from current exercise names — re-fires when exos are added/removed
  const exoNamesKey = useMemo(() => exos.map(e => e.name).filter(Boolean).join('|'), [exos])

  // Fetch previous performance (incremental: only missing names)
  useEffect(() => {
    const names = exos.map(e => e.name).filter(Boolean)
    if (!names.length) return
    const fetchPrev = async () => {
      // Skip names already cached
      const missing = names.filter(n => !(n in prevSessionsByExo))
      if (!missing.length) return

      const { data: userData } = await supabase.auth.getUser()
      const userId = userData?.user?.id
      if (!userId) return
      const newPrev: Record<string, { weight: number; reps: number }[]> = {}
      const newPrevSessions: Record<string, PrevSessionSet[][]> = {}
      for (const name of missing) {
        const { data } = await supabase
          .from('workout_sets')
          .select('weight, reps, set_number, session_id, completed, created_at')
          .eq('user_id', userId)
          .eq('exercise_name', name)
          .order('created_at', { ascending: false })
          .limit(30)
        if (data?.length) {
          const sessionIds: string[] = []
          for (const row of data) {
            if (row.session_id && !sessionIds.includes(row.session_id)) {
              sessionIds.push(row.session_id)
              if (sessionIds.length >= 2) break
            }
          }
          const sessions: PrevSessionSet[][] = sessionIds.map(sid =>
            data
              .filter((d: any) => d.session_id === sid)
              .sort((a: any, b: any) => (a.set_number || 0) - (b.set_number || 0))
              .map((s: any) => ({ weight: s.weight || 0, reps: s.reps || 0, completed: s.completed !== false }))
          )
          newPrevSessions[name] = sessions
          const latestCompleted = sessions[0]?.filter(s => s.completed) ?? []
          if (latestCompleted.length > 0) newPrev[name] = latestCompleted.map(s => ({ weight: s.weight, reps: s.reps }))
        } else {
          // Mark as fetched (empty) to avoid re-fetching
          newPrevSessions[name] = []
        }
      }
      // Merge with existing, don't overwrite
      setPreviousData(prev => ({ ...prev, ...newPrev }))
      setPrevSessionsByExo(prev => ({ ...prev, ...newPrevSessions }))
    }
    fetchPrev()
  }, [exoNamesKey])

  useEffect(() => { elT.current = setInterval(() => setElapsed(Date.now() - t0), 1000); return () => { if (elT.current) clearInterval(elT.current) } }, [])

  useEffect(() => {
    if (!done) return
    setAutoRedirectCountdown(AUTO_REDIRECT_SECONDS)
    const interval = setInterval(() => {
      setAutoRedirectCountdown(prev => (prev <= 1 ? 0 : prev - 1))
    }, 1000)
    return () => clearInterval(interval)
  }, [done])

  // Effet séparé : quand le countdown atteint 0, fermer
  useEffect(() => {
    if (done && autoRedirectCountdown === 0) onClose()
  }, [done, autoRedirectCountdown, onClose])

  useEffect(() => {
    if (!done) return
    let cancelled = false
    ;(async () => {
      setSummaryLoading(true)
      try {
        const { data: userData } = await supabase.auth.getUser()
        if (!userData.user) return
        const { data, error } = await supabase.rpc('get_workout_session_summary', {
          target_user_id: userData.user.id,
          exclude_session_id: null
        })
        if (cancelled) return
        if (error) {
          console.error('[workout-summary]', error.message)
          return
        }
        setSummary(data as any)
      } catch (e: any) {
        console.error('[workout-summary] unexpected', e?.message)
      } finally {
        if (!cancelled) setSummaryLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [done])

  const prevRemaining = useRef(Infinity)
  useEffect(() => {
    if (!restOn) { prevRemaining.current = Infinity; return }
    const tick = () => {
      const remaining = Math.max(0, Math.ceil((restEndsAtRef.current - Date.now()) / 1000))
      setRestSecs(remaining)
      if (remaining === 5 && prevRemaining.current > 5) { playWarningTick(); vibrateDevice() }
      prevRemaining.current = remaining
      if (remaining === 0) {
        setRestOn(false); playBeep(); vibrateDevice()
        setMotivationalMsg(getRandomMessage()); setRestDone(true)
      }
    }
    tick()
    restT.current = setInterval(tick, 200)
    return () => { if (restT.current) clearInterval(restT.current) }
  }, [restOn])
  // Force recalc when app becomes visible (iOS Safari suspends setInterval)
  useEffect(() => {
    if (!restOn) return
    const onVisible = () => {
      if (document.visibilityState !== 'visible') return
      const remaining = Math.max(0, Math.ceil((restEndsAtRef.current - Date.now()) / 1000))
      setRestSecs(remaining)
      if (remaining === 0) {
        setRestOn(false); playBeep(); vibrateDevice()
        setMotivationalMsg(getRandomMessage()); setRestDone(true)
      }
    }
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('focus', onVisible)
    return () => {
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('focus', onVisible)
    }
  }, [restOn])
  useEffect(() => {
    if (!restDone) return
    const t = setTimeout(() => {
      dismissRestDone()
    }, 5000)
    return () => clearTimeout(t)
  }, [restDone])
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

  const cleanupDraft = () => { try { localStorage.removeItem('moovx_workout_draft') } catch {} }

  const startRest = (s: number, exoId?: string, nextInfo?: string, setId?: string) => {
    if (restT.current) clearInterval(restT.current)
    // Cancel any previously scheduled sounds (defensive: shouldn't happen,
    // but if startRest is called while a previous one is still pending
    // (e.g. fast re-validation), we don't want stale beeps to fire)
    if (restScheduledSoundsRef.current.length > 0) {
      cancelScheduledSounds(restScheduledSoundsRef.current)
      restScheduledSoundsRef.current = []
    }
    restEndsAtRef.current = Date.now() + s * 1000
    restScheduledSoundsRef.current = scheduleRestPeriodSounds(s)
    setRestMax(s); setRestSecs(s); setRestOn(true); setRestDone(false)
    if (exoId) setRestExoId(exoId)
    if (setId) setRestSetId(setId)
    if (nextInfo) setRestNextInfo(nextInfo)
  }
  const skipRest = () => {
    // Cancel scheduled audio cues so they don't fire after skip
    if (restScheduledSoundsRef.current.length > 0) {
      cancelScheduledSounds(restScheduledSoundsRef.current)
      restScheduledSoundsRef.current = []
    }
    setRestOn(false); setRestSecs(0); setRestExoId(null); setRestSetId(null)
  }
  const addRestTime = () => { restEndsAtRef.current += 30000; setRestMax(m => m + 30) }
  const dismissRestDone = () => { setRestDone(false); setRestExoId(null); setRestSetId(null) }
  const setField = (eid: string, sid: string, f: 'weight' | 'reps', v: string) => {
    if (f === 'weight') {
      setExos(p => p.map(e => e.id !== eid ? e : { ...e, sets: e.sets.map(s => s.id !== sid ? s : { ...s, weightRaw: v }) }))
    } else {
      setExos(p => p.map(e => e.id !== eid ? e : { ...e, sets: e.sets.map(s => s.id !== sid ? s : { ...s, [f]: v === '' ? '' : Number(v) }) }))
    }
  }
  const commitWeight = (eid: string, sid: string) => {
    setExos(p => p.map(e => e.id !== eid ? e : { ...e, sets: e.sets.map(s => {
      if (s.id !== sid) return s
      if (s.weightRaw === '' || s.weightRaw === '.' || s.weightRaw === ',') return { ...s, weight: '' }
      const n = parseFloat(s.weightRaw.replace(',', '.'))
      return { ...s, weight: Number.isNaN(n) ? '' : n }
    }) }))
  }
  const doValidate = (eid: string, sid: string) => {
    initAudio()
    // Compute r SYNCHRONOUSLY before any state update
    const targetExo = exos.find(e => e.id === eid)
    const r = targetExo ? getRestSeconds(targetExo) : 90
    const exoName = targetExo?.name || ''

    // Projection synchrone : calculer nextSetNum AVANT setExos (updater async)
    const projectedSets = targetExo?.sets.map(s =>
      s.id !== sid ? s : { ...s, done: true }
    ) ?? []
    const nextUndone = projectedSets.find(s => !s.done)
    const nextSetNum = nextUndone?.num ?? 0

    setExos(p => p.map(e => e.id !== eid ? e : {
      ...e,
      sets: e.sets.map(s => {
        if (s.id !== sid) return s
        let committedWeight: number | '' = s.weight
        if (s.weightRaw === '' || s.weightRaw === '.' || s.weightRaw === ',') {
          committedWeight = ''
        } else {
          const n = parseFloat(s.weightRaw.replace(',', '.'))
          committedWeight = Number.isNaN(n) ? '' : n
        }
        return { ...s, weight: committedWeight, done: true }
      })
    }))

    const prev = previousData[exoName]
    const prevInfo = prev?.[nextSetNum - 1]
    const nextInfo = nextSetNum > 0
      ? `Set ${nextSetNum}${prevInfo ? ` — ${prevInfo.weight} kg × ${prevInfo.reps}` : ''}`
      : t('exerciseDone')
    startRest(r, eid, nextInfo, sid)
  }
  const validate = (eid: string, sid: string) => {
    const exo = exos.find(e => e.id === eid)
    const set = exo?.sets.find(s => s.id === sid)
    const reps = Number(set?.reps) || 0
    if (reps > 15) { setRepsWarning({ eid, sid, reps }); return }
    doValidate(eid, sid)
  }
  const unvalidate = (eid: string, sid: string) => { skipRest(); setExos(p => p.map(e => e.id !== eid ? e : { ...e, sets: e.sets.map(s => s.id !== sid ? s : { ...s, done: false }) })) }
  const addSet = (eid: string) => setExos(p => p.map(e => e.id !== eid ? e : { ...e, sets: [...e.sets, { id: uid(), num: e.sets.length + 1, weight: e.sets.at(-1)?.weight ?? '', weightRaw: e.sets.at(-1)?.weightRaw ?? '', reps: e.sets.at(-1)?.reps ?? '', done: false }] }))

  const total = exos.reduce((s, e) => s + e.sets.length, 0)
  const completed = exos.reduce((s, e) => s + e.sets.filter(s => s.done).length, 0)
  const volume = exos.reduce((v, e) => v + e.sets.filter(s => s.done && s.weight && s.reps).reduce((sv, s) => sv + Number(s.weight) * Number(s.reps), 0), 0)
  const pct = total > 0 ? (completed / total) * 100 : 0
  const allDone = completed === total && total > 0

  const finish = () => {
    if (elT.current) clearInterval(elT.current)
    cleanupDraft()
    onFinish({ duration: elapsed, completedSets: completed, totalSets: total, totalVolume: volume, exercises: exos.map(e => ({ name: e.name, muscle: e.muscle, setsTarget: e.targetSets, sets: e.sets.filter(s => s.done).map(s => ({ weight: s.weight, reps: s.reps })) })) })
    if (exos.length > 0) {
      setShowSaveTemplate(true)
    } else {
      setDone(true)
    }
  }
  async function saveAsTemplate() {
    await supabase.from('custom_programs').insert({
      user_id: (await supabase.auth.getUser()).data.user?.id,
      name: templateName.trim() || 'Séance libre',
      days: [{ name: templateName.trim() || 'Séance libre', exercises: exos.map(e => ({ exercise_name: e.name, muscle_group: e.muscle, sets: e.targetSets, reps: parseInt(String(e.targetReps)) || 10, rest_seconds: e.rest })), is_rest: false }],
      source: 'free_session',
      is_active: false,
    })
    toast.success(t('templateSaved'))
    setShowSaveTemplate(false)
    setDone(true)
  }

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
    const fields = 'name, muscle_group, equipment, difficulty, description, execution_tips, instructions, tips, gif_url, video_url, variant_group'
    // Try exact match first, then fuzzy
    let { data } = await supabase.from('exercises_db')
      .select(fields).ilike('name', exo.name).limit(1).maybeSingle()
    if (!data) {
      const fuzzy = await supabase.from('exercises_db')
        .select(fields).ilike('name', `%${exo.name}%`).limit(1).maybeSingle()
      data = fuzzy.data
    }
    // If no video_url but has variant_group, try siblings
    if (data && !data.video_url && data.variant_group) {
      const { data: sibling } = await supabase.from('exercises_db')
        .select('video_url').eq('variant_group', data.variant_group)
        .not('video_url', 'is', null).limit(1).maybeSingle()
      if (sibling?.video_url) data.video_url = sibling.video_url
    }
    console.log('[ExerciseInfo]', exo.name, '→ video_url:', data?.video_url, '| matched:', data?.name)
    setExerciseInfo(data || { name: exo.name })
  }
  function selectSessionVariant(v: any) {
    if (!variantPopup) return
    setExos(prev => prev.map((e, i) => i === variantPopup.exIdx ? { ...e, name: v.name, muscle: v.muscle_group || e.muscle } : e))
    setSessionModified(true)
    setVariantPopup(null)
  }

  if (mode === 'custom') return <CustomBuilder onStart={(n, exercises) => { setExos(prev => [...prev, ...exercises.map(e => ({ id: uid(), name: e.exercise_name || e.name || t('exercise'), muscle: e.muscle_group || '', targetSets: e.sets || 3, targetReps: String(e.reps || '10-12'), rest: getRestSeconds(e), tempo: undefined, rir: null, notes: e.notes || '', videoUrl: e.video_url, sets: makeSets(e.sets || 3), open: true }))]); setSessionModified(true); setMode('session') }} onCancel={() => setMode('session')} />

  if (done) {
    // Compute volume comparison
    const volumeDelta = summary ? summary.currentWeekVolume - summary.lastWeekVolume : 0
    const volumePercent = summary && summary.lastWeekVolume > 0
      ? ((volumeDelta / summary.lastWeekVolume) * 100)
      : null
    const trend: 'up' | 'down' | 'neutral' =
      volumePercent === null ? 'neutral' :
      volumePercent > 0.5 ? 'up' :
      volumePercent < -0.5 ? 'down' : 'neutral'
    const trendColor = trend === 'up' ? GREEN : trend === 'down' ? RED : TEXT_DIM

    // Top 3 exos by max weight
    const performances = exos
      .map(e => {
        const doneSets = e.sets.filter(s => s.done)
        if (!doneSets.length) return null
        const best = Math.max(...doneSets.map(s => Number(s.weight) || 0))
        return { name: e.name, muscle: e.muscle, setsCount: doneSets.length, best }
      })
      .filter((p): p is NonNullable<typeof p> => p !== null && p.best > 0)
      .sort((a, b) => b.best - a.best)
      .slice(0, 3)

    // Format date contextually — locale-aware
    const now = new Date()
    const dateLabel = `${now.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })} · ${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`

    // Mini-graph : up to 4 previous sessions, oldest first
    const graphSessions = summary?.previousSessions
      ? [...summary.previousSessions].reverse().slice(-4)
      : []
    const maxGraphVolume = graphSessions.length
      ? Math.max(...graphSessions.map(s => s.volume), volume)
      : volume

    return (
      <>
      <WorkoutCelebration visible={done} />
      <div className="fixed inset-0 z-50 flex flex-col" style={{ background: BG_BASE, fontFamily: FONT_BODY, overflowY: 'auto' }}>

        {/* Glow décoratif top */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[24rem] h-[24rem] pointer-events-none rounded-full" style={{ background: `radial-gradient(circle, ${GOLD_DIM} 0%, transparent 65%)`, filter: 'blur(80px)', opacity: 0.4 }} />

        {/* Contenu principal scrollable */}
        <div className="relative z-10 flex-1 flex flex-col pt-8 pb-36 w-full" style={{ paddingLeft: 20, paddingRight: 20, maxWidth: 512, marginLeft: 'auto', marginRight: 'auto' }}>

          {/* Header : date + trend badge */}
          <div className="flex items-center justify-between mb-6">
            <div style={mutedStyle}>{dateLabel}</div>
            {summaryLoading ? (
              <div style={{ width: 64, height: 22, background: BG_CARD_2, borderRadius: 12, opacity: 0.5 }} />
            ) : volumePercent !== null ? (
              <div style={{ ...badgeStyle, color: trendColor, background: trend === 'up' ? 'rgba(74,222,128,0.12)' : trend === 'down' ? 'rgba(239,68,68,0.12)' : colors.goldDim, fontSize: 11, padding: '4px 10px' }}>
                {trend === 'up' ? '↗' : trend === 'down' ? '↘' : '→'} {volumePercent > 0 ? '+' : ''}{volumePercent.toFixed(1)}%
              </div>
            ) : null}
          </div>

          {/* Titre éditorial */}
          <h1 className="mb-1" style={{ ...pageTitleStyle, fontSize: 40, letterSpacing: '0.04em', lineHeight: 1.05 }}>
            {t('done.title')}<span style={{ color: GOLD }}></span>
          </h1>
          <p className="mb-10" style={{ ...subtitleStyle, color: TEXT_MUTED, fontStyle: 'italic', textTransform: 'none' as const, letterSpacing: '0.02em', fontWeight: 400 }}>
            {sessionName}
          </p>

          {/* CARD : Volume HERO */}
          <div className="flex items-center gap-3 mb-2">
            <span style={titleStyle}>{t('done.totalVolume')}</span>
            <div style={titleLineStyle} />
          </div>
          <div style={{ ...cardStyle, padding: '32px 24px', marginBottom: 24, textAlign: 'center', background: `linear-gradient(135deg, ${colors.surface}, ${BG_CARD_2})` }}>
            <div className="flex items-baseline justify-center gap-3">
              <span style={{ fontFamily: FONT_DISPLAY, fontSize: 64, fontWeight: 800, color: GOLD, letterSpacing: '-0.02em', lineHeight: 1 }}>
                {Math.round(volume).toLocaleString('fr-FR')}
              </span>
              <span style={{ fontFamily: FONT_DISPLAY, fontSize: 20, fontWeight: 600, color: TEXT_MUTED, letterSpacing: '0.05em' }}>kg</span>
            </div>
          </div>

          {/* CARD : Mini-graph dernières séances */}
          {graphSessions.length > 0 && (
            <>
              <div className="flex items-center gap-3 mb-2">
                <span style={titleStyle}>{t('done.lastSessions')}</span>
                <div style={titleLineStyle} />
              </div>
              <div style={{ ...cardStyle, padding: '20px 16px', marginBottom: 24 }}>
                <div className="flex items-end gap-3 h-24">
                  {graphSessions.map((s, i) => {
                    const heightPct = (s.volume / maxGraphVolume) * 100
                    const isCurrent = i === graphSessions.length - 1
                    return (
                      <div key={s.id} className="flex-1 flex flex-col items-center gap-2">
                        <div className="w-full rounded-t" style={{
                          height: `${Math.max(heightPct, 6)}%`,
                          background: isCurrent ? GOLD : GOLD_DIM,
                          minHeight: 8,
                        }} />
                        <div style={{ ...mutedStyle, fontSize: 10 }}>
                          {new Date(s.date).getDate()}/{new Date(s.date).getMonth() + 1}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </>
          )}

          {/* CARDS : Stats secondaires 2 colonnes */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            <div style={{ ...cardStyle, padding: 20, textAlign: 'center' }}>
              <div style={{ ...titleStyle, fontSize: 10, marginBottom: 8 }}>{t('done.duration')}</div>
              <div style={{ ...statStyle, fontSize: 32 }}>{dur(elapsed)}</div>
            </div>
            <div style={{ ...cardStyle, padding: 20, textAlign: 'center' }}>
              <div style={{ ...titleStyle, fontSize: 10, marginBottom: 8 }}>{t('done.sets')}</div>
              <div style={{ ...statStyle, fontSize: 32 }}>
                {completed}<span style={{ color: TEXT_DIM, fontSize: 22 }}>/{total}</span>
              </div>
            </div>
          </div>

          {/* CARD : Liste exercices */}
          {performances.length > 0 && (
            <>
              <div className="flex items-center gap-3 mb-2">
                <span style={titleStyle}>{t('done.exercises')}</span>
                <div style={titleLineStyle} />
              </div>
              <div style={{ ...cardStyle, padding: '8px 20px' }}>
                {performances.map((p, i) => (
                  <div key={i}>
                    <div className="py-3 flex justify-between items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <div style={{ fontFamily: FONT_ALT, fontSize: 15, fontWeight: 700, color: TEXT_PRIMARY, letterSpacing: '0.01em' }} className="truncate">
                          {getExerciseName(p, locale)}
                        </div>
                        <div className="mt-0.5" style={{ ...mutedStyle, fontSize: 11 }}>
                          {t('done.setsCount', { count: p.setsCount })} · {getMuscleLabel(p.muscle, locale, tMuscle)}
                        </div>
                      </div>
                      <div style={{ ...statSmallStyle, fontSize: 18 }}>{p.best} kg</div>
                    </div>
                    {i < performances.length - 1 && (
                      <div style={{ height: 1, background: BORDER, opacity: 0.5 }} />
                    )}
                  </div>
                ))}
              </div>
            </>
          )}

        </div>

        {/* Bottom bar fixe : bouton premium + compteur */}
        <div className="fixed bottom-0 left-0 right-0 z-20" style={{ paddingBottom: 'max(20px, env(safe-area-inset-bottom, 20px))' }}>
          <div className="pt-6" style={{ paddingLeft: 20, paddingRight: 20, maxWidth: 512, marginLeft: 'auto', marginRight: 'auto', background: 'linear-gradient(to top, rgba(13,11,8,0.98) 0%, rgba(13,11,8,0.95) 60%, transparent 100%)' }}>
            <button onClick={onClose} style={{ ...btnPrimary, width: '100%', padding: '16px 0', fontSize: 14 }} className="active:scale-[0.98] transition-transform">
              {t('done.backToDashboard')}
            </button>
            <p className="text-center mt-3" style={{ ...mutedStyle, fontSize: 11 }}>
              {t('done.autoRedirect', { seconds: autoRedirectCountdown })}
            </p>
          </div>
        </div>
      </div>
      </>
    )
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" style={{ background: BG_BASE, fontFamily: FONT_BODY }}>
      <style>{`
        .ws-input { -webkit-appearance: none; appearance: none; }
        .ws-input::-webkit-inner-spin-button,
        .ws-input::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
        .ws-input:focus { background: rgba(201,168,76,0.08) !important; border-radius: 6px !important; }
        .ws-input::placeholder { color: rgba(255,255,255,0.15); }
        @media(max-width:420px){
          .ws-big-input { font-size: 32px !important; }
        }
        @keyframes wsPopIn {
          0% { opacity: 0; transform: scale(0.8); }
          100% { opacity: 1; transform: scale(1); }
        }
        @keyframes wsSlideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
      {/* DRAFT RESUME PROMPT */}
      {draftPrompt && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 10000, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(12px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div style={{ background: BG_BASE, border: `1px solid ${GOLD}`, borderRadius: 20, padding: 24, maxWidth: 360, width: '100%', animation: 'wsPopIn 0.3s ease-out' }}>
            <h2 style={{ fontFamily: FONT_ALT, textTransform: 'uppercase', letterSpacing: '0.04em', fontSize: '0.95rem', fontWeight: 800, color: GOLD, margin: '0 0 12px' }}>{t('draft.title')}</h2>
            <p style={{ fontFamily: FONT_BODY, fontSize: '0.875rem', color: TEXT_MUTED, lineHeight: 1.55, margin: '0 0 24px' }}>
              {t('draft.description', { name: sessionName })}
            </p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={discardDraft} style={{ flex: 1, padding: '12px', background: 'transparent', border: `1px solid ${BORDER}`, borderRadius: 10, color: TEXT_PRIMARY, fontFamily: FONT_ALT, fontWeight: 700, fontSize: 11, letterSpacing: '0.04em', textTransform: 'uppercase' as const, cursor: 'pointer' }}>{t('draft.restart')}</button>
              <button onClick={resumeDraft} style={{ flex: 2, padding: '12px', background: GOLD, border: 'none', borderRadius: 10, color: colors.onGold, fontFamily: FONT_ALT, fontWeight: 800, fontSize: 11, letterSpacing: '0.04em', textTransform: 'uppercase' as const, cursor: 'pointer' }}>{t('draft.resume')}</button>
            </div>
          </div>
        </div>
      )}

      {/* REST DONE POPUP — only shows when timer reaches 0 */}
      {restDone && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.92)', backdropFilter: 'blur(12px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: 24 }}>
          <div style={{ position: 'relative', overflow: 'hidden', background: BG_BASE, border: `1px solid ${GOLD}`, borderRadius: 20, padding: 32, textAlign: 'center', maxWidth: 340, width: '100%', animation: 'wsPopIn 0.3s ease-out' }}>
            <div style={{ width: 80, height: 80, borderRadius: '50%', background: colors.goldBorder, margin: '0 auto 20px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke={GOLD} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
            </div>
            <h2 style={{ fontFamily: FONT_DISPLAY, fontSize: 24, color: TEXT_PRIMARY, letterSpacing: 3, margin: '0 0 8px' }}>{t('restDone.title')}</h2>
            <p style={{ fontFamily: FONT_BODY, fontSize: 14, color: TEXT_MUTED, margin: '0 0 8px' }}>{t('restDone.next')}</p>
            <p style={{ fontFamily: FONT_DISPLAY, fontSize: 16, color: GOLD, letterSpacing: 1, margin: '0 0 24px' }}>{restNextInfo || motivationalMsg}</p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => { dismissRestDone(); startRest(30, restExoId || undefined, restNextInfo) }} className="active:scale-95"
                style={{ flex: 1, padding: '14px', background: colors.surface2, border: `1px solid ${colors.divider}`, borderRadius: 12, color: GOLD, fontFamily: FONT_ALT, fontWeight: 800, fontSize: 13, letterSpacing: 1, textTransform: 'uppercase' as const, cursor: 'pointer' }}>+30S</button>
              <button onClick={dismissRestDone} className="active:scale-95"
                style={{ flex: 2, padding: '14px', background: GOLD, border: 'none', borderRadius: 12, color: colors.onGold, fontFamily: FONT_ALT, fontWeight: 800, fontSize: 14, letterSpacing: 2, textTransform: 'uppercase' as const, cursor: 'pointer' }}>{t('restDone.start')}</button>
            </div>
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 3, background: 'rgba(255,255,255,0.1)', overflow: 'hidden' }}>
              <div style={{ height: '100%', background: GOLD, animation: 'rest-autoclose-progress 5s linear forwards' }} />
            </div>
          </div>
        </div>
      )}
      {showVideo && (<div className="fixed inset-0 z-[70] flex items-center justify-center p-5" style={{ background: 'rgba(0,0,0,0.95)' }}><div className="w-full max-w-sm"><div className="flex justify-between items-center mb-4"><span style={{ color: TEXT_PRIMARY, fontFamily: FONT_ALT, fontWeight: 700, fontSize: '0.875rem' }}>{t('demo')}</span><button aria-label={t('closeVideo')} onClick={() => setShowVideo(null)} className="w-9 h-9 flex items-center justify-center" style={{ background: colors.surface2, border: `1px solid ${colors.divider}`, borderRadius: '50%' }}><X size={16} style={{ color: TEXT_PRIMARY }} /></button></div><video src={showVideo} controls autoPlay className="w-full" style={{ borderRadius: RADIUS_CARD }} /></div></div>)}

      {/* HEADER */}
      <div className="sticky top-0 z-40 border-b" style={{ background: '#0D0B08', borderColor: BORDER, padding: '0 16px 10px', paddingTop: 'max(12px, env(safe-area-inset-top, 12px))', position: 'relative' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 4, flexShrink: 0 }}>
            <ArrowLeft size={22} color={TEXT_PRIMARY} />
          </button>
          <h1 style={{ flex: 1, color: TEXT_PRIMARY, fontFamily: FONT_DISPLAY, fontSize: 16, letterSpacing: '2px', margin: 0, textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sessionName || t('freeSession')}</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: GREEN, animation: 'pulse 2s infinite' }} />
            <span style={{ fontSize: 14, color: TEXT_PRIMARY, fontFamily: FONT_DISPLAY, letterSpacing: '1px' }}>{dur(elapsed)}</span>
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
          <span style={{ fontSize: 10, color: TEXT_MUTED, fontFamily: FONT_ALT, fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase' }}>{t('progression')}</span>
          <span style={{ fontSize: 11, color: GOLD, fontFamily: FONT_DISPLAY }}>{completed}/{total} sets</span>
        </div>
        <div style={{ height: 2, background: TEXT_DIM, overflow: 'hidden' }}>
          <div style={{ width: `${pct}%`, height: '100%', background: GOLD, transition: 'width 0.5s ease' }} />
        </div>
      </div>

      {/* EXERCICES */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 0, padding: '16px 12px', paddingBottom: 'calc(120px + env(safe-area-inset-bottom, 0px))' }}>
        {/* Add exercise button — hidden in reorder mode */}
        {!reorderMode && (
          <div style={{ margin: '0 4px 16px', width: 'calc(100% - 8px)' }}>
            <button onClick={() => setMode('custom')} style={{
              width: '100%', padding: 10, borderRadius: 12,
              background: colors.surface2, border: `1px solid ${colors.divider}`,
              color: GOLD,
              fontFamily: FONT_ALT, fontSize: 11, fontWeight: 700,
              letterSpacing: 2, cursor: 'pointer',
            }}>{t('addExercise')}</button>
          </div>
        )}

        {!reorderMode && exos.length === 0 && (
          <div style={{ margin: '0 4px 24px', padding: '40px 20px', textAlign: 'center', border: `1.5px dashed ${colors.divider}`, borderRadius: 14, background: colors.surface2 }}>
            <Dumbbell size={32} color={TEXT_DIM} style={{ marginBottom: 12 }} />
            <p style={{ fontFamily: FONT_ALT, fontSize: 14, fontWeight: 700, color: TEXT_MUTED, letterSpacing: 1, margin: '0 0 4px' }}>{t('emptyTitle')}</p>
            <p style={{ fontFamily: FONT_BODY, fontSize: 12, color: TEXT_DIM, margin: 0 }}>{t('emptyHint')}</p>
          </div>
        )}

        {/* ── Reorder mode ── */}
        {reorderMode && (
          <div>
            <div style={{ textAlign: 'center', paddingBottom: 14, marginBottom: 14, borderBottom: '1px solid rgba(201,168,76,0.10)' }}>
              <div style={{ fontSize: 11, letterSpacing: '0.18em', fontWeight: 700, color: GOLD, fontFamily: FONT_ALT }}>{t('reorder.title')}</div>
              <div style={{ fontSize: 10, color: TEXT_DIM, marginTop: 4, fontFamily: FONT_BODY }}>{t('reorder.hint')}</div>
            </div>
            <Reorder.Group axis="y" values={exos} onReorder={(newOrder) => setExos(newOrder)} style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {exos.map((exo, idx) => (
                <Reorder.Item
                  key={exo.id}
                  value={exo}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '14px 12px',
                    background: 'rgba(201,168,76,0.05)',
                    border: '1px solid rgba(201,168,76,0.20)',
                    borderRadius: 12, marginBottom: 8,
                    cursor: 'grab', userSelect: 'none',
                  }}
                  whileDrag={{
                    scale: 1.02,
                    boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
                    borderColor: GOLD,
                    background: 'rgba(201,168,76,0.12)',
                    cursor: 'grabbing',
                  }}
                >
                  <span style={{ fontSize: 11, color: 'rgba(201,168,76,0.5)', letterSpacing: '0.15em', flexShrink: 0, minWidth: 16, fontFamily: FONT_ALT, fontWeight: 700 }}>{idx + 1}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 15, color: TEXT_PRIMARY, fontWeight: 600, lineHeight: 1.2, fontFamily: FONT_BODY }}>{getExerciseName(exo, locale)}</div>
                    <div style={{ fontSize: 11, color: 'rgba(245,241,232,0.5)', marginTop: 2, fontFamily: FONT_BODY }}>{exo.muscle ? `${getMuscleLabel(exo.muscle, locale, tMuscle)} · ` : ''}{t('done.setsCount', { count: exo.targetSets })}</div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 3, padding: 4, flexShrink: 0 }}>
                    <div style={{ width: 18, height: 2, background: GOLD, borderRadius: 1 }} />
                    <div style={{ width: 18, height: 2, background: GOLD, borderRadius: 1 }} />
                    <div style={{ width: 18, height: 2, background: GOLD, borderRadius: 1 }} />
                  </div>
                </Reorder.Item>
              ))}
            </Reorder.Group>
            <button onClick={() => setReorderMode(false)} style={{ width: '100%', background: GOLD, padding: 14, borderRadius: 12, border: 'none', textAlign: 'center', fontSize: 13, fontWeight: 800, color: colors.onGold, letterSpacing: '0.15em', marginTop: 18, cursor: 'pointer', fontFamily: FONT_ALT }}>{t('reorder.done')}</button>
          </div>
        )}

        {/* ── Normal exercise list ── */}
        {!reorderMode && exos.map((exo, idx) => {
          const cnt = exo.sets.filter(s => s.done).length
          const isDone = cnt === exo.sets.length
          const last = exo.sets.filter(s => s.done).at(-1)
          // Progression badge
          const progressBadge = (() => {
            const prev = previousData[exo.name]
            if (!prev?.length) return null
            const doneSets = exo.sets.filter(s => s.done && s.weight !== '' && s.reps !== '')
            if (!doneSets.length) return null
            const curVol = doneSets.reduce((s, st) => s + Number(st.weight) * Number(st.reps), 0) / doneSets.length
            const prevVol = prev.reduce((s, st) => s + st.weight * st.reps, 0) / prev.length
            if (!prevVol) return null
            return Math.round(((curVol - prevVol) / prevVol) * 100)
          })()
          return (
            <div key={exo.id} style={{ marginBottom: 12 }}>
              {/* ── Exercise Hero Banner ── */}
              <div
                onClick={() => setExos(p => p.map(e => e.id === exo.id ? { ...e, open: !e.open } : e))}
                style={{ position: 'relative', height: 110, borderRadius: 12, overflow: 'hidden', marginBottom: exo.open ? 14 : 0, cursor: 'pointer', background: colors.surface2 }}
              >
                {/* Background image */}
                {exo.imageUrl && (
                  <img src={exo.imageUrl} alt={getExerciseName(exo, locale)} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
                )}
                {/* Gradient overlay */}
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, transparent 0%, rgba(13,11,8,0.85) 100%)', pointerEvents: 'none' }} />
                {/* Done overlay */}
                {isDone && <div style={{ position: 'absolute', inset: 0, background: colors.goldBorder, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}><Check size={32} color={GOLD} strokeWidth={3} /></div>}

                {/* Actions — top right */}
                <div style={{ position: 'absolute', top: 10, right: 10, display: 'flex', gap: 6, zIndex: 2 }}>
                  <button onClick={(e) => { e.stopPropagation(); openExerciseInfo(exo) }} style={{ width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.45)', border: 'none', borderRadius: '50%', cursor: 'pointer', padding: 0 }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={GOLD} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); setExerciseMenu(exerciseMenu === idx ? null : idx) }} style={{ width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.45)', border: 'none', borderRadius: '50%', cursor: 'pointer', padding: 0, color: GOLD, fontSize: 13, fontWeight: 700 }}>⋯</button>
                </div>

                {/* Text — bottom left */}
                <div style={{ position: 'absolute', bottom: 12, left: 14, right: 14, zIndex: 1 }}>
                  {exo.muscle && <div style={{ fontSize: 11, letterSpacing: '0.18em', fontWeight: 700, color: GOLD, opacity: 0.85, textTransform: 'uppercase' as const, marginBottom: 4, fontFamily: FONT_ALT }}>{getMuscleLabel(exo.muscle, locale, tMuscle)}</div>}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 24, fontWeight: 800, color: TEXT_PRIMARY, letterSpacing: '-0.01em', lineHeight: 1, textTransform: 'uppercase' as const, fontFamily: FONT_DISPLAY }}>{getExerciseName(exo, locale)}</span>
                    {progressBadge !== null && (
                      <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 6, fontFamily: FONT_ALT, background: progressBadge > 0 ? 'rgba(34,197,94,0.20)' : progressBadge < 0 ? 'rgba(239,68,68,0.20)' : 'rgba(255,255,255,0.12)', color: progressBadge > 0 ? colors.success : progressBadge < 0 ? colors.error : 'rgba(255,255,255,0.5)' }}>
                        {progressBadge > 0 ? '+' : ''}{progressBadge}%
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 12, color: 'rgba(245,241,232,0.7)', marginTop: 6, fontFamily: FONT_BODY }}>
                    {t('setsReps', { sets: exo.targetSets, reps: exo.targetReps })}
                    {exo.tempo && (
                      <button
                        onClick={(e) => { e.stopPropagation(); setTempoModal({ tempo: exo.tempo!, name: exo.name }) }}
                        style={{
                          marginLeft: 8,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 5,
                          padding: '3px 8px',
                          background: 'rgba(212,175,55,0.15)',
                          border: `0.5px solid ${GOLD_RULE}`,
                          borderRadius: 5,
                          color: GOLD,
                          fontFamily: FONT_ALT,
                          fontSize: 10,
                          fontWeight: 700,
                          letterSpacing: 0.5,
                          cursor: 'pointer',
                          verticalAlign: 'middle',
                        }}
                      >
                        <Clock size={10} strokeWidth={2.5} />
                        <span style={{ fontSize: 8, color: TEXT_DIM, letterSpacing: 1.5 }}>TEMPO</span>
                        <span>{exo.tempo}</span>
                      </button>
                    )}
                    {exo.rir != null && <span style={{ marginLeft: 4, fontSize: 10, padding: '2px 5px', background: 'rgba(0,0,0,0.35)', borderRadius: 4, fontFamily: FONT_ALT, fontWeight: 700 }}>R{exo.rir}</span>}
                    {exo.technique && TECHNIQUE_LABELS[exo.technique] && (
                      <span style={{ marginLeft: 4, fontSize: 10, padding: '2px 6px', background: colors.goldBorder, border: `0.5px solid ${GOLD_RULE}`, borderRadius: 4, fontFamily: FONT_ALT, fontWeight: 700, color: GOLD }}>
                        {TECHNIQUE_LABELS[exo.technique].emoji} {TECHNIQUE_LABELS[exo.technique].label}{exo.techniqueDetails ? ` ×${exo.techniqueDetails.split(',')[0]}` : ''}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Exercise menu */}
              {exerciseMenu === idx && (
                <div style={{ display: 'flex', gap: 6, padding: '10px 0 4px', flexWrap: 'wrap' }}>
                  <button disabled={idx === 0} onClick={() => { moveExercise(idx, -1); setExerciseMenu(null) }} style={{ flex: 1, padding: 8, borderRadius: 8, minWidth: 65, background: idx === 0 ? BG_BASE : GOLD_DIM, border: `1px solid ${idx === 0 ? BORDER : GOLD_RULE}`, color: idx === 0 ? TEXT_DIM : GOLD, fontFamily: FONT_ALT, fontSize: 10, fontWeight: 700, letterSpacing: 1, cursor: idx === 0 ? 'default' : 'pointer' }}>{t('menu.moveUp')}</button>
                  <button disabled={idx === exos.length - 1} onClick={() => { moveExercise(idx, 1); setExerciseMenu(null) }} style={{ flex: 1, padding: 8, borderRadius: 8, minWidth: 65, background: idx === exos.length - 1 ? BG_BASE : GOLD_DIM, border: `1px solid ${idx === exos.length - 1 ? BORDER : GOLD_RULE}`, color: idx === exos.length - 1 ? TEXT_DIM : GOLD, fontFamily: FONT_ALT, fontSize: 10, fontWeight: 700, letterSpacing: 1, cursor: idx === exos.length - 1 ? 'default' : 'pointer' }}>{t('menu.moveDown')}</button>
                  <button onClick={() => { setExerciseMenu(null); loadVariantsForSession(exo, idx) }} style={{ flex: 1, padding: 8, borderRadius: 8, minWidth: 65, background: GOLD_DIM, border: `1px solid ${GOLD_RULE}`, color: GOLD, fontFamily: FONT_ALT, fontSize: 10, fontWeight: 700, letterSpacing: 1, cursor: 'pointer' }}>{t('menu.replace')}</button>
                  <button onClick={() => removeExerciseDuringSession(idx)} style={{ flex: 1, padding: 8, borderRadius: 8, minWidth: 65, background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)', color: colors.error, fontFamily: FONT_ALT, fontSize: 10, fontWeight: 700, letterSpacing: 1, cursor: 'pointer' }}>{t('menu.delete')}</button>
                </div>
              )}

              {/* ── Sets Big Stack ── */}
              {exo.open && (
                <div style={{ paddingTop: 8, display: 'flex', flexDirection: 'column', gap: 8 }}>

                  {/* Set cards */}
                  {exo.sets.map((set: ExSet, si: number) => {
                    const firstUndoneIdx = exo.sets.findIndex(s => !s.done)
                    const isFirstUndone = si === firstUndoneIdx
                    const showTempoPlay = !set.done && isFirstUndone && isTempoValid(exo.tempo)
                    const ok = !set.done && (set.weight !== '' || set.reps !== '')
                    const prevSet = previousData[exo.name]?.[set.num - 1]
                    const isActive = ok && !set.done
                    return (
                      <Fragment key={set.id}>
                      <div style={{
                        display: 'flex', alignItems: 'center', gap: 12,
                        padding: '14px 12px', borderRadius: 12,
                        background: (isActive || set.done) ? 'rgba(201,168,76,0.10)' : 'rgba(201,168,76,0.05)',
                        border: set.done ? `2px solid ${colors.success}` : isActive ? `2px solid ${GOLD}` : '1px solid rgba(201,168,76,0.20)',
                        transition: 'all 0.2s',
                      }}>
                        {/* a) Set number */}
                        <div style={{ width: 42, flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                          <span style={{ fontSize: 9, fontFamily: FONT_ALT, fontWeight: 700, letterSpacing: '0.15em', color: 'rgba(245,241,232,0.4)', textTransform: 'uppercase' as const }}>{t('set')}</span>
                          <span style={{ fontSize: 22, fontFamily: FONT_DISPLAY, fontWeight: 700, color: set.done ? GOLD : isActive ? GOLD : 'rgba(245,241,232,0.5)', lineHeight: 1 }}>{set.num}</span>
                        </div>

                        {/* b) Previous data + progression badge on 1st set */}
                        <div style={{ width: 60, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 1 }}>
                          <span style={{ fontSize: 9, fontFamily: FONT_ALT, fontWeight: 700, letterSpacing: '0.15em', color: 'rgba(201,168,76,0.6)', textTransform: 'uppercase' as const }}>{t('prev')}</span>
                          <span style={{ fontSize: 13, fontFamily: FONT_BODY, fontWeight: 600, color: prevSet ? GOLD : 'rgba(245,241,232,0.25)', whiteSpace: 'nowrap' }}>
                            {prevSet ? `${prevSet.weight} × ${prevSet.reps}` : '—'}
                          </span>
                          {si === 0 && progressionByExo[exo.name] && (
                            <span style={{
                              marginTop: 2, fontSize: 9, fontFamily: FONT_ALT, fontWeight: 700,
                              padding: '1px 4px', borderRadius: 4, alignSelf: 'flex-start',
                              ...(progressionByExo[exo.name]!.status === 'progress'
                                ? { color: GREEN, background: `${GREEN}20` }
                                : progressionByExo[exo.name]!.status === 'deload'
                                  ? { color: colors.orange, background: 'rgba(251,146,60,0.15)' }
                                  : { color: TEXT_DIM, background: `${TEXT_DIM}20` }),
                            }}>
                              {progressionByExo[exo.name]!.status === 'progress' ? `+${fmtStep(progressionByExo[exo.name]!.step)}` : progressionByExo[exo.name]!.status === 'deload' ? `-${fmtStep(progressionByExo[exo.name]!.step)}` : t('keep')}
                            </span>
                          )}
                        </div>

                        {/* c) KG x REPS inputs */}
                        <div style={{ flex: 1, display: 'flex', alignItems: 'baseline', gap: 6, justifyContent: 'center' }}>
                          <input type="text" inputMode="decimal" pattern="[0-9]*[.,]?[0-9]*" className="ws-input ws-big-input"
                            value={set.weightRaw ?? ''} onChange={e => setField(exo.id, set.id, 'weight', e.target.value)}
                            onBlur={() => commitWeight(exo.id, set.id)}
                            disabled={set.done} placeholder={si === 0 && progressionByExo[exo.name] ? String(progressionByExo[exo.name]!.weight).replace('.', ',') : last?.weight ? String(last.weight).replace('.', ',') : '0'}
                            style={{ width: 64, textAlign: 'center', background: 'transparent', border: 'none', borderRadius: 6, fontSize: isActive ? 40 : 36, fontFamily: FONT_BODY, fontWeight: 800, color: (set.weight !== '') ? GOLD : 'rgba(201,168,76,0.4)', caretColor: GOLD, outline: 'none', lineHeight: 1, opacity: set.done ? 0.6 : 1 }} />
                          <span style={{ fontSize: 17, fontWeight: 600, color: 'rgba(245,241,232,0.3)', lineHeight: 1 }}>×</span>
                          <input type="text" inputMode="numeric" pattern="[0-9]*" className="ws-input ws-big-input"
                            value={set.reps === '' || Number.isNaN(set.reps) ? '' : set.reps} onChange={e => { const cleaned = e.target.value.replace(/\D/g, ''); setField(exo.id, set.id, 'reps', cleaned) }}
                            disabled={set.done} placeholder={String(exo.targetReps || '0').split('-')[0] || '0'}
                            style={{ width: 52, textAlign: 'center', background: 'transparent', border: 'none', borderRadius: 6, fontSize: isActive ? 40 : 36, fontFamily: FONT_BODY, fontWeight: 800, color: (set.reps !== '') ? GOLD : 'rgba(201,168,76,0.4)', caretColor: GOLD, outline: 'none', lineHeight: 1, opacity: set.done ? 0.6 : 1 }} />
                        </div>

                        {/* d) Tempo play + Validate button */}
                        <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center' }}>
                          {showTempoPlay && (
                            <button
                              onClick={() => {
                                initAudio()
                                setTempoExecutor({
                                  exoId: exo.id,
                                  setIdx: si,
                                  tempo: exo.tempo!,
                                  name: exo.name,
                                  targetReps: parseTargetRepsForTempo(exo.targetReps),
                                })
                              }}
                              aria-label={t('startTempo')}
                              style={{
                                width: 40,
                                height: 40,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                background: GOLD_DIM,
                                border: `1.5px solid ${GOLD}`,
                                borderRadius: '50%',
                                cursor: 'pointer',
                                color: GOLD,
                                marginRight: 8,
                                transition: 'transform 0.15s',
                              }}
                              className="active:scale-95"
                            >
                              <Play size={16} fill={GOLD} strokeWidth={2} />
                            </button>
                          )}
                          {set.done ? (
                            <button onClick={() => unvalidate(exo.id, set.id)} style={{ width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', background: colors.success, border: 'none', borderRadius: '50%', cursor: 'pointer' }}>
                              <Check size={18} strokeWidth={3} color="#fff" />
                            </button>
                          ) : ok ? (
                            <button onClick={() => validate(exo.id, set.id)} style={{ width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', background: GOLD, border: 'none', borderRadius: '50%', cursor: 'pointer' }}>
                              <Check size={18} strokeWidth={3} color={colors.onGold} />
                            </button>
                          ) : (
                            <div style={{ width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1.5px solid rgba(201,168,76,0.3)', borderRadius: '50%' }}>
                              <Check size={14} strokeWidth={2.5} color="rgba(201,168,76,0.3)" />
                            </div>
                          )}
                        </div>
                      </div>
                      {/* INLINE REST TIMER — rendered below the set that triggered it */}
                      {restOn && restExoId === exo.id && restSetId === set.id && (
                        <div style={{
                          marginTop: 8, marginBottom: 4, padding: 16, borderRadius: 12,
                          background: 'rgba(201,168,76,0.08)',
                          border: `1px solid ${restSecs <= 10 ? colors.orange : GOLD_RULE}`,
                          display: 'flex', alignItems: 'center', gap: 16,
                          transition: 'border-color 200ms',
                        }}>
                          <div style={{ position: 'relative', width: 80, height: 80, flexShrink: 0 }}>
                            <svg width="80" height="80" viewBox="0 0 80 80" style={{ transform: 'rotate(-90deg)' }}>
                              <circle cx="40" cy="40" r="32" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="6" />
                              <circle cx="40" cy="40" r="32" fill="none"
                                stroke={restSecs <= 10 ? colors.orange : GOLD} strokeWidth="6" strokeLinecap="round"
                                strokeDasharray={2 * Math.PI * 32} strokeDashoffset={2 * Math.PI * 32 * (1 - (restMax > 0 ? restSecs / restMax : 0))}
                                style={{ transition: 'stroke-dashoffset 1s linear, stroke 200ms' }} />
                            </svg>
                            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
                              <span style={{ fontSize: 22, fontWeight: 800, fontFamily: FONT_ALT, color: restSecs <= 10 ? colors.orange : GOLD, lineHeight: 1 }}>{restSecs}s</span>
                              <span style={{ fontSize: 8, fontFamily: FONT_ALT, color: TEXT_DIM, letterSpacing: '0.1em', marginTop: 2 }}>{t('rest')}</span>
                            </div>
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
                            <button onClick={addRestTime} style={{ padding: '10px 16px', background: 'transparent', border: `1px solid ${GOLD_RULE}`, borderRadius: 10, color: GOLD, fontFamily: FONT_ALT, fontWeight: 700, fontSize: 11, letterSpacing: '0.04em', textTransform: 'uppercase' as const, cursor: 'pointer' }}>+30s</button>
                            <button onClick={skipRest} style={{ padding: '10px 16px', background: GOLD, border: 'none', borderRadius: 10, color: colors.onGold, fontFamily: FONT_ALT, fontWeight: 800, fontSize: 11, letterSpacing: '0.04em', textTransform: 'uppercase' as const, cursor: 'pointer' }}>{t('skipRest')}</button>
                          </div>
                        </div>
                      )}
                      </Fragment>
                    )
                  })}

                  {/* Add set */}
                  <button onClick={() => addSet(exo.id)} style={{
                    width: '100%', marginTop: 8, padding: '10px 0', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                    background: 'transparent', border: `1px dashed rgba(201,168,76,0.2)`, borderRadius: 8, cursor: 'pointer',
                    fontFamily: FONT_ALT, fontWeight: 700, fontSize: 11, color: GOLD, letterSpacing: '0.08em', textTransform: 'uppercase' as const,
                  }}>
                    <Plus size={12} /> {t('addSet')}
                  </button>
                </div>
              )}
            </div>
          )
        })}

        {/* Reorder link — visible only in normal mode with 2+ exos */}
        {exos.length >= 2 && !reorderMode && (
          <div style={{ textAlign: 'center', padding: '6px 0', marginBottom: 14 }}>
            <button onClick={() => setReorderMode(true)} style={{ background: 'transparent', border: 'none', fontSize: 12, color: 'rgba(201,168,76,0.6)', letterSpacing: '0.05em', textDecoration: 'underline', textDecorationColor: 'rgba(201,168,76,0.3)', textUnderlineOffset: 3, cursor: 'pointer', fontFamily: FONT_BODY }}>{t('reorderLink')}</button>
          </div>
        )}

        {/* Spacer to keep scroll above bottom bar */}
        <div style={{ height: 8 }} />
      </div>

      {/* FAB ajout exercice — flottant, au-dessus de la barre TERMINER */}
      {!reorderMode && (
        <button
          onClick={() => setMode('custom')}
          aria-label={t('addExercise')}
          className="active:scale-90"
          style={{
            position: 'fixed',
            left: 20,
            bottom: 'calc(100px + env(safe-area-inset-bottom, 0px))',
            zIndex: 201,
            width: 56, height: 56, borderRadius: '50%',
            background: GOLD, border: 'none',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 16px rgba(0,0,0,0.4), 0 2px 6px rgba(212,175,55,0.3)',
            cursor: 'pointer',
            transition: 'transform 120ms ease',
          }}
        >
          <Plus size={26} color={colors.onGold} strokeWidth={2.5} />
        </button>
      )}

      {/* BARRE BAS — centered TERMINER — hidden in reorder mode */}
      {!reorderMode && <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 200, background: '#0D0B08', borderTop: `1px solid ${BORDER}`, padding: '10px 16px', paddingBottom: 'calc(10px + env(safe-area-inset-bottom, 16px))' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 10, color: GOLD, fontFamily: FONT_ALT, fontWeight: 700, letterSpacing: '3px', textTransform: 'uppercase' as const }}>{t('time')}</span>
            <span style={{ fontSize: 18, color: TEXT_PRIMARY, fontFamily: FONT_DISPLAY, letterSpacing: '2px', lineHeight: 1 }}>{dur(elapsed)}</span>
          </div>
          <button onClick={() => setShowEndModal(true)} className="active:scale-95" style={{ background: GOLD, border: 'none', borderRadius: 12, padding: '12px 0', width: '60%', maxWidth: 280, color: colors.onGold, fontFamily: FONT_DISPLAY, fontSize: 16, letterSpacing: '2px', cursor: 'pointer', textTransform: 'uppercase' as const }}>{t('finish')}</button>
        </div>
      </div>}

      {/* END SESSION MODAL — slide up sheet */}
      {showEndModal && !showDeleteConfirm && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 250, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
          <div style={{ background: BG_BASE, borderTopLeftRadius: 24, borderTopRightRadius: 24, borderTop: `1px solid ${BORDER}`, width: '100%', maxWidth: 480, padding: 24, paddingBottom: 'calc(24px + env(safe-area-inset-bottom, 0px))', animation: 'wsSlideUp 300ms ease-out' }}>
            {/* Handle */}
            <div style={{ width: 40, height: 4, background: 'rgba(201,168,76,0.3)', borderRadius: 2, margin: '0 auto 20px' }} />
            <h3 style={{ fontFamily: FONT_DISPLAY, fontSize: 20, letterSpacing: 2, color: TEXT_PRIMARY, textAlign: 'center', margin: '0 0 4px' }}>{t('endModal.title')}</h3>
            <p style={{ fontFamily: FONT_BODY, fontSize: 13, color: TEXT_MUTED, textAlign: 'center', margin: '0 0 20px' }}>{t('endModal.question')}</p>
            {/* Summary stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 20 }}>
              {([
                { icon: <Clock size={24} color={GOLD} />, value: dur(elapsed), label: t('endModal.duration') },
                { icon: <CheckCircle2 size={24} color={GOLD} />, value: `${completed}/${total}`, label: 'Sets' },
                { icon: <Dumbbell size={24} color={GOLD} />, value: `${Math.round(volume)} kg`, label: 'Volume' },
              ]).map(stat => (
                <div key={stat.label} style={{ padding: '10px 6px', textAlign: 'center', background: colors.surface2, border: `1px solid ${colors.divider}`, borderRadius: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 2 }}>{stat.icon}</div>
                  <div style={{ fontFamily: FONT_DISPLAY, fontSize: 15, color: GOLD, letterSpacing: 1 }}>{stat.value}</div>
                  <div style={{ fontFamily: FONT_ALT, fontSize: 8, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase' as const, color: TEXT_DIM, marginTop: 2 }}>{stat.label}</div>
                </div>
              ))}
            </div>
            {/* Save button */}
            <button onClick={() => { setShowEndModal(false); sessionModified ? setShowSavePopup(true) : finish() }} className="active:scale-[0.98]" style={{
              width: '100%', padding: 16, borderRadius: 14, background: GOLD, border: 'none', color: colors.onGold,
              fontFamily: FONT_ALT, fontWeight: 800, fontSize: 14, letterSpacing: 2, cursor: 'pointer', textTransform: 'uppercase' as const,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 4,
            }}>
              <Check size={16} strokeWidth={3} />{t('endModal.save')}
            </button>
            <p style={{ fontSize: 10, color: TEXT_DIM, textAlign: 'center', margin: '0 0 16px' }}>{t('endModal.saveHint')}</p>
            {/* Delete button */}
            <button onClick={() => setShowDeleteConfirm(true)} className="active:scale-[0.98]" style={{
              width: '100%', padding: 14, borderRadius: 14,
              background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.2)',
              color: 'rgba(239,68,68,0.8)', fontFamily: FONT_ALT, fontWeight: 800, fontSize: 13, letterSpacing: 2, cursor: 'pointer', textTransform: 'uppercase' as const,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 4,
            }}>
              <X size={16} strokeWidth={3} />{t('endModal.delete')}
            </button>
            <p style={{ fontSize: 10, color: TEXT_DIM, textAlign: 'center', margin: '0 0 20px' }}>{t('endModal.deleteHint')}</p>
            {/* Cancel */}
            <button onClick={() => setShowEndModal(false)} className="active:scale-[0.98]" style={{
              width: '100%', padding: 14, borderRadius: 14, background: 'transparent',
              border: `1px solid ${colors.divider}`, color: TEXT_MUTED,
              fontFamily: FONT_ALT, fontWeight: 700, fontSize: 13, letterSpacing: 2, cursor: 'pointer', textTransform: 'uppercase' as const,
            }}>{t('endModal.continue')}</button>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION — double check */}
      {showDeleteConfirm && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div style={{ background: colors.surface2, border: '1px solid rgba(239,68,68,0.3)', borderRadius: 20, padding: 24, maxWidth: 360, width: '100%', textAlign: 'center' }}>
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', margin: '0 auto 16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <X size={28} color={colors.error} strokeWidth={2} />
            </div>
            <h3 style={{ fontFamily: FONT_DISPLAY, fontSize: 18, letterSpacing: 2, color: TEXT_PRIMARY, margin: '0 0 8px' }}>{t('deleteModal.title')}</h3>
            <p style={{ fontFamily: FONT_BODY, fontSize: 13, color: TEXT_MUTED, lineHeight: 1.6, margin: '0 0 20px' }}>
              {completed > 0 ? t('deleteModal.withSets', { count: completed }) : t('deleteModal.noSets')}
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setShowDeleteConfirm(false)} className="active:scale-[0.98]" style={{
                flex: 1, padding: 14, borderRadius: 12, background: 'transparent',
                border: `1px solid ${BORDER}`, color: TEXT_MUTED,
                fontFamily: FONT_ALT, fontWeight: 700, fontSize: 12, letterSpacing: 1, cursor: 'pointer', textTransform: 'uppercase' as const,
              }}>{t('cancel')}</button>
              <button onClick={() => { setShowDeleteConfirm(false); setShowEndModal(false); cleanupDraft(); onClose() }} className="active:scale-[0.98]" style={{
                flex: 1, padding: 14, borderRadius: 12,
                background: colors.error, border: 'none', color: '#fff',
                fontFamily: FONT_ALT, fontWeight: 800, fontSize: 12, letterSpacing: 1, cursor: 'pointer', textTransform: 'uppercase' as const,
              }}>{t('delete')}</button>
            </div>
          </div>
        </div>
      )}

      {/* REPS WARNING MODAL */}
      {repsWarning && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div style={{ background: colors.surface2, border: `1px solid ${colors.divider}`, borderRadius: 20, padding: 24, maxWidth: 360, width: '100%', textAlign: 'center' }}>
            <div style={{
              width: 56, height: 56, borderRadius: '50%',
              background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.3)',
              margin: '0 auto 16px', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" /><path d="M12 8v4M12 16h.01" />
              </svg>
            </div>
            <h3 style={{ fontFamily: FONT_DISPLAY, fontSize: 18, letterSpacing: 2, color: TEXT_PRIMARY, marginBottom: 8 }}>
              {t('repsWarning.title')}
            </h3>
            <p style={{ fontFamily: FONT_BODY, fontSize: 14, color: TEXT_MUTED, lineHeight: 1.6, marginBottom: 20 }}>
              {t('repsWarning.description', { reps: repsWarning.reps })}
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <button onClick={() => setRepsWarning(null)} className="active:scale-[0.98]" style={{
                width: '100%', padding: 12, borderRadius: 12,
                background: 'transparent', border: `1.5px solid ${GOLD_RULE}`, color: GOLD,
                fontFamily: FONT_ALT, fontWeight: 800, fontSize: 12, letterSpacing: 2, textTransform: 'uppercase' as const, cursor: 'pointer',
              }}>{t('repsWarning.edit')}</button>
              <button onClick={() => { doValidate(repsWarning.eid, repsWarning.sid); setRepsWarning(null) }} className="active:scale-[0.98]" style={{
                width: '100%', padding: 12, borderRadius: 12,
                background: GOLD, border: 'none', color: colors.onGold,
                fontFamily: FONT_ALT, fontWeight: 800, fontSize: 12, letterSpacing: 2, textTransform: 'uppercase' as const, cursor: 'pointer',
              }}>{t('repsWarning.confirm')}</button>
            </div>
          </div>
        </div>
      )}

      {/* Save as template popup */}
      {showSaveTemplate && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: colors.surface2, border: `1px solid ${colors.divider}`, borderRadius: 20, padding: 24, maxWidth: 380, width: '100%' }}>
            <div style={{ fontFamily: FONT_DISPLAY, fontSize: 24, letterSpacing: 2, color: TEXT_PRIMARY, marginBottom: 8 }}>{t('saveTemplate.title')}</div>
            <div style={{ fontFamily: FONT_BODY, fontSize: 14, color: TEXT_MUTED, lineHeight: 1.6, marginBottom: 20 }}>
              {t('saveTemplate.description')}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, marginBottom: 16 }}>
              {SESSION_TYPE_OPTIONS.filter(t => t.key !== 'repos').map(t => (
                <button key={t.key} onClick={() => setTemplateName(t.label)} style={{
                  padding: '10px 6px', borderRadius: 10, cursor: 'pointer',
                  background: templateName === t.label ? `${t.color}20` : colors.surface2,
                  border: `1.5px solid ${templateName === t.label ? t.color : colors.divider}`,
                  color: templateName === t.label ? t.color : TEXT_MUTED,
                  fontFamily: FONT_ALT, fontSize: 10, fontWeight: 700, letterSpacing: 1,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
                }}>
                  <span style={{ fontSize: 14 }}>{t.emoji}</span> {t.shortLabel}
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <button onClick={saveAsTemplate} style={{ width: '100%', padding: 14, borderRadius: 14, background: GOLD, border: 'none', color: colors.onGold, fontFamily: FONT_DISPLAY, fontSize: 17, letterSpacing: 2, cursor: 'pointer' }}>
                {t('saveTemplate.yes')}
              </button>
              <button onClick={() => { setShowSaveTemplate(false); setDone(true) }} style={{ width: '100%', padding: 14, borderRadius: 14, background: 'transparent', border: `1.5px solid ${GOLD_RULE}`, color: GOLD, fontFamily: FONT_DISPLAY, fontSize: 16, letterSpacing: 2, cursor: 'pointer' }}>
                {t('saveTemplate.no')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Exercise info popup */}
      {exerciseInfo && (
        <div style={{position:'fixed',inset:0,zIndex:300,background:'rgba(0,0,0,0.85)',backdropFilter:'blur(8px)',display:'flex',alignItems:'flex-end',justifyContent:'center'}} onClick={()=>setExerciseInfo(null)}>
          <div onClick={e=>e.stopPropagation()} style={{background:colors.surface2,border:`1px solid ${colors.divider}`,borderRadius:'20px 20px 0 0',width:'100%',maxWidth:500,maxHeight:'85vh',display:'flex',flexDirection:'column',overflow:'hidden'}}>
            <div style={{padding:'16px 20px',borderBottom:`1px solid ${colors.divider}`,display:'flex',justifyContent:'space-between',alignItems:'center',flexShrink:0}}>
              <div>
                <div style={{fontFamily:FONT_DISPLAY,fontSize:22,letterSpacing:2,color:TEXT_PRIMARY}}>{getExerciseName(exerciseInfo, locale)}</div>
                <div style={{display:'flex',gap:6,marginTop:4,flexWrap:'wrap'}}>
                  {exerciseInfo.muscle_group&&<span style={{fontFamily:FONT_ALT,fontSize:10,fontWeight:700,padding:'2px 8px',borderRadius:6,background:GOLD_DIM,color:GOLD,letterSpacing:1,textTransform:'uppercase' as const}}>{getMuscleLabel(exerciseInfo.muscle_group, locale, tMuscle)}</span>}
                  {exerciseInfo.equipment&&<span style={{fontFamily:FONT_BODY,fontSize:10,padding:'2px 8px',borderRadius:6,background:BG_CARD_2,color:TEXT_MUTED}}>{exerciseInfo.equipment}</span>}
                  {exerciseInfo.difficulty&&<span style={{fontFamily:FONT_ALT,fontSize:10,fontWeight:700,padding:'2px 8px',borderRadius:6,background:exerciseInfo.difficulty==='avance'?'rgba(239,68,68,0.1)':exerciseInfo.difficulty==='intermediaire'?GOLD_DIM:'rgba(74,222,128,0.1)',color:exerciseInfo.difficulty==='avance'?colors.error:exerciseInfo.difficulty==='intermediaire'?GOLD:colors.success,letterSpacing:1,textTransform:'uppercase' as const}}>{exerciseInfo.difficulty==='debutant'?'Débutant':exerciseInfo.difficulty==='intermediaire'?'Intermédiaire':'Avancé'}</span>}
                </div>
              </div>
              <button onClick={()=>setExerciseInfo(null)} style={{width:36,height:36,borderRadius:12,background:GOLD_DIM,border:`1px solid ${BORDER}`,display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',color:TEXT_MUTED,fontSize:16}}>✕</button>
            </div>
            <div style={{flex:1,overflowY:'auto',padding:'16px 20px 32px',WebkitOverflowScrolling:'touch' as any}}>
              {exerciseInfo.video_url?(
                <div style={{marginBottom:20,borderRadius:14,overflow:'hidden',border:`1px solid ${BORDER}`}}>
                  <video src={`${exerciseInfo.video_url}?v=2`} autoPlay loop muted playsInline style={{width:'100%',height:'auto',display:'block'}}/>
                </div>
              ):exerciseInfo.gif_url?(
                <div style={{marginBottom:20,borderRadius:14,overflow:'hidden',border:`1px solid ${BORDER}`}}>
                  <img src={exerciseInfo.gif_url} alt={getExerciseName(exerciseInfo, locale)} style={{width:'100%',height:'auto',display:'block'}}/>
                </div>
              ):(
                <div style={{marginBottom:20,borderRadius:14,border:`1px dashed ${BORDER}`,padding:'40px 20px',textAlign:'center',background:GOLD_DIM}}>
                  <div style={{fontSize:32,marginBottom:8}}>🎬</div>
                  <div style={{fontFamily:FONT_ALT,fontSize:12,fontWeight:700,color:TEXT_DIM,letterSpacing:1}}>{t('exerciseInfo.videoSoon')}</div>
                </div>
              )}
              {exerciseInfo.description&&(
                <div style={{marginBottom:20}}>
                  <div style={{fontFamily:FONT_ALT,fontSize:11,fontWeight:700,color:GOLD,letterSpacing:2,textTransform:'uppercase' as const,marginBottom:8}}>{t('exerciseInfo.description')}</div>
                  <div style={{fontFamily:FONT_BODY,fontSize:14,color:TEXT_MUTED,lineHeight:1.6}}>{exerciseInfo.description}</div>
                </div>
              )}
              {exerciseInfo.instructions&&(
                <div style={{marginBottom:20}}>
                  <div style={{fontFamily:FONT_ALT,fontSize:11,fontWeight:700,color:GOLD,letterSpacing:2,textTransform:'uppercase' as const,marginBottom:8}}>{t('exerciseInfo.execution')}</div>
                  <div style={{fontFamily:FONT_BODY,fontSize:14,color:TEXT_PRIMARY,lineHeight:1.6}}>{exerciseInfo.instructions}</div>
                </div>
              )}
              {(exerciseInfo.execution_tips||exerciseInfo.tips)&&(
                <div style={{marginBottom:20}}>
                  <div style={{fontFamily:FONT_ALT,fontSize:11,fontWeight:700,color:GOLD,letterSpacing:2,textTransform:'uppercase' as const,marginBottom:8}}>{t('exerciseInfo.tips')}</div>
                  <div style={{fontFamily:FONT_BODY,fontSize:13,color:TEXT_MUTED,lineHeight:1.6,padding:'12px 14px',background:GOLD_DIM,border:`1px solid ${GOLD_RULE}`,borderRadius:12}}>{exerciseInfo.execution_tips||exerciseInfo.tips}</div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Variant popup */}
      {variantPopup && (
        <div style={{position:'fixed',inset:0,zIndex:300,background:'rgba(0,0,0,0.85)',backdropFilter:'blur(8px)',display:'flex',alignItems:'flex-end'}} onClick={()=>setVariantPopup(null)}>
          <div onClick={e=>e.stopPropagation()} style={{background:colors.surface2,border:`1px solid ${colors.divider}`,borderRadius:'20px 20px 0 0',width:'100%',maxHeight:'60vh',display:'flex',flexDirection:'column'}}>
            <div style={{padding:'16px 20px',borderBottom:`1px solid ${colors.divider}`,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <div>
                <div style={{fontFamily:FONT_DISPLAY,fontSize:20,letterSpacing:2,color:TEXT_PRIMARY}}>{t('menu.replace')}</div>
                <div style={{fontFamily:FONT_BODY,fontSize:12,color:TEXT_MUTED,marginTop:2}}>{variantPopup.originalName}</div>
              </div>
              <button onClick={()=>setVariantPopup(null)} style={{background:'none',border:'none',color:TEXT_MUTED,fontSize:20,cursor:'pointer'}}>✕</button>
            </div>
            <div style={{overflowY:'auto',padding:'8px 12px 32px'}}>
              {variantPopup.variants.length===0?(
                <div style={{textAlign:'center',padding:32,color:TEXT_MUTED,fontSize:14}}>{t('noVariants')}</div>
              ):variantPopup.variants.map((v: any,i: number)=>(
                <button key={i} onClick={()=>selectSessionVariant(v)} style={{width:'100%',display:'flex',alignItems:'center',gap:12,padding:'14px 16px',marginBottom:4,borderRadius:14,background:colors.surface2,border:`1px solid ${colors.divider}`,cursor:'pointer',textAlign:'left'}}>
                  <div style={{width:40,height:40,borderRadius:10,background:GOLD_DIM,display:'flex',alignItems:'center',justifyContent:'center',fontSize:16,flexShrink:0}}>
                    {v.equipment==='Barre'?'🏋️':v.equipment==='Haltères'?'💪':v.equipment==='Machine'?'⚙️':v.equipment==='Poulie'?'🔗':'🤸'}
                  </div>
                  <div>
                    <div style={{fontFamily:FONT_BODY,fontSize:14,color:TEXT_PRIMARY,fontWeight:500}}>{getExerciseName(v, locale)}</div>
                    <div style={{fontFamily:FONT_ALT,fontSize:10,color:GOLD,fontWeight:700,letterSpacing:1,marginTop:2}}>{v.equipment||''}{v.muscle_group?` · ${getMuscleLabel(v.muscle_group, locale, tMuscle)}`:''}</div>
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
          <div style={{ background: colors.surface2, border: `1px solid ${colors.divider}`, borderRadius: 20, padding: 24, maxWidth: 380, width: '100%' }}>
            <div style={{ fontFamily: FONT_DISPLAY, fontSize: 24, letterSpacing: 2, color: TEXT_PRIMARY, marginBottom: 8 }}>{t('savePopup.title')}</div>
            <div style={{ fontFamily: FONT_BODY, fontSize: 14, color: TEXT_MUTED, lineHeight: 1.6, marginBottom: 24 }}>
              {t('savePopup.description')}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <button onClick={() => { setShowSavePopup(false); finish() }} style={{
                width: '100%', padding: 14, borderRadius: 14, background: GOLD, border: 'none', color: colors.onGold,
                fontFamily: FONT_DISPLAY, fontSize: 17, letterSpacing: 2, cursor: 'pointer',
              }}>{t('savePopup.save')}</button>
              <button onClick={() => { setSessionModified(false); setShowSavePopup(false); finish() }} style={{
                width: '100%', padding: 14, borderRadius: 14, background: 'transparent',
                border: `1.5px solid ${GOLD_RULE}`, color: GOLD,
                fontFamily: FONT_DISPLAY, fontSize: 16, letterSpacing: 2, cursor: 'pointer',
              }}>{t('savePopup.justThisTime')}</button>
              <button onClick={() => setShowSavePopup(false)} style={{
                width: '100%', padding: 12, background: 'transparent', border: 'none',
                color: TEXT_MUTED, fontFamily: FONT_BODY, fontSize: 13, cursor: 'pointer',
              }}>{t('cancel')}</button>
            </div>
          </div>
        </div>
      )}
      {/* Tempo modal */}
      {tempoModal && (
        <TempoModal
          tempo={tempoModal.tempo}
          exerciseName={tempoModal.name}
          onClose={() => setTempoModal(null)}
        />
      )}
      {/* Tempo executor — fullscreen guided tempo for the current set */}
      {tempoExecutor && (
        <TempoExecutor
          tempo={tempoExecutor.tempo}
          exerciseName={tempoExecutor.name}
          targetReps={tempoExecutor.targetReps}
          onComplete={() => {
            // For now in B.2 just close. B.3 will auto-trigger rest timer here.
            setTempoExecutor(null)
          }}
          onClose={() => setTempoExecutor(null)}
        />
      )}
    </div>
  )
}
