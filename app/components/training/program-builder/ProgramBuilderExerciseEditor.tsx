'use client'

import { Plus, Trash2 } from 'lucide-react'
import { getExerciseName } from '@/lib/i18n-exercise'
import type { ProgramEditorDay, ProgramEditorExercise } from '@/lib/training/program-editor-model'
import { BG_BASE, BG_CARD, BG_CARD_2, BORDER, GOLD, GOLD_DIM, GOLD_RULE, FONT_ALT, FONT_DISPLAY, RED, TEXT_DIM, TEXT_MUTED, TEXT_PRIMARY } from '@/lib/design-tokens'
import ConfirmDialog from '../../ui/ConfirmDialog'
import { ProgramBuilderDayNavigation } from './ProgramBuilderDayNavigation'
import { builderInputStyle, builderLabelStyle } from './styles'

type Translate = (key: string, values?: Record<string, string | number>) => string
type CatalogExercise = { id?: unknown; name?: unknown; muscle_group?: unknown }
export interface ExerciseDeleteTarget { dayIdx: number; exIdx: number; name: string }

interface Props {
  days: ProgramEditorDay[]; activeIndex: number; swapMode: boolean; swapFirst: number | null
  locale: 'fr'|'en'|'de'; catalog: CatalogExercise[]; deleteTarget: ExerciseDeleteTarget | null; t: Translate
  onDay: (index: number) => void; onStartSwap: () => void; onCancelSwap: () => void; onToggleRest: () => void
  onSessionName: (name: string) => void; onMove: (index: number, direction: number) => void
  onVariant: (name: string, index: number) => void; onDeleteRequest: (target: ExerciseDeleteTarget) => void
  onDeleteConfirm: () => void; onDeleteCancel: () => void
  onExercise: (index: number, field: string, value: unknown) => void; onAdd: () => void
}

export function ProgramBuilderExerciseEditor(props: Props) {
  const active = props.days[props.activeIndex]
  return <div>
    <ProgramBuilderDayNavigation days={props.days} activeIndex={props.activeIndex} swapMode={props.swapMode} swapFirst={props.swapFirst} t={props.t} onSelectDay={props.onDay} onStartSwap={props.onStartSwap} onCancelSwap={props.onCancelSwap} onToggleRest={props.onToggleRest} onSessionNameChange={props.onSessionName}/>
    {active && !active.is_rest && <><div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>{(active.exercises || []).map((exercise, index) => <ExerciseCard key={index} exercise={exercise} index={index} count={active.exercises?.length || 0} {...props}/>)}</div><button onClick={props.onAdd} style={{ width: '100%', padding: 14, background: BG_CARD_2, border: `1px dashed ${BORDER}`, color: GOLD, fontFamily: FONT_DISPLAY, fontSize: 16, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}><Plus size={18}/> {props.t('day.addExercise')}</button></>}
    <ConfirmDialog open={!!props.deleteTarget} variant="danger" title={props.t('confirm.deleteTitle')} message={props.t('confirm.deleteMessage', { name: props.deleteTarget?.name || '' })} confirmLabel={props.t('confirm.deleteConfirm')} cancelLabel={props.t('confirm.deleteCancel')} onConfirm={props.onDeleteConfirm} onCancel={props.onDeleteCancel}/>
  </div>
}

function ExerciseCard(props: Props & { exercise: ProgramEditorExercise; index: number; count: number }) {
  const { exercise, index } = props
  const catalog = props.catalog.find(item => item.id === exercise.exercise_id)
  const rawName = String(exercise.exercise_name || exercise.custom_name || exercise.name || catalog?.name || '')
  const fallbackName = rawName || props.t('day.unknownExercise')
  const displayName = getExerciseName(exercise, props.locale) || fallbackName
  const muscle = String(exercise.muscle_group || exercise.focus || catalog?.muscle_group || '')
  const update = (field: string, value: unknown) => props.onExercise(index, field, value)
  return <div style={{ background: BG_CARD, border: `1px solid ${BORDER}`, padding: 16 }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 12 }}><div><div style={{ fontFamily: builderInputStyle.fontFamily, fontSize: 15, fontWeight: 600, color: TEXT_PRIMARY }}>{displayName}</div>{muscle && <span style={{ fontFamily: FONT_ALT, fontSize: 10, textTransform: 'uppercase', padding: '2px 8px', background: GOLD_DIM, color: GOLD, letterSpacing: '0.05em', marginTop: 4, display: 'inline-block' }}>{muscle}</span>}</div><div style={{ display: 'flex', gap: 4 }}>
      <MoveButton label={`${props.t('day.moveUp')} ${displayName}`} disabled={index === 0} direction="↑" onClick={() => props.onMove(index, -1)}/><MoveButton label={`${props.t('day.moveDown')} ${displayName}`} disabled={index === props.count - 1} direction="↓" onClick={() => props.onMove(index, 1)}/>
      <button aria-label={`${props.t('day.variants')} ${displayName}`} onClick={() => props.onVariant(rawName, index)} title={props.t('day.variants')} style={{ background: GOLD_DIM, border: `1px solid ${GOLD_RULE}`, cursor: 'pointer', padding: '4px 8px', fontSize: 14 }}>🔄</button>
      <button aria-label={`${props.t('confirm.deleteConfirm')} ${displayName}`} onClick={() => props.onDeleteRequest({ dayIdx: props.activeIndex, exIdx: index, name: displayName })} style={{ background: 'none', border: 'none', color: RED, cursor: 'pointer', padding: 4 }}><Trash2 size={16}/></button>
    </div></div>
    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}><NumberField label={props.t('day.setsLabel')} value={Number(exercise.sets || 3)} max={10} onChange={value => update('sets', value)}/><NumberField label={props.t('day.repsLabel')} value={Number(exercise.reps || 10)} max={100} onChange={value => update('reps', value)}/><div><Label>{props.t('day.restLabel')}</Label><select value={Number(exercise.rest || 90)} onChange={event => update('rest', Number(event.target.value))} style={{ ...builderInputStyle, width: 80, padding: 8, appearance: 'auto' }}>{[30,60,90,120,180].map(value => <option key={value} value={value}>{value}s</option>)}</select></div></div>
    <Tempo value={String(exercise.tempo || '2-0-2')} label={props.t('day.tempoLabel')} onChange={value => update('tempo', value)}/>
    <Technique exercise={exercise} t={props.t} onChange={update}/>
  </div>
}

function MoveButton({ label, disabled, direction, onClick }: { label: string; disabled: boolean; direction: string; onClick: () => void }) { return <button aria-label={label} disabled={disabled} onClick={onClick} title={label} style={{ background: disabled ? BG_BASE : GOLD_DIM, border: `1px solid ${disabled ? BORDER : GOLD_RULE}`, color: disabled ? TEXT_DIM : GOLD, cursor: disabled ? 'default' : 'pointer', padding: '4px 8px', fontSize: 12 }}>{direction}</button> }
function Label({ children }: { children: string }) { return <div style={{ ...builderLabelStyle, marginBottom: 4 }}>{children}</div> }
function NumberField({ label, value, max, onChange }: { label: string; value: number; max: number; onChange: (value: number) => void }) { return <div><Label>{label}</Label><input type="number" min={1} max={max} value={value} onChange={event => onChange(Number(event.target.value))} style={{ ...builderInputStyle, width: 60, padding: 8, textAlign: 'center' }}/></div> }
function Tempo({ value, label, onChange }: { value: string; label: string; onChange: (value: string) => void }) { const parts = value.split('-'); return <div style={{ marginTop: 12 }}><Label>{label}</Label><div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>{[0,1,2].map(index => <span key={index} style={{ display: 'flex', alignItems: 'center', gap: 4 }}><input type="number" min={0} max={9} value={parts[index] || (index === 1 ? '0' : '2')} onChange={event => { const next = [...parts]; next[index] = event.target.value; onChange(next.join('-')) }} style={{ ...builderInputStyle, width: 36, padding: '8px 4px', textAlign: 'center', fontFamily: FONT_DISPLAY, fontSize: 16, color: GOLD }}/>{index < 2 && <span style={{ color: TEXT_DIM, fontSize: 16, fontWeight: 700 }}>-</span>}</span>)}</div></div> }

function Technique({ exercise, t, onChange }: { exercise: ProgramEditorExercise; t: Translate; onChange: (field: string, value: unknown) => void }) {
  const technique = String(exercise.technique || '')
  const details = String(exercise.technique_details || '')
  return <div style={{ marginTop: 12 }}><Label>{t('day.techniqueLabel')}</Label><select value={technique} onChange={event => { const value = event.target.value || null; onChange('technique', value); if (!value) onChange('technique_details', '') }} style={{ ...builderInputStyle, width: '100%', padding: 8, appearance: 'auto' }}><option value="">{t('day.techniqueNone')}</option><option value="dropset">Drop Set</option><option value="restpause">Rest Pause</option><option value="superset">Superset</option><option value="mechanical">Mechanical Drop Set</option></select>
    {technique === 'dropset' && <OptionButtons label={t('day.dropCount')} values={[1,2,3]} selected={details || '2'} onChange={value => onChange('technique_details', value)}/>}
    {technique === 'restpause' && <div style={{ marginTop: 8, display: 'flex', gap: 12 }}><OptionButtons label={t('day.miniSets')} values={[2,3]} selected={(details || '2,15').split(',')[0]} onChange={value => onChange('technique_details', `${value},${(details || '2,15').split(',')[1] || '15'}`)}/><OptionButtons label={t('day.restSec')} values={[10,15,20]} suffix="s" selected={(details || '2,15').split(',')[1]} onChange={value => onChange('technique_details', `${(details || '2,15').split(',')[0] || '2'},${value}`)}/></div>}
    {(technique === 'superset' || technique === 'mechanical') && <div style={{ marginTop: 8 }}><Label>{t(technique === 'superset' ? 'day.partnerExercise' : 'day.mechanicalDesc')}</Label><input type="text" value={details} onChange={event => onChange('technique_details', event.target.value)} placeholder={t(technique === 'superset' ? 'day.partnerPlaceholder' : 'day.mechanicalPlaceholder')} style={{ ...builderInputStyle, width: '100%', padding: 8 }}/></div>}
  </div>
}
function OptionButtons({ label, values, selected, suffix = '', onChange }: { label: string; values: number[]; selected: string; suffix?: string; onChange: (value: string) => void }) { return <div style={{ marginTop: 8 }}><div style={{ ...builderLabelStyle, marginBottom: 4, fontSize: 9 }}>{label}</div><div style={{ display: 'flex', gap: 6 }}>{values.map(value => <button key={value} onClick={() => onChange(String(value))} style={{ padding: '6px 12px', border: `1px solid ${selected === String(value) ? GOLD : BORDER}`, background: selected === String(value) ? GOLD_DIM : BG_BASE, color: selected === String(value) ? GOLD : TEXT_MUTED, fontFamily: FONT_ALT, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>{value}{suffix}</button>)}</div></div> }
