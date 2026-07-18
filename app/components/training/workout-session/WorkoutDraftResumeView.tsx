import { BG_BASE, BORDER, FONT_ALT, FONT_BODY, GOLD, TEXT_MUTED, TEXT_PRIMARY, colors } from '../../../../lib/design-tokens'
import type { WorkoutTranslate } from './types'

interface WorkoutDraftResumeViewProps {
  sessionName: string
  t: WorkoutTranslate
  onDiscard(): void
  onResume(): void
}

export function WorkoutDraftResumeView({ sessionName, t, onDiscard, onResume }: WorkoutDraftResumeViewProps) {
  return (
    <div data-workout-phase="preparation" style={{ position: 'fixed', inset: 0, zIndex: 10000, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(12px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ background: BG_BASE, border: `1px solid ${GOLD}`, borderRadius: 20, padding: 24, maxWidth: 360, width: '100%', animation: 'wsPopIn 0.3s ease-out' }}>
        <h2 style={{ fontFamily: FONT_ALT, textTransform: 'uppercase', letterSpacing: '0.04em', fontSize: '0.95rem', fontWeight: 800, color: GOLD, margin: '0 0 12px' }}>{t('draft.title')}</h2>
        <p style={{ fontFamily: FONT_BODY, fontSize: '0.875rem', color: TEXT_MUTED, lineHeight: 1.55, margin: '0 0 24px' }}>{t('draft.description', { name: sessionName })}</p>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={onDiscard} style={{ flex: 1, padding: '12px', background: 'transparent', border: `1px solid ${BORDER}`, borderRadius: 10, color: TEXT_PRIMARY, fontFamily: FONT_ALT, fontWeight: 700, fontSize: 11, letterSpacing: '0.04em', textTransform: 'uppercase', cursor: 'pointer' }}>{t('draft.restart')}</button>
          <button onClick={onResume} style={{ flex: 2, padding: '12px', background: GOLD, border: 'none', borderRadius: 10, color: colors.onGold, fontFamily: FONT_ALT, fontWeight: 800, fontSize: 11, letterSpacing: '0.04em', textTransform: 'uppercase', cursor: 'pointer' }}>{t('draft.resume')}</button>
        </div>
      </div>
    </div>
  )
}
