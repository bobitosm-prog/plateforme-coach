import { colors, fonts, labelStyle, bodyStyle, btnPrimary, btnSecondary } from '../../../../lib/design-tokens'
import type { LegacyTrainingDay, LegacyTrainingExercise } from './training-tab-types'

interface TrainingProgramDayEditorProps {
  dayIndex: number
  day: LegacyTrainingDay
  labels: {
    editMode: string
    sets: string
    reps: string
    rest: string
    tempo: string
    addExercise: string
    save: string
    cancel: string
  }
  onMove: (dayIndex: number, exerciseIndex: number, direction: -1 | 1) => void
  onInfo: (exerciseName: string) => void
  onVariants: (exerciseName: string, dayIndex: number, exerciseIndex: number) => void
  onRemove: (dayIndex: number, exerciseIndex: number) => void
  onChange: (dayIndex: number, exerciseIndex: number, field: string, value: string | number) => void
  onAdd: () => void
  onSave: () => void
  onCancel: () => void
}

function exerciseName(exercise: LegacyTrainingExercise) {
  return exercise.exercise_name || exercise.custom_name || exercise.name || ''
}

export default function TrainingProgramDayEditor({
  dayIndex, day, labels, onMove, onInfo, onVariants, onRemove, onChange, onAdd, onSave, onCancel,
}: TrainingProgramDayEditorProps) {
  const exercises = day.exercises || []

  return (
    <div style={{ background: colors.surface2, border: `1px solid ${colors.divider}`, borderRadius: 16, padding: 16, marginBottom: 8, boxShadow: '0 4px 24px rgba(0,0,0,0.6)' }}>
      <div style={{ ...labelStyle, fontSize: 10, letterSpacing: 2, marginBottom: 12 }}>{labels.editMode}</div>
      {exercises.map((exercise, index) => {
        const name = exerciseName(exercise)
        return (
          <div key={`${name}-${index}`} style={{ padding: '12px 0', borderBottom: index < exercises.length - 1 ? `1px solid ${colors.goldDim}` : 'none' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 1, flexShrink: 0 }}>
                <button onClick={() => onMove(dayIndex, index, -1)} disabled={index === 0} style={{ background: 'none', border: 'none', color: index === 0 ? colors.textDim : colors.gold, fontSize: 11, cursor: 'pointer', padding: '1px 3px', lineHeight: 1 }}>▲</button>
                <button onClick={() => onMove(dayIndex, index, 1)} disabled={index === exercises.length - 1} style={{ background: 'none', border: 'none', color: index === exercises.length - 1 ? colors.textDim : colors.gold, fontSize: 11, cursor: 'pointer', padding: '1px 3px', lineHeight: 1 }}>▼</button>
              </div>
              <div style={{ flex: 1, ...bodyStyle, color: colors.text, fontWeight: 600, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</div>
              <button onClick={() => onInfo(name)} style={iconButtonStyle}><InfoIcon /></button>
              <button onClick={() => onVariants(name, dayIndex, index)} style={iconButtonStyle}><VariantIcon /></button>
              <button onClick={() => onRemove(dayIndex, index)} style={{ ...iconButtonStyle, background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)', color: colors.error, fontSize: 12 }}>✕</button>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 26 }}>
              <NumberField label={labels.sets} value={exercise.sets} width={36} min={1} max={10} onChange={value => onChange(dayIndex, index, 'sets', value)} />
              <span style={{ color: colors.textDim, fontSize: 10 }}>×</span>
              <NumberField label={labels.reps} value={exercise.reps} width={36} min={1} max={50} onChange={value => onChange(dayIndex, index, 'reps', value)} />
              <span style={{ color: colors.textDim, fontSize: 10 }}>·</span>
              <NumberField label={labels.rest} value={exercise.rest_seconds} width={44} min={0} max={300} step={15} suffix="s" onChange={value => onChange(dayIndex, index, 'rest_seconds', value)} />
            </div>
            <TempoField label={labels.tempo} value={exercise.tempo} onChange={value => onChange(dayIndex, index, 'tempo', value)} />
          </div>
        )
      })}
      <button onClick={onAdd} style={{ width: '100%', padding: 10, marginTop: 8, background: 'transparent', border: `1.5px dashed ${colors.goldRule}`, borderRadius: 16, color: colors.gold, fontFamily: fonts.body, fontSize: 12, fontWeight: 700, letterSpacing: 2, cursor: 'pointer' }}>{labels.addExercise}</button>
      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
        <button onClick={onSave} style={{ ...btnPrimary, flex: 1, padding: 12, borderRadius: 12 }}>{labels.save}</button>
        <button onClick={onCancel} style={{ ...btnSecondary, flex: 1, padding: 12, borderRadius: 12 }}>{labels.cancel}</button>
      </div>
    </div>
  )
}

const iconButtonStyle = {
  background: 'rgba(230,195,100,0.06)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 8,
  width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0,
}

function InfoIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={colors.gold} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>
}

function VariantIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={colors.gold} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 3h5v5M8 3H3v5M21 3l-7 7M3 21l7-7M21 21h-5v-5M3 21V16h5"/></svg>
}

interface NumberFieldProps {
  label: string
  value: number | string | undefined
  width: number
  min: number
  max: number
  step?: number
  suffix?: string
  onChange: (value: string | number) => void
}

function NumberField({ label, value, width, min, max, step, suffix, onChange }: NumberFieldProps) {
  return <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
    <span style={fieldLabelStyle}>{label}</span>
    <input type="number" min={min} max={max} step={step} value={value ?? ''} onChange={event => {
      if (event.target.value === '') return onChange('')
      const parsed = Number.parseInt(event.target.value, 10)
      if (!Number.isNaN(parsed)) onChange(parsed)
    }} style={{ ...fieldInputStyle, width }} />
    {suffix && <span style={{ fontFamily: fonts.body, fontSize: 9, color: colors.textMuted }}>{suffix}</span>}
  </div>
}

function TempoField({ label, value, onChange }: { label: string; value?: string; onChange: (value: string) => void }) {
  const parts = (value || '2-0-2').split('-')
  return <div style={{ display: 'flex', alignItems: 'center', gap: 3, marginTop: 6, marginLeft: 26 }}>
    <span style={fieldLabelStyle}>{label}</span>
    {[0, 1, 2].map(index => <span key={index} style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
      <input type="number" min={0} max={9} value={parts[index] || (index === 1 ? '0' : '2')} onChange={event => {
        const next = [...parts]
        next[index] = event.target.value
        onChange(next.join('-'))
      }} style={{ ...fieldInputStyle, width: 28, padding: '3px 2px', fontSize: 12 }} />
      {index < 2 && <span style={{ color: colors.textDim, fontSize: 10 }}>-</span>}
    </span>)}
  </div>
}

const fieldLabelStyle = { fontFamily: fonts.body, fontSize: 9, color: colors.textMuted, textTransform: 'uppercase' as const, letterSpacing: '0.05em' }
const fieldInputStyle = { padding: '4px', textAlign: 'center' as const, background: colors.background, border: `1px solid ${colors.goldBorder}`, borderRadius: 6, color: colors.gold, fontFamily: fonts.headline, fontSize: 14, outline: 'none' }
