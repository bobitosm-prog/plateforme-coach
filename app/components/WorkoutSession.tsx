'use client'
import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { Check, Plus, ArrowLeft, Search, X, Dumbbell, Clock, CheckCircle2 } from 'lucide-react'
import { useTranslations, useLocale } from 'next-intl'
import { getExerciseName } from '../../lib/i18n-exercise'
import { getMuscleLabel } from '../../lib/i18n-muscle'
import { createBrowserClient } from '@supabase/ssr'
import { colors, BG_BASE, BORDER, GOLD, GOLD_DIM, GOLD_RULE, GREEN, RED, TEXT_PRIMARY, TEXT_MUTED, TEXT_DIM, FONT_DISPLAY, FONT_ALT, FONT_BODY, btnPrimary } from '../../lib/design-tokens'
import { Reorder } from 'framer-motion'
import { initAudio, playBeep, playWarningTick, vibrateDevice, scheduleRestPeriodSounds, cancelScheduledSounds, type ScheduledSound } from '../../lib/timer-audio'
import { getRestSeconds } from '../../lib/utils/exercise'
import { TECHNIQUE_LABELS } from '../../lib/technique-labels'
import { useBeforeUnload } from '../hooks/useBeforeUnload'
import { computeProgression, getIncrementForExercise, parseRepsTarget, type PrevSessionSet } from '../../lib/training/compute-progression'
import {
  findNextWorkoutPosition,
  removeActiveWorkoutDraft,
  updateActiveWorkoutDraft,
  type ActiveWorkoutDraft,
  type WorkoutDraftExercise,
} from '../../lib/training/active-workout-draft'
import type { CompletedWorkoutData } from '../../lib/training/session-persistence'
import { TrainingV2 } from './training-v2/TrainingV2'
import TrainingSessionHero from './training-v2/TrainingSessionHero'
import SessionTimeline from './training-v2/SessionTimeline'
import ActiveExerciseFocus from './training-v2/ActiveExerciseFocus'
import CurrentSetEditor from './training-v2/CurrentSetEditor'
import ExerciseTools from './training-v2/ExerciseTools'
import RestTimerCompact from './training-v2/RestTimerCompact'
import TrainingSheet from './training-v2/TrainingSheet'
import SessionCompletion from './training-v2/SessionCompletion'
import trainingV2Styles from './training-v2/TrainingV2.module.css'
import {
  adjustRepsValue,
  adjustWeightValue,
  buildPreviousPerformanceMap,
  getPreviousPerformanceLimit,
  resolveCurrentSetPrefill,
  type PreviousPerformance,
  type PreviousExerciseReference,
} from '../../lib/training/set-logging'
import { extendRestTimerDeadline, resolveRestTimer } from '../../lib/training/rest-timer'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

interface ExSet { id: string; num: number; weight: number | ''; weightRaw: string; reps: number | ''; done: boolean; rir: number | null }
interface Exo { id: string; name: string; muscle: string; targetSets: number; targetReps: string; rest: number; tempo?: string; rir?: number | null; notes?: string; videoUrl?: string; imageUrl?: string; technique?: string; techniqueDetails?: string; exerciseId?: string | null; sets: ExSet[]; open: boolean }
interface ExerciseVariant { id?: string; name: string; equipment?: string | null; muscle_group?: string | null; video_url?: string | null }
interface VariantPopupState { exIdx: number; variants: ExerciseVariant[]; originalName: string; status: 'loading' | 'ready' | 'error' }
interface WorkoutFinishResult {
  newPRs?: { exercise: string; value: number }[]
  secondary?: Promise<{ newPRs: { exercise: string; value: number }[] }>
}
interface WorkoutSessionProps {
  draft: ActiveWorkoutDraft
  onDraftChange: (draft: ActiveWorkoutDraft) => void
  onFinish: (data: CompletedWorkoutData, draft?: ActiveWorkoutDraft) => Promise<WorkoutFinishResult>
  onClose: () => void
  onNavigateHome: () => void
  onNavigateProgress: () => void
  rirTrackingEnabled?: boolean
}

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
  const name = t('builder.defaultName')
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
            <button onClick={() => setSearch('')} style={{ position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)', width: 44, height: 44, borderRadius: '50%', background: GOLD_DIM, border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
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

export default function WorkoutSession({ draft, onDraftChange, onFinish, onClose, onNavigateHome, onNavigateProgress, rirTrackingEnabled }: WorkoutSessionProps) {
  const sessionName = draft.sessionName
  const startedAt = draft.startedAt
  const raw = draft.exercises
  const t = useTranslations('training_tab.ws')
  const tv2 = useTranslations('training_tab.v2')
  const locale = useLocale() as 'fr' | 'en' | 'de'
  const tMuscle = useTranslations('muscles')
  const supabase = createBrowserClient(SUPABASE_URL, SUPABASE_KEY)
  useBeforeUnload(true)
  const [mode, setMode] = useState<'session' | 'custom'>('session')
  const [exos, setExos] = useState<Exo[]>(() => raw as Exo[])
  const [activeExerciseIndex, setActiveExerciseIndex] = useState(() => (
    Math.min(Math.max(draft.currentExerciseIndex, 0), Math.max(raw.length - 1, 0))
  ))
  const draftRef = useRef(draft)
  const [draftPrompt, setDraftPrompt] = useState<Exo[] | null>(null)
  const [saving, setSaving] = useState(draft.status === 'saving')
  const [saveError, setSaveError] = useState(draft.status === 'save_error')
  useEffect(() => { draftRef.current = draft }, [draft])
  const onDraftChangeRef = useRef(onDraftChange)
  useEffect(() => { onDraftChangeRef.current = onDraftChange }, [onDraftChange])

  const persistDraft = useCallback((patch: Partial<ActiveWorkoutDraft>) => {
    const next = updateActiveWorkoutDraft(draftRef.current, patch)
    draftRef.current = next
    onDraftChangeRef.current(next)
  }, [])

  // The versioned draft is the single logical local authority.
  useEffect(() => {
    if (typeof window === 'undefined' || mode !== 'session') return
    persistDraft({ exercises: exos as WorkoutDraftExercise[] })
  }, [exos, mode, persistDraft])
  useEffect(() => {
    if (activeExerciseIndex < exos.length) return
    setActiveExerciseIndex(Math.max(exos.length - 1, 0))
  }, [activeExerciseIndex, exos.length])
  const resumeDraft = () => {
    if (draftPrompt) {
      setExos(draftPrompt.map(e => ({ ...e, sets: e.sets.map(s => ({ ...s, weightRaw: s.weightRaw ?? (s.weight !== '' ? String(s.weight).replace('.', ',') : '') })) })))
    }
    setDraftPrompt(null)
  }
  const discardDraft = () => { cleanupDraft(); setDraftPrompt(null) }

  const [restOn, setRestOn] = useState(false)
  const [restSecs, setRestSecs] = useState(0)
  const [restDone, setRestDone] = useState(false)
  const restT = useRef<NodeJS.Timeout | null>(null)
  const restEndsAtRef = useRef(0)
  const restScheduledSoundsRef = useRef<ScheduledSound[]>([])
  const completeRestTimer = useCallback(() => {
    if (restScheduledSoundsRef.current.length > 0) {
      cancelScheduledSounds(restScheduledSoundsRef.current)
      restScheduledSoundsRef.current = []
    }
    setRestOn(false)
    setRestSecs(0)
    setRestDone(true)
    persistDraft({ restTimerEndAt: null })
    playBeep()
    vibrateDevice()
  }, [persistDraft])
  useEffect(() => {
    if (!draft.restTimerEndAt) return
    const snapshot = resolveRestTimer(draft.restTimerEndAt)
    if (snapshot.state === 'finished') {
      completeRestTimer()
      return
    }
    if (snapshot.state !== 'running' || snapshot.endAt === null) return
    restEndsAtRef.current = snapshot.endAt
    setRestSecs(snapshot.remainingSeconds)
    setRestOn(true)
  }, [completeRestTimer, draft.restTimerEndAt])
  const [t0] = useState(() => startedAt ? new Date(startedAt).getTime() : Date.now())
  const [elapsed, setElapsed] = useState(() => startedAt ? Date.now() - new Date(startedAt).getTime() : 0)
  const elT = useRef<NodeJS.Timeout | null>(null)
  const [done, setDone] = useState(false)
  const [completionRecords, setCompletionRecords] = useState<{ exercise: string; value: number }[]>([])
  const [showVideo, setShowVideo] = useState<string | null>(null)
  const [sessionModified, setSessionModified] = useState(false)
  const [variantPopup, setVariantPopup] = useState<VariantPopupState | null>(null)
  const [exerciseInfo, setExerciseInfo] = useState<any>(null)
  const [exerciseInfoLoading, setExerciseInfoLoading] = useState(false)
  const [exerciseInfoError, setExerciseInfoError] = useState(false)
  const [videoError, setVideoError] = useState(false)
  const [reorderMode, setReorderMode] = useState(false)
  const [previousPerformance, setPreviousPerformance] = useState<Record<string, PreviousPerformance>>({})
  const previousLoadStartedRef = useRef(false)
  const [setStatusMessage, setSetStatusMessage] = useState('')
  const [showEndModal, setShowEndModal] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [repsWarning, setRepsWarning] = useState<{ eid: string; sid: string; reps: number } | null>(null)

  const progressionByExo = useMemo(() => {
    const map: Record<string, ReturnType<typeof computeProgression>> = {}
    for (const exo of exos) {
      const progression = computeProgression(
        previousPerformance[exo.id]?.sessions ?? [],
        parseRepsTarget(exo.targetReps),
        exo.name,
      )
      map[exo.id] = progression
      map[exo.name] = progression
    }
    return map
  }, [exos, previousPerformance])

  // Compatibility adapter for the existing progression helper.
  const prevSessionsByExo = useMemo<Record<string, PrevSessionSet[][] | null>>(() => Object.fromEntries(
    exos.map(exercise => {
      const performance = previousPerformance[exercise.id]
      return [exercise.name, performance?.state === 'error' ? null : performance?.sessions ?? []]
    }),
  ), [exos, previousPerformance])

  const previousReferences = useMemo<PreviousExerciseReference[]>(() => exos.map(exercise => ({
    key: exercise.id,
    exerciseId: exercise.exerciseId ?? null,
    name: exercise.name,
  })), [exos])

  // Exactly one bounded previous-performance read per mounted active draft.
  useEffect(() => {
    if (previousLoadStartedRef.current || previousReferences.length === 0) return
    previousLoadStartedRef.current = true
    const fetchPrev = async () => {
      const { data: userData } = await supabase.auth.getUser()
      const userId = userData?.user?.id
      if (!userId) {
        setPreviousPerformance(buildPreviousPerformanceMap(previousReferences, [], true))
        return
      }
      const { data, error } = await supabase
        .from('workout_sets')
        .select('exercise_id, exercise_name, weight, reps, set_number, session_id, completed, created_at, rir')
        .eq('user_id', userId)
        .eq('completed', true)
        .order('created_at', { ascending: false })
        .limit(getPreviousPerformanceLimit(previousReferences.length))
      setPreviousPerformance(buildPreviousPerformanceMap(previousReferences, data || [], Boolean(error)))
    }
    void fetchPrev()
  }, [draft.draftId, previousReferences, supabase])

  // Prefill empty draft values only: draft > prescription > previous > empty.
  useEffect(() => {
    if (Object.keys(previousPerformance).length === 0) return
    setExos(current => {
      let changed = false
      const next = current.map(exercise => {
        const performance = previousPerformance[exercise.id]
        const prescribedReps = parseRepsTarget(exercise.targetReps)
        const sets = exercise.sets.map((set, index) => {
          if (set.done) return set
          const previousSet = performance?.latestSets[index]
          const prefill = resolveCurrentSetPrefill({
            draftWeight: set.weight,
            draftWeightRaw: set.weightRaw,
            draftReps: set.reps,
            prescribedReps,
            previousWeight: previousSet?.weight,
            previousReps: previousSet?.reps,
          })
          if (prefill.weight === set.weight && prefill.weightRaw === set.weightRaw && prefill.reps === set.reps) return set
          changed = true
          return { ...set, weight: prefill.weight, weightRaw: prefill.weightRaw, reps: prefill.reps }
        })
        return sets === exercise.sets ? exercise : { ...exercise, sets }
      })
      return changed ? next : current
    })
  }, [previousPerformance])

  useEffect(() => { elT.current = setInterval(() => setElapsed(Date.now() - t0), 1000); return () => { if (elT.current) clearInterval(elT.current) } }, [])

  const prevRemaining = useRef(Infinity)
  useEffect(() => {
    if (!restOn) { prevRemaining.current = Infinity; return }
    const tick = () => {
      const remaining = Math.max(0, Math.ceil((restEndsAtRef.current - Date.now()) / 1000))
      const previousRemaining = prevRemaining.current
      setRestSecs(remaining)
      if (remaining === 5 && previousRemaining > 5) { playWarningTick(); vibrateDevice() }
      prevRemaining.current = remaining
      if (remaining === 0 && previousRemaining > 0) {
        completeRestTimer()
      }
    }
    tick()
    restT.current = setInterval(tick, 200)
    return () => { if (restT.current) clearInterval(restT.current) }
  }, [completeRestTimer, restOn])
  // Force recalc when app becomes visible (iOS Safari suspends setInterval)
  useEffect(() => {
    if (!restOn) return
    const onVisible = () => {
      if (document.visibilityState !== 'visible') return
      const remaining = Math.max(0, Math.ceil((restEndsAtRef.current - Date.now()) / 1000))
      setRestSecs(remaining)
      if (remaining === 0) {
        completeRestTimer()
      }
    }
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('focus', onVisible)
    return () => {
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('focus', onVisible)
    }
  }, [completeRestTimer, restOn])
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

  const cleanupDraft = () => { removeActiveWorkoutDraft(localStorage, draftRef.current.draftId) }

  const startRest = (s: number) => {
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
    setRestSecs(s); setRestOn(true); setRestDone(false)
    persistDraft({ restTimerEndAt: new Date(restEndsAtRef.current).toISOString() })
  }
  const skipRest = () => {
    // Cancel scheduled audio cues so they don't fire after skip
    if (restScheduledSoundsRef.current.length > 0) {
      cancelScheduledSounds(restScheduledSoundsRef.current)
      restScheduledSoundsRef.current = []
    }
    setRestOn(false); setRestDone(false); setRestSecs(0)
    persistDraft({ restTimerEndAt: null })
  }
  const addRestTime = () => {
    restEndsAtRef.current = extendRestTimerDeadline(restEndsAtRef.current, 30)
    persistDraft({ restTimerEndAt: new Date(restEndsAtRef.current).toISOString() })
  }
  const dismissRestDone = () => { setRestDone(false) }
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

    // Project the next set before the asynchronous state update.
    const projectedSets = targetExo?.sets.map(s =>
      s.id !== sid ? s : { ...s, done: true }
    ) ?? []
    const nextUndone = projectedSets.find(s => !s.done)

    const updatedExercises = exos.map(e => e.id !== eid ? e : {
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
    })
    setExos(updatedExercises)
    const exerciseIndex = updatedExercises.findIndex(exercise => exercise.id === eid)
    const setIndex = updatedExercises[exerciseIndex]?.sets.findIndex(set => set.id === sid) ?? 0
    const nextPosition = findNextWorkoutPosition(updatedExercises as WorkoutDraftExercise[], exerciseIndex, setIndex)
    persistDraft({
      exercises: updatedExercises as WorkoutDraftExercise[],
      ...nextPosition,
    })
    setActiveExerciseIndex(nextPosition.currentExerciseIndex)

    if (nextPosition.currentExerciseIndex > exerciseIndex) {
      setSetStatusMessage(tv2('nextExerciseReady'))
    } else if (nextUndone) {
      setSetStatusMessage(tv2('nextSetReady', { set: nextUndone.num }))
    } else {
      setSetStatusMessage(tv2('workoutComplete'))
    }

    startRest(r)
  }
  const validate = (eid: string, sid: string) => {
    const exo = exos.find(e => e.id === eid)
    const set = exo?.sets.find(s => s.id === sid)
    const reps = Number(set?.reps) || 0
    if (reps > 15) { setRepsWarning({ eid, sid, reps }); return }
    doValidate(eid, sid)
  }
  const setSetRir = (eid: string, sid: string, value: number) => {
    setExos(p => p.map(e => e.id !== eid ? e : { ...e, sets: e.sets.map(s => s.id !== sid ? s : { ...s, rir: value }) }))
  }

  const total = exos.reduce((s, e) => s + e.sets.length, 0)
  const completed = exos.reduce((s, e) => s + e.sets.filter(s => s.done).length, 0)
  const volume = exos.reduce((v, e) => v + e.sets.filter(s => s.done && s.weight && s.reps).reduce((sv, s) => sv + Number(s.weight) * Number(s.reps), 0), 0)
  const completedExercises = exos.filter(exercise => (
    exercise.sets.length > 0 && exercise.sets.every(set => set.done)
  )).length
  const timelineExercises = exos.map(exercise => ({
    id: exercise.id,
    name: getExerciseName(exercise, locale),
    completedSets: exercise.sets.filter(set => set.done).length,
    totalSets: exercise.sets.length,
  }))

  const selectExercise = (index: number) => {
    const exercise = exos[index]
    if (!exercise) return
    const currentSetIndex = Math.max(exercise.sets.findIndex(set => !set.done), 0)
    setActiveExerciseIndex(index)
    persistDraft({ currentExerciseIndex: index, currentSetIndex })
  }

  const finish = async () => {
    if (saving) return
    if (elT.current) clearInterval(elT.current)
    setSaving(true)
    setSaveError(false)
    try {
      const result = await onFinish({ duration: elapsed, completedSets: completed, totalSets: total, totalVolume: volume, exercises: exos.map(e => ({ name: e.name, muscle: e.muscle, exerciseId: e.exerciseId, setsTarget: e.targetSets, sets: e.sets.filter(s => s.done).map(s => ({ weight: s.weight, reps: s.reps, rir: s.rir })) })) }, draftRef.current)
      setCompletionRecords(result.newPRs ?? [])
      setSaving(false)
      setDone(true)
      void result.secondary?.then(secondary => setCompletionRecords(secondary.newPRs)).catch(() => undefined)
    } catch {
      setSaving(false)
      setSaveError(true)
    }
  }
  async function loadVariantsForSession(exo: Exo, exIdx: number) {
    setVariantPopup({ exIdx, variants: [], originalName: exo.name, status: 'loading' })
    try {
      const { data: current, error: currentError } = await supabase
        .from('exercises_db')
        .select('variant_group, equipment')
        .ilike('name', exo.name)
        .limit(1)
        .maybeSingle()
      if (currentError) throw currentError

      let variants: ExerciseVariant[] = []
      if (current?.variant_group) {
        const { data, error } = await supabase
          .from('exercises_db')
          .select('id, name, equipment, muscle_group, video_url')
          .eq('variant_group', current.variant_group)
          .neq('name', exo.name)
          .limit(5)
        if (error) throw error
        variants = (data || []) as ExerciseVariant[]
      } else {
        const baseName = exo.name.split(' ').slice(0, 2).join(' ')
        const { data, error } = await supabase
          .from('exercises_db')
          .select('id, name, equipment, muscle_group, video_url')
          .ilike('name', `%${baseName}%`)
          .neq('name', exo.name)
          .limit(5)
        if (error) throw error
        variants = (data || []) as ExerciseVariant[]
      }
      if (current?.equipment) {
        variants.sort((left, right) => Number(right.equipment === current.equipment) - Number(left.equipment === current.equipment))
      }
      setVariantPopup({ exIdx, variants, originalName: exo.name, status: 'ready' })
    } catch {
      setVariantPopup({ exIdx, variants: [], originalName: exo.name, status: 'error' })
    }
  }
  async function openExerciseInfo(exo: Exo) {
    setExerciseInfo({ name: exo.name })
    setExerciseInfoLoading(true)
    setExerciseInfoError(false)
    const fields = 'name, muscle_group, equipment, difficulty, description, execution_tips, instructions, tips, gif_url, video_url, variant_group'
    try {
      const exact = await supabase.from('exercises_db')
        .select(fields).ilike('name', exo.name).limit(1).maybeSingle()
      if (exact.error) throw exact.error
      let data = exact.data
      if (!data) {
        const fuzzy = await supabase.from('exercises_db')
          .select(fields).ilike('name', `%${exo.name}%`).limit(1).maybeSingle()
        if (fuzzy.error) throw fuzzy.error
        data = fuzzy.data
      }
      setExerciseInfo(data || { name: exo.name })
    } catch {
      setExerciseInfoError(true)
    } finally {
      setExerciseInfoLoading(false)
    }
  }
  function selectSessionVariant(v: ExerciseVariant) {
    if (!variantPopup) return
    const replacedExercise = exos[variantPopup.exIdx]
    if (replacedExercise?.sets.some(set => set.done) && !window.confirm(tv2('replaceCompletedConfirm'))) return
    setExos(prev => prev.map((e, i) => i === variantPopup.exIdx ? {
      ...e,
      name: v.name,
      muscle: v.muscle_group || e.muscle,
      exerciseId: v.id || e.exerciseId,
      videoUrl: v.video_url || undefined,
    } : e))
    setSessionModified(true)
    setVariantPopup(null)
  }

  if (mode === 'custom') return <CustomBuilder onStart={(n, exercises) => { setExos(prev => [...prev, ...exercises.map(e => ({ id: uid(), name: e.exercise_name || e.name || t('exercise'), muscle: e.muscle_group || '', targetSets: e.sets || 3, targetReps: String(e.reps || '10-12'), rest: getRestSeconds(e), tempo: undefined, rir: null, notes: e.notes || '', videoUrl: e.video_url, exerciseId: null, sets: makeSets(e.sets || 3), open: true }))]); setSessionModified(true); setMode('session') }} onCancel={() => setMode('session')} />

  if (done) {
    return (
      <SessionCompletion
        sessionName={sessionName}
        duration={dur(elapsed)}
        completedSets={completed}
        completedExercises={completedExercises}
        records={completionRecords}
        onGoHome={onNavigateHome}
        onGoProgress={onNavigateProgress}
      />
    )
  }

  return (
    <TrainingV2 session>
    <div className={`${trainingV2Styles.sessionShell} fixed inset-0 z-50 overflow-y-auto`} style={{ fontFamily: FONT_BODY }}>
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
      {(saving || saveError) && (
        <div role="alertdialog" aria-modal="true" aria-labelledby="workout-save-status" style={{ position: 'fixed', inset: 0, zIndex: 10020, background: 'rgba(0,0,0,0.88)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div style={{ width: '100%', maxWidth: 360, padding: 24, borderRadius: 18, background: BG_BASE, border: `1px solid ${saveError ? RED : GOLD}`, textAlign: 'center' }}>
            <h2 id="workout-save-status" style={{ margin: '0 0 10px', color: saveError ? RED : GOLD, fontFamily: FONT_ALT, fontSize: 17 }}>
              {saving ? t('done.saving') : t('done.saveErrorTitle')}
            </h2>
            <p style={{ margin: '0 0 20px', color: TEXT_MUTED, fontFamily: FONT_BODY, fontSize: 14, lineHeight: 1.5 }}>
              {saving
                ? t('done.saving')
                : t('done.saveErrorDescription')}
            </p>
            {saveError && (
              <button onClick={() => void finish()} style={{ ...btnPrimary, width: '100%', padding: 14 }}>
                {t('done.retry')}
              </button>
            )}
          </div>
        </div>
      )}
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

      {showVideo && (
        <TrainingSheet title={tv2('video')} onClose={() => { setShowVideo(null); setVideoError(false) }}>
          {videoError ? (
            <div className={trainingV2Styles.toolError} role="status">{tv2('videoError')}</div>
          ) : (
            <video src={showVideo} controls preload="metadata" onError={() => setVideoError(true)} className={trainingV2Styles.exerciseVideo} />
          )}
        </TrainingSheet>
      )}

      {/* Compact safe exit; application bottom navigation remains behind this fullscreen shell. */}
      <div style={{ width: 'min(100%, 1180px)', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 4px 12px' }}>
        <button aria-label={t('back')} onClick={onClose} style={{ width: 44, height: 44, display: 'grid', placeItems: 'center', background: 'transparent', border: `1px solid ${BORDER}`, borderRadius: 14, cursor: 'pointer' }}>
          <ArrowLeft size={20} color={TEXT_PRIMARY} />
        </button>
        <span style={{ fontSize: 11, color: TEXT_MUTED, fontFamily: FONT_ALT, fontWeight: 800, letterSpacing: '0.16em', textTransform: 'uppercase' }}>{draft.programSource === 'coach' ? tv2('coachPlan') : tv2('personalProgram')}</span>
      </div>

      <div style={{ width: 'min(100%, 1180px)', margin: '0 auto' }}>
        <TrainingSessionHero
          mode="active"
          title={sessionName || t('freeSession')}
          exerciseCount={exos.length}
          completedExercises={completedExercises}
          totalSets={total}
          completedSets={completed}
          elapsed={dur(elapsed)}
        />
      </div>

      <div className={trainingV2Styles.sessionGrid}>
      <SessionTimeline exercises={timelineExercises} activeIndex={activeExerciseIndex} onSelect={selectExercise} />

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
            <Reorder.Group axis="y" values={exos} onReorder={(newOrder) => { setExos(newOrder); setSessionModified(true) }} style={{ listStyle: 'none', padding: 0, margin: 0 }}>
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
            <button onClick={() => setReorderMode(false)} style={{ width: '100%', minHeight: 44, background: GOLD, padding: 14, borderRadius: 12, border: 'none', textAlign: 'center', fontSize: 13, fontWeight: 800, color: colors.onGold, letterSpacing: '0.15em', marginTop: 18, cursor: 'pointer', fontFamily: FONT_ALT }}>{t('reorder.done')}</button>
          </div>
        )}

        {/* ── Normal exercise list ── */}
        {!reorderMode && exos.map((exo, idx) => {
          if (idx !== activeExerciseIndex) return null
          const firstUndone = exo.sets.findIndex(set => !set.done)
          const activeSetIndex = firstUndone >= 0 ? firstUndone : Math.max(exo.sets.length - 1, 0)
          const activeSet = exo.sets[activeSetIndex]
          const activeSetNumber = activeSet?.num ?? 1
          const previousState = prevSessionsByExo[exo.name]
          const previousSet = previousPerformance[exo.id]?.latestSets[activeSetIndex]
          const previousLabel = previousSet
            ? `${previousSet.weight} kg × ${previousSet.reps}${previousSet.rir != null ? ` · RIR ${previousSet.rir === 4 ? '4+' : previousSet.rir}` : ''}`
            : null
          const progression = progressionByExo[exo.id]
          const targetLabel = progression
            ? `${fmtStep(progression.weight)} kg × ${parseRepsTarget(exo.targetReps) ?? exo.targetReps}`
            : `${exo.targetReps} reps`
          const suggestion = progression && !activeSet?.done
            ? {
                label: progression.status === 'progress'
                  ? tv2('suggestionIncrease', { step: fmtStep(progression.step), weight: fmtStep(progression.weight) })
                  : progression.status === 'deload'
                    ? tv2('suggestionReduce', { weight: fmtStep(progression.weight) })
                    : tv2('suggestionKeep', { weight: fmtStep(progression.weight) }),
                weight: progression.weight,
              }
            : null
          const techniqueSummary = [
            exo.tempo ? `Tempo ${exo.tempo}` : null,
            exo.technique && TECHNIQUE_LABELS[exo.technique]
              ? `${TECHNIQUE_LABELS[exo.technique].emoji} ${TECHNIQUE_LABELS[exo.technique].label}${exo.techniqueDetails ? ` · ${exo.techniqueDetails}` : ''}`
              : null,
          ].filter(Boolean).join(' · ') || null
          return (
            <ActiveExerciseFocus
              key={exo.id}
              name={getExerciseName(exo, locale)}
              exerciseIndex={idx}
              exerciseCount={exos.length}
              activeSet={activeSetNumber}
              totalSets={exo.sets.length}
              previous={previousLabel}
              previousError={previousState === null}
              target={targetLabel}
            >
            <div style={{ marginBottom: 12 }}>
              <div className={trainingV2Styles.focusExecutionLayout}>
                <div className={trainingV2Styles.focusEditorColumn}>
                  {activeSet && (
                    <CurrentSetEditor
                      setNumber={activeSet.num}
                      totalSets={exo.sets.length}
                      weight={activeSet.weightRaw ?? ''}
                      reps={activeSet.reps}
                      rir={activeSet.rir}
                      weightStep={getIncrementForExercise(exo.name)}
                      showRir={Boolean(rirTrackingEnabled)}
                      canValidate={!activeSet.done && (activeSet.weightRaw !== '' || activeSet.reps !== '')}
                      suggestion={suggestion}
                      statusMessage={setStatusMessage}
                      onWeightChange={value => { setSetStatusMessage(''); setField(exo.id, activeSet.id, 'weight', value) }}
                      onWeightBlur={() => commitWeight(exo.id, activeSet.id)}
                      onAdjustWeight={direction => {
                        setSetStatusMessage('')
                        setField(exo.id, activeSet.id, 'weight', adjustWeightValue(activeSet.weightRaw || String(activeSet.weight || ''), direction, getIncrementForExercise(exo.name)))
                      }}
                      onRepsChange={value => {
                        setSetStatusMessage('')
                        setField(exo.id, activeSet.id, 'reps', value.replace(/\D/g, ''))
                      }}
                      onAdjustReps={direction => {
                        setSetStatusMessage('')
                        setField(exo.id, activeSet.id, 'reps', String(adjustRepsValue(activeSet.reps, direction)))
                      }}
                      onRirChange={value => setSetRir(exo.id, activeSet.id, value)}
                      onUseSuggestion={() => {
                        if (!suggestion) return
                        setSetStatusMessage('')
                        setField(exo.id, activeSet.id, 'weight', fmtStep(suggestion.weight))
                      }}
                      onValidate={() => validate(exo.id, activeSet.id)}
                    />
                  )}
                </div>

                <aside className={trainingV2Styles.contextRail}>
                  {(restOn || restDone) && (
                    <RestTimerCompact
                      state={restDone ? 'finished' : 'running'}
                      remainingSeconds={restSecs}
                      onSkip={skipRest}
                      onAddThirtySeconds={addRestTime}
                      onDismissFinished={dismissRestDone}
                    />
                  )}
                  <ExerciseTools
                    notes={exo.notes?.trim() || null}
                    technique={techniqueSummary}
                    videoAvailable={Boolean(exo.videoUrl)}
                    onOpenDetails={() => void openExerciseInfo(exo)}
                    onOpenVideo={() => { if (exo.videoUrl) { setVideoError(false); setShowVideo(exo.videoUrl) } }}
                    onReplace={() => void loadVariantsForSession(exo, idx)}
                  />
                </aside>
              </div>

            </div>
            </ActiveExerciseFocus>
          )
        })}

        {/* Reorder link — visible only in normal mode with 2+ exos */}
        {exos.length >= 2 && !reorderMode && (
          <div style={{ textAlign: 'center', padding: '6px 0', marginBottom: 14 }}>
            <button onClick={() => setReorderMode(true)} style={{ minHeight: 44, background: 'transparent', border: 'none', fontSize: 12, color: 'rgba(201,168,76,0.6)', letterSpacing: '0.05em', textDecoration: 'underline', textDecorationColor: 'rgba(201,168,76,0.3)', textUnderlineOffset: 3, cursor: 'pointer', fontFamily: FONT_BODY }}>{t('reorderLink')}</button>
          </div>
        )}

        {/* Spacer to keep scroll above bottom bar */}
        <div style={{ height: 8 }} />
      </div>
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
          <button onClick={() => setShowEndModal(true)} className="active:scale-95" style={{ minHeight: 44, background: GOLD, border: 'none', borderRadius: 12, padding: '12px 0', width: '60%', maxWidth: 280, color: colors.onGold, fontFamily: FONT_DISPLAY, fontSize: 16, letterSpacing: '2px', cursor: 'pointer', textTransform: 'uppercase' as const }}>{t('finish')}</button>
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
            {sessionModified && (
              <p style={{ fontFamily: FONT_BODY, fontSize: 12, lineHeight: 1.5, color: TEXT_MUTED, textAlign: 'center', margin: '0 0 16px' }}>
                {t('endModal.sessionOnly')}
              </p>
            )}
            {/* Save button */}
            <button onClick={() => { setShowEndModal(false); void finish() }} className="active:scale-[0.98]" style={{
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

      {/* Exercise info popup */}
      {exerciseInfo && (
        <TrainingSheet title={getExerciseName(exerciseInfo, locale)} onClose={() => setExerciseInfo(null)}>
          {exerciseInfoLoading ? (
            <div className={trainingV2Styles.toolState} role="status">{tv2('toolLoading')}</div>
          ) : exerciseInfoError ? (
            <div className={trainingV2Styles.toolError} role="status">
              <span>{tv2('detailsError')}</span>
              <button type="button" onClick={() => void openExerciseInfo(exos[activeExerciseIndex])}>{tv2('retry')}</button>
            </div>
          ) : (
            <div className={trainingV2Styles.exerciseInfoContent}>
              {exerciseInfo.video_url && (
                <video src={exerciseInfo.video_url} controls preload="metadata" className={trainingV2Styles.exerciseVideo} />
              )}
              {exerciseInfo.description && <p>{exerciseInfo.description}</p>}
              {exerciseInfo.instructions && (
                <section><h3>{t('exerciseInfo.execution')}</h3><p>{exerciseInfo.instructions}</p></section>
              )}
              {(exerciseInfo.execution_tips || exerciseInfo.tips) && (
                <section><h3>{t('exerciseInfo.tips')}</h3><p>{exerciseInfo.execution_tips || exerciseInfo.tips}</p></section>
              )}
              {!exerciseInfo.description && !exerciseInfo.instructions && !exerciseInfo.execution_tips && !exerciseInfo.tips && !exerciseInfo.video_url && (
                <div className={trainingV2Styles.toolState}>{tv2('detailsUnavailable')}</div>
              )}
            </div>
          )}
        </TrainingSheet>
      )}

      {/* Variant popup */}
      {variantPopup && (
        <TrainingSheet title={tv2('replaceForSession')} description={variantPopup.originalName} onClose={() => setVariantPopup(null)}>
          {variantPopup.status === 'loading' ? (
            <div className={trainingV2Styles.toolState} role="status">{tv2('replacementLoading')}</div>
          ) : variantPopup.status === 'error' ? (
            <div className={trainingV2Styles.toolError} role="status">
              <span>{tv2('replacementError')}</span>
              <button type="button" onClick={() => void loadVariantsForSession(exos[variantPopup.exIdx], variantPopup.exIdx)}>{tv2('retry')}</button>
            </div>
          ) : variantPopup.variants.length === 0 ? (
            <div className={trainingV2Styles.toolState}>{tv2('noReplacement')}</div>
          ) : (
            <div className={trainingV2Styles.variantList}>
              {variantPopup.variants.map(variant => (
                <button key={variant.id || variant.name} type="button" onClick={() => selectSessionVariant(variant)}>
                  <strong>{getExerciseName(variant, locale)}</strong>
                  <span>{[variant.equipment, variant.muscle_group ? getMuscleLabel(variant.muscle_group, locale, tMuscle) : null].filter(Boolean).join(' · ')}</span>
                </button>
              ))}
            </div>
          )}
          <p className={trainingV2Styles.sessionOnlyNotice}>{tv2('replacementSessionOnly')}</p>
        </TrainingSheet>
      )}

    </div>
    </TrainingV2>
  )
}
