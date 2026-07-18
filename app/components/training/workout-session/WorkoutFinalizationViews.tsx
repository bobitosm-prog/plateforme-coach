import { Check, CheckCircle2, Clock, Dumbbell, X } from 'lucide-react'
import { SESSION_TYPES } from '../../../../lib/session-types'
import { BG_BASE, BORDER, FONT_ALT, FONT_BODY, FONT_DISPLAY, GOLD, GOLD_RULE, TEXT_DIM, TEXT_MUTED, TEXT_PRIMARY, colors } from '../../../../lib/design-tokens'
import type { WorkoutTranslate } from './types'

interface WorkoutEndConfirmationViewProps {
  elapsed: string
  completedSets: number
  totalSets: number
  volume: number
  t: WorkoutTranslate
  onSave(): void
  onDelete(): void
  onContinue(): void
}

export function WorkoutEndConfirmationView(props: WorkoutEndConfirmationViewProps) {
  const { elapsed, completedSets, totalSets, volume, t, onSave, onDelete, onContinue } = props
  const stats = [
    { icon: <Clock size={24} color={GOLD} />, value: elapsed, label: t('endModal.duration') },
    { icon: <CheckCircle2 size={24} color={GOLD} />, value: `${completedSets}/${totalSets}`, label: 'Sets' },
    { icon: <Dumbbell size={24} color={GOLD} />, value: `${Math.round(volume)} kg`, label: 'Volume' },
  ]
  return <div data-workout-phase="finalizing" style={{ position: 'fixed', inset: 0, zIndex: 250, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
    <div style={{ background: BG_BASE, borderTopLeftRadius: 24, borderTopRightRadius: 24, borderTop: `1px solid ${BORDER}`, width: '100%', maxWidth: 480, padding: 24, paddingBottom: 'calc(24px + env(safe-area-inset-bottom, 0px))', animation: 'wsSlideUp 300ms ease-out' }}>
      <div style={{ width: 40, height: 4, background: 'rgba(201,168,76,0.3)', borderRadius: 2, margin: '0 auto 20px' }} />
      <h3 style={{ fontFamily: FONT_DISPLAY, fontSize: 20, letterSpacing: 2, color: TEXT_PRIMARY, textAlign: 'center', margin: '0 0 4px' }}>{t('endModal.title')}</h3>
      <p style={{ fontFamily: FONT_BODY, fontSize: 13, color: TEXT_MUTED, textAlign: 'center', margin: '0 0 20px' }}>{t('endModal.question')}</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 20 }}>{stats.map(stat => <div key={stat.label} style={{ padding: '10px 6px', textAlign: 'center', background: colors.surface2, border: `1px solid ${colors.divider}`, borderRadius: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 2 }}>{stat.icon}</div><div style={{ fontFamily: FONT_DISPLAY, fontSize: 15, color: GOLD, letterSpacing: 1 }}>{stat.value}</div><div style={{ fontFamily: FONT_ALT, fontSize: 8, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', color: TEXT_DIM, marginTop: 2 }}>{stat.label}</div>
      </div>)}</div>
      <button onClick={onSave} className="active:scale-[0.98]" style={{ width: '100%', padding: 16, borderRadius: 14, background: GOLD, border: 'none', color: colors.onGold, fontFamily: FONT_ALT, fontWeight: 800, fontSize: 14, letterSpacing: 2, cursor: 'pointer', textTransform: 'uppercase', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 4 }}><Check size={16} strokeWidth={3} />{t('endModal.save')}</button>
      <p style={{ fontSize: 10, color: TEXT_DIM, textAlign: 'center', margin: '0 0 16px' }}>{t('endModal.saveHint')}</p>
      <button onClick={onDelete} className="active:scale-[0.98]" style={{ width: '100%', padding: 14, borderRadius: 14, background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.2)', color: 'rgba(239,68,68,0.8)', fontFamily: FONT_ALT, fontWeight: 800, fontSize: 13, letterSpacing: 2, cursor: 'pointer', textTransform: 'uppercase', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 4 }}><X size={16} strokeWidth={3} />{t('endModal.delete')}</button>
      <p style={{ fontSize: 10, color: TEXT_DIM, textAlign: 'center', margin: '0 0 20px' }}>{t('endModal.deleteHint')}</p>
      <button onClick={onContinue} className="active:scale-[0.98]" style={{ width: '100%', padding: 14, borderRadius: 14, background: 'transparent', border: `1px solid ${colors.divider}`, color: TEXT_MUTED, fontFamily: FONT_ALT, fontWeight: 700, fontSize: 13, letterSpacing: 2, cursor: 'pointer', textTransform: 'uppercase' }}>{t('endModal.continue')}</button>
    </div>
  </div>
}

export function WorkoutAbandonConfirmationView({ completedSets, t, onCancel, onConfirm }: { completedSets: number; t: WorkoutTranslate; onCancel(): void; onConfirm(): void }) {
  return <div data-workout-phase="abandon-confirmation" style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
    <div style={{ background: colors.surface2, border: '1px solid rgba(239,68,68,0.3)', borderRadius: 20, padding: 24, maxWidth: 360, width: '100%', textAlign: 'center' }}>
      <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', margin: '0 auto 16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={28} color={colors.error} strokeWidth={2} /></div>
      <h3 style={{ fontFamily: FONT_DISPLAY, fontSize: 18, letterSpacing: 2, color: TEXT_PRIMARY, margin: '0 0 8px' }}>{t('deleteModal.title')}</h3>
      <p style={{ fontFamily: FONT_BODY, fontSize: 13, color: TEXT_MUTED, lineHeight: 1.6, margin: '0 0 20px' }}>{completedSets > 0 ? t('deleteModal.withSets', { count: completedSets }) : t('deleteModal.noSets')}</p>
      <div style={{ display: 'flex', gap: 10 }}>
        <button onClick={onCancel} className="active:scale-[0.98]" style={{ flex: 1, padding: 14, borderRadius: 12, background: 'transparent', border: `1px solid ${BORDER}`, color: TEXT_MUTED, fontFamily: FONT_ALT, fontWeight: 700, fontSize: 12, letterSpacing: 1, cursor: 'pointer', textTransform: 'uppercase' }}>{t('cancel')}</button>
        <button onClick={onConfirm} className="active:scale-[0.98]" style={{ flex: 1, padding: 14, borderRadius: 12, background: colors.error, border: 'none', color: '#fff', fontFamily: FONT_ALT, fontWeight: 800, fontSize: 12, letterSpacing: 1, cursor: 'pointer', textTransform: 'uppercase' }}>{t('delete')}</button>
      </div>
    </div>
  </div>
}

export function WorkoutRepetitionsWarningView({ repetitions, t, onEdit, onConfirm }: { repetitions: number; t: WorkoutTranslate; onEdit(): void; onConfirm(): void }) {
  return <div data-workout-phase="set-validation" style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
    <div style={{ background: colors.surface2, border: `1px solid ${colors.divider}`, borderRadius: 20, padding: 24, maxWidth: 360, width: '100%', textAlign: 'center' }}>
      <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.3)', margin: '0 auto 16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M12 8v4M12 16h.01" /></svg></div>
      <h3 style={{ fontFamily: FONT_DISPLAY, fontSize: 18, letterSpacing: 2, color: TEXT_PRIMARY, marginBottom: 8 }}>{t('repsWarning.title')}</h3>
      <p style={{ fontFamily: FONT_BODY, fontSize: 14, color: TEXT_MUTED, lineHeight: 1.6, marginBottom: 20 }}>{t('repsWarning.description', { reps: repetitions })}</p>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <button onClick={onEdit} className="active:scale-[0.98]" style={{ width: '100%', padding: 12, borderRadius: 12, background: 'transparent', border: `1.5px solid ${GOLD_RULE}`, color: GOLD, fontFamily: FONT_ALT, fontWeight: 800, fontSize: 12, letterSpacing: 2, textTransform: 'uppercase', cursor: 'pointer' }}>{t('repsWarning.edit')}</button>
        <button onClick={onConfirm} className="active:scale-[0.98]" style={{ width: '100%', padding: 12, borderRadius: 12, background: GOLD, border: 'none', color: colors.onGold, fontFamily: FONT_ALT, fontWeight: 800, fontSize: 12, letterSpacing: 2, textTransform: 'uppercase', cursor: 'pointer' }}>{t('repsWarning.confirm')}</button>
      </div>
    </div>
  </div>
}

interface WorkoutTemplateSaveViewProps { templateName: string; t: WorkoutTranslate; onSelectName(value: string): void; onSave(): void; onSkip(): void }
export function WorkoutTemplateSaveView({ templateName, t, onSelectName, onSave, onSkip }: WorkoutTemplateSaveViewProps) {
  return <div data-workout-phase="template-save" style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
    <div style={{ background: colors.surface2, border: `1px solid ${colors.divider}`, borderRadius: 20, padding: 24, maxWidth: 380, width: '100%' }}>
      <div style={{ fontFamily: FONT_DISPLAY, fontSize: 24, letterSpacing: 2, color: TEXT_PRIMARY, marginBottom: 8 }}>{t('saveTemplate.title')}</div>
      <div style={{ fontFamily: FONT_BODY, fontSize: 14, color: TEXT_MUTED, lineHeight: 1.6, marginBottom: 20 }}>{t('saveTemplate.description')}</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, marginBottom: 16 }}>{SESSION_TYPES.filter(option => option.key !== 'repos').map(option => <button key={option.key} onClick={() => onSelectName(option.label)} style={{ padding: '10px 6px', borderRadius: 10, cursor: 'pointer', background: templateName === option.label ? `${option.color}20` : colors.surface2, border: `1.5px solid ${templateName === option.label ? option.color : colors.divider}`, color: templateName === option.label ? option.color : TEXT_MUTED, fontFamily: FONT_ALT, fontSize: 10, fontWeight: 700, letterSpacing: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}><span style={{ fontSize: 14 }}>{option.emoji}</span> {option.shortLabel}</button>)}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <button onClick={onSave} style={{ width: '100%', padding: 14, borderRadius: 14, background: GOLD, border: 'none', color: colors.onGold, fontFamily: FONT_DISPLAY, fontSize: 17, letterSpacing: 2, cursor: 'pointer' }}>{t('saveTemplate.yes')}</button>
        <button onClick={onSkip} style={{ width: '100%', padding: 14, borderRadius: 14, background: 'transparent', border: `1.5px solid ${GOLD_RULE}`, color: GOLD, fontFamily: FONT_DISPLAY, fontSize: 16, letterSpacing: 2, cursor: 'pointer' }}>{t('saveTemplate.no')}</button>
      </div>
    </div>
  </div>
}
