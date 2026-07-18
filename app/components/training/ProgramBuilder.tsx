'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { RailOverlay } from '../ui/RailOverlay'
import { useTranslations, useLocale } from 'next-intl'
import { getExerciseName } from '../../../lib/i18n-exercise'
import { getMuscleLabel } from '../../../lib/i18n-muscle'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { consumeProgramStream } from '@/lib/training/consume-program-stream'
import { combineExerciseLibraries, searchExerciseLibrary } from '@/lib/training/exercise-library'
import {
  addProgramExercise,
  createProgramEditorWeek,
  moveProgramExercise,
  normalizeProgramEditorDays,
  prepareLegacyProgramPayload,
  removeProgramExercise,
  setProgramDayRest,
  swapProgramDays,
  updateProgramDay,
  updateProgramExercise,
  type ProgramEditorDay,
  type ProgramEditorExercise,
} from '@/lib/training/program-editor-model'
import {
  createProgramBuilderCustomExercise,
  createProgramBuilderSupabasePort,
  loadProgramBuilderData,
  loadProgramExerciseVariants,
  saveProgramAndSynchronizeCalendar,
} from '@/lib/training/program-builder-persistence'
import { X, Plus, ChevronLeft, ChevronRight, Trash2, Check } from 'lucide-react'
import {
  BG_BASE, BG_CARD, BG_CARD_2, BORDER, GOLD, GOLD_DIM, GOLD_RULE,
  GREEN, RED, BLUE, TEXT_PRIMARY, TEXT_MUTED, TEXT_DIM,
  RADIUS_CARD, FONT_DISPLAY, FONT_ALT, FONT_BODY, colors, Z_MODAL,
} from '../../../lib/design-tokens'
import { TechniqueExplanationCards } from '../tabs/training/TechniquePopup'
import ConfirmDialog from '../ui/ConfirmDialog'
import { ProgramBuilderExerciseSearchOverlay, ProgramBuilderVariantOverlay } from './program-builder/ProgramBuilderOverlays'
import { ProgramBuilderDayNavigation } from './program-builder/ProgramBuilderDayNavigation'

/* ─── Types ─── */
interface ProgramBuilderProps {
  supabase: any
  session: any
  aiAllowed?: boolean
  onClose: () => void
  onSave: () => void
  editProgram?: any
}

const MUSCLE_OPTIONS = ['Poitrine', 'Dos', 'Épaules', 'Bras', 'Jambes', 'Fessiers', 'Abdos']
const MUSCLE_FILTERS = ['Tous', 'Pectoraux', 'Dos', 'Épaules', 'Biceps', 'Triceps', 'Quadriceps', 'Ischio-jambiers', 'Fessiers', 'Mollets', 'Abdos']
const EQUIPMENT_OPTIONS = ['Haltères', 'Barre', 'Machine', 'Câble', 'Poids du corps', 'Autre']
const REST_OPTIONS = [30, 60, 90, 120, 180]

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
export { padTo7Days } // re-export for existing importers

const DAY_NAMES = DAY_NAMES_FR
const DAY_SHORT = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']

/* ─── Component ─── */
export default function ProgramBuilder({ supabase, session, aiAllowed = true, onClose, onSave, editProgram }: ProgramBuilderProps) {
  const t = useTranslations('training_tab.builder')
  const locale = useLocale() as 'fr' | 'en' | 'de'
  const tMuscle = useTranslations('muscles')
  // Display-only day names (translated). DAY_NAMES at module-level stays FR for DB/padTo7Days.
  const dayNamesDisplay = DAY_NAMES // padTo7Days stores FR weekday in DB — display translation happens at render
  const dayShortDisplay = DAY_SHORT
  // AI config display labels (keys stay FR for backend API)
  const AI_OBJECTIVES = [
    { key: 'masse', label: t('config.objMasse') },
    { key: 'perte', label: t('config.objPerte') },
    { key: 'force', label: t('config.objForce') },
    { key: 'endurance', label: t('config.objEndurance') },
  ]
  const AI_LEVELS = [
    { key: 'debutant', label: t('config.lvlDebutant') },
    { key: 'intermediaire', label: t('config.lvlIntermediaire') },
    { key: 'avance', label: t('config.lvlAvance') },
  ]
  const AI_EQUIPMENT = [
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
  const [aiObjective, setAiObjective] = useState('masse')
  const [aiLevel, setAiLevel] = useState('intermediaire')
  const [aiDays, setAiDays] = useState(4)
  const [aiDuration, setAiDuration] = useState(60)
  const [aiEquipment, setAiEquipment] = useState('salle')
  const [aiPriorities, setAiPriorities] = useState<string[]>([])
  const [aiNotes, setAiNotes] = useState('')
  const [aiGenerating, setAiGenerating] = useState(false)
  const [aiResult, setAiResult] = useState<any>(null)

  // Manual mode
  const [programName, setProgramName] = useState('')
  const [programDays, setProgramDays] = useState<ProgramEditorDay[]>([])
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
  const persistence = useMemo(() => createProgramBuilderSupabasePort(supabase), [supabase])

  /* ─── Load exercises + profile gender (au montage) ─── */
  useEffect(() => {
    void loadProgramBuilderData(persistence, session.user.id).then(result => {
      setDbExercises(result.catalogExercises)
      setCustomExercises(result.customExercises)
      if (result.gender) setUserGender(result.gender)
    })
  }, [persistence, session.user.id])

  /* ─── Charger le programme à éditer (réagit à editProgram) ─── */
  useEffect(() => {
    if (editProgram) {
      setProgramName(editProgram.name)
      setProgramDays(normalizeProgramEditorDays(editProgram.days || []).days)
      setMode('manual')
      setManualStep(1)
    }
  }, [editProgram])

  /* ─── AI generate ─── */
  async function generateAI() {
    setAiGenerating(true)
    const tid = toast.loading(t('toast.generating'))
    try {
      const res = await fetch('/api/generate-custom-program', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          objective: aiObjective, level: aiLevel, daysPerWeek: aiDays,
          duration: aiDuration, equipment: aiEquipment, priorities: aiPriorities,
          notes: aiNotes, gender: userGender,
        }),
      })
      const program = await consumeProgramStream(res)
      if (program) {
        setAiResult(program)
        setProgramName(program.program_name || 'Programme IA') // DB value, do not translate
        setProgramDays(normalizeProgramEditorDays(program.days || []).days)
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
  }

  /* ─── Save custom exercise ─── */
  async function saveCustomExercise() {
    if (!ceName.trim()) return
    setSaving(true)
    const result = await createProgramBuilderCustomExercise(persistence, {
      user_id: session.user.id, name: ceName.trim(), muscle_group: ceMuscle,
      equipment: ceEquipment, description: ceDescription,
      sets: ceSets, reps: ceReps, rest_seconds: ceRest, is_private: true,
    })
    if (result.status === 'success') {
      setCustomExercises(prev => [...prev, result.exercise])
      toast.success(t('toast.exerciseCreated'))
      setCeName(''); setCeMuscle(''); setCeEquipment(''); setCeDescription('')
      setMode('manual')
    }
    setSaving(false)
  }

  /* ─── Save program ─── */
  async function saveProgram() {
    if (!programName.trim() || !programDays.length) return
    const prepared = prepareLegacyProgramPayload({
      ownerUserId: session.user.id,
      name: programName,
      description: aiResult?.description || '',
      days: programDays,
      source: aiResult ? 'ai' : 'manual',
      now: () => new Date(),
    })
    if (!prepared.ok) return
    setSaving(true)
    await saveProgramAndSynchronizeCalendar(persistence, {
      ownerUserId: session.user.id,
      editProgramId: editProgram?.id,
      payload: prepared.payload,
      days: programDays,
      now: () => new Date(),
    })

    toast.success(t('toast.programSaved'))
    setSaving(false)
    onSave()
    onClose()
  }

  /* ─── Helpers ─── */
  function addExerciseToDay(exercise: ProgramEditorExercise, isCustom: boolean) {
    setProgramDays(prev => addProgramExercise(prev, editingDayIndex, exercise, isCustom))
    setShowExerciseSearch(false)
  }

  function removeExerciseFromDay(dayIdx: number, exIdx: number) {
    setProgramDays(prev => removeProgramExercise(prev, { dayIndex: dayIdx, exerciseIndex: exIdx }))
  }

  function updateExerciseField(dayIdx: number, exIdx: number, field: string, value: any) {
    setProgramDays(prev => updateProgramExercise(prev, { dayIndex: dayIdx, exerciseIndex: exIdx }, field, value))
  }

  async function loadVariants(exerciseName: string, dayIdx: number, exIdx: number) {
    const result = await loadProgramExerciseVariants(persistence, exerciseName)
    setVariantPopup({ dayIdx, exIdx, variants: result.variants })
  }
  function selectVariant(variant: any) {
    if (!variantPopup) return
    updateExerciseField(variantPopup.dayIdx, variantPopup.exIdx, 'name', variant.name)
    updateExerciseField(variantPopup.dayIdx, variantPopup.exIdx, 'exercise_name', variant.name)
    setVariantPopup(null)
  }

  function updateDayName(dayIdx: number, name: string) {
    setProgramDays(prev => updateProgramDay(prev, dayIdx, { name }))
  }

  const filteredExercises = searchExerciseLibrary(
    combineExerciseLibraries(dbExercises, customExercises),
    {
      search: exerciseSearchQuery,
      muscle: exerciseSearchFilter,
      allMusclesKey: ALL_KEY,
      muscleMatch: 'case-insensitive',
    },
  ).results

  const previousMode = useRef<'select' | 'manual'>('select')
  function moveExerciseInDay(exIdx: number, dir: number) {
    const ni = exIdx + dir
    const exercises = programDays[editingDayIndex]?.exercises || []
    if (ni < 0 || ni >= exercises.length) return
    setProgramDays(prev => {
      const result = moveProgramExercise(
        prev,
        { dayIndex: editingDayIndex, exerciseIndex: exIdx },
        { dayIndex: editingDayIndex, exerciseIndex: ni },
      )
      return result.days
    })
  }

  /* ─── RENDER ─── */
  if (typeof document === 'undefined') return null
  const portalContent = (
    <div data-no-tab-swipe="true" style={{
      position: 'fixed', inset: 0, zIndex: Z_MODAL, background: BG_BASE, overflowY: 'auto',
    }}>
      <div style={{ maxWidth: 520, margin: '0 auto', padding: '24px 16px calc(120px + env(safe-area-inset-bottom, 0px))' }}>

        {/* ──────── MODE SELECT ──────── */}
        {mode === 'select' && (
          <div>
            {/* Close button */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
              <button onClick={onClose} style={{ background: 'none', border: 'none', color: TEXT_MUTED, cursor: 'pointer' }}>
                <X size={24} />
              </button>
            </div>

            <h1 style={{ fontFamily: FONT_DISPLAY, fontSize: 36, color: TEXT_PRIMARY, margin: '0 0 24px' }}>
              {t('createTitle')}
            </h1>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {/* Card 1 - AI */}
              {aiAllowed ? (
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
              disabled={aiGenerating}
              style={{
                width: '100%', padding: '16px', background: aiGenerating ? GOLD_DIM : GOLD,
                color: colors.onGold, border: 'none', fontFamily: FONT_DISPLAY, fontSize: 18,
                cursor: aiGenerating ? 'not-allowed' : 'pointer', opacity: aiGenerating ? 0.6 : 1,
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
              disabled={saving}
              style={{
                width: '100%', padding: '16px', background: saving ? GOLD_DIM : GOLD,
                color: colors.onGold, border: 'none', fontFamily: FONT_DISPLAY, fontSize: 18,
                cursor: saving ? 'not-allowed' : 'pointer', marginTop: 24,
              }}
            >
              {saving ? t('saving') : t('save')}
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
                        setProgramDays(createProgramEditorWeek(n, programDays))
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
                      const trainingCount = programDays.filter(d => !d.is_rest).length || 4
                      setProgramDays(createProgramEditorWeek(trainingCount, programDays))
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
                  disabled={saving}
                  style={{
                    width: '100%', padding: '16px', background: saving ? GOLD_DIM : GOLD,
                    color: colors.onGold, border: 'none', fontFamily: FONT_DISPLAY, fontSize: 18,
                    cursor: saving ? 'not-allowed' : 'pointer', marginTop: 24,
                  }}
                >
                  {saving ? t('saving') : t('saveProgram')}
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
              disabled={saving || !ceName.trim()}
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

      <ProgramBuilderExerciseSearchOverlay
        open={showExerciseSearch}
        locale={locale}
        query={exerciseSearchQuery}
        filter={exerciseSearchFilter}
        filters={muscleFilterDisplay}
        allKey={ALL_KEY}
        exercises={filteredExercises}
        t={t}
        tMuscle={tMuscle}
        onQueryChange={setExerciseSearchQuery}
        onFilterChange={setExerciseSearchFilter}
        onClose={() => { setShowExerciseSearch(false); setExerciseSearchQuery(''); setExerciseSearchFilter('') }}
        onSelect={addExerciseToDay}
        onCreateCustom={() => { previousMode.current = 'manual'; setShowExerciseSearch(false); setMode('custom-exercise') }}
      />
      <ProgramBuilderVariantOverlay
        variants={variantPopup?.variants || null}
        locale={locale}
        t={t}
        tMuscle={tMuscle}
        onClose={() => setVariantPopup(null)}
        onSelect={selectVariant}
      />
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
    setProgramDays(prev => swapProgramDays(prev, swapFirst, i))
    setSwapFirst(null)
    setSwapMode(false)
    setEditingDayIndex(i)
  }

  function renderDayEditor() {
    return (
      <div>
        <ProgramBuilderDayNavigation
          days={programDays}
          activeIndex={editingDayIndex}
          swapMode={swapMode}
          swapFirst={swapFirst}
          t={t}
          onSelectDay={handleDayTabClick}
          onStartSwap={() => { setSwapMode(true); setSwapFirst(null) }}
          onCancelSwap={() => { setSwapMode(false); setSwapFirst(null) }}
          onToggleRest={() => setProgramDays(previous => setProgramDayRest(previous, editingDayIndex, !previous[editingDayIndex]?.is_rest))}
          onSessionNameChange={name => updateDayName(editingDayIndex, name)}
        />

        {programDays[editingDayIndex] && (
          <div>
            {/* Exercise list — hidden for rest days */}
            {!programDays[editingDayIndex]?.is_rest && (<>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
              {(programDays[editingDayIndex]?.exercises || []).map((ex: any, exIdx: number) => {
                const exerciseNameRaw = ex.exercise_name || ex.custom_name || ex.name || dbExercises.find(e => e.id === ex.exercise_id)?.name || ''
                const exerciseName = exerciseNameRaw || t('day.unknownExercise') // display fallback
                const exerciseNameDisplay = getExerciseName(ex, locale) || exerciseName
                const exerciseMuscle = ex.muscle_group || ex.focus || dbExercises.find(e => e.id === ex.exercise_id)?.muscle_group || ''
                const exCount = programDays[editingDayIndex]?.exercises?.length || 0
                return (
                <div key={exIdx} style={{ background: BG_CARD, border: `1px solid ${BORDER}`, padding: 16 }}>
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
                        value={ex.sets || 3}
                        onChange={e => updateExerciseField(editingDayIndex, exIdx, 'sets', Number(e.target.value))}
                        style={{ ...inputStyle, width: 60, padding: '8px', textAlign: 'center' }}
                      />
                    </div>
                    <div>
                      <div style={{ ...labelStyle, marginBottom: 4 }}>{t('day.repsLabel')}</div>
                      <input
                        type="number" min={1} max={100}
                        value={ex.reps || 10}
                        onChange={e => updateExerciseField(editingDayIndex, exIdx, 'reps', Number(e.target.value))}
                        style={{ ...inputStyle, width: 60, padding: '8px', textAlign: 'center' }}
                      />
                    </div>
                    <div>
                      <div style={{ ...labelStyle, marginBottom: 4 }}>{t('day.restLabel')}</div>
                      <select
                        value={ex.rest || 90}
                        onChange={e => updateExerciseField(editingDayIndex, exIdx, 'rest', Number(e.target.value))}
                        style={{ ...inputStyle, width: 80, padding: '8px', appearance: 'auto' as any }}
                      >
                        {REST_OPTIONS.map(r => (
                          <option key={r} value={r}>{r}s</option>
                        ))}
                      </select>
                    </div>
                  </div>

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
                      onChange={e => {
                        const val = e.target.value || null
                        updateExerciseField(editingDayIndex, exIdx, 'technique', val)
                        if (!val) updateExerciseField(editingDayIndex, exIdx, 'technique_details', '')
                      }}
                      style={{ ...inputStyle, width: '100%', padding: '8px', appearance: 'auto' as any }}
                    >
                      <option value="">{t('day.techniqueNone')}</option>
                      <option value="dropset">Drop Set</option>
                      <option value="restpause">Rest Pause</option>
                      <option value="superset">Superset</option>
                      <option value="mechanical">Mechanical Drop Set</option>
                    </select>

                    {/* Technique details */}
                    {ex.technique === 'dropset' && (
                      <div style={{ marginTop: 8 }}>
                        <div style={{ ...labelStyle, marginBottom: 4, fontSize: 9 }}>{t('day.dropCount')}</div>
                        <div style={{ display: 'flex', gap: 6 }}>
                          {[1, 2, 3].map(n => (
                            <button key={n} onClick={() => updateExerciseField(editingDayIndex, exIdx, 'technique_details', String(n))}
                              style={{ padding: '6px 14px', border: `1px solid ${(ex.technique_details || '2') === String(n) ? GOLD : BORDER}`, background: (ex.technique_details || '2') === String(n) ? GOLD_DIM : BG_BASE, color: (ex.technique_details || '2') === String(n) ? GOLD : TEXT_MUTED, fontFamily: FONT_ALT, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}
                            >{n}</button>
                          ))}
                        </div>
                      </div>
                    )}
                    {ex.technique === 'restpause' && (
                      <div style={{ marginTop: 8, display: 'flex', gap: 12 }}>
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
                        <input
                          type="text"
                          value={ex.technique_details || ''}
                          onChange={e => updateExerciseField(editingDayIndex, exIdx, 'technique_details', e.target.value)}
                          placeholder={t('day.partnerPlaceholder')}
                          style={{ ...inputStyle, width: '100%', padding: '8px' }}
                        />
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
                </div>
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
