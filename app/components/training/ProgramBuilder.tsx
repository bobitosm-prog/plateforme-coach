'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { RailOverlay } from '../ui/RailOverlay'
import { TechniqueExplanationCards } from '../tabs/training/TechniquePopup'
import { getMuscleLabel } from '@/lib/i18n-muscle'
import { consumeProgramStream } from '@/lib/training/consume-program-stream'
import { combineExerciseLibraries, searchExerciseLibrary } from '@/lib/training/exercise-library'
import {
  addProgramExercise, createProgramEditorWeek, moveProgramExercise, normalizeProgramEditorDays,
  prepareLegacyProgramPayload, removeProgramExercise, setProgramDayRest, swapProgramDays,
  updateProgramDay, updateProgramExercise, type ProgramEditorDay, type ProgramEditorExercise,
} from '@/lib/training/program-editor-model'
import {
  createProgramBuilderCustomExercise, createProgramBuilderSupabasePort, loadProgramBuilderData,
  loadProgramExerciseVariants, saveProgramAndSynchronizeCalendar, type BuilderRecord,
  type ProgramBuilderSupabaseClient,
} from '@/lib/training/program-builder-persistence'
import { BG_BASE, Z_MODAL } from '@/lib/design-tokens'
import { padTo7Days } from '@/lib/schedule-utils'
import { ProgramBuilderExerciseEditor, type ExerciseDeleteTarget } from './program-builder/ProgramBuilderExerciseEditor'
import {
  ProgramBuilderAiView, ProgramBuilderCustomExerciseView, ProgramBuilderManualView,
  ProgramBuilderSelectView, type BuilderMode,
} from './program-builder/ProgramBuilderModeViews'
import { ProgramBuilderExerciseSearchOverlay, ProgramBuilderVariantOverlay } from './program-builder/ProgramBuilderOverlays'

export { padTo7Days }

interface ProgramBuilderProps {
  supabase: ProgramBuilderSupabaseClient
  session: { user: { id: string } }
  aiAllowed?: boolean
  onClose: () => void
  onSave: () => void
  editProgram?: { id?: string; name: string; days?: unknown[] }
}

interface AiProgram { program_name?: string; description?: string; days?: unknown[] }
interface VariantRecord extends BuilderRecord { name?: string; equipment?: string; muscle_group?: string }

const MUSCLE_FILTERS = ['Tous', 'Pectoraux', 'Dos', 'Épaules', 'Biceps', 'Triceps', 'Quadriceps', 'Ischio-jambiers', 'Fessiers', 'Mollets', 'Abdos']
const ALL_KEY = '__all__'

export default function ProgramBuilder({ supabase, session, aiAllowed = true, onClose, onSave, editProgram }: ProgramBuilderProps) {
  const t = useTranslations('training_tab.builder')
  const tMuscle = useTranslations('muscles')
  const locale = useLocale() as 'fr' | 'en' | 'de'
  const persistence = useMemo(() => createProgramBuilderSupabasePort(supabase), [supabase])

  const [mode, setMode] = useState<BuilderMode>('select')
  const [catalog, setCatalog] = useState<BuilderRecord[]>([])
  const [customExercises, setCustomExercises] = useState<BuilderRecord[]>([])
  const [userGender, setUserGender] = useState('male')
  const [saving, setSaving] = useState(false)
  const [programName, setProgramName] = useState('')
  const [programDays, setProgramDays] = useState<ProgramEditorDay[]>([])
  const [manualStep, setManualStep] = useState(0)
  const [editingDayIndex, setEditingDayIndex] = useState(0)
  const [swapMode, setSwapMode] = useState(false)
  const [swapFirst, setSwapFirst] = useState<number | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<ExerciseDeleteTarget | null>(null)
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchFilter, setSearchFilter] = useState('')
  const [variantPopup, setVariantPopup] = useState<{ dayIdx: number; exIdx: number; variants: VariantRecord[] } | null>(null)
  const previousMode = useRef<'select' | 'manual'>('select')

  const [aiObjective, setAiObjective] = useState('masse')
  const [aiLevel, setAiLevel] = useState('intermediaire')
  const [aiDays, setAiDays] = useState(4)
  const [aiDuration, setAiDuration] = useState(60)
  const [aiEquipment, setAiEquipment] = useState('salle')
  const [aiPriorities, setAiPriorities] = useState<string[]>([])
  const [aiNotes, setAiNotes] = useState('')
  const [aiGenerating, setAiGenerating] = useState(false)
  const [aiResult, setAiResult] = useState<AiProgram | null>(null)

  const [customDraft, setCustomDraft] = useState({ name: '', muscle: '', equipment: '', description: '', sets: 3, reps: 10, rest: 90 })

  useEffect(() => {
    void loadProgramBuilderData(persistence, session.user.id).then(result => {
      setCatalog(result.catalogExercises)
      setCustomExercises(result.customExercises)
      if (result.gender) setUserGender(result.gender)
    })
  }, [persistence, session.user.id])

  useEffect(() => {
    if (!editProgram) return
    setProgramName(editProgram.name)
    setProgramDays(normalizeProgramEditorDays(editProgram.days || []).days)
    setMode('manual')
    setManualStep(1)
  }, [editProgram])

  async function generateAI() {
    setAiGenerating(true)
    const loading = toast.loading(t('toast.generating'))
    try {
      const response = await fetch('/api/generate-custom-program', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ objective: aiObjective, level: aiLevel, daysPerWeek: aiDays, duration: aiDuration, equipment: aiEquipment, priorities: aiPriorities, notes: aiNotes, gender: userGender }),
      })
      const program = await consumeProgramStream(response) as AiProgram | null
      if (program) {
        setAiResult(program)
        setProgramName(program.program_name || 'Programme IA')
        setProgramDays(normalizeProgramEditorDays(program.days || []).days)
        toast.success(t('toast.generated'))
      } else toast.error(t('toast.generationError'))
    } catch (error) {
      console.error('[ProgramBuilder] Fetch error:', error)
      toast.error(`${t('toast.networkError')}: ${error instanceof Error ? error.message : ''}`)
    } finally {
      toast.dismiss(loading)
      setAiGenerating(false)
    }
  }

  async function saveCustomExercise() {
    if (!customDraft.name.trim()) return
    setSaving(true)
    const result = await createProgramBuilderCustomExercise(persistence, {
      user_id: session.user.id, name: customDraft.name.trim(), muscle_group: customDraft.muscle,
      equipment: customDraft.equipment, description: customDraft.description,
      sets: customDraft.sets, reps: customDraft.reps, rest_seconds: customDraft.rest, is_private: true,
    })
    if (result.status === 'success') {
      setCustomExercises(previous => [...previous, result.exercise])
      toast.success(t('toast.exerciseCreated'))
      setCustomDraft({ name: '', muscle: '', equipment: '', description: '', sets: 3, reps: 10, rest: 90 })
      setMode('manual')
    }
    setSaving(false)
  }

  async function saveProgram() {
    if (!programName.trim() || !programDays.length) return
    const prepared = prepareLegacyProgramPayload({ ownerUserId: session.user.id, name: programName, description: aiResult?.description || '', days: programDays, source: aiResult ? 'ai' : 'manual', now: () => new Date() })
    if (!prepared.ok) return
    setSaving(true)
    await saveProgramAndSynchronizeCalendar(persistence, { ownerUserId: session.user.id, editProgramId: editProgram?.id, payload: prepared.payload, days: programDays, now: () => new Date() })
    toast.success(t('toast.programSaved'))
    setSaving(false)
    onSave()
    onClose()
  }

  const filteredExercises = searchExerciseLibrary(combineExerciseLibraries(catalog, customExercises), { search: searchQuery, muscle: searchFilter, allMusclesKey: ALL_KEY, muscleMatch: 'case-insensitive' }).results
  const filters = [{ key: ALL_KEY, label: tMuscle('all') }, ...MUSCLE_FILTERS.slice(1).map(muscle => ({ key: muscle, label: getMuscleLabel(muscle, locale, tMuscle) }))]

  function updateExercise(index: number, field: string, value: unknown) {
    setProgramDays(previous => updateProgramExercise(previous, { dayIndex: editingDayIndex, exerciseIndex: index }, field, value))
  }
  function addExercise(exercise: ProgramEditorExercise, custom: boolean) {
    setProgramDays(previous => addProgramExercise(previous, editingDayIndex, exercise, custom))
    setSearchOpen(false)
  }
  function moveExercise(index: number, direction: number) {
    const destination = index + direction
    const exercises = programDays[editingDayIndex]?.exercises || []
    if (destination < 0 || destination >= exercises.length) return
    setProgramDays(previous => moveProgramExercise(previous, { dayIndex: editingDayIndex, exerciseIndex: index }, { dayIndex: editingDayIndex, exerciseIndex: destination }).days)
  }
  function selectDay(index: number) {
    if (!swapMode) return setEditingDayIndex(index)
    if (swapFirst === null) return setSwapFirst(index)
    setProgramDays(previous => swapProgramDays(previous, swapFirst, index))
    setSwapFirst(null); setSwapMode(false); setEditingDayIndex(index)
  }
  async function loadVariants(name: string, index: number) {
    const result = await loadProgramExerciseVariants(persistence, name)
    setVariantPopup({ dayIdx: editingDayIndex, exIdx: index, variants: result.variants })
  }
  function selectVariant(variant: VariantRecord) {
    if (!variantPopup) return
    setProgramDays(previous => {
      const named = updateProgramExercise(previous, { dayIndex: variantPopup.dayIdx, exerciseIndex: variantPopup.exIdx }, 'name', variant.name)
      return updateProgramExercise(named, { dayIndex: variantPopup.dayIdx, exerciseIndex: variantPopup.exIdx }, 'exercise_name', variant.name)
    })
    setVariantPopup(null)
  }

  const dayEditor = <ProgramBuilderExerciseEditor days={programDays} activeIndex={editingDayIndex} swapMode={swapMode} swapFirst={swapFirst} locale={locale} catalog={catalog} deleteTarget={deleteTarget} t={t}
    onDay={selectDay} onStartSwap={() => { setSwapMode(true); setSwapFirst(null) }} onCancelSwap={() => { setSwapMode(false); setSwapFirst(null) }}
    onToggleRest={() => setProgramDays(previous => setProgramDayRest(previous, editingDayIndex, !previous[editingDayIndex]?.is_rest))}
    onSessionName={name => setProgramDays(previous => updateProgramDay(previous, editingDayIndex, { name }))}
    onMove={moveExercise} onVariant={loadVariants} onDeleteRequest={setDeleteTarget}
    onDeleteConfirm={() => { if (deleteTarget) setProgramDays(previous => removeProgramExercise(previous, { dayIndex: deleteTarget.dayIdx, exerciseIndex: deleteTarget.exIdx })); setDeleteTarget(null) }}
    onDeleteCancel={() => setDeleteTarget(null)} onExercise={updateExercise} onAdd={() => setSearchOpen(true)}/>

  const techniques = [...new Set(programDays.flatMap(day => (day.exercises || []).map(exercise => exercise.technique).filter((value): value is string => typeof value === 'string' && !!value)))]
  function manualNext() {
    if (!programName.trim()) return void toast.error(t('config.nameRequired'))
    if (!programDays.length || programDays.length < 7) setProgramDays(createProgramEditorWeek(programDays.filter(day => !day.is_rest).length || 4, programDays))
    setManualStep(1)
  }

  if (typeof document === 'undefined') return null
  return <RailOverlay><div data-no-tab-swipe="true" style={{ position: 'fixed', inset: 0, zIndex: Z_MODAL, background: BG_BASE, overflowY: 'auto' }}><div style={{ maxWidth: 520, margin: '0 auto', padding: '24px 16px calc(120px + env(safe-area-inset-bottom, 0px))' }}>
    {mode === 'select' && (
      <ProgramBuilderSelectView t={t} aiAllowed={aiAllowed} onClose={onClose} onSelect={next => {
        if (next === 'custom-exercise') previousMode.current = 'select'
        setMode(next)
      }}/>
    )}
    {mode === 'ai' && (
      <ProgramBuilderAiView t={t} tMuscle={tMuscle} locale={locale} result={aiResult} programName={programName} dayEditor={dayEditor} objective={aiObjective} level={aiLevel} days={aiDays} duration={aiDuration} equipment={aiEquipment} priorities={aiPriorities} notes={aiNotes} generating={aiGenerating} saving={saving} techniques={techniques} onBack={() => setMode('select')} onObjective={setAiObjective} onLevel={setAiLevel} onDays={setAiDays} onDuration={setAiDuration} onEquipment={setAiEquipment} onPriorities={setAiPriorities} onNotes={setAiNotes} onGenerate={generateAI} onEditParameters={() => setAiResult(null)} onSave={saveProgram} techniqueCards={values => <TechniqueExplanationCards techniques={values}/>}/>
    )}
    {mode === 'manual' && (
      <ProgramBuilderManualView t={t} step={manualStep} name={programName} days={programDays} saving={saving} dayEditor={dayEditor} onBack={() => manualStep > 0 ? setManualStep(0) : setMode('select')} onName={setProgramName} onDays={count => setProgramDays(createProgramEditorWeek(count, programDays))} onNext={manualNext} onSave={saveProgram}/>
    )}
    {mode === 'custom-exercise' && (
      <ProgramBuilderCustomExerciseView t={t} {...customDraft} onBack={() => setMode(previousMode.current)} saving={saving} onField={(field, value) => setCustomDraft(previous => ({ ...previous, [field]: value }))} onSave={saveCustomExercise}/>
    )}
  </div>
  <ProgramBuilderExerciseSearchOverlay open={searchOpen} locale={locale} query={searchQuery} filter={searchFilter} filters={filters} allKey={ALL_KEY} exercises={filteredExercises} t={t} tMuscle={tMuscle} onQueryChange={setSearchQuery} onFilterChange={setSearchFilter} onClose={() => { setSearchOpen(false); setSearchQuery(''); setSearchFilter('') }} onSelect={addExercise} onCreateCustom={() => { previousMode.current = 'manual'; setSearchOpen(false); setMode('custom-exercise') }}/>
  <ProgramBuilderVariantOverlay variants={variantPopup?.variants || null} locale={locale} t={t} tMuscle={tMuscle} onClose={() => setVariantPopup(null)} onSelect={selectVariant}/>
  </div></RailOverlay>
}
