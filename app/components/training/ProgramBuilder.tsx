'use client'

import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { X, Plus, ChevronLeft, ChevronRight, Search, Trash2, Check } from 'lucide-react'
import {
  BG_BASE, BG_CARD, BG_CARD_2, BORDER, GOLD, GOLD_DIM, GOLD_RULE,
  GREEN, RED, BLUE, TEXT_PRIMARY, TEXT_MUTED, TEXT_DIM,
  RADIUS_CARD, FONT_DISPLAY, FONT_ALT, FONT_BODY,
} from '../../../lib/design-tokens'
import { DndContext, closestCenter, PointerSensor, TouchSensor, useSensor, useSensors } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable'
import SortableExercise from '../ui/SortableExercise'

/* ─── Types ─── */
interface ProgramBuilderProps {
  supabase: any
  session: any
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

const DAY_NAMES = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche']
const DAY_SHORT = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']

/** Ensure programDays always has exactly 7 entries, each tagged with weekday */
function padTo7Days(days: any[]): any[] {
  const result = [...days]
  result.forEach((d, i) => { if (!d.weekday) d.weekday = DAY_NAMES[i] || `Jour ${i + 1}` })
  while (result.length < 7) {
    result.push({ name: '', weekday: DAY_NAMES[result.length], is_rest: true, exercises: [] })
  }
  return result.slice(0, 7)
}

/** Export for TrainingTab */
export { padTo7Days }

/* ─── Component ─── */
export default function ProgramBuilder({ supabase, session, onClose, onSave, editProgram }: ProgramBuilderProps) {
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
  const [programDays, setProgramDays] = useState<any[]>([])
  const [manualStep, setManualStep] = useState(0)
  const [showExerciseSearch, setShowExerciseSearch] = useState(false)
  const [exerciseSearchQuery, setExerciseSearchQuery] = useState('')
  const [exerciseSearchFilter, setExerciseSearchFilter] = useState('')
  const [editingDayIndex, setEditingDayIndex] = useState(0)
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

  /* ─── Load exercises + profile gender ─── */
  useEffect(() => {
    supabase.from('exercises_db').select('id, name, muscle_group').order('name').limit(200)
      .then(({ data }: any) => setDbExercises(data || []))
    supabase.from('custom_exercises').select('*').eq('user_id', session.user.id).order('name')
      .then(({ data }: any) => setCustomExercises(data || []))
    supabase.from('profiles').select('gender').eq('id', session.user.id).single()
      .then(({ data }: any) => { if (data?.gender) setUserGender(data.gender) })
    if (editProgram) {
      setProgramName(editProgram.name)
      setProgramDays(padTo7Days(editProgram.days || []))
      setMode('manual')
      setManualStep(1)
    }
  }, [])

  /* ─── AI generate ─── */
  async function generateAI() {
    setAiGenerating(true)
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
      const data = await res.json()
      if (data.program) {
        setAiResult(data.program)
        setProgramName(data.program.program_name || 'Programme IA')
        setProgramDays(padTo7Days(data.program.days || []))
        toast.success('Programme généré !')
      } else {
        toast.error(data.error || 'Erreur de génération')
      }
    } catch (e: any) {
      console.error('[ProgramBuilder] Fetch error:', e)
      toast.error('Erreur réseau: ' + (e.message || 'inconnue'))
    }
    setAiGenerating(false)
  }

  /* ─── Save custom exercise ─── */
  async function saveCustomExercise() {
    if (!ceName.trim()) return
    setSaving(true)
    const { data } = await supabase.from('custom_exercises').insert({
      user_id: session.user.id, name: ceName.trim(), muscle_group: ceMuscle,
      equipment: ceEquipment, description: ceDescription,
      sets: ceSets, reps: ceReps, rest_seconds: ceRest, is_private: true,
    }).select().single()
    if (data) {
      setCustomExercises(prev => [...prev, data])
      toast.success('Exercice créé !')
      setCeName(''); setCeMuscle(''); setCeEquipment(''); setCeDescription('')
      setMode('manual')
    }
    setSaving(false)
  }

  /* ─── Save program ─── */
  async function saveProgram() {
    if (!programName.trim() || !programDays.length) return
    setSaving(true)
    const payload = {
      user_id: session.user.id,
      name: programName.trim(),
      description: aiResult?.description || '',
      days: programDays,
      source: aiResult ? 'ai' : 'manual',
      is_active: false,
      updated_at: new Date().toISOString(),
    }
    if (editProgram?.id) {
      await supabase.from('custom_programs').update(payload).eq('id', editProgram.id)
    } else {
      await supabase.from('custom_programs').insert(payload)
    }

    // Regenerate scheduled_sessions for current week with correct day names
    try {
      const today = new Date()
      const dow = today.getDay()
      const monday = new Date(today)
      monday.setDate(today.getDate() - (dow === 0 ? 6 : dow - 1))
      monday.setHours(0, 0, 0, 0)
      const sunday = new Date(monday)
      sunday.setDate(monday.getDate() + 6)
      const mondayStr = monday.toISOString().split('T')[0]
      const sundayStr = sunday.toISOString().split('T')[0]

      await supabase.from('scheduled_sessions').delete()
        .eq('user_id', session.user.id)
        .gte('scheduled_date', mondayStr).lte('scheduled_date', sundayStr)
        .eq('completed', false)

      const newSessions: any[] = []
      for (let i = 0; i < 7; i++) {
        const day = programDays[i]
        if (!day || day.is_rest) continue
        const date = new Date(monday)
        date.setDate(monday.getDate() + i)
        newSessions.push({
          user_id: session.user.id,
          title: day.name || day.weekday || DAY_NAMES[i],
          session_type: 'custom',
          scheduled_date: date.toISOString().split('T')[0],
          scheduled_time: '08:00',
          duration_min: 60,
          completed: false,
        })
      }
      if (newSessions.length > 0) {
        await supabase.from('scheduled_sessions').insert(newSessions)
      }
    } catch (e) { console.error('[saveProgram] scheduled_sessions sync error:', e) }

    toast.success('Programme sauvegardé !')
    setSaving(false)
    onSave()
    onClose()
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
          name: exercise.name,
          muscle_group: exercise.muscle_group,
          sets: exercise.sets || 3,
          reps: exercise.reps || 10,
          rest: exercise.rest_seconds || 90,
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
      day.exercises[exIdx] = { ...day.exercises[exIdx], [field]: value }
      updated[dayIdx] = day
      return updated
    })
  }

  async function loadVariants(exerciseName: string, dayIdx: number, exIdx: number) {
    const { data: current } = await supabase
      .from('exercises_db').select('variant_group')
      .ilike('name', exerciseName).limit(1).maybeSingle()
    if (!current?.variant_group) {
      const baseName = exerciseName.split(' ').slice(0, 2).join(' ')
      const { data: similar } = await supabase
        .from('exercises_db').select('name, equipment, muscle_group')
        .ilike('name', `%${baseName}%`).neq('name', exerciseName).limit(8)
      setVariantPopup({ dayIdx, exIdx, variants: similar || [] })
      return
    }
    const { data: variants } = await supabase
      .from('exercises_db').select('name, equipment, muscle_group')
      .eq('variant_group', current.variant_group)
      .neq('name', exerciseName).order('equipment').limit(10)
    setVariantPopup({ dayIdx, exIdx, variants: variants || [] })
  }
  function selectVariant(variant: any) {
    if (!variantPopup) return
    updateExerciseField(variantPopup.dayIdx, variantPopup.exIdx, 'name', variant.name)
    updateExerciseField(variantPopup.dayIdx, variantPopup.exIdx, 'exercise_name', variant.name)
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
      if (exerciseSearchFilter && exerciseSearchFilter !== 'Tous') {
        const mg = (e.muscle_group || '').toLowerCase()
        const filter = exerciseSearchFilter.toLowerCase()
        if (mg !== filter) return false
      }
      return true
    })

  const previousMode = useRef<'select' | 'manual'>('select')
  const pbSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } })
  )
  function handleExerciseDragEnd(event: any) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = parseInt(active.id.replace('pex-', ''))
    const newIndex = parseInt(over.id.replace('pex-', ''))
    setProgramDays(prev => {
      const updated = [...prev]
      const day = { ...updated[editingDayIndex] }
      day.exercises = arrayMove([...(day.exercises || [])], oldIndex, newIndex)
      updated[editingDayIndex] = day
      return updated
    })
  }

  /* ─── RENDER ─── */
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 60, background: BG_BASE, overflowY: 'auto',
    }}>
      <div style={{ maxWidth: 520, margin: '0 auto', padding: '24px 16px 100px' }}>

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
              CRÉE TON PROGRAMME
            </h1>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {/* Card 1 - AI */}
              <motion.button
                whileHover={{ borderColor: GOLD }}
                onClick={() => setMode('ai')}
                style={{
                  background: BG_CARD, border: `1px solid ${BORDER}`, padding: 24,
                  cursor: 'pointer', textAlign: 'left', width: '100%',
                }}
              >
                <div style={{ fontSize: 28, marginBottom: 8 }}>🤖</div>
                <div style={{ fontFamily: FONT_DISPLAY, fontSize: 20, color: TEXT_PRIMARY }}>GÉNÉRER AVEC L&apos;IA</div>
                <div style={{ fontFamily: FONT_BODY, fontSize: 13, color: TEXT_MUTED, marginTop: 4 }}>
                  Décris ton objectif et l&apos;IA crée tout
                </div>
              </motion.button>

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
                <div style={{ fontFamily: FONT_DISPLAY, fontSize: 20, color: TEXT_PRIMARY }}>CRÉER MOI-MÊME</div>
                <div style={{ fontFamily: FONT_BODY, fontSize: 13, color: TEXT_MUTED, marginTop: 4 }}>
                  Sélectionne tes exercices par jour
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
                <div style={{ fontFamily: FONT_DISPLAY, fontSize: 20, color: TEXT_PRIMARY }}>EXERCICE PERSONNALISÉ</div>
                <div style={{ fontFamily: FONT_BODY, fontSize: 13, color: TEXT_MUTED, marginTop: 4 }}>
                  Ajoute un exercice qui n&apos;existe pas
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
              <ChevronLeft size={18} /> Retour
            </button>

            <h1 style={{ fontFamily: FONT_DISPLAY, fontSize: 32, color: TEXT_PRIMARY, margin: '0 0 24px' }}>
              PROGRAMME IA
            </h1>

            {/* Objectif */}
            <div style={{ marginBottom: 20 }}>
              <div style={labelStyle}>Objectif</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {['masse', 'perte', 'force', 'endurance'].map(o => (
                  <button key={o} onClick={() => setAiObjective(o)} style={selBtn(aiObjective === o)}>{o}</button>
                ))}
              </div>
            </div>

            {/* Niveau */}
            <div style={{ marginBottom: 20 }}>
              <div style={labelStyle}>Niveau</div>
              <div style={{ display: 'flex', gap: 8 }}>
                {['debutant', 'intermediaire', 'avance'].map(l => (
                  <button key={l} onClick={() => setAiLevel(l)} style={{ ...selBtn(aiLevel === l), flex: 1 }}>{l}</button>
                ))}
              </div>
            </div>

            {/* Jours/semaine */}
            <div style={{ marginBottom: 20 }}>
              <div style={labelStyle}>Jours / semaine</div>
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
              <div style={labelStyle}>Durée (min)</div>
              <div style={{ display: 'flex', gap: 8 }}>
                {[30, 45, 60, 90].map(d => (
                  <button key={d} onClick={() => setAiDuration(d)} style={{ ...selBtn(aiDuration === d), flex: 1 }}>{d}</button>
                ))}
              </div>
            </div>

            {/* Équipement */}
            <div style={{ marginBottom: 20 }}>
              <div style={labelStyle}>Équipement</div>
              <div style={{ display: 'flex', gap: 8 }}>
                {['salle', 'halteres', 'sans_materiel'].map(eq => (
                  <button key={eq} onClick={() => setAiEquipment(eq)} style={{ ...selBtn(aiEquipment === eq), flex: 1 }}>{eq.replace('_', ' ')}</button>
                ))}
              </div>
            </div>

            {/* Zones prioritaires */}
            <div style={{ marginBottom: 20 }}>
              <div style={labelStyle}>Zones prioritaires</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {MUSCLE_OPTIONS.map(m => {
                  const selected = aiPriorities.includes(m)
                  return (
                    <button
                      key={m}
                      onClick={() => setAiPriorities(prev => selected ? prev.filter(p => p !== m) : [...prev, m])}
                      style={selBtn(selected)}
                    >
                      {m}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Notes */}
            <div style={{ marginBottom: 24 }}>
              <div style={labelStyle}>Notes</div>
              <textarea
                value={aiNotes}
                onChange={e => setAiNotes(e.target.value)}
                rows={3}
                style={{ ...inputStyle, resize: 'vertical' }}
                placeholder="Blessures, préférences..."
              />
            </div>

            {/* Generate button */}
            <button
              onClick={generateAI}
              disabled={aiGenerating}
              style={{
                width: '100%', padding: '16px', background: aiGenerating ? GOLD_DIM : GOLD,
                color: '#0D0B08', border: 'none', fontFamily: FONT_DISPLAY, fontSize: 18,
                cursor: aiGenerating ? 'not-allowed' : 'pointer', opacity: aiGenerating ? 0.6 : 1,
              }}
            >
              {aiGenerating ? 'GÉNÉRATION EN COURS...' : 'GÉNÉRER MON PROGRAMME'}
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
              <ChevronLeft size={18} /> Modifier les paramètres
            </button>

            <h1 style={{ fontFamily: FONT_DISPLAY, fontSize: 32, color: TEXT_PRIMARY, margin: '0 0 8px' }}>
              {programName}
            </h1>

            {renderDayEditor()}

            <button
              onClick={saveProgram}
              disabled={saving}
              style={{
                width: '100%', padding: '16px', background: saving ? GOLD_DIM : GOLD,
                color: '#0D0B08', border: 'none', fontFamily: FONT_DISPLAY, fontSize: 18,
                cursor: saving ? 'not-allowed' : 'pointer', marginTop: 24,
              }}
            >
              {saving ? 'SAUVEGARDE...' : 'SAUVEGARDER'}
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
              <ChevronLeft size={18} /> Retour
            </button>

            {manualStep === 0 && (
              <div>
                <h1 style={{ fontFamily: FONT_DISPLAY, fontSize: 32, color: TEXT_PRIMARY, margin: '0 0 24px' }}>
                  PROGRAMME MANUEL
                </h1>

                <div style={{ marginBottom: 20 }}>
                  <div style={labelStyle}>Nom du programme</div>
                  <input
                    value={programName}
                    onChange={e => setProgramName(e.target.value)}
                    style={inputStyle}
                    placeholder="Ex: Push Pull Legs"
                    required
                  />
                </div>

                <div style={{ marginBottom: 24 }}>
                  <div style={labelStyle}>Jours d&apos;entraînement / semaine</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <input
                      type="range" min={1} max={7}
                      value={programDays.filter(d => !d.is_rest).length || 3}
                      onChange={e => {
                        const n = parseInt(e.target.value)
                        setProgramDays(DAY_NAMES.map((wd, i) => {
                          const existing = programDays[i]
                          if (i < n) {
                            return existing && !existing.is_rest
                              ? { ...existing, weekday: wd }
                              : { name: existing?.name || '', weekday: wd, is_rest: false, exercises: existing?.exercises || [] }
                          }
                          return { name: '', weekday: wd, is_rest: true, exercises: [] }
                        }))
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
                    if (!programName.trim()) { toast.error('Donne un nom au programme'); return }
                    if (!programDays.length || programDays.length < 7) {
                      const trainingCount = programDays.filter(d => !d.is_rest).length || 4
                      setProgramDays(DAY_NAMES.map((wd, i) => {
                        const existing = programDays[i]
                        if (i < trainingCount && existing && !existing.is_rest) return { ...existing, weekday: wd }
                        if (i < trainingCount) return { name: '', weekday: wd, is_rest: false, exercises: [] }
                        return { name: '', weekday: wd, is_rest: true, exercises: [] }
                      }))
                    }
                    setManualStep(1)
                  }}
                  style={{
                    width: '100%', padding: '16px', background: GOLD, color: '#0D0B08',
                    border: 'none', fontFamily: FONT_DISPLAY, fontSize: 18, cursor: 'pointer',
                  }}
                >
                  SUIVANT
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
                    color: '#0D0B08', border: 'none', fontFamily: FONT_DISPLAY, fontSize: 18,
                    cursor: saving ? 'not-allowed' : 'pointer', marginTop: 24,
                  }}
                >
                  {saving ? 'SAUVEGARDE...' : 'SAUVEGARDER LE PROGRAMME'}
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
              <ChevronLeft size={18} /> Retour
            </button>

            <h1 style={{ fontFamily: FONT_DISPLAY, fontSize: 32, color: TEXT_PRIMARY, margin: '0 0 24px' }}>
              NOUVEL EXERCICE
            </h1>

            {/* Nom */}
            <div style={{ marginBottom: 20 }}>
              <div style={labelStyle}>Nom</div>
              <input value={ceName} onChange={e => setCeName(e.target.value)} style={inputStyle} placeholder="Nom de l'exercice" required />
            </div>

            {/* Groupe musculaire */}
            <div style={{ marginBottom: 20 }}>
              <div style={labelStyle}>Groupe musculaire</div>
              <select value={ceMuscle} onChange={e => setCeMuscle(e.target.value)} style={{ ...inputStyle, appearance: 'auto' as any }}>
                <option value="">Sélectionner</option>
                {['Poitrine', 'Dos', 'Épaules', 'Bras', 'Jambes', 'Fessiers', 'Abdos', 'Cardio'].map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>

            {/* Équipement */}
            <div style={{ marginBottom: 20 }}>
              <div style={labelStyle}>Équipement</div>
              <select value={ceEquipment} onChange={e => setCeEquipment(e.target.value)} style={{ ...inputStyle, appearance: 'auto' as any }}>
                <option value="">Sélectionner</option>
                {EQUIPMENT_OPTIONS.map(eq => (
                  <option key={eq} value={eq}>{eq}</option>
                ))}
              </select>
            </div>

            {/* Description */}
            <div style={{ marginBottom: 20 }}>
              <div style={labelStyle}>Description</div>
              <textarea value={ceDescription} onChange={e => setCeDescription(e.target.value)} rows={3} style={{ ...inputStyle, resize: 'vertical' }} placeholder="Notes ou instructions..." />
            </div>

            {/* Sets */}
            <div style={{ marginBottom: 20 }}>
              <div style={labelStyle}>Séries</div>
              <input type="number" min={1} max={10} value={ceSets} onChange={e => setCeSets(Number(e.target.value))} style={{ ...inputStyle, width: 100 }} />
            </div>

            {/* Reps */}
            <div style={{ marginBottom: 20 }}>
              <div style={labelStyle}>Répétitions</div>
              <input type="number" min={1} max={30} value={ceReps} onChange={e => setCeReps(Number(e.target.value))} style={{ ...inputStyle, width: 100 }} />
            </div>

            {/* Rest */}
            <div style={{ marginBottom: 24 }}>
              <div style={labelStyle}>Repos (secondes)</div>
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
                color: '#0D0B08', border: 'none', fontFamily: FONT_DISPLAY, fontSize: 18,
                cursor: saving || !ceName.trim() ? 'not-allowed' : 'pointer',
                opacity: !ceName.trim() ? 0.5 : 1,
              }}
            >
              {saving ? 'SAUVEGARDE...' : "SAUVEGARDER L'EXERCICE"}
            </button>
          </div>
        )}
      </div>

      {/* ──────── EXERCISE SEARCH — FULLSCREEN ──��───── */}
      {showExerciseSearch && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          zIndex: 200, background: BG_BASE,
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
              <span style={{ fontFamily: FONT_DISPLAY, fontSize: 20, color: TEXT_PRIMARY }}>AJOUTER UN EXERCICE</span>
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
                placeholder="Rechercher un exercice..."
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
              {MUSCLE_FILTERS.map(f => (
                <button
                  key={f}
                  onClick={() => setExerciseSearchFilter(f === 'Tous' ? '' : f)}
                  style={{
                    ...selBtn((f === 'Tous' && !exerciseSearchFilter) || exerciseSearchFilter === f),
                    padding: '6px 12px', fontSize: 11, whiteSpace: 'nowrap', flexShrink: 0,
                  }}
                >
                  {f}
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
                  <div style={{ fontFamily: FONT_BODY, fontSize: 15, color: TEXT_PRIMARY }}>{ex.name}</div>
                  <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                    {ex.muscle_group && (
                      <span style={{ fontFamily: FONT_ALT, fontSize: 10, textTransform: 'uppercase', padding: '2px 8px', background: GOLD_DIM, color: GOLD, letterSpacing: '0.05em' }}>
                        {ex.muscle_group}
                      </span>
                    )}
                    {ex._custom && (
                      <span style={{ fontFamily: FONT_ALT, fontSize: 10, textTransform: 'uppercase', padding: '2px 8px', background: GOLD_DIM, color: GOLD, letterSpacing: '0.05em' }}>
                        MON EXERCICE
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
            {filteredExercises.length === 0 && (
              <div style={{ textAlign: 'center', padding: 40, color: TEXT_MUTED, fontFamily: FONT_BODY, fontSize: 14 }}>
                Aucun exercice trouvé
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
              CRÉER UN EXERCICE
            </button>
          </div>
        </div>
      )}

      {/* ──────── VARIANT POPUP ──────── */}
      {variantPopup && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.75)',backdropFilter:'blur(8px)',zIndex:200,display:'flex',alignItems:'flex-end',justifyContent:'center'}} onClick={()=>setVariantPopup(null)}>
          <div onClick={e=>e.stopPropagation()} style={{background:BG_CARD,border:`1px solid ${GOLD_RULE}`,borderRadius:'20px 20px 0 0',width:'100%',maxWidth:480,maxHeight:'60vh',overflow:'hidden'}}>
            <div style={{padding:'16px 20px',borderBottom:`1px solid ${BORDER}`,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <span style={{fontFamily:FONT_DISPLAY,fontSize:20,letterSpacing:2,color:TEXT_PRIMARY}}>VARIANTES</span>
              <button onClick={()=>setVariantPopup(null)} style={{background:'none',border:'none',color:TEXT_MUTED,fontSize:20,cursor:'pointer'}}>✕</button>
            </div>
            <div style={{overflowY:'auto',maxHeight:'calc(60vh - 60px)',padding:'8px 12px'}}>
              {variantPopup.variants.length === 0 ? (
                <div style={{textAlign:'center',padding:32,color:TEXT_MUTED,fontSize:14,fontFamily:FONT_BODY}}>Aucune variante trouvée</div>
              ) : variantPopup.variants.map((v: any,i: number)=>(
                <button key={i} onClick={()=>selectVariant(v)} style={{width:'100%',display:'flex',alignItems:'center',gap:12,padding:'14px 16px',marginBottom:4,borderRadius:14,background:BG_BASE,border:`1px solid ${BORDER}`,cursor:'pointer',textAlign:'left',transition:'all 0.2s'}}>
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
                  letterSpacing: 1, color: isActive ? '#0D0B08' : isRest ? TEXT_DIM : hasEx ? GOLD : TEXT_MUTED,
                }}>{DAY_SHORT[i]}</span>
                {isRest ? (
                  <span style={{ fontSize: 14, lineHeight: 1 }}>😴</span>
                ) : (
                  <span style={{
                    fontFamily: FONT_DISPLAY, fontSize: 18,
                    color: isActive ? '#0D0B08' : hasEx ? GOLD : TEXT_DIM,
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
            Réorganiser les jours
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
            {swapFirst !== null ? `${DAY_SHORT[swapFirst]} sélectionné — cliquez un 2e jour` : 'Cliquez 2 jours pour les échanger'}
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
                  setProgramDays(prev => {
                    const updated = [...prev]
                    const day = { ...updated[editingDayIndex] }
                    day.is_rest = !day.is_rest
                    if (day.is_rest) { day.exercises = [] }
                    updated[editingDayIndex] = day
                    return updated
                  })
                }}
                style={{
                  padding: '6px 14px', borderRadius: 10, cursor: 'pointer',
                  background: programDays[editingDayIndex]?.is_rest ? 'rgba(138,133,128,.18)' : GOLD_DIM,
                  border: `1px solid ${programDays[editingDayIndex]?.is_rest ? BORDER : GOLD}`,
                  color: programDays[editingDayIndex]?.is_rest ? TEXT_MUTED : GOLD,
                  fontFamily: FONT_ALT, fontSize: 11, fontWeight: 700, letterSpacing: 1,
                }}
              >
                {programDays[editingDayIndex]?.is_rest ? '😴 Repos — Cliquer pour activer' : 'Entraînement ✓'}
              </button>
            </div>

            {!programDays[editingDayIndex]?.is_rest && (
            <div style={{ marginBottom: 16 }}>
              <div style={labelStyle}>Nom de la séance</div>
              <input
                value={programDays[editingDayIndex]?.name || ''}
                onChange={e => updateDayName(editingDayIndex, e.target.value)}
                style={inputStyle}
                placeholder="Ex: Push, Chest & Triceps..."
              />
            </div>
            )}

            {/* Exercise list — hidden for rest days */}
            {!programDays[editingDayIndex]?.is_rest && (<>
            <DndContext sensors={pbSensors} collisionDetection={closestCenter} onDragEnd={handleExerciseDragEnd}>
            <SortableContext items={(programDays[editingDayIndex]?.exercises || []).map((_: any, i: number) => `pex-${i}`)} strategy={verticalListSortingStrategy}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
              {(programDays[editingDayIndex]?.exercises || []).map((ex: any, exIdx: number) => {
                const exerciseName = ex.exercise_name || ex.custom_name || ex.name || dbExercises.find(e => e.id === ex.exercise_id)?.name || 'Exercice inconnu'
                const exerciseMuscle = ex.muscle_group || ex.focus || dbExercises.find(e => e.id === ex.exercise_id)?.muscle_group || ''
                return (
                <SortableExercise key={`pex-${exIdx}`} id={`pex-${exIdx}`} exerciseName={exerciseName}>
                {(dragHandleProps: any) => (
                <div
                  style={{
                    background: BG_CARD, border: `1px solid ${BORDER}`, padding: 16,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 12 }}>
                    <div {...dragHandleProps}>
                      <div style={{ fontFamily: FONT_BODY, fontSize: 15, fontWeight: 600, color: TEXT_PRIMARY }}>{exerciseName}</div>
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
                      <button
                        onClick={() => loadVariants(exerciseName, editingDayIndex, exIdx)}
                        title="Variantes"
                        style={{ background: GOLD_DIM, border: `1px solid ${GOLD_RULE}`, cursor: 'pointer', padding: '4px 8px', fontSize: 14 }}
                      >🔄</button>
                      <button
                        onClick={() => removeExerciseFromDay(editingDayIndex, exIdx)}
                        style={{ background: 'none', border: 'none', color: RED, cursor: 'pointer', padding: 4 }}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 12 }}>
                    <div>
                      <div style={{ ...labelStyle, marginBottom: 4 }}>Séries</div>
                      <input
                        type="number" min={1} max={10}
                        value={ex.sets || 3}
                        onChange={e => updateExerciseField(editingDayIndex, exIdx, 'sets', Number(e.target.value))}
                        style={{ ...inputStyle, width: 60, padding: '8px', textAlign: 'center' }}
                      />
                    </div>
                    <div>
                      <div style={{ ...labelStyle, marginBottom: 4 }}>Reps</div>
                      <input
                        type="number" min={1} max={100}
                        value={ex.reps || 10}
                        onChange={e => updateExerciseField(editingDayIndex, exIdx, 'reps', Number(e.target.value))}
                        style={{ ...inputStyle, width: 60, padding: '8px', textAlign: 'center' }}
                      />
                    </div>
                    <div>
                      <div style={{ ...labelStyle, marginBottom: 4 }}>Repos</div>
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
                </div>
                )}
                </SortableExercise>
              )})}
            </div>
            </SortableContext>
            </DndContext>

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
              <Plus size={18} /> AJOUTER UN EXERCICE
            </button>
            </>)}
          </div>
        )}
      </div>
    )
  }
}
