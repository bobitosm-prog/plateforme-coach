'use client'

import type { ReactNode } from 'react'
import { ChevronLeft, X } from 'lucide-react'
import { motion } from 'framer-motion'
import { getMuscleLabel } from '@/lib/i18n-muscle'
import type { ProgramEditorDay } from '@/lib/training/program-editor-model'
import { BG_CARD, BORDER, GOLD, GOLD_DIM, FONT_BODY, FONT_DISPLAY, TEXT_DIM, TEXT_MUTED, TEXT_PRIMARY, colors } from '@/lib/design-tokens'
import { builderInputStyle, builderLabelStyle, builderSelectionStyle } from './styles'

type Translate = (key: string, values?: Record<string, string | number>) => string
type MuscleTranslate = (key: string) => string
export type BuilderMode = 'select' | 'ai' | 'manual' | 'custom-exercise'

interface CommonProps { t: Translate; onBack: () => void }

export function ProgramBuilderSelectView({ t, aiAllowed, onClose, onSelect }: { t: Translate; aiAllowed: boolean; onClose: () => void; onSelect: (mode: BuilderMode) => void }) {
  const card = (mode: BuilderMode, icon: string, title: string, description: string) => <motion.button whileHover={{ borderColor: GOLD }} onClick={() => onSelect(mode)} style={{ background: BG_CARD, border: `1px solid ${BORDER}`, padding: 24, cursor: 'pointer', textAlign: 'left', width: '100%' }}><div style={{ fontSize: 28, marginBottom: 8 }}>{icon}</div><div style={{ fontFamily: FONT_DISPLAY, fontSize: 20, color: TEXT_PRIMARY }}>{title}</div><div style={{ fontFamily: FONT_BODY, fontSize: 13, color: TEXT_MUTED, marginTop: 4 }}>{description}</div></motion.button>
  return <div><div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}><button onClick={onClose} style={{ background: 'none', border: 'none', color: TEXT_MUTED, cursor: 'pointer' }}><X size={24} /></button></div><h1 style={{ fontFamily: FONT_DISPLAY, fontSize: 36, color: TEXT_PRIMARY, margin: '0 0 24px' }}>{t('createTitle')}</h1><div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
    {aiAllowed ? card('ai', '🤖', t('aiCard'), t('aiCardDesc')) : <div style={{ background: BG_CARD, border: `1px solid ${BORDER}`, padding: 24, opacity: 0.5, textAlign: 'left', width: '100%' }}><div style={{ fontSize: 28, marginBottom: 8 }}>🔒</div><div style={{ fontFamily: FONT_DISPLAY, fontSize: 20, color: TEXT_MUTED }}>{t('aiCard')}</div><div style={{ fontFamily: FONT_BODY, fontSize: 13, color: TEXT_DIM, marginTop: 4 }}>{t('aiLocked')}</div></div>}
    {card('manual', '📋', t('manualCard'), t('manualCardDesc'))}
    {card('custom-exercise', '➕', t('customCard'), t('customCardDesc'))}
  </div></div>
}

export interface AiViewProps extends CommonProps {
  locale: 'fr' | 'en' | 'de'; tMuscle: MuscleTranslate; result: unknown; programName: string; dayEditor: ReactNode
  objective: string; level: string; days: number; duration: number; equipment: string; priorities: string[]; notes: string
  generating: boolean; saving: boolean; techniques: string[]
  onObjective: (value: string) => void; onLevel: (value: string) => void; onDays: (value: number) => void
  onDuration: (value: number) => void; onEquipment: (value: string) => void; onPriorities: (value: string[]) => void
  onNotes: (value: string) => void; onGenerate: () => void; onEditParameters: () => void; onSave: () => void
  techniqueCards: (techniques: string[]) => ReactNode
}

export function ProgramBuilderAiView(props: AiViewProps) {
  if (props.result) return <div><Back t={props.t} onClick={props.onEditParameters} label="editParams"/><h1 style={{ fontFamily: FONT_DISPLAY, fontSize: 32, color: TEXT_PRIMARY, margin: '0 0 8px' }}>{props.programName}</h1>{props.dayEditor}{props.techniques.length ? props.techniqueCards(props.techniques) : null}<SaveButton t={props.t} saving={props.saving} label="save" onClick={props.onSave}/></div>
  const objectives = ['masse', 'perte', 'force', 'endurance']
  const levels = ['debutant', 'intermediaire', 'avance']
  const equipment = ['salle', 'halteres', 'sans_materiel']
  const muscles = ['Poitrine', 'Dos', 'Épaules', 'Bras', 'Jambes', 'Fessiers', 'Abdos']
  return <div><Back t={props.t} onClick={props.onBack}/><h1 style={{ fontFamily: FONT_DISPLAY, fontSize: 32, color: TEXT_PRIMARY, margin: '0 0 24px' }}>{props.t('aiTitle')}</h1>
    <ChoiceGrid label={props.t('config.objective')} columns="1fr 1fr">{objectives.map(value => <button key={value} onClick={() => props.onObjective(value)} style={builderSelectionStyle(props.objective === value)}>{props.t(`config.obj${value === 'masse' ? 'Masse' : value === 'perte' ? 'Perte' : value === 'force' ? 'Force' : 'Endurance'}`)}</button>)}</ChoiceGrid>
    <ChoiceGrid label={props.t('config.level')} columns="repeat(3, 1fr)">{levels.map(value => <button key={value} onClick={() => props.onLevel(value)} style={builderSelectionStyle(props.level === value)}>{props.t(`config.lvl${value === 'debutant' ? 'Debutant' : value === 'intermediaire' ? 'Intermediaire' : 'Avance'}`)}</button>)}</ChoiceGrid>
    <Range label={props.t('config.daysPerWeek')} min={2} max={6} value={props.days} onChange={props.onDays}/>
    <ChoiceGrid label={props.t('config.duration')} columns="repeat(4, 1fr)">{[30,45,60,90].map(value => <button key={value} onClick={() => props.onDuration(value)} style={builderSelectionStyle(props.duration === value)}>{value}</button>)}</ChoiceGrid>
    <ChoiceGrid label={props.t('config.equipment')} columns="repeat(3, 1fr)">{equipment.map(value => <button key={value} onClick={() => props.onEquipment(value)} style={builderSelectionStyle(props.equipment === value)}>{props.t(`config.eq${value === 'salle' ? 'Salle' : value === 'halteres' ? 'Halteres' : 'SansMateriel'}`)}</button>)}</ChoiceGrid>
    <div style={{ marginBottom: 20 }}><div style={builderLabelStyle}>{props.t('config.priorities')}</div><div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>{muscles.map(muscle => { const selected = props.priorities.includes(muscle); return <button key={muscle} onClick={() => props.onPriorities(selected ? props.priorities.filter(value => value !== muscle) : [...props.priorities, muscle])} style={builderSelectionStyle(selected)}>{getMuscleLabel(muscle, props.locale, props.tMuscle)}</button> })}</div></div>
    <div style={{ marginBottom: 24 }}><div style={builderLabelStyle}>{props.t('config.notes')}</div><textarea value={props.notes} onChange={event => props.onNotes(event.target.value)} rows={3} style={{ ...builderInputStyle, resize: 'vertical' }} placeholder={props.t('config.notesPlaceholder')}/></div>
    <button onClick={props.onGenerate} disabled={props.generating} style={{ width: '100%', padding: 16, background: props.generating ? GOLD_DIM : GOLD, color: colors.onGold, border: 'none', fontFamily: FONT_DISPLAY, fontSize: 18, cursor: props.generating ? 'not-allowed' : 'pointer', opacity: props.generating ? 0.6 : 1 }}>{props.generating ? props.t('generating') : props.t('generate')}</button>
  </div>
}

export function ProgramBuilderManualView({ t, step, name, days, saving, dayEditor, onBack, onName, onDays, onNext, onSave }: CommonProps & { step: number; name: string; days: ProgramEditorDay[]; saving: boolean; dayEditor: ReactNode; onName: (value: string) => void; onDays: (count: number) => void; onNext: () => void; onSave: () => void }) {
  return <div><Back t={t} onClick={onBack}/>{step === 0 ? <div><h1 style={{ fontFamily: FONT_DISPLAY, fontSize: 32, color: TEXT_PRIMARY, margin: '0 0 24px' }}>{t('manualTitle')}</h1><div style={{ marginBottom: 20 }}><div style={builderLabelStyle}>{t('config.programName')}</div><input value={name} onChange={event => onName(event.target.value)} style={builderInputStyle} placeholder={t('config.programNamePlaceholder')} required/></div><Range label={t('config.trainingDays')} min={1} max={7} value={days.filter(day => !day.is_rest).length || 3} onChange={onDays}/><button onClick={onNext} style={{ width: '100%', padding: 16, background: GOLD, color: colors.onGold, border: 'none', fontFamily: FONT_DISPLAY, fontSize: 18, cursor: 'pointer' }}>{t('next')}</button></div> : <div>{dayEditor}<SaveButton t={t} saving={saving} label="saveProgram" onClick={onSave}/></div>}</div>
}

export interface CustomExerciseViewProps extends CommonProps { name: string; muscle: string; equipment: string; description: string; sets: number; reps: number; rest: number; saving: boolean; onField: (field: 'name'|'muscle'|'equipment'|'description'|'sets'|'reps'|'rest', value: string|number) => void; onSave: () => void }
export function ProgramBuilderCustomExerciseView(props: CustomExerciseViewProps) {
  const field = (label: string, child: ReactNode) => <div style={{ marginBottom: 20 }}><div style={builderLabelStyle}>{props.t(label)}</div>{child}</div>
  return <div><Back t={props.t} onClick={props.onBack}/><h1 style={{ fontFamily: FONT_DISPLAY, fontSize: 32, color: TEXT_PRIMARY, margin: '0 0 24px' }}>{props.t('newExercise')}</h1>
    {field('customExercise.name', <input value={props.name} onChange={event => props.onField('name', event.target.value)} style={builderInputStyle} placeholder={props.t('customExercise.namePlaceholder')} required/>)}
    {field('customExercise.muscleGroup', <select value={props.muscle} onChange={event => props.onField('muscle', event.target.value)} style={{ ...builderInputStyle, appearance: 'auto' }}><option value="">{props.t('customExercise.select')}</option>{['Poitrine','Dos','Épaules','Bras','Jambes','Fessiers','Abdos','Cardio'].map(value => <option key={value} value={value}>{value}</option>)}</select>)}
    {field('customExercise.equipment', <select value={props.equipment} onChange={event => props.onField('equipment', event.target.value)} style={{ ...builderInputStyle, appearance: 'auto' }}><option value="">{props.t('customExercise.select')}</option>{['Haltères','Barre','Machine','Câble','Poids du corps','Autre'].map(value => <option key={value} value={value}>{value}</option>)}</select>)}
    {field('customExercise.description', <textarea value={props.description} onChange={event => props.onField('description', event.target.value)} rows={3} style={{ ...builderInputStyle, resize: 'vertical' }} placeholder={props.t('customExercise.descPlaceholder')}/>)}
    {field('customExercise.sets', <input type="number" min={1} max={10} value={props.sets} onChange={event => props.onField('sets', Number(event.target.value))} style={{ ...builderInputStyle, width: 100 }}/>)}
    {field('customExercise.reps', <input type="number" min={1} max={30} value={props.reps} onChange={event => props.onField('reps', Number(event.target.value))} style={{ ...builderInputStyle, width: 100 }}/>)}
    <div style={{ marginBottom: 24 }}><div style={builderLabelStyle}>{props.t('customExercise.rest')}</div><select value={props.rest} onChange={event => props.onField('rest', Number(event.target.value))} style={{ ...builderInputStyle, width: 140, appearance: 'auto' }}>{[30,60,90,120,180].map(value => <option key={value} value={value}>{value}s</option>)}</select></div>
    <button onClick={props.onSave} disabled={props.saving || !props.name.trim()} style={{ width: '100%', padding: 16, background: props.saving ? GOLD_DIM : GOLD, color: colors.onGold, border: 'none', fontFamily: FONT_DISPLAY, fontSize: 18, cursor: props.saving || !props.name.trim() ? 'not-allowed' : 'pointer', opacity: !props.name.trim() ? 0.5 : 1 }}>{props.saving ? props.t('saving') : props.t('saveExercise')}</button>
  </div>
}

function Back({ t, onClick, label = 'back' }: { t: Translate; onClick: () => void; label?: string }) { return <button onClick={onClick} style={{ background: 'none', border: 'none', color: TEXT_MUTED, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, marginBottom: 16, fontFamily: FONT_BODY, fontSize: 14 }}><ChevronLeft size={18}/> {t(label)}</button> }
function SaveButton({ t, saving, label, onClick }: { t: Translate; saving: boolean; label: string; onClick: () => void }) { return <button onClick={onClick} disabled={saving} style={{ width: '100%', padding: 16, background: saving ? GOLD_DIM : GOLD, color: colors.onGold, border: 'none', fontFamily: FONT_DISPLAY, fontSize: 18, cursor: saving ? 'not-allowed' : 'pointer', marginTop: 24 }}>{saving ? t('saving') : t(label)}</button> }
function ChoiceGrid({ label, columns, children }: { label: string; columns: string; children: ReactNode }) { return <div style={{ marginBottom: 20 }}><div style={builderLabelStyle}>{label}</div><div style={{ display: 'grid', gridTemplateColumns: columns, gap: 8 }}>{children}</div></div> }
function Range({ label, min, max, value, onChange }: { label: string; min: number; max: number; value: number; onChange: (value: number) => void }) { return <div style={{ marginBottom: 24 }}><div style={builderLabelStyle}>{label}</div><div style={{ display: 'flex', alignItems: 'center', gap: 16 }}><input type="range" min={min} max={max} value={value} onChange={event => onChange(Number(event.target.value))} style={{ flex: 1, accentColor: GOLD }}/><span style={{ fontFamily: FONT_DISPLAY, fontSize: 28, color: GOLD, minWidth: 32, textAlign: 'center' }}>{value}</span></div></div> }
