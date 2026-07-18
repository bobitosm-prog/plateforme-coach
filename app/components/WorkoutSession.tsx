'use client'
import { useState, useEffect, useRef, useMemo, Fragment } from 'react'
import { Check, Plus, ArrowLeft, Search, X, Play, Dumbbell, Clock } from 'lucide-react'
import { toast } from 'sonner'
import { useTranslations, useLocale } from 'next-intl'
import { getExerciseName } from '../../lib/i18n-exercise'
import { normalizeExerciseName } from '../../lib/exercise-matching'
import { getMuscleLabel } from '../../lib/i18n-muscle'
import { createBrowserClient } from '@supabase/ssr'
import { colors, BG_BASE, BG_CARD_2, BORDER, GOLD, GOLD_DIM, GOLD_RULE, GREEN, RED, TEXT_PRIMARY, TEXT_MUTED, TEXT_DIM, RADIUS_CARD, FONT_DISPLAY, FONT_ALT, FONT_BODY } from '../../lib/design-tokens'
import { Reorder } from 'framer-motion'
import { initAudio } from '../../lib/timer-audio'
import { getRestSeconds } from '../../lib/utils/exercise'
import { TECHNIQUE_LABELS } from '../../lib/technique-labels'
import { useBeforeUnload } from '../hooks/useBeforeUnload'
import { computeProgression, parseRepsTarget, type PrevSessionSet } from '../../lib/training/compute-progression'
import { discardWorkoutDraftSnapshot, restoreWorkoutDraftSnapshot, saveWorkoutDraftSnapshot } from '../../lib/training/workout-draft-sync'
import { useWorkoutRuntime } from '../hooks/useWorkoutRuntime'
import TempoModal from './training/TempoModal'
import TempoExecutor from './training/TempoExecutor'
import { WorkoutDraftResumeView } from './training/workout-session/WorkoutDraftResumeView'
import { WorkoutActiveRestView, WorkoutRestCompleteView } from './training/workout-session/WorkoutRestViews'
import { WorkoutCompletionView } from './training/workout-session/WorkoutCompletionView'
import { WorkoutAbandonConfirmationView, WorkoutEndConfirmationView, WorkoutRepetitionsWarningView, WorkoutTemplateSaveView } from './training/workout-session/WorkoutFinalizationViews'
import { WorkoutActiveSessionFinishView, WorkoutActiveSessionHeaderView } from './training/workout-session/WorkoutActiveSessionViews'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

interface ExSet { id: string; num: number; weight: number | ''; weightRaw: string; reps: number | ''; done: boolean; rir: number | null }
interface Exo { id: string; name: string; muscle: string; targetSets: number; targetReps: string; rest: number; tempo?: string; rir?: number | null; notes?: string; videoUrl?: string; imageUrl?: string; technique?: string; techniqueDetails?: string; exerciseId?: string | null; sets: ExSet[]; open: boolean }
interface WorkoutSessionProps { sessionName: string; exercises: any[]; startedAt?: string; onFinish: (data: any) => void; onClose: () => void; rirTrackingEnabled?: boolean; rirScaleAdvanced?: boolean }

function fmtStep(n: number): string { return n.toString().replace('.', ',') }

const uid = () => Math.random().toString(36).slice(2)
const makeSets = (n: number): ExSet[] => Array.from({ length: n }, (_, i) => ({ id: uid(), num: i + 1, weight: '', weightRaw: '', reps: '', done: false, rir: null }))
const dur = (ms: number) => { const s = Math.floor(ms / 1000), h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60; if (h > 0) return `${h}h ${m}min`; if (m > 0) return `${m}min ${sec}s`; return `${sec}s` }

const WORKOUT_MUSCLE_FILTERS = ['Tous', 'Pectoraux', 'Dos', 'Épaules', 'Biceps', 'Triceps', 'Quadriceps', 'Ischio-jambiers', 'Fessiers', 'Mollets', 'Abdos', 'Corps Entier']

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
                <div style={{ fontFamily: FONT_BODY, fontSize: 14, fontWeight: 700, color: TEXT_PRIMARY }}>{getExerciseName(e, locale)}</div>
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
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'center' }}>
          {muscleFilters.map(f => (
            <button key={f.key} onClick={() => setFilter(f.key)} style={{
              padding: '6px 14px', borderRadius: 10,
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
                <div style={{ fontFamily: FONT_BODY, fontSize: 14, fontWeight: 700, color: TEXT_PRIMARY }}>{getExerciseName(e, locale)}</div>
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

export default function WorkoutSession({ sessionName, exercises: raw, startedAt, onFinish, onClose, rirTrackingEnabled, rirScaleAdvanced }: WorkoutSessionProps) {
  const t = useTranslations('training_tab.ws')
  const locale = useLocale() as 'fr' | 'en' | 'de'
  const tMuscle = useTranslations('muscles')
  const supabase = createBrowserClient(SUPABASE_URL, SUPABASE_KEY)
  useBeforeUnload(true)
  const draftCheckedRef = useRef(false)
  const [mode, setMode] = useState<'session' | 'custom'>('session')
  const [exos, setExos] = useState<Exo[]>(() => raw.map(e => ({ id: uid(), name: e.exercise_name || e.name || t('exercise'), muscle: e.muscle_group || '', targetSets: e.sets || 3, targetReps: String(e.reps || '10-12'), rest: getRestSeconds(e), tempo: e.tempo, rir: e.rir ?? null, notes: e.notes || e.description || e.tips || '', videoUrl: e.video_url, imageUrl: e.image_url || e.gif_url, technique: e.technique, techniqueDetails: e.technique_details, exerciseId: e.exercise_id ?? null, sets: makeSets(e.sets || 3), open: true })))
  // Draft resume prompt
  const [draftPrompt, setDraftPrompt] = useState<Exo[] | null>(null)
  // Persist exos to localStorage after each mutation (gated by draftCheckedRef)
  useEffect(() => {
    if (typeof window === 'undefined' || mode !== 'session') return
    if (!draftCheckedRef.current) return
    if (draftPrompt) return
    saveWorkoutDraftSnapshot(localStorage, { sessionName, startedAt, exos }, { now: () => new Date() })
  }, [exos, sessionName, startedAt, mode, draftPrompt])
  useEffect(() => {
    const draft = restoreWorkoutDraftSnapshot<Exo>(localStorage, sessionName, { now: () => new Date() })
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

  const runtime = useWorkoutRuntime(startedAt)
  const { elapsed, restOn, restSecs, restMax, restDone, motivationalMsg } = runtime
  const [restExoId, setRestExoId] = useState<string | null>(null)
  const [restSetId, setRestSetId] = useState<string | null>(null)
  const [restNextInfo, setRestNextInfo] = useState('')
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
      // Fetch distinct exercise_name for this user once, to enable normalized matching
      const { data: allUserSets } = await supabase
        .from('workout_sets')
        .select('exercise_name')
        .eq('user_id', userId)
      const allCandidates = new Set<string>()
      for (const row of (allUserSets || [])) {
        if (row.exercise_name) allCandidates.add(row.exercise_name)
      }

      const newPrev: Record<string, { weight: number; reps: number }[]> = {}
      const newPrevSessions: Record<string, PrevSessionSet[][]> = {}
      for (const name of missing) {
        const target = normalizeExerciseName(name)
        const matchingNames = Array.from(allCandidates).filter(c => normalizeExerciseName(c) === target)
        if (matchingNames.length === 0) matchingNames.push(name)
        const { data } = await supabase
          .from('workout_sets')
          .select('weight, reps, set_number, session_id, completed, created_at, rir')
          .eq('user_id', userId)
          .in('exercise_name', matchingNames)
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
              .map((s: any) => ({ weight: s.weight || 0, reps: s.reps || 0, completed: s.completed !== false, rir: s.rir ?? null }))
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

  useEffect(() => {
    if (!restDone) return
    const t = setTimeout(() => {
      dismissRestDone()
    }, 5000)
    return () => clearTimeout(t)
  }, [restDone])
  const cleanupDraft = () => { discardWorkoutDraftSnapshot(localStorage) }

  const startRest = (s: number, exoId?: string, nextInfo?: string, setId?: string) => {
    runtime.startRest(s)
    if (exoId) setRestExoId(exoId)
    if (setId) setRestSetId(setId)
    if (nextInfo) setRestNextInfo(nextInfo)
  }
  const skipRest = () => {
    runtime.cancelRest(); setRestExoId(null); setRestSetId(null)
  }
  const addRestTime = () => runtime.addRestTime(30)
  const dismissRestDone = () => { runtime.dismissRestDone(); setRestExoId(null); setRestSetId(null) }
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
  const addSet = (eid: string) => setExos(p => p.map(e => e.id !== eid ? e : { ...e, sets: [...e.sets, { id: uid(), num: e.sets.length + 1, weight: e.sets.at(-1)?.weight ?? '', weightRaw: e.sets.at(-1)?.weightRaw ?? '', reps: e.sets.at(-1)?.reps ?? '', done: false, rir: null }] }))
  const setRir = (value: number) => {
    if (!restExoId || !restSetId) return
    setExos(p => p.map(e => e.id !== restExoId ? e : { ...e, sets: e.sets.map(s => s.id !== restSetId ? s : { ...s, rir: value }) }))
  }

  const total = exos.reduce((s, e) => s + e.sets.length, 0)
  const completed = exos.reduce((s, e) => s + e.sets.filter(s => s.done).length, 0)
  const volume = exos.reduce((v, e) => v + e.sets.filter(s => s.done && s.weight && s.reps).reduce((sv, s) => sv + Number(s.weight) * Number(s.reps), 0), 0)
  const pct = total > 0 ? (completed / total) * 100 : 0
  const allDone = completed === total && total > 0

  const finish = () => {
    runtime.stop()
    cleanupDraft()
    onFinish({ duration: elapsed, completedSets: completed, totalSets: total, totalVolume: volume, exercises: exos.map(e => ({ name: e.name, muscle: e.muscle, exerciseId: e.exerciseId, setsTarget: e.targetSets, sets: e.sets.filter(s => s.done).map(s => ({ weight: s.weight, reps: s.reps, rir: s.rir })) })) })
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

  if (mode === 'custom') return <CustomBuilder onStart={(n, exercises) => { setExos(prev => [...prev, ...exercises.map(e => ({ id: uid(), name: e.exercise_name || e.name || t('exercise'), muscle: e.muscle_group || '', targetSets: e.sets || 3, targetReps: String(e.reps || '10-12'), rest: getRestSeconds(e), tempo: undefined, rir: null, notes: e.notes || '', videoUrl: e.video_url, exerciseId: null, sets: makeSets(e.sets || 3), open: true }))]); setSessionModified(true); setMode('session') }} onCancel={() => setMode('session')} />
  if (done) {
    return (
      <WorkoutCompletionView
        sessionName={sessionName}
        elapsedMs={elapsed}
        completedSets={completed}
        totalSets={total}
        totalVolume={volume}
        exercises={exos}
        summary={summary}
        summaryLoading={summaryLoading}
        autoRedirectCountdown={autoRedirectCountdown}
        now={new Date()}
        locale={locale}
        t={t}
        tMuscle={tMuscle}
        formatDuration={dur}
        onClose={onClose}
      />
    )
  }

  return (
    <div data-workout-phase="active" className="fixed inset-0 z-50 overflow-y-auto" style={{ background: BG_BASE, fontFamily: FONT_BODY }}>
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
        <WorkoutDraftResumeView sessionName={sessionName} t={t} onDiscard={discardDraft} onResume={resumeDraft} />
      )}

      {/* REST DONE POPUP — only shows when timer reaches 0 */}
      {restDone && (
        <WorkoutRestCompleteView message={restNextInfo || motivationalMsg} t={t}
          onAddThirtySeconds={() => { dismissRestDone(); startRest(30, restExoId || undefined, restNextInfo) }}
          onContinue={dismissRestDone} />
      )}
      {showVideo && (<div className="fixed inset-0 z-[70] flex items-center justify-center p-5" style={{ background: 'rgba(0,0,0,0.95)' }}><div className="w-full max-w-sm"><div className="flex justify-between items-center mb-4"><span style={{ color: TEXT_PRIMARY, fontFamily: FONT_ALT, fontWeight: 700, fontSize: '0.875rem' }}>{t('demo')}</span><button aria-label={t('closeVideo')} onClick={() => setShowVideo(null)} className="w-9 h-9 flex items-center justify-center" style={{ background: colors.surface2, border: `1px solid ${colors.divider}`, borderRadius: '50%' }}><X size={16} style={{ color: TEXT_PRIMARY }} /></button></div><video src={showVideo} controls autoPlay className="w-full" style={{ borderRadius: RADIUS_CARD }} /></div></div>)}

      <WorkoutActiveSessionHeaderView sessionName={sessionName} elapsed={dur(elapsed)} completedSets={completed} totalSets={total} progressPercent={pct} t={t} onClose={onClose} />

      {/* EXERCICES */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 0, padding: '16px 12px', paddingBottom: 'calc(120px + env(safe-area-inset-bottom, 0px))' }}>
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
                    <div style={{ fontSize: 15, color: TEXT_PRIMARY, fontWeight: 700, lineHeight: 1.2, fontFamily: FONT_BODY }}>{getExerciseName(exo, locale)}</div>
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
          // Progression badge — "même stade" : compare le volume cumulé des N premiers sets communs
          const progressBadge = (() => {
            const prev = previousData[exo.name]
            if (!prev?.length) return null
            const doneSets = exo.sets.filter(s => s.done && s.weight !== '' && s.reps !== '')
            if (!doneSets.length) return null
            const n = Math.min(doneSets.length, prev.length)
            const curVol = doneSets.slice(0, n).reduce((s, st) => s + Number(st.weight) * Number(st.reps), 0)
            const prevVol = prev.slice(0, n).reduce((s, st) => s + st.weight * st.reps, 0)
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
                    <span style={{ fontSize: 24, fontWeight: 700, color: TEXT_PRIMARY, letterSpacing: '0.02em', lineHeight: 1, textTransform: 'uppercase' as const, fontFamily: FONT_BODY }}>{getExerciseName(exo, locale)}</span>
                    {progressBadge !== null && (
                      <span style={{ fontSize: 14, fontWeight: 700, padding: '5px 12px', borderRadius: 8, fontFamily: FONT_ALT, background: progressBadge > 0 ? 'rgba(34,197,94,0.20)' : progressBadge < 0 ? 'rgba(239,68,68,0.20)' : 'rgba(255,255,255,0.12)', color: progressBadge > 0 ? colors.success : progressBadge < 0 ? colors.error : 'rgba(255,255,255,0.5)' }}>
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
                        <WorkoutActiveRestView
                          seconds={restSecs}
                          maximumSeconds={restMax}
                          currentRir={exo.sets.find(candidate => candidate.id === set.id)?.rir ?? null}
                          rirTrackingEnabled={Boolean(rirTrackingEnabled)}
                          rirScaleAdvanced={Boolean(rirScaleAdvanced)}
                          t={t}
                          onSetRir={setRir}
                          onAddThirtySeconds={addRestTime}
                          onSkip={skipRest}
                        />
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
      {!reorderMode && <WorkoutActiveSessionFinishView elapsed={dur(elapsed)} t={t} onFinish={() => setShowEndModal(true)} />}

      {showEndModal && !showDeleteConfirm && (
        <WorkoutEndConfirmationView
          elapsed={dur(elapsed)}
          completedSets={completed}
          totalSets={total}
          volume={volume}
          t={t}
          onSave={() => { setShowEndModal(false); sessionModified ? setShowSavePopup(true) : finish() }}
          onDelete={() => setShowDeleteConfirm(true)}
          onContinue={() => setShowEndModal(false)}
        />
      )}

      {showDeleteConfirm && (
        <WorkoutAbandonConfirmationView
          completedSets={completed}
          t={t}
          onCancel={() => setShowDeleteConfirm(false)}
          onConfirm={() => { setShowDeleteConfirm(false); setShowEndModal(false); runtime.stop(); cleanupDraft(); onClose() }}
        />
      )}

      {repsWarning && (
        <WorkoutRepetitionsWarningView
          repetitions={repsWarning.reps}
          t={t}
          onEdit={() => setRepsWarning(null)}
          onConfirm={() => { doValidate(repsWarning.eid, repsWarning.sid); setRepsWarning(null) }}
        />
      )}

      {showSaveTemplate && (
        <WorkoutTemplateSaveView
          templateName={templateName}
          t={t}
          onSelectName={setTemplateName}
          onSave={saveAsTemplate}
          onSkip={() => { setShowSaveTemplate(false); setDone(true) }}
        />
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
                    <div style={{fontFamily:FONT_BODY,fontSize:14,color:TEXT_PRIMARY,fontWeight:700}}>{getExerciseName(v, locale)}</div>
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
