'use client'

import { useState, useEffect, useRef } from 'react'
import { canonicalExerciseName } from '@/lib/training/exercise-identity'
import { RailOverlay } from '../ui/RailOverlay'
import { toDateStr } from '../../../lib/schedule-utils'
import { useTranslations, useLocale } from 'next-intl'
import { getExerciseName } from '../../../lib/i18n-exercise'
import { getMuscleLabel } from '../../../lib/i18n-muscle'
import { SESSION_TYPES as SESSION_TYPE_OPTIONS } from '../../../lib/session-types'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { consumeProgramStream } from '@/lib/training/consume-program-stream'
import { X, Plus, ChevronLeft, ChevronRight, Search, Trash2, Check } from 'lucide-react'
import {
  BG_BASE, BG_CARD, BG_CARD_2, BORDER, GOLD, GOLD_DIM, GOLD_RULE,
  GREEN, RED, BLUE, TEXT_PRIMARY, TEXT_MUTED, TEXT_DIM,
  RADIUS_CARD, FONT_DISPLAY, FONT_ALT, FONT_BODY, colors, Z_MODAL,
} from '../../../lib/design-tokens'
import { TechniqueExplanationCards } from '../tabs/training/TechniquePopup'
import ConfirmDialog from '../ui/ConfirmDialog'
import { useFocusTrap } from '../../hooks/useFocusTrap'
import { buildProgramParams, type Level } from '@/lib/training/build-program-params'
import type { Profile } from '@/lib/profile-service'
import { prescribedDuration } from '@/lib/training/exercise-measurement'
import { getRestSeconds } from '@/lib/utils/exercise'
import { editorDays, editExercise, setDayRest, resizeTrainingDays, editorDraftKey, readEditorDraft, programSessionCount, editorProgramContext } from '@/lib/training/program-editor'
import { resolveProgramExercise } from '@/lib/training/resolve-program'
import { mutateProgram } from '@/lib/training/program-mutation'
import { readActiveWorkoutDraft } from '@/lib/training/active-workout-draft'
import { isCatalogExerciseCompatible } from '@/lib/training/equipment-contract'
import { bisetFor, dropCount, restPausePrescription } from '@/lib/training/guided-techniques'
import { programTechniqueIssues, validateProgramEdit } from '@/lib/training/program-editor'

/* ─── Types ─── */
interface ProgramBuilderProps {
  supabase: any
  session: any
  aiAllowed?: boolean
  canMutate?: boolean
  onAiQuotaChange?: () => void
  onClose: () => void
  onSave: () => void
  editProgram?: any
  profile?: Profile | null
}

const MUSCLE_OPTIONS = ['Poitrine', 'Dos', 'Épaules', 'Bras', 'Jambes', 'Fessiers', 'Abdos']
const MUSCLE_FILTERS = ['Tous', 'Pectoraux', 'Dos', 'Épaules', 'Biceps', 'Triceps', 'Quadriceps', 'Ischio-jambiers', 'Fessiers', 'Mollets', 'Abdos']
const EQUIPMENT_OPTIONS = ['Haltères', 'Barre', 'Machine', 'Câble', 'Poids du corps', 'Autre']
const REST_OPTIONS = [30, 45, 60, 90, 120, 180]

/* ─── Shared styles ─── */
const inputStyle: React.CSSProperties = {
  background: BG_BASE,
  border: `1px solid ${BORDER}`,
  color: TEXT_PRIMARY,
  padding: '14px 16px',
  fontFamily: FONT_BODY,
  fontSize: '1rem',
  width: '100%',
  outline: 'none',
}

function selBtn(selected: boolean): React.CSSProperties {
  return {
    padding: '14px',
    border: `1.5px solid ${selected ? GOLD : BORDER}`,
    background: selected ? GOLD_DIM : BG_CARD,
    color: selected ? GOLD : TEXT_PRIMARY,
    cursor: 'pointer',
    fontFamily: FONT_ALT,
    fontWeight: 700,
    fontSize: 14,
    textTransform: 'uppercase',
    letterSpacing: '1px',
  }
}

const labelStyle: React.CSSProperties = {
  fontFamily: FONT_ALT,
  fontSize: 10,
  textTransform: 'uppercase',
  letterSpacing: '0.1em',
  color: TEXT_MUTED,
  marginBottom: 8,
}

import { padTo7Days, DAY_NAMES_FR } from '../../../lib/schedule-utils'

const DAY_NAMES = DAY_NAMES_FR
const DAY_SHORT = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']

/* ─── Component ─── */
export default function ProgramBuilder({ supabase, session, aiAllowed = true, canMutate = true, onAiQuotaChange, onClose, onSave, editProgram, profile }: ProgramBuilderProps) {
  const t = useTranslations('training_tab.builder')
  const tx = useTranslations('programWorkspace')
  const tTechnique = useTranslations('trainingTechnique')
  const guide = useTranslations('techniqueGuide')
  const locale = useLocale() as 'fr' | 'en' | 'de'
  const prescriptionContext=editorProgramContext(editProgram)
  const tMuscle = useTranslations('muscles')
  // Display-only day names (translated). DAY_NAMES at module-level stays FR for DB/padTo7Days.
  const dayNamesDisplay = DAY_NAMES // padTo7Days stores FR weekday in DB — display translation happens at render
  const dayShortDisplay = DAY_SHORT
  // AI config display labels (keys stay FR for backend API)
  const AI_OBJECTIVES = [
    { key: 'masse', label: t('config.objMasse') },
    { key: 'perte', label: t('config.objPerte') },
    { key: 'maintien', label: t('config.objMaintain') },
    { key: 'force', label: t('config.objForce') },
    { key: 'endurance', label: t('config.objEndurance') },
  ]
  const AI_LEVELS: Array<{ key: Level; label: string }> = [
    { key: 'debutant', label: t('config.lvlDebutant') },
    { key: 'intermediaire', label: t('config.lvlIntermediaire') },
    { key: 'avance', label: t('config.lvlAvance') },
  ]
  const AI_EQUIPMENT = [
    ...(profile ? [{ key: '__profile__', label: t('config.eqProfile') }] : []),
    { key: 'salle', label: t('config.eqSalle') },
    { key: 'halteres', label: t('config.eqHalteres') },
    { key: 'sans_materiel', label: t('config.eqSansMateriel') },
  ]
  const ALL_KEY = '__all__'
  const muscleFilterDisplay = [{ key: ALL_KEY, label: tMuscle('all') }, ...MUSCLE_FILTERS.slice(1).map(m => ({ key: m, label: getMuscleLabel(m, locale, tMuscle) }))]

  const [mode, setMode] = useState<'select' | 'ai' | 'manual' | 'custom-exercise'>('select')
  const [dbExercises, setDbExercises] = useState<any[]>([])
  const [customExercises, setCustomExercises] = useState<any[]>([])

  // AI mode
  const profileProgramParams = profile ? buildProgramParams(profile) : null
  const [aiObjective, setAiObjective] = useState(() => {
    if (profileProgramParams?.objective === 'prise de muscle') return 'masse'
    if (profileProgramParams?.objective === 'sèche') return 'perte'
    if (profileProgramParams?.objective === 'maintien') return 'maintien'
    return 'masse'
  })
  const [aiLevel, setAiLevel] = useState(() => profileProgramParams?.level ?? 'intermediaire')
  const [aiDays, setAiDays] = useState(() => profileProgramParams?.daysPerWeek ?? 4)
  const [aiDuration, setAiDuration] = useState(() => profileProgramParams?.duration ?? 60)
  const [aiEquipment, setAiEquipment] = useState(() => profileProgramParams ? '__profile__' : 'salle')
  const [aiPriorities, setAiPriorities] = useState<string[]>(() => profileProgramParams?.priorities ?? [])
  const [aiNotes, setAiNotes] = useState('')
  const [aiGenerating, setAiGenerating] = useState(false)
  const [aiResult, setAiResult] = useState<any>(null)

  // Manual mode
  const [programName, setProgramName] = useState(editProgram?.name??'')
  const [programDays, setProgramDays] = useState<any[]>(()=>editProgram?editorDays(editProgram.days||[]):[])
  const [scope,setScope]=useState<'phase'|'program'>('phase')
  const [reviewing,setReviewing]=useState(false)
  const reviewRef=useRef<HTMLElement>(null)
  useEffect(()=>{if(reviewing){reviewRef.current?.scrollIntoView?.({block:'start'});reviewRef.current?.focus()}},[reviewing])
  const [recovery,setRecovery]=useState<{name:string;days:any[];aiResult?:any}|null>(null)
  const mutationRetry=useRef<{body:string;id:string}|null>(null)
  const draftKey=editorDraftKey(session?.user?.id||'',editProgram?.id)
  const baseline=JSON.stringify(editProgram??null)
  const initialDays=editProgram?editorDays(editProgram.days||[]):[]
  const dirty=programName!==(editProgram?.name??'')||JSON.stringify(programDays)!==JSON.stringify(initialDays)
  const draftReady=useRef(false)
  useEffect(()=>{
    try {setRecovery(readEditorDraft(localStorage.getItem(draftKey),baseline))} catch { /* local storage unavailable */ }
    draftReady.current=true
  },[draftKey,baseline])
  useEffect(()=>{
    setReviewing(false)
    if(!draftReady.current||!dirty||recovery) return
    try {localStorage.setItem(draftKey,JSON.stringify({baseline,name:programName,days:programDays,aiResult,savedAt:Date.now()}))} catch { /* explicit close warning still protects changes */ }
  },[programName,programDays,draftKey,baseline,dirty,recovery,aiResult])
  useEffect(()=>{
    if(!dirty)return
    const warn=(event:BeforeUnloadEvent)=>{event.preventDefault();event.returnValue=''}
    window.addEventListener('beforeunload',warn)
    return()=>window.removeEventListener('beforeunload',warn)
  },[dirty])
  const [manualStep, setManualStep] = useState(0)
  const [showExerciseSearch, setShowExerciseSearch] = useState(false)
  const [exerciseSearchQuery, setExerciseSearchQuery] = useState('')
  const [exerciseSearchFilter, setExerciseSearchFilter] = useState('')
  const [editingDayIndex, setEditingDayIndex] = useState(0)
  const [exerciseToDelete, setExerciseToDelete] = useState<{ dayIdx: number; exIdx: number; name: string } | null>(null)
  const [swapMode, setSwapMode] = useState(false)
  const [swapFirst, setSwapFirst] = useState<number | null>(null)
  const [variantPopup, setVariantPopup] = useState<{dayIdx: number, exIdx: number, variants: any[]} | null>(null)

  // Custom exercise mode
  const [ceName, setCeName] = useState('')
  const [ceMuscle, setCeMuscle] = useState('')
  const [ceEquipment, setCeEquipment] = useState('')
  const [ceDescription, setCeDescription] = useState('')
  const [ceSets, setCeSets] = useState(3)
  const [ceReps, setCeReps] = useState(10)
  const [ceRest, setCeRest] = useState(90)
  const [saving, setSaving] = useState(false)
  const [userGender, setUserGender] = useState('male')
  const [exerciseCatalogError, setExerciseCatalogError] = useState(false)
  const [customExercisesError, setCustomExercisesError] = useState(false)
  const builderRef = useRef<HTMLDivElement>(null)

  useFocusTrap({
    active: true,
    containerRef: builderRef,
    onEscape: requestClose,
  })

  /* ─── Load exercises + profile gender (au montage) ─── */
  useEffect(() => {
    supabase.from('exercises_catalog').select('id, name, muscle_group, equipment, equipment_legacy').order('name').limit(200)
      .then(({ data, error }: any) => {
        setExerciseCatalogError(Boolean(error))
        if (!error) setDbExercises(data || [])
      })
    supabase.from('custom_exercises').select('*').eq('user_id', session.user.id).order('name')
      .then(({ data, error }: any) => {
        setCustomExercisesError(Boolean(error))
        if (!error) setCustomExercises(data || [])
      })
    supabase.from('profiles').select('gender').eq('id', session.user.id).single()
      .then(({ data }: any) => { if (data?.gender) setUserGender(data.gender) })
  }, [])

  /* ─── Charger le programme à éditer (réagit à editProgram) ─── */
  useEffect(() => {
    if (editProgram) {
      setProgramName(editProgram.name)
      setProgramDays(editorDays(editProgram.days || []))
      setMode('manual')
      setManualStep(1)
    }
  }, [editProgram])

  /* ─── AI generate ─── */
  async function generateAI() {
    if (!canMutate || !aiAllowed) {
      toast.error(t('toast.actionUnavailable'))
      return
    }
    setAiGenerating(true)
    const tid = toast.loading(t('toast.generating'))
    try {
      const res = await fetch('/api/generate-custom-program', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          objective: aiObjective, level: aiLevel, daysPerWeek: aiDays,
          duration: aiDuration,
          equipment: aiEquipment === '__profile__' ? profileProgramParams?.equipment ?? 'salle' : aiEquipment,
          priorities: aiPriorities,
          notes: aiNotes, gender: userGender,
        }),
      })
      const program = await consumeProgramStream(res)
      if (program) {
        setAiResult(program)
        setProgramName(program.program_name || 'Programme IA') // DB value, do not translate
        setProgramDays(padTo7Days(program.days || []))
        toast.success(t('toast.generated'))
      } else {
        toast.error(t('toast.generationError'))
      }
    } catch (e: any) {
      console.error('[ProgramBuilder] Fetch error:', e)
      toast.error(t('toast.networkError') + ': ' + (e.message || ''))
    }
    toast.dismiss(tid)
    setAiGenerating(false)
    onAiQuotaChange?.()
  }

  /* ─── Save custom exercise ─── */
  async function saveCustomExercise() {
    if (!canMutate || !ceName.trim()) return
    setSaving(true)
    const { data, error } = await supabase.from('custom_exercises').insert({
      user_id: session.user.id, name: ceName.trim(), muscle_group: ceMuscle,
      equipment: ceEquipment, description: ceDescription,
      sets: ceSets, reps: ceReps, rest_seconds: ceRest, is_private: true,
    }).select().single()
    if (error || !data) {
      toast.error(t('toast.persistenceError'))
    } else {
      setCustomExercises(prev => [...prev, data])
      toast.success(t('toast.exerciseCreated'))
      setCeName(''); setCeMuscle(''); setCeEquipment(''); setCeDescription('')
      setMode('manual')
    }
    setSaving(false)
  }

  /* ─── Save program ─── */
  async function saveProgram() {
    if (!canMutate || saving || !programName.trim()) return
    if (!validateProgramEdit(programDays, initialDays)) {
      const issue = programTechniqueIssues(programDays, initialDays).find(issue=>!issue.inherited)
      if (issue) {
        setEditingDayIndex(issue.day)
        toast.error(`${DAY_NAMES[issue.day]} — ${issue.name} : ${tTechnique(issue.code)}`)
      } else toast.error(tx('invalid'))
      return
    }
    if (!reviewing) { setReviewing(true); return }
    if (readActiveWorkoutDraft(localStorage, session.user.id)) { toast.error(tx('finishWorkout')); return }
    setSaving(true)
    try {
      await mutateProgram({action:'save',programId:editProgram?.id??null,expected:editProgram??null,candidate:{
        name:programName.trim(),days:programDays,description:editProgram?.description??aiResult?.description??'',
        source:editProgram ? undefined : aiResult?'ai':'manual',
      }},mutationRetry)
      try {localStorage.removeItem(draftKey)} catch { /* mutation already confirmed by server */ }
      toast.success(t('toast.programSaved'))
      onSave(); onClose()
    } catch(error) { toast.error(tx(error instanceof Error&&error.message==='PROGRAM_INVALID'?'invalid':'conflict')) }
    finally { setSaving(false) }
  }

  /* ─── Helpers ─── */
  function addExerciseToDay(exercise: any, isCustom: boolean) {
    setProgramDays(prev => {
      const updated = [...prev]
      const day = { ...updated[editingDayIndex] }
      day.exercises = [
        ...(day.exercises || []),
        {
          id: exercise.id,
          exercise_id: isCustom?undefined:exercise.id,
          name: exercise.name,
          muscle_group: exercise.muscle_group,
          sets: exercise.sets || 3,
          reps: prescribedDuration(exercise) ? 0 : exercise.reps || 10,
          duration_seconds: prescribedDuration(exercise),
          rest: getRestSeconds(exercise),
          rest_seconds: getRestSeconds(exercise),
          equipment: exercise.equipment,
          isCustom,
        },
      ]
      updated[editingDayIndex] = day
      return updated
    })
    setShowExerciseSearch(false)
  }

  function removeExerciseFromDay(dayIdx: number, exIdx: number) {
    setProgramDays(prev => {
      const updated = [...prev]
      const day = { ...updated[dayIdx] }
      day.exercises = [...(day.exercises || [])]
      day.exercises.splice(exIdx, 1)
      updated[dayIdx] = day
      return updated
    })
  }

  function updateExerciseField(dayIdx: number, exIdx: number, field: string, value: any) {
    setProgramDays(prev => {
      const updated = [...prev]
      const day = { ...updated[dayIdx] }
      day.exercises = [...(day.exercises || [])]
      day.exercises[exIdx] = editExercise(day.exercises[exIdx],field,value,prescriptionContext,scope)
      updated[dayIdx] = day
      return updated
    })
  }

  async function loadVariants(exerciseName: string, dayIdx: number, exIdx: number) {
    const { data: current } = await supabase
      .from('exercises_catalog').select('variant_group')
      .ilike('name', canonicalExerciseName(exerciseName)).limit(1).maybeSingle()
    if (!current?.variant_group) {
      setVariantPopup({dayIdx, exIdx, variants:[]})
      return
    }
    const { data: variants } = await supabase
      .from('exercises_catalog').select('id, name, equipment, equipment_legacy, muscle_group')
      .eq('variant_group', current.variant_group)
      .neq('name', exerciseName).order('equipment').limit(10)
    setVariantPopup({ dayIdx, exIdx, variants: (variants || []).filter((v:any)=>isCatalogExerciseCompatible(v,profileProgramParams?.equipment||'salle')) })
  }
  function selectVariant(variant: any) {
    if (!variantPopup) return
    const {dayIdx,exIdx}=variantPopup
    setProgramDays(prev=>prev.map((day,i)=>i!==dayIdx?day:{...day,exercises:day.exercises.map((ex:any,j:number)=>{
      if(j!==exIdx)return ex
      // Preserve the prescription, not the previous movement's identity, media or loads.
      const replacement:any={id:variant.id,exercise_id:variant.id,name:variant.name,exercise_name:variant.name,equipment:variant.equipment,muscle_group:variant.muscle_group}
      for(const field of ['sets','reps','rest','rest_seconds','tempo','technique','technique_details','phases','_weekly_sets'])if(ex[field]!==undefined)replacement[field]=ex[field]
      const duration=prescribedDuration(replacement)
      if(duration){replacement.duration_seconds=duration;replacement.reps=0}
      else if(!Number.parseInt(String(replacement.reps)))replacement.reps=10
      return replacement
    })}))
    setVariantPopup(null)
  }

  function updateDayName(dayIdx: number, name: string) {
    setProgramDays(prev => {
      const updated = [...prev]
      updated[dayIdx] = { ...updated[dayIdx], name }
      return updated
    })
  }

  const filteredExercises = [...dbExercises, ...customExercises.map(e => ({ ...e, _custom: true }))]
    .filter(e => {
      if (exerciseSearchQuery && !e.name.toLowerCase().includes(exerciseSearchQuery.toLowerCase())) return false
      if (exerciseSearchFilter && exerciseSearchFilter !== ALL_KEY) {
        const mg = (e.muscle_group || '').toLowerCase()
        const filter = exerciseSearchFilter.toLowerCase()
        if (mg !== filter) return false
      }
      return true
    })

  const previousMode = useRef<'select' | 'manual'>('select')
  function moveExerciseInDay(exIdx: number, dir: number) {
    const ni = exIdx + dir
    const exs = programDays[editingDayIndex]?.exercises || []
    if (ni < 0 || ni >= exs.length) return
    setProgramDays(prev => {
      const updated = [...prev]
      const day = { ...updated[editingDayIndex] }
      const arr = [...(day.exercises || [])]
      const temp = arr[exIdx]; arr[exIdx] = arr[ni]; arr[ni] = temp
      day.exercises = arr
      updated[editingDayIndex] = day
      return updated
    })
  }

  function requestClose() {
    if (aiGenerating && !window.confirm(t('confirm.closeGenerating'))) return
    if (dirty && !window.confirm(tx('leaveDraft'))) return
    onClose()
  }

  /* ─── RENDER ─── */
  if (typeof document === 'undefined') return null
  const portalContent = (
    <div ref={builderRef} role="dialog" aria-modal="true" aria-label={editProgram?tx('adjust'):tx('prepare')} data-no-tab-swipe="true" style={{
      position: 'fixed', inset: 0, zIndex: Z_MODAL, background: BG_BASE, color:TEXT_PRIMARY, overflowY: 'auto',
    }}>
      <div style={{ maxWidth: 520, margin: '0 auto', padding: '24px 16px calc(120px + env(safe-area-inset-bottom, 0px))' }}>
        <header style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:12,marginBottom:16}}>
          <strong>{editProgram?tx('adjust'):tx('prepare')}</strong>
          <button type="button" onClick={requestClose} style={{...selBtn(false),minHeight:44}}>{tx('close')}</button>
        </header>
        <p>{editProgram?tx('futureOnly'):tx('draftOnly')}</p>
        {dirty&&<p role="status">{tx('dirty')}</p>}
        {programTechniqueIssues(programDays, initialDays).length > 0 && <aside aria-label={tx('techniqueReview')} style={{padding:12,border:`1px solid ${GOLD}`,marginBottom:12}}>
          <strong>{tx('techniqueReview')}</strong><p>{tx('legacyTechniqueHelp')}</p>
          {programTechniqueIssues(programDays, initialDays).map(issue=><div key={`${issue.day}:${issue.exercise}:${issue.phase}`} style={{marginBottom:10}}>
            <button type="button" onClick={()=>{setEditingDayIndex(issue.day);setMode('manual');setManualStep(1)}}>{DAY_NAMES[issue.day]} — {issue.name}{issue.phase ? ` · ${issue.phase}` : ''}</button>
            <p>{tTechnique(issue.code)} {tx(issue.inherited?'legacyTechniqueWarning':'techniqueBlocking')}</p>
          </div>)}
        </aside>}
        {recovery&&<aside role="status"><p>{tx('draftFound')}</p><button type="button" onClick={()=>{setProgramName(recovery.name);setProgramDays(recovery.days);setAiResult(recovery.aiResult??null);setRecovery(null);setMode('manual');setManualStep(1)}}>{tx('resume')}</button> <button type="button" onClick={()=>{try{localStorage.removeItem(draftKey)}catch{}setRecovery(null)}}>{tx('discard')}</button></aside>}
        {programDays.some(d=>d.exercises?.some((ex:any)=>ex.phases))&&<label>{tx('scope')} <select value={scope} onChange={e=>setScope(e.target.value as 'phase'|'program')}><option value="phase">{tx('phase')}</option><option value="program">{tx('allPhases')}</option></select></label>}
        {reviewing&&<aside ref={reviewRef} tabIndex={-1} aria-label={tx('review')} style={{padding:16,border:`1px solid ${GOLD}`,marginBottom:16}}>
          <strong>{tx('review')}</strong><p>{programName} · {tx('sessionCount',{count:programSessionCount(programDays)})}</p>
          {programDays.map((day,index)=>{
            if(JSON.stringify(day)===JSON.stringify(initialDays[index]))return null
            const describe=(value:any)=>!value||value.is_rest||value.repos?tx('rest'):(value.exercises||[]).map((raw:any)=>{
              const ex=resolveProgramExercise(raw,prescriptionContext)
              return `${ex.name||ex.exercise_name} : ${ex.sets} × ${prescribedDuration(ex)?prescribedDuration(ex)+' s':ex.reps} · ${getRestSeconds(ex)} s${ex.technique?' · '+ex.technique:''}`
            }).join(' ; ')
            return <div key={index} style={{borderTop:`1px solid ${BORDER}`,padding:'8px 0'}}><strong>{day.weekday}</strong>{editProgram&&<p>{tx('before')} : {describe(initialDays[index])}</p>}<p>{tx('after')} : {describe(day)}</p></div>
          })}
          <p>{editProgram?tx('futureOnly'):tx('draftOnly')}</p><button type="button" onClick={()=>setReviewing(false)}>{tx('keepEditing')}</button>
        </aside>}

        {/* ──────── MODE SELECT ──────── */}
        {mode === 'select' && (
          <div>
            {/* Close button */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
              <button onClick={requestClose} aria-label={t('close')} style={{ background: 'none', border: 'none', color: TEXT_MUTED, cursor: 'pointer', minWidth: 44, minHeight: 44 }}>
                <X size={24} />
              </button>
            </div>

            <h1 style={{ fontFamily: FONT_DISPLAY, fontSize: 36, color: TEXT_PRIMARY, margin: '0 0 24px' }}>
              {t('createTitle')}
            </h1>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {/* Card 1 - AI */}
              {aiAllowed && canMutate ? (
              <motion.button
                whileHover={{ borderColor: GOLD }}
                onClick={() => setMode('ai')}
                style={{
                  background: BG_CARD, border: `1px solid ${BORDER}`, padding: 24,
                  cursor: 'pointer', textAlign: 'left', width: '100%',
                }}
              >
                <div style={{ fontSize: 28, marginBottom: 8 }}>🤖</div>
                <div style={{ fontFamily: FONT_DISPLAY, fontSize: 20, color: TEXT_PRIMARY }}>{t('aiCard')}</div>
                <div style={{ fontFamily: FONT_BODY, fontSize: 13, color: TEXT_MUTED, marginTop: 4 }}>
                  {t('aiCardDesc')}
                </div>
              </motion.button>
              ) : (
              <div style={{ background: BG_CARD, border: `1px solid ${BORDER}`, padding: 24, opacity: 0.5, textAlign: 'left', width: '100%' }}>
                <div style={{ fontSize: 28, marginBottom: 8 }}>🔒</div>
                <div style={{ fontFamily: FONT_DISPLAY, fontSize: 20, color: TEXT_MUTED }}>{t('aiCard')}</div>
                <div style={{ fontFamily: FONT_BODY, fontSize: 13, color: TEXT_DIM, marginTop: 4 }}>
                  {t('aiLocked')}
                </div>
              </div>
              )}

              {/* Card 2 - Manual */}
              <motion.button
                whileHover={{ borderColor: GOLD }}
                onClick={() => setMode('manual')}
                disabled={!canMutate}
                style={{
                  background: BG_CARD, border: `1px solid ${BORDER}`, padding: 24,
                  cursor: 'pointer', textAlign: 'left', width: '100%',
                }}
              >
                <div style={{ fontSize: 28, marginBottom: 8 }}>📋</div>
                <div style={{ fontFamily: FONT_DISPLAY, fontSize: 20, color: TEXT_PRIMARY }}>{t('manualCard')}</div>
                <div style={{ fontFamily: FONT_BODY, fontSize: 13, color: TEXT_MUTED, marginTop: 4 }}>
                  {t('manualCardDesc')}
                </div>
              </motion.button>

              {/* Card 3 - Custom exercise */}
              <motion.button
                whileHover={{ borderColor: GOLD }}
                onClick={() => { previousMode.current = 'select'; setMode('custom-exercise') }}
                disabled={!canMutate}
                style={{
                  background: BG_CARD, border: `1px solid ${BORDER}`, padding: 24,
                  cursor: 'pointer', textAlign: 'left', width: '100%',
                }}
              >
                <div style={{ fontSize: 28, marginBottom: 8 }}>➕</div>
                <div style={{ fontFamily: FONT_DISPLAY, fontSize: 20, color: TEXT_PRIMARY }}>{t('customCard')}</div>
                <div style={{ fontFamily: FONT_BODY, fontSize: 13, color: TEXT_MUTED, marginTop: 4 }}>
                  {t('customCardDesc')}
                </div>
              </motion.button>
            </div>
          </div>
        )}

        {/* ──────── MODE AI ──────── */}
        {mode === 'ai' && !aiResult && (
          <div>
            <button
              onClick={() => setMode('select')}
              style={{ background: 'none', border: 'none', color: TEXT_MUTED, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, marginBottom: 16, fontFamily: FONT_BODY, fontSize: 14 }}
            >
              <ChevronLeft size={18} /> {t('back')}
            </button>

            <h1 style={{ fontFamily: FONT_DISPLAY, fontSize: 32, color: TEXT_PRIMARY, margin: '0 0 24px' }}>
              {t('aiTitle')}
            </h1>

            {/* Objectif */}
            <div style={{ marginBottom: 20 }}>
              <div style={labelStyle}>{t('config.objective')}</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {AI_OBJECTIVES.map(o => (
                  <button key={o.key} onClick={() => setAiObjective(o.key)} style={selBtn(aiObjective === o.key)}>{o.label}</button>
                ))}
              </div>
            </div>

            {/* Niveau */}
            <div style={{ marginBottom: 20 }}>
              <div style={labelStyle}>{t('config.level')}</div>
              <div style={{ display: 'flex', gap: 8 }}>
                {AI_LEVELS.map(l => (
                  <button key={l.key} onClick={() => setAiLevel(l.key)} style={{ ...selBtn(aiLevel === l.key), flex: 1 }}>{l.label}</button>
                ))}
              </div>
            </div>

            {/* Jours/semaine */}
            <div style={{ marginBottom: 20 }}>
              <div style={labelStyle}>{t('config.daysPerWeek')}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <input
                  type="range" min={2} max={6} value={aiDays}
                  onChange={e => setAiDays(Number(e.target.value))}
                  style={{ flex: 1, accentColor: GOLD }}
                />
                <span style={{ fontFamily: FONT_DISPLAY, fontSize: 28, color: GOLD, minWidth: 32, textAlign: 'center' }}>{aiDays}</span>
              </div>
            </div>

            {/* Durée */}
            <div style={{ marginBottom: 20 }}>
              <div style={labelStyle}>{t('config.duration')}</div>
              <div style={{ display: 'flex', gap: 8 }}>
                {[30, 45, 60, 90].map(d => (
                  <button key={d} onClick={() => setAiDuration(d)} style={{ ...selBtn(aiDuration === d), flex: 1 }}>{d}</button>
                ))}
              </div>
            </div>

            {/* Équipement */}
            <div style={{ marginBottom: 20 }}>
              <div style={labelStyle}>{t('config.equipment')}</div>
              <div style={{ display: 'flex', gap: 8 }}>
                {AI_EQUIPMENT.map(eq => (
                  <button key={eq.key} onClick={() => setAiEquipment(eq.key)} style={{ ...selBtn(aiEquipment === eq.key), flex: 1 }}>{eq.label}</button>
                ))}
              </div>
            </div>

            {/* Zones prioritaires */}
            <div style={{ marginBottom: 20 }}>
              <div style={labelStyle}>{t('config.priorities')}</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {MUSCLE_OPTIONS.map(m => {
                  const selected = aiPriorities.includes(m)
                  return (
                    <button
                      key={m}
                      onClick={() => setAiPriorities(prev => selected ? prev.filter(p => p !== m) : [...prev, m])}
                      style={selBtn(selected)}
                    >
                      {getMuscleLabel(m, locale, tMuscle)}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Notes */}
            <div style={{ marginBottom: 24 }}>
              <div style={labelStyle}>{t('config.notes')}</div>
              <textarea
                value={aiNotes}
                onChange={e => setAiNotes(e.target.value)}
                rows={3}
                style={{ ...inputStyle, resize: 'vertical' }}
                placeholder={t('config.notesPlaceholder')}
              />
            </div>

            {/* Generate button */}
            <button
              onClick={generateAI}
              aria-busy={aiGenerating}
              disabled={aiGenerating || !aiAllowed || !canMutate}
              style={{
                width: '100%', padding: '16px', background: aiGenerating ? GOLD_DIM : GOLD,
                color: colors.onGold, border: 'none', fontFamily: FONT_DISPLAY, fontSize: 18,
                cursor: aiGenerating || !aiAllowed || !canMutate ? 'not-allowed' : 'pointer', opacity: aiGenerating || !aiAllowed || !canMutate ? 0.6 : 1,
              }}
            >
              {aiGenerating ? t('generating') : t('generate')}
            </button>
          </div>
        )}

        {/* ──────── AI RESULT (edit + save) ──────── */}
        {mode === 'ai' && aiResult && (
          <div>
            <button
              onClick={() => setAiResult(null)}
              style={{ background: 'none', border: 'none', color: TEXT_MUTED, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, marginBottom: 16, fontFamily: FONT_BODY, fontSize: 14 }}
            >
              <ChevronLeft size={18} /> {t('editParams')}
            </button>

            <h1 style={{ fontFamily: FONT_DISPLAY, fontSize: 32, color: TEXT_PRIMARY, margin: '0 0 8px' }}>
              {programName}
            </h1>

            {renderDayEditor()}

            {/* Technique explanations (if AI used techniques) */}
            {(() => {
              const usedTechniques = [...new Set(programDays.flatMap((d: any) => (d.exercises || []).map((e: any) => e.technique).filter(Boolean)))]
              return usedTechniques.length > 0 ? <TechniqueExplanationCards techniques={usedTechniques} /> : null
            })()}

            <button
              onClick={saveProgram}
              disabled={saving || !canMutate}
              style={{
                width: '100%', padding: '16px', background: saving ? GOLD_DIM : GOLD,
                color: colors.onGold, border: 'none', fontFamily: FONT_DISPLAY, fontSize: 18,
                cursor: saving ? 'not-allowed' : 'pointer', marginTop: 24,
              }}
            >
              {saving ? t('saving') : reviewing ? tx('apply') : tx('review')}
            </button>
          </div>
        )}

        {/* ──────── MODE MANUAL ──────── */}
        {mode === 'manual' && (
          <div>
            <button
              onClick={() => { if (manualStep > 0) { setManualStep(0) } else { setMode('select') } }}
              style={{ background: 'none', border: 'none', color: TEXT_MUTED, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, marginBottom: 16, fontFamily: FONT_BODY, fontSize: 14 }}
            >
              <ChevronLeft size={18} /> {t('back')}
            </button>

            {manualStep === 0 && (
              <div>
                <h1 style={{ fontFamily: FONT_DISPLAY, fontSize: 32, color: TEXT_PRIMARY, margin: '0 0 24px' }}>
                  {t('manualTitle')}
                </h1>

                <div style={{ marginBottom: 20 }}>
                  <div style={labelStyle}>{t('config.programName')}</div>
                  <input
                    value={programName}
                    onChange={e => setProgramName(e.target.value)}
                    style={inputStyle}
                    placeholder={t('config.programNamePlaceholder')}
                    required
                  />
                </div>

                <div style={{ marginBottom: 24 }}>
                  <div style={labelStyle}>{t('config.trainingDays')}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <input
                      type="range" min={1} max={7}
                      value={programDays.filter(d => !d.is_rest).length || 3}
                      onChange={e => {
                        const n = parseInt(e.target.value)
                        setProgramDays(resizeTrainingDays(programDays,n))
                      }}
                      style={{ flex: 1, accentColor: GOLD }}
                    />
                    <span style={{ fontFamily: FONT_DISPLAY, fontSize: 28, color: GOLD, minWidth: 32, textAlign: 'center' }}>
                      {programDays.filter(d => !d.is_rest).length || 3}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => {
                    if (!programName.trim()) { toast.error(t('config.nameRequired')); return }
                    if (!programDays.length || programDays.length < 7) {
                      const trainingCount = programDays.filter(d => !d.is_rest).length || 3
                      setProgramDays(resizeTrainingDays(programDays,trainingCount))
                    }
                    setManualStep(1)
                  }}
                  style={{
                    width: '100%', padding: '16px', background: GOLD, color: colors.onGold,
                    border: 'none', fontFamily: FONT_DISPLAY, fontSize: 18, cursor: 'pointer',
                  }}
                >
                  {t('next')}
                </button>
              </div>
            )}

            {manualStep >= 1 && (
              <div>
                {renderDayEditor()}

                <button
                  onClick={saveProgram}
                  disabled={saving || !canMutate}
                  style={{
                    width: '100%', padding: '16px', background: saving ? GOLD_DIM : GOLD,
                    color: colors.onGold, border: 'none', fontFamily: FONT_DISPLAY, fontSize: 18,
                    cursor: saving ? 'not-allowed' : 'pointer', marginTop: 24,
                  }}
                >
                  {saving ? t('saving') : reviewing ? tx('apply') : tx('review')}
                </button>
              </div>
            )}
          </div>
        )}

        {/* ──────── MODE CUSTOM EXERCISE ──────── */}
        {mode === 'custom-exercise' && (
          <div>
            <button
              onClick={() => setMode(previousMode.current)}
              style={{ background: 'none', border: 'none', color: TEXT_MUTED, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, marginBottom: 16, fontFamily: FONT_BODY, fontSize: 14 }}
            >
              <ChevronLeft size={18} /> {t('back')}
            </button>

            <h1 style={{ fontFamily: FONT_DISPLAY, fontSize: 32, color: TEXT_PRIMARY, margin: '0 0 24px' }}>
              {t('newExercise')}
            </h1>

            {/* Nom */}
            <div style={{ marginBottom: 20 }}>
              <div style={labelStyle}>{t('customExercise.name')}</div>
              <input value={ceName} onChange={e => setCeName(e.target.value)} style={inputStyle} placeholder={t('customExercise.namePlaceholder')} required />
            </div>

            {/* Groupe musculaire */}
            <div style={{ marginBottom: 20 }}>
              <div style={labelStyle}>{t('customExercise.muscleGroup')}</div>
              <select value={ceMuscle} onChange={e => setCeMuscle(e.target.value)} style={{ ...inputStyle, appearance: 'auto' as any }}>
                <option value="">{t('customExercise.select')}</option>
                {['Poitrine', 'Dos', 'Épaules', 'Bras', 'Jambes', 'Fessiers', 'Abdos', 'Cardio'].map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>

            {/* Équipement */}
            <div style={{ marginBottom: 20 }}>
              <div style={labelStyle}>{t('customExercise.equipment')}</div>
              <select value={ceEquipment} onChange={e => setCeEquipment(e.target.value)} style={{ ...inputStyle, appearance: 'auto' as any }}>
                <option value="">{t('customExercise.select')}</option>
                {EQUIPMENT_OPTIONS.map(eq => (
                  <option key={eq} value={eq}>{eq}</option>
                ))}
              </select>
            </div>

            {/* Description */}
            <div style={{ marginBottom: 20 }}>
              <div style={labelStyle}>{t('customExercise.description')}</div>
              <textarea value={ceDescription} onChange={e => setCeDescription(e.target.value)} rows={3} style={{ ...inputStyle, resize: 'vertical' }} placeholder={t('customExercise.descPlaceholder')} />
            </div>

            {/* Sets */}
            <div style={{ marginBottom: 20 }}>
              <div style={labelStyle}>{t('customExercise.sets')}</div>
              <input type="number" min={1} max={10} value={ceSets} onChange={e => setCeSets(Number(e.target.value))} style={{ ...inputStyle, width: 100 }} />
            </div>

            {/* Reps */}
            <div style={{ marginBottom: 20 }}>
              <div style={labelStyle}>{t('customExercise.reps')}</div>
              <input type="number" min={1} max={30} value={ceReps} onChange={e => setCeReps(Number(e.target.value))} style={{ ...inputStyle, width: 100 }} />
            </div>

            {/* Rest */}
            <div style={{ marginBottom: 24 }}>
              <div style={labelStyle}>{t('customExercise.rest')}</div>
              <select value={ceRest} onChange={e => setCeRest(Number(e.target.value))} style={{ ...inputStyle, width: 140, appearance: 'auto' as any }}>
                {REST_OPTIONS.map(r => (
                  <option key={r} value={r}>{r}s</option>
                ))}
              </select>
            </div>

            <button
              onClick={saveCustomExercise}
              disabled={saving || !ceName.trim() || !canMutate}
              style={{
                width: '100%', padding: '16px', background: saving ? GOLD_DIM : GOLD,
                color: colors.onGold, border: 'none', fontFamily: FONT_DISPLAY, fontSize: 18,
                cursor: saving || !ceName.trim() ? 'not-allowed' : 'pointer',
                opacity: !ceName.trim() ? 0.5 : 1,
              }}
            >
              {saving ? t('saving') : t('saveExercise')}
            </button>
          </div>
        )}
      </div>

      {/* ──────── EXERCISE SEARCH — FULLSCREEN ──��───── */}
      {showExerciseSearch && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          zIndex: Z_MODAL, background: BG_BASE,
          display: 'flex', flexDirection: 'column',
          height: '100%',
        }}>
          {/* Header fixe avec recherche */}
          <div style={{
            flexShrink: 0, background: BG_BASE,
            padding: '16px 16px 10px',
            paddingTop: 'max(16px, env(safe-area-inset-top, 16px))',
            borderBottom: `1px solid ${BORDER}`,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <span style={{ fontFamily: FONT_DISPLAY, fontSize: 20, color: TEXT_PRIMARY }}>{t('search.title')}</span>
              <button onClick={() => { setShowExerciseSearch(false); setExerciseSearchQuery(''); setExerciseSearchFilter('') }} style={{ background: 'none', border: 'none', color: TEXT_MUTED, cursor: 'pointer', padding: 8, minWidth: 44, minHeight: 44, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <X size={22} />
              </button>
            </div>

            <div style={{ position: 'relative', marginBottom: 10 }}>
              <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: TEXT_MUTED, pointerEvents: 'none' }} />
              <input
                autoFocus
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck={false}
                inputMode="search"
                enterKeyHint="search"
                value={exerciseSearchQuery}
                onChange={e => setExerciseSearchQuery(e.target.value)}
                onFocus={e => { setTimeout(() => e.target.scrollIntoView({ behavior: 'smooth', block: 'center' }), 300) }}
                placeholder={t('search.placeholder')}
                style={{
                  width: '100%', padding: '14px 44px 14px 40px',
                  background: BG_CARD, border: `1px solid ${BORDER}`,
                  borderRadius: 12, color: TEXT_PRIMARY, fontSize: 16,
                  fontFamily: FONT_BODY, outline: 'none',
                }}
              />
              {exerciseSearchQuery && (
                <button onClick={() => setExerciseSearchQuery('')} style={{
                  position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                  width: 28, height: 28, borderRadius: '50%',
                  background: 'rgba(212,168,67,0.15)', border: 'none',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer',
                }}>
                  <X size={14} color={GOLD} />
                </button>
              )}
            </div>

            <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 4, WebkitOverflowScrolling: 'touch' as any }}>
              {muscleFilterDisplay.map(f => (
                <button
                  key={f.key}
                  onClick={() => setExerciseSearchFilter(f.key === ALL_KEY ? '' : f.key)}
                  style={{
                    ...selBtn((f.key === ALL_KEY && !exerciseSearchFilter) || exerciseSearchFilter === f.key),
                    padding: '6px 12px', fontSize: 11, whiteSpace: 'nowrap', flexShrink: 0,
                  }}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Liste scrollable */}
          <div style={{ flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch' as any, padding: '8px 16px 120px' }}>
            {filteredExercises.map((ex, i) => (
              <div
                key={ex.id || i}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '14px 0', borderBottom: `1px solid ${BORDER}`,
                }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: FONT_BODY, fontSize: 15, color: TEXT_PRIMARY }}>{getExerciseName(ex, locale)}</div>
                  <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                    {ex.muscle_group && (
                      <span style={{ fontFamily: FONT_ALT, fontSize: 10, textTransform: 'uppercase', padding: '2px 8px', background: GOLD_DIM, color: GOLD, letterSpacing: '0.05em' }}>
                        {getMuscleLabel(ex.muscle_group, locale, tMuscle)}
                      </span>
                    )}
                    {ex._custom && (
                      <span style={{ fontFamily: FONT_ALT, fontSize: 10, textTransform: 'uppercase', padding: '2px 8px', background: GOLD_DIM, color: GOLD, letterSpacing: '0.05em' }}>
                        {t('search.myExercise')}
                      </span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => addExerciseToDay(ex, !!ex._custom)}
                  style={{ background: GOLD_DIM, border: `1px solid ${GOLD_RULE}`, color: GOLD, cursor: 'pointer', padding: 10, borderRadius: 12, minWidth: 44, minHeight: 44, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  <Plus size={18} />
                </button>
              </div>
            ))}
            {(exerciseCatalogError || customExercisesError) && (
              <div role="alert" style={{ padding: 16, color: RED, fontFamily: FONT_BODY, fontSize: 13 }}>
                {t('search.loadError')}
              </div>
            )}
            {!exerciseCatalogError && !customExercisesError && filteredExercises.length === 0 && (
              <div style={{ textAlign: 'center', padding: 40, color: TEXT_MUTED, fontFamily: FONT_BODY, fontSize: 14 }}>
                {t('search.noResults')}
              </div>
            )}
          </div>

          {/* Bouton créer exercice en bas */}
          <div style={{ padding: '12px 16px', paddingBottom: 'max(12px, env(safe-area-inset-bottom, 12px))', borderTop: `1px solid ${BORDER}`, flexShrink: 0, background: BG_BASE }}>
            <button
              onClick={() => { previousMode.current = 'manual'; setShowExerciseSearch(false); setMode('custom-exercise') }}
              style={{
                width: '100%', padding: '14px', background: BG_CARD_2,
                border: `1px solid ${BORDER}`, color: GOLD, borderRadius: 12,
                fontFamily: FONT_DISPLAY, fontSize: 16, cursor: 'pointer',
              }}
            >
              {t('search.createExercise')}
            </button>
          </div>
        </div>
      )}

      {/* ──────── VARIANT POPUP ──────── */}
      {variantPopup && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.75)',backdropFilter:'blur(8px)',zIndex:Z_MODAL,display:'flex',alignItems:'flex-end',justifyContent:'center'}} onClick={()=>setVariantPopup(null)}>
          <div onClick={e=>e.stopPropagation()} style={{background:BG_CARD,border:`1px solid ${GOLD_RULE}`,borderRadius:'20px 20px 0 0',width:'100%',maxWidth:480,maxHeight:'60vh',overflow:'hidden'}}>
            <div style={{padding:'16px 20px',borderBottom:`1px solid ${BORDER}`,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <span style={{fontFamily:FONT_DISPLAY,fontSize:20,letterSpacing:2,color:TEXT_PRIMARY}}>{t('variants.title')}</span>
              <button aria-label={t('variants.close')} onClick={()=>setVariantPopup(null)} style={{background:'none',border:'none',color:TEXT_MUTED,fontSize:20,cursor:'pointer'}}>✕</button>
            </div>
            <div style={{overflowY:'auto',maxHeight:'calc(60vh - 60px)',padding:'8px 12px'}}>
              {variantPopup.variants.length === 0 ? (
                <div style={{textAlign:'center',padding:32,color:TEXT_MUTED,fontSize:14,fontFamily:FONT_BODY}}>{t('variants.noVariants')}</div>
              ) : variantPopup.variants.map((v: any,i: number)=>(
                <button key={i} onClick={()=>selectVariant(v)} style={{width:'100%',display:'flex',alignItems:'center',gap:12,padding:'14px 16px',marginBottom:4,borderRadius:14,background:BG_BASE,border:`1px solid ${BORDER}`,cursor:'pointer',textAlign:'left',transition:'all 0.2s'}}>
                  <div style={{width:40,height:40,borderRadius:10,background:GOLD_DIM,display:'flex',alignItems:'center',justifyContent:'center',fontSize:16,flexShrink:0}}>
                    {v.equipment==='Barre'?'🏋️':v.equipment==='Haltères'?'💪':v.equipment==='Machine'?'⚙️':v.equipment==='Poulie'?'🔗':'🤸'}
                  </div>
                  <div>
                    <div style={{fontFamily:FONT_BODY,fontSize:14,color:TEXT_PRIMARY,fontWeight:500}}>{v.name}</div>
                    <div style={{fontFamily:FONT_ALT,fontSize:10,color:GOLD,fontWeight:700,letterSpacing:1,marginTop:2}}>{v.equipment||''}{v.muscle_group?` · ${getMuscleLabel(v.muscle_group, locale, tMuscle)}`:''}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )

  /* ──────── DAY EDITOR (shared between AI result and manual) ──────── */
  function handleDayTabClick(i: number) {
    if (!swapMode) {
      setEditingDayIndex(i)
      return
    }
    if (swapFirst === null) {
      setSwapFirst(i)
      return
    }
    // Swap everything EXCEPT weekday (which stays fixed to the calendar position)
    setProgramDays(prev => {
      const updated = [...prev]
      const dayA = { ...updated[swapFirst!] }
      const dayB = { ...updated[i] }
      const weekdayA = dayA.weekday
      const weekdayB = dayB.weekday
      updated[swapFirst!] = { ...dayB, weekday: weekdayA }
      updated[i] = { ...dayA, weekday: weekdayB }
      return updated
    })
    setSwapFirst(null)
    setSwapMode(false)
    setEditingDayIndex(i)
  }

  function renderDayEditor() {
    return (
      <div>
        {/* Day grid — always 7 columns with weekday labels */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 6, marginBottom: 12 }}>
          {programDays.slice(0, 7).map((day, i) => {
            const isActive = editingDayIndex === i
            const isSwap = swapFirst === i
            const isRest = day.is_rest
            const hasEx = !isRest && (day.exercises?.length || 0) > 0
            return (
              <button
                key={i}
                onClick={() => handleDayTabClick(i)}
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
                  padding: '10px 2px', borderRadius: 14, cursor: 'pointer',
                  background: isSwap ? 'rgba(232,201,122,0.2)' : isActive ? GOLD : isRest ? BG_BASE : hasEx ? GOLD_DIM : BG_CARD,
                  border: `1.5px solid ${isSwap ? '#E8C97A' : isActive ? GOLD : hasEx ? GOLD_RULE : BORDER}`,
                  transition: 'all 0.2s',
                }}
              >
                <span style={{
                  fontFamily: FONT_ALT, fontSize: 10, fontWeight: 700,
                  letterSpacing: 1, color: isActive ? colors.onGold : isRest ? TEXT_DIM : hasEx ? GOLD : TEXT_MUTED,
                }}>{DAY_SHORT[i]}</span>
                {isRest ? (
                  <span style={{ fontSize: 14, lineHeight: 1 }}>😴</span>
                ) : (
                  <span style={{
                    fontFamily: FONT_DISPLAY, fontSize: 18,
                    color: isActive ? colors.onGold : hasEx ? GOLD : TEXT_DIM,
                  }}>{day.exercises?.length || 0}</span>
                )}
              </button>
            )
          })}
        </div>

        {/* Active day session name */}
        {programDays[editingDayIndex]?.name && !programDays[editingDayIndex]?.is_rest && (
          <div style={{
            fontFamily: FONT_ALT, fontSize: 11, fontWeight: 700,
            letterSpacing: 2, color: GOLD, textTransform: 'uppercase',
            marginBottom: 8, paddingLeft: 4,
          }}>
            {DAY_NAMES[editingDayIndex]} — {programDays[editingDayIndex].name}
          </div>
        )}

        {/* Swap button — only show text when active */}
        {!swapMode && (
          <button
            onClick={() => { setSwapMode(true); setSwapFirst(null) }}
            style={{
              width: '100%', padding: 12, borderRadius: 14, marginBottom: 10,
              background: BG_CARD, border: `1px dashed ${BORDER}`,
              color: TEXT_MUTED, fontFamily: FONT_ALT, fontSize: 12,
              fontWeight: 700, letterSpacing: 2, cursor: 'pointer',
            }}
          >
            {t('day.reorderDays')}
          </button>
        )}
        {swapMode && (
          <button
            onClick={() => { setSwapMode(false); setSwapFirst(null) }}
            style={{
              width: '100%', padding: 12, borderRadius: 14, marginBottom: 10,
              background: GOLD_DIM, border: `1px solid ${GOLD}`,
              color: GOLD, fontFamily: FONT_ALT, fontSize: 12,
              fontWeight: 700, letterSpacing: 2, cursor: 'pointer',
            }}
          >
            {swapFirst !== null ? t('day.swapSelected', { day: DAY_SHORT[swapFirst] }) : t('day.swapHint')}
          </button>
        )}

        {/* Active day */}
        {programDays[editingDayIndex] && (
          <div>
            {/* Rest toggle */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 16, alignItems: 'center' }}>
              <span style={{ fontFamily: FONT_DISPLAY, fontSize: 18, color: TEXT_PRIMARY, letterSpacing: 1 }}>
                {DAY_NAMES[editingDayIndex]}
              </span>
              <button
                onClick={() => {
                  setProgramDays(prev => setDayRest(prev,editingDayIndex,!prev[editingDayIndex].is_rest))
                }}
                style={{
                  padding: '6px 14px', borderRadius: 10, cursor: 'pointer',
                  background: programDays[editingDayIndex]?.is_rest ? 'rgba(138,133,128,.18)' : GOLD_DIM,
                  border: `1px solid ${programDays[editingDayIndex]?.is_rest ? BORDER : GOLD}`,
                  color: programDays[editingDayIndex]?.is_rest ? TEXT_MUTED : GOLD,
                  fontFamily: FONT_ALT, fontSize: 11, fontWeight: 700, letterSpacing: 1,
                }}
              >
                {programDays[editingDayIndex]?.is_rest ? t('day.restToggleOn') : t('day.trainingToggle')}
              </button>
            </div>

            {programDays[editingDayIndex]?.is_rest&&programDays[editingDayIndex]?.exercises?.length>0&&<p>{tx('parked')}</p>}
            {!programDays[editingDayIndex]?.is_rest && (
            <details style={{ marginBottom: 16 }}>
              <summary style={{...labelStyle,minHeight:44,cursor:'pointer'}}>{t('day.sessionType')} · {programDays[editingDayIndex]?.name||tx('session')}</summary>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
                {SESSION_TYPE_OPTIONS.map(t => {
                  const isSelected = programDays[editingDayIndex]?.name === t.label
                  return (
                    <button key={t.key} onClick={() => updateDayName(editingDayIndex, t.label)} style={{
                      padding: '10px 6px', borderRadius: 10, cursor: 'pointer',
                      background: isSelected ? `${t.color}20` : BG_CARD,
                      border: `1.5px solid ${isSelected ? t.color : BORDER}`,
                      color: isSelected ? t.color : TEXT_MUTED,
                      fontFamily: FONT_ALT, fontSize: 11, fontWeight: 700, letterSpacing: 1,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                    }}>
                      <span style={{ fontSize: 16 }}>{t.emoji}</span> {t.label}
                    </button>
                  )
                })}
              </div>
            </details>
            )}

            {/* Exercise list — hidden for rest days */}
            {!programDays[editingDayIndex]?.is_rest && (<>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
              {(programDays[editingDayIndex]?.exercises || []).map((rawEx: any, exIdx: number) => {
                const ex:any=resolveProgramExercise(rawEx,prescriptionContext)
                const exerciseNameRaw = ex.exercise_name || ex.custom_name || ex.name || dbExercises.find(e => e.id === ex.exercise_id)?.name || ''
                const exerciseName = exerciseNameRaw || t('day.unknownExercise') // display fallback
                const exerciseNameDisplay = getExerciseName(ex, locale) || exerciseName
                const exerciseMuscle = ex.muscle_group || ex.focus || dbExercises.find(e => e.id === ex.exercise_id)?.muscle_group || ''
                const exCount = programDays[editingDayIndex]?.exercises?.length || 0
                const dayPrescriptions = programDays[editingDayIndex].exercises.map((row: any) => {
                  const resolved: any = resolveProgramExercise(row, prescriptionContext)
                  return { name: String(resolved.name || resolved.exercise_name || resolved.custom_name || ''), technique: resolved.technique, techniqueDetails: resolved.technique_details, targetSets: Number(resolved.sets), targetDurationSeconds: prescribedDuration(resolved) || undefined }
                })
                const techniqueError = ex.technique === 'dropset' && !dropCount(ex.technique_details) ? 'missingDrops' : ex.technique === 'superset' && !bisetFor(dayPrescriptions, exIdx) ? 'invalidBiset' : ex.technique === 'restpause' && !restPausePrescription(ex.technique_details) ? 'invalidRestPause' : null
                return (
                <details key={exIdx} style={{ background: BG_CARD, border: `1px solid ${BORDER}`, padding: 16 }}>
                  <summary style={{cursor:'pointer',minHeight:44,lineHeight:1.6}}><strong>{exerciseNameDisplay}</strong><br/>{ex.sets||3} × {prescribedDuration(ex)?`${prescribedDuration(ex)} s`:ex.reps||10} · {getRestSeconds(ex)} s {ex.technique?`· ${ex.technique}`:''}</summary>
                  {techniqueError && <p role="alert">{tTechnique(techniqueError)}</p>}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 12 }}>
                    <div>
                      <div style={{ fontFamily: FONT_BODY, fontSize: 15, fontWeight: 600, color: TEXT_PRIMARY }}>{exerciseNameDisplay}</div>
                      {exerciseMuscle && (
                        <span style={{
                          fontFamily: FONT_ALT, fontSize: 10, textTransform: 'uppercase',
                          padding: '2px 8px', background: GOLD_DIM, color: GOLD,
                          letterSpacing: '0.05em', marginTop: 4, display: 'inline-block',
                        }}>
                          {exerciseMuscle}
                        </span>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button aria-label={`${t('day.moveUp')} ${exerciseNameDisplay}`} disabled={exIdx === 0} onClick={() => moveExerciseInDay(exIdx, -1)} title={t('day.moveUp')} style={{ background: exIdx === 0 ? BG_BASE : GOLD_DIM, border: `1px solid ${exIdx === 0 ? BORDER : GOLD_RULE}`, color: exIdx === 0 ? TEXT_DIM : GOLD, cursor: exIdx === 0 ? 'default' : 'pointer', padding: '4px 8px', fontSize: 12 }}>↑</button>
                      <button aria-label={`${t('day.moveDown')} ${exerciseNameDisplay}`} disabled={exIdx === exCount - 1} onClick={() => moveExerciseInDay(exIdx, 1)} title={t('day.moveDown')} style={{ background: exIdx === exCount - 1 ? BG_BASE : GOLD_DIM, border: `1px solid ${exIdx === exCount - 1 ? BORDER : GOLD_RULE}`, color: exIdx === exCount - 1 ? TEXT_DIM : GOLD, cursor: exIdx === exCount - 1 ? 'default' : 'pointer', padding: '4px 8px', fontSize: 12 }}>↓</button>
                      <button aria-label={`${t('day.variants')} ${exerciseNameDisplay}`} onClick={() => loadVariants(exerciseNameRaw, editingDayIndex, exIdx)} title={t('day.variants')} style={{ background: GOLD_DIM, border: `1px solid ${GOLD_RULE}`, cursor: 'pointer', padding: '4px 8px', fontSize: 14 }}>🔄</button>
                      <button aria-label={`${t('confirm.deleteConfirm')} ${exerciseNameDisplay}`} onClick={() => setExerciseToDelete({ dayIdx: editingDayIndex, exIdx, name: exerciseNameDisplay })} style={{ background: 'none', border: 'none', color: RED, cursor: 'pointer', padding: 4 }}><Trash2 size={16} /></button>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                    <div>
                      <div style={{ ...labelStyle, marginBottom: 4 }}>{t('day.setsLabel')}</div>
                      <input
                        type="number" min={1} max={10}
                        aria-label={`${t('day.setsLabel')} — ${exerciseNameDisplay}`}
                        value={ex.sets || 3}
                        onChange={e => updateExerciseField(editingDayIndex, exIdx, 'sets', Number(e.target.value))}
                        style={{ ...inputStyle, width: 60, padding: '8px', textAlign: 'center' }}
                      />
                    </div>
                    <div>
                      <div style={{ ...labelStyle, marginBottom: 4 }}>{prescribedDuration(ex) ? t('day.durationLabel') : t('day.repsLabel')}</div>
                      <input
                        type={prescribedDuration(ex)?'number':'text'} inputMode={prescribedDuration(ex)?'numeric':'text'}
                        aria-label={`${prescribedDuration(ex)?t('day.durationLabel'):t('day.repsLabel')} — ${exerciseNameDisplay}`}
                        value={prescribedDuration(ex) ?? (ex.reps || 10)}
                        onChange={e => updateExerciseField(editingDayIndex, exIdx, prescribedDuration(ex) ? 'duration_seconds' : 'reps', prescribedDuration(ex)?Number(e.target.value):e.target.value)}
                        style={{ ...inputStyle, width: 60, padding: '8px', textAlign: 'center' }}
                      />
                    </div>
                    <div>
                      <div style={{ ...labelStyle, marginBottom: 4 }}>{t('day.restLabel')}</div>
                      <select
                        value={getRestSeconds(ex)}
                        aria-label={`${t('day.restLabel')} — ${exerciseNameDisplay}`}
                        onChange={e => updateExerciseField(editingDayIndex, exIdx, 'rest_seconds', Number(e.target.value))}
                        style={{ ...inputStyle, width: 80, padding: '8px', appearance: 'auto' as any }}
                      >
                        {[...new Set([...REST_OPTIONS,getRestSeconds(ex)])].sort((a,b)=>a-b).map(r => (
                          <option key={r} value={r}>{r}s</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <details style={{marginTop:12}}><summary style={{cursor:'pointer',minHeight:44}}>{tx('advancedExercise')}</summary>
                  {/* Tempo input */}
                  <div style={{ marginTop: 12 }}>
                    <div style={{ ...labelStyle, marginBottom: 4 }}>{t('day.tempoLabel')}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      {(() => {
                        const parts = (ex.tempo || '2-0-2').split('-')
                        return [0, 1, 2].map(i => (
                          <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <input
                              type="number" min={0} max={9}
                              aria-label={`${t('day.tempoLabel')} ${i+1} — ${exerciseNameDisplay}`}
                              value={parts[i] || (i === 1 ? '0' : '2')}
                              onChange={e => {
                                const p = [...parts]; p[i] = e.target.value
                                updateExerciseField(editingDayIndex, exIdx, 'tempo', p.join('-'))
                              }}
                              style={{ ...inputStyle, width: 36, padding: '8px 4px', textAlign: 'center', fontFamily: FONT_DISPLAY, fontSize: 16, color: GOLD }}
                            />
                            {i < 2 && <span style={{ color: TEXT_DIM, fontSize: 16, fontWeight: 700 }}>-</span>}
                          </span>
                        ))
                      })()}
                    </div>
                  </div>

                  {/* Technique avancée */}
                  <div style={{ marginTop: 12 }}>
                    <div style={{ ...labelStyle, marginBottom: 4 }}>{t('day.techniqueLabel')}</div>
                    <select
                      value={ex.technique || ''}
                      aria-label={`${t('day.techniqueLabel')} — ${exerciseNameDisplay}`}
                      onChange={e => {
                        const val = e.target.value || null
                        updateExerciseField(editingDayIndex, exIdx, 'technique', val)
                        if (!val) updateExerciseField(editingDayIndex, exIdx, 'technique_details', '')
                      }}
                      style={{ ...inputStyle, width: '100%', padding: '8px', appearance: 'auto' as any }}
                    >
                      <option value="">{t('day.techniqueNone')}</option>
                      <option value="dropset">Drop Set</option>
                      <option value="fst7" disabled={Boolean(prescribedDuration(ex))}>FST-7 (7 × 8–12 · 45 s)</option>
                      <option value="restpause">Rest Pause</option>
                      <option value="superset">{guide('biset')}</option>
                      <option value="mechanical">Mechanical Drop Set</option>
                    </select>

                    {/* Technique details */}
                    {ex.technique === 'dropset' && (
                      <div style={{ marginTop: 8 }}>
                        <div style={{ ...labelStyle, marginBottom: 4, fontSize: 9 }}>{t('day.dropCount')}</div>
                        <div style={{ display: 'flex', gap: 6 }}>
                          {[1, 2, 3].map(n => (
                            <button key={n} onClick={() => updateExerciseField(editingDayIndex, exIdx, 'technique_details', String(n))}
                              aria-pressed={ex.technique_details === String(n)}
                              style={{ padding: '6px 14px', border: `1px solid ${ex.technique_details === String(n) ? GOLD : BORDER}`, background: ex.technique_details === String(n) ? GOLD_DIM : BG_BASE, color: ex.technique_details === String(n) ? GOLD : TEXT_MUTED, fontFamily: FONT_ALT, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}
                            >{n}</button>
                          ))}
                        </div>
                      </div>
                    )}
                    {ex.technique === 'restpause' && (
                      <div style={{ marginTop: 8, display: 'flex', gap: 12, flexWrap:'wrap' }}>
                        <p style={{width:'100%',margin:0}}>{guide('restPause')}</p>
                        <div>
                          <div style={{ ...labelStyle, marginBottom: 4, fontSize: 9 }}>{t('day.miniSets')}</div>
                          <div style={{ display: 'flex', gap: 4 }}>
                            {[2, 3].map(n => (
                              <button key={n} onClick={() => {
                                const rest = (ex.technique_details || '2,15').split(',')[1] || '15'
                                updateExerciseField(editingDayIndex, exIdx, 'technique_details', `${n},${rest}`)
                              }}
                                style={{ padding: '6px 12px', border: `1px solid ${(ex.technique_details || '2,15').split(',')[0] === String(n) ? GOLD : BORDER}`, background: (ex.technique_details || '2,15').split(',')[0] === String(n) ? GOLD_DIM : BG_BASE, color: (ex.technique_details || '2,15').split(',')[0] === String(n) ? GOLD : TEXT_MUTED, fontFamily: FONT_ALT, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}
                              >{n}</button>
                            ))}
                          </div>
                        </div>
                        <div>
                          <div style={{ ...labelStyle, marginBottom: 4, fontSize: 9 }}>{t('day.restSec')}</div>
                          <div style={{ display: 'flex', gap: 4 }}>
                            {[10, 15, 20].map(n => (
                              <button key={n} onClick={() => {
                                const sets = (ex.technique_details || '2,15').split(',')[0] || '2'
                                updateExerciseField(editingDayIndex, exIdx, 'technique_details', `${sets},${n}`)
                              }}
                                style={{ padding: '6px 10px', border: `1px solid ${(ex.technique_details || '2,15').split(',')[1] === String(n) ? GOLD : BORDER}`, background: (ex.technique_details || '2,15').split(',')[1] === String(n) ? GOLD_DIM : BG_BASE, color: (ex.technique_details || '2,15').split(',')[1] === String(n) ? GOLD : TEXT_MUTED, fontFamily: FONT_ALT, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}
                              >{n}s</button>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                    {ex.technique === 'superset' && (
                      <div style={{ marginTop: 8 }}>
                        <div style={{ ...labelStyle, marginBottom: 4, fontSize: 9 }}>{t('day.partnerExercise')}</div>
                        <select
                          aria-label={`${t('day.partnerExercise')} — ${exerciseNameDisplay}`}
                          value={ex.technique_details || ''}
                          onChange={e => updateExerciseField(editingDayIndex, exIdx, 'technique_details', e.target.value)}
                          style={{ ...inputStyle, width: '100%', padding: '8px' }}
                        >
                          <option value="">{t('day.partnerExercise')}</option>
                          {ex.technique_details && !programDays[editingDayIndex].exercises.some((row: any) => (row.name || row.exercise_name || row.custom_name) === ex.technique_details) && <option value={ex.technique_details} disabled>{ex.technique_details}</option>}
                          {programDays[editingDayIndex].exercises.map((row: any, partnerIndex: number) => {
                            const name = row.name || row.exercise_name || row.custom_name
                            if (partnerIndex === exIdx || !name) return null
                            return <option key={partnerIndex} value={name}>{name}</option>
                          })}
                        </select>
                        <p>{tTechnique('bisetSetup')}</p>
                      </div>
                    )}
                    {ex.technique === 'mechanical' && (
                      <div style={{ marginTop: 8 }}>
                        <div style={{ ...labelStyle, marginBottom: 4, fontSize: 9 }}>{t('day.mechanicalDesc')}</div>
                        <input
                          type="text"
                          value={ex.technique_details || ''}
                          onChange={e => updateExerciseField(editingDayIndex, exIdx, 'technique_details', e.target.value)}
                          placeholder={t('day.mechanicalPlaceholder')}
                          style={{ ...inputStyle, width: '100%', padding: '8px' }}
                        />
                      </div>
                    )}
                  </div>
                  </details>
                </details>
              )})}
            </div>

            {/* Add exercise button */}
            <button
              onClick={() => setShowExerciseSearch(true)}
              style={{
                width: '100%', padding: '14px', background: BG_CARD_2,
                border: `1px dashed ${BORDER}`, color: GOLD,
                fontFamily: FONT_DISPLAY, fontSize: 16, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}
            >
              <Plus size={18} /> {t('day.addExercise')}
            </button>
            </>)}
          </div>
        )}
      <ConfirmDialog
        open={!!exerciseToDelete}
        variant="danger"
        title={t('confirm.deleteTitle')}
        message={t('confirm.deleteMessage', { name: exerciseToDelete?.name || '' })}
        confirmLabel={t('confirm.deleteConfirm')}
        cancelLabel={t('confirm.deleteCancel')}
        onConfirm={() => {
          if (exerciseToDelete) {
            removeExerciseFromDay(exerciseToDelete.dayIdx, exerciseToDelete.exIdx);
            setExerciseToDelete(null);
          }
        }}
        onCancel={() => setExerciseToDelete(null)}
      />
      </div>
    )
  }

  return <RailOverlay>{portalContent}</RailOverlay>
}
