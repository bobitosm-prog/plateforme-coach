import { FONT_ALT, FONT_BODY, FONT_DISPLAY, GOLD, GOLD_DIM, GOLD_RULE, TEXT_DIM, TEXT_MUTED, TEXT_PRIMARY, colors } from '../../../../lib/design-tokens'
import type { WorkoutTranslate } from './types'

interface WorkoutRestCompleteViewProps {
  message: string
  t: WorkoutTranslate
  onAddThirtySeconds(): void
  onContinue(): void
}

export function WorkoutRestCompleteView({ message, t, onAddThirtySeconds, onContinue }: WorkoutRestCompleteViewProps) {
  return (
    <div data-workout-phase="rest-complete" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.92)', backdropFilter: 'blur(12px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: 24 }}>
      <div style={{ position: 'relative', overflow: 'hidden', background: '#0D0B08', border: `1px solid ${GOLD}`, borderRadius: 20, padding: 32, textAlign: 'center', maxWidth: 340, width: '100%', animation: 'wsPopIn 0.3s ease-out' }}>
        <div style={{ width: 80, height: 80, borderRadius: '50%', background: colors.goldBorder, margin: '0 auto 20px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke={GOLD} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
        </div>
        <h2 style={{ fontFamily: FONT_DISPLAY, fontSize: 24, color: TEXT_PRIMARY, letterSpacing: 3, margin: '0 0 8px' }}>{t('restDone.title')}</h2>
        <p style={{ fontFamily: FONT_BODY, fontSize: 14, color: TEXT_MUTED, margin: '0 0 8px' }}>{t('restDone.next')}</p>
        <p style={{ fontFamily: FONT_DISPLAY, fontSize: 16, color: GOLD, letterSpacing: 1, margin: '0 0 24px' }}>{message}</p>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onAddThirtySeconds} className="active:scale-95" style={{ flex: 1, padding: 14, background: colors.surface2, border: `1px solid ${colors.divider}`, borderRadius: 12, color: GOLD, fontFamily: FONT_ALT, fontWeight: 800, fontSize: 13, letterSpacing: 1, textTransform: 'uppercase', cursor: 'pointer' }}>+30S</button>
          <button onClick={onContinue} className="active:scale-95" style={{ flex: 2, padding: 14, background: GOLD, border: 'none', borderRadius: 12, color: colors.onGold, fontFamily: FONT_ALT, fontWeight: 800, fontSize: 14, letterSpacing: 2, textTransform: 'uppercase', cursor: 'pointer' }}>{t('restDone.start')}</button>
        </div>
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 3, background: 'rgba(255,255,255,0.1)', overflow: 'hidden' }}>
          <div style={{ height: '100%', background: GOLD, animation: 'rest-autoclose-progress 5s linear forwards' }} />
        </div>
      </div>
    </div>
  )
}

interface WorkoutActiveRestViewProps {
  seconds: number
  maximumSeconds: number
  currentRir: number | null
  rirTrackingEnabled: boolean
  rirScaleAdvanced: boolean
  t: WorkoutTranslate
  onSetRir(value: number): void
  onAddThirtySeconds(): void
  onSkip(): void
}

export function WorkoutActiveRestView(props: WorkoutActiveRestViewProps) {
  const { seconds, maximumSeconds, currentRir, rirTrackingEnabled, rirScaleAdvanced, t, onSetRir, onAddThirtySeconds, onSkip } = props
  return (
    <div data-workout-phase="resting" style={{ marginTop: 8, marginBottom: 4, borderRadius: 12, background: 'rgba(201,168,76,0.08)', border: `1px solid ${seconds <= 10 ? colors.orange : GOLD_RULE}`, transition: 'border-color 200ms', overflow: 'hidden' }}>
      {rirTrackingEnabled && (
        <div style={{ padding: '12px 16px 10px', borderBottom: `1px solid ${GOLD_RULE}` }}>
          <div style={{ fontFamily: FONT_ALT, fontSize: 10, fontWeight: 700, letterSpacing: '0.15em', color: TEXT_DIM, textTransform: 'uppercase', marginBottom: 8 }}>{t(rirScaleAdvanced ? 'rirQuestionAdvanced' : 'rirQuestionSimple')}</div>
          <div style={{ display: 'flex', gap: 6 }}>
            {(rirScaleAdvanced ? [0, 1, 2, 3, 4].map(value => ({ label: value === 4 ? '4+' : String(value), value })) : [
              { label: 'Facile', value: 4 }, { label: 'Moyen', value: 2 }, { label: 'Dur', value: 1 }, { label: 'Échec', value: 0 },
            ]).map(option => (
              <button key={option.value} onClick={() => onSetRir(option.value)} style={{ flex: 1, padding: '8px 0', borderRadius: 8, cursor: 'pointer', background: currentRir === option.value ? GOLD_DIM : colors.surface2, border: `1px solid ${currentRir === option.value ? GOLD : colors.divider}`, fontFamily: FONT_ALT, fontSize: rirScaleAdvanced ? 13 : 10, fontWeight: 700, letterSpacing: rirScaleAdvanced ? undefined : '0.04em', color: currentRir === option.value ? GOLD : TEXT_MUTED }}>{option.label}</button>
            ))}
          </div>
        </div>
      )}
      <div style={{ padding: 16, display: 'flex', alignItems: 'center', gap: 16 }}>
        <div style={{ position: 'relative', width: 80, height: 80, flexShrink: 0 }}>
          <svg width="80" height="80" viewBox="0 0 80 80" style={{ transform: 'rotate(-90deg)' }}>
            <circle cx="40" cy="40" r="32" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="6" />
            <circle cx="40" cy="40" r="32" fill="none" stroke={seconds <= 10 ? colors.orange : GOLD} strokeWidth="6" strokeLinecap="round" strokeDasharray={2 * Math.PI * 32} strokeDashoffset={2 * Math.PI * 32 * (1 - (maximumSeconds > 0 ? seconds / maximumSeconds : 0))} style={{ transition: 'stroke-dashoffset 1s linear, stroke 200ms' }} />
          </svg>
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
            <span style={{ fontSize: 22, fontWeight: 800, fontFamily: FONT_ALT, color: seconds <= 10 ? colors.orange : GOLD, lineHeight: 1 }}>{seconds}s</span>
            <span style={{ fontSize: 8, fontFamily: FONT_ALT, color: TEXT_DIM, letterSpacing: '0.1em', marginTop: 2 }}>{t('rest')}</span>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
          <button onClick={onAddThirtySeconds} style={{ padding: '10px 16px', background: 'transparent', border: `1px solid ${GOLD_RULE}`, borderRadius: 10, color: GOLD, fontFamily: FONT_ALT, fontWeight: 700, fontSize: 11, letterSpacing: '0.04em', textTransform: 'uppercase', cursor: 'pointer' }}>+30s</button>
          <button onClick={onSkip} style={{ padding: '10px 16px', background: GOLD, border: 'none', borderRadius: 10, color: colors.onGold, fontFamily: FONT_ALT, fontWeight: 800, fontSize: 11, letterSpacing: '0.04em', textTransform: 'uppercase', cursor: 'pointer' }}>{t('skipRest')}</button>
        </div>
      </div>
    </div>
  )
}
