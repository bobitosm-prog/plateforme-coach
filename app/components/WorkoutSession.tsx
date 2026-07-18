'use client'
import { useState, useEffect, useRef, useMemo } from 'react'
import { X } from 'lucide-react'
import { toast } from 'sonner'
import { useTranslations, useLocale } from 'next-intl'
import { normalizeExerciseName } from '../../lib/exercise-matching'
import { createBrowserClient } from '@supabase/ssr'
import { colors, BG_BASE, TEXT_PRIMARY, RADIUS_CARD, FONT_ALT, FONT_BODY } from '../../lib/design-tokens'
import { initAudio } from '../../lib/timer-audio'
import { getRestSeconds } from '../../lib/utils/exercise'
import { useBeforeUnload } from '../hooks/useBeforeUnload'
import { computeProgression, parseRepsTarget, type PrevSessionSet } from '../../lib/training/compute-progression'
import { discardWorkoutDraftSnapshot, restoreWorkoutDraftSnapshot, saveWorkoutDraftSnapshot } from '../../lib/training/workout-draft-sync'
import { useWorkoutRuntime } from '../hooks/useWorkoutRuntime'
import { WorkoutDraftResumeView } from './training/workout-session/WorkoutDraftResumeView'
import { WorkoutRestCompleteView } from './training/workout-session/WorkoutRestViews'
import { WorkoutCompletionView } from './training/workout-session/WorkoutCompletionView'
import { WorkoutAbandonConfirmationView, WorkoutEndConfirmationView, WorkoutRepetitionsWarningView, WorkoutTemplateSaveView } from './training/workout-session/WorkoutFinalizationViews'
import { WorkoutActiveSessionFinishView, WorkoutActiveSessionHeaderView } from './training/workout-session/WorkoutActiveSessionViews'
import { WorkoutCustomBuilder } from './training/workout-session/WorkoutCustomBuilder'
import { WorkoutExerciseEditor } from './training/workout-session/WorkoutExerciseEditor'
import { WorkoutSessionOverlays } from './training/workout-session/WorkoutSessionOverlays'
import type { WorkoutExerciseInfo, WorkoutExerciseVariant, WorkoutSessionExercise as Exo, WorkoutSessionSet as ExSet, WorkoutTempoExecutorState, WorkoutTempoModalState, WorkoutVariantPopupState } from './training/workout-session/types'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

interface WorkoutSessionProps { sessionName: string; exercises: any[]; startedAt?: string; onFinish: (data: any) => void; onClose: () => void; rirTrackingEnabled?: boolean; rirScaleAdvanced?: boolean }

const uid = () => Math.random().toString(36).slice(2)
const makeSets = (n: number): ExSet[] => Array.from({ length: n }, (_, i) => ({ id: uid(), num: i + 1, weight: '', weightRaw: '', reps: '', done: false, rir: null }))
const dur = (ms: number) => { const s = Math.floor(ms / 1000), h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60; if (h > 0) return `${h}h ${m}min`; if (m > 0) return `${m}min ${sec}s`; return `${sec}s` }

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
  const [variantPopup, setVariantPopup] = useState<WorkoutVariantPopupState | null>(null)
  const [exerciseInfo, setExerciseInfo] = useState<WorkoutExerciseInfo | null>(null)
  const [reorderMode, setReorderMode] = useState(false)
  const [previousData, setPreviousData] = useState<Record<string, { weight: number; reps: number }[]>>({})
  const [prevSessionsByExo, setPrevSessionsByExo] = useState<Record<string, PrevSessionSet[][]>>({})
  const [showEndModal, setShowEndModal] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [repsWarning, setRepsWarning] = useState<{ eid: string; sid: string; reps: number } | null>(null)
  const [tempoModal, setTempoModal] = useState<WorkoutTempoModalState | null>(null)
  const [tempoExecutor, setTempoExecutor] = useState<WorkoutTempoExecutorState | null>(null)

  // Parse the target reps for TempoExecutor (e.g. '8-10' → 10, '12' → 12)
  const parseTargetRepsForTempo = (targetReps: string): number => {
    if (!targetReps) return 10
    // If range like '8-10', use the higher number
    const parts = String(targetReps).split('-').map(s => parseInt(s.trim(), 10)).filter(n => !isNaN(n))
    if (parts.length === 0) return 10
    return Math.max(...parts)
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
  function selectSessionVariant(v: WorkoutExerciseVariant) {
    if (!variantPopup) return
    setExos(prev => prev.map((e, i) => i === variantPopup.exIdx ? { ...e, name: v.name, muscle: v.muscle_group || e.muscle } : e))
    setSessionModified(true)
    setVariantPopup(null)
  }

  if (mode === 'custom') return <WorkoutCustomBuilder onStart={(_name, exercises) => { setExos(prev => [...prev, ...exercises.map(e => ({ id: uid(), name: e.exercise_name || t('exercise'), muscle: e.muscle_group || '', targetSets: e.sets || 3, targetReps: String(e.reps || '10-12'), rest: getRestSeconds(e), tempo: undefined, rir: null, notes: e.notes || '', videoUrl: e.video_url ?? undefined, exerciseId: null, sets: makeSets(e.sets || 3), open: true }))]); setSessionModified(true); setMode('session') }} onCancel={() => setMode('session')} />
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

      <WorkoutExerciseEditor
        exos={exos} setExos={setExos} reorderMode={reorderMode} setReorderMode={setReorderMode}
        locale={locale} t={t} tMuscle={tMuscle} previousData={previousData} progressionByExo={progressionByExo}
        exerciseMenu={exerciseMenu} setExerciseMenu={setExerciseMenu}
        restOn={restOn} restExoId={restExoId} restSetId={restSetId} restSecs={restSecs} restMax={restMax}
        rirTrackingEnabled={rirTrackingEnabled} rirScaleAdvanced={rirScaleAdvanced}
        onMoveExercise={moveExercise} onRemoveExercise={removeExerciseDuringSession} onLoadVariants={loadVariantsForSession}
        onOpenExerciseInfo={openExerciseInfo} onOpenTempo={(tempo, name) => setTempoModal({ tempo, name })}
        onStartTempo={(exercise, setIndex) => { initAudio(); setTempoExecutor({ exoId: exercise.id, setIdx: setIndex, tempo: exercise.tempo!, name: exercise.name, targetReps: parseTargetRepsForTempo(exercise.targetReps) }) }}
        onSetField={setField} onCommitWeight={commitWeight} onValidate={validate} onUnvalidate={unvalidate}
        onSetRir={setRir} onAddRestTime={addRestTime} onSkipRest={skipRest} onAddSet={addSet}
        onAddExercise={() => setMode('custom')}
      />

      {/* BARRE BAS — centered TERMINER — hidden in reorder mode */}
      {!reorderMode && <WorkoutActiveSessionFinishView elapsed={dur(elapsed)} t={t} onFinish={() => setShowEndModal(true)} />}

      {showEndModal && !showDeleteConfirm && (
        <WorkoutEndConfirmationView
          elapsed={dur(elapsed)}
          completedSets={completed}
          totalSets={total}
          volume={volume}
          t={t}
          onSave={() => {
            setShowEndModal(false)
            if (sessionModified) setShowSavePopup(true)
            else finish()
          }}
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

      <WorkoutSessionOverlays
        exerciseInfo={exerciseInfo} variantPopup={variantPopup} showSavePopup={showSavePopup}
        tempoModal={tempoModal} tempoExecutor={tempoExecutor} locale={locale} t={t} tMuscle={tMuscle}
        onCloseExerciseInfo={() => setExerciseInfo(null)} onCloseVariants={() => setVariantPopup(null)}
        onSelectVariant={selectSessionVariant}
        onSaveChanges={() => { setShowSavePopup(false); finish() }}
        onUseOnce={() => { setSessionModified(false); setShowSavePopup(false); finish() }}
        onCancelSave={() => setShowSavePopup(false)}
        onCloseTempo={() => setTempoModal(null)} onCloseTempoExecutor={() => setTempoExecutor(null)}
      />
    </div>
  )
}
