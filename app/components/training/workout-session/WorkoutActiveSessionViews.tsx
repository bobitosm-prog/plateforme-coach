import { ArrowLeft } from 'lucide-react'
import { BORDER, FONT_ALT, FONT_DISPLAY, GOLD, GREEN, TEXT_DIM, TEXT_MUTED, TEXT_PRIMARY, colors } from '../../../../lib/design-tokens'
import type { WorkoutTranslate } from './types'

interface WorkoutActiveSessionHeaderViewProps {
  sessionName: string
  elapsed: string
  completedSets: number
  totalSets: number
  progressPercent: number
  t: WorkoutTranslate
  onClose(): void
}

export function WorkoutActiveSessionHeaderView(props: WorkoutActiveSessionHeaderViewProps) {
  const { sessionName, elapsed, completedSets, totalSets, progressPercent, t, onClose } = props
  return <header data-workout-view="active-session-header" className="sticky top-0 z-40 border-b" style={{ background: '#0D0B08', borderColor: BORDER, padding: '0 16px 10px', paddingTop: 'max(12px, env(safe-area-inset-top, 12px))', position: 'relative' }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
      <button onClick={onClose} style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 4, flexShrink: 0 }}><ArrowLeft size={22} color={TEXT_PRIMARY} /></button>
      <h1 style={{ flex: 1, color: TEXT_PRIMARY, fontFamily: FONT_DISPLAY, fontSize: 16, letterSpacing: '2px', margin: 0, textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sessionName || t('freeSession')}</h1>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}><div style={{ width: 6, height: 6, borderRadius: '50%', background: GREEN, animation: 'pulse 2s infinite' }} /><span style={{ fontSize: 14, color: TEXT_PRIMARY, fontFamily: FONT_DISPLAY, letterSpacing: '1px' }}>{elapsed}</span></div>
    </div>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}><span style={{ fontSize: 10, color: TEXT_MUTED, fontFamily: FONT_ALT, fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase' }}>{t('progression')}</span><span style={{ fontSize: 11, color: GOLD, fontFamily: FONT_DISPLAY }}>{completedSets}/{totalSets} sets</span></div>
    <div style={{ height: 2, background: TEXT_DIM, overflow: 'hidden' }}><div style={{ width: `${progressPercent}%`, height: '100%', background: GOLD, transition: 'width 0.5s ease' }} /></div>
  </header>
}

export function WorkoutActiveSessionFinishView({ elapsed, t, onFinish }: { elapsed: string; t: WorkoutTranslate; onFinish(): void }) {
  return <div data-workout-view="active-session-finish" style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 200, background: '#0D0B08', borderTop: `1px solid ${BORDER}`, padding: '10px 16px', paddingBottom: 'calc(10px + env(safe-area-inset-bottom, 16px))' }}>
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><span style={{ fontSize: 10, color: GOLD, fontFamily: FONT_ALT, fontWeight: 700, letterSpacing: '3px', textTransform: 'uppercase' }}>{t('time')}</span><span style={{ fontSize: 18, color: TEXT_PRIMARY, fontFamily: FONT_DISPLAY, letterSpacing: '2px', lineHeight: 1 }}>{elapsed}</span></div>
      <button onClick={onFinish} className="active:scale-95" style={{ background: GOLD, border: 'none', borderRadius: 12, padding: '12px 0', width: '60%', maxWidth: 280, color: colors.onGold, fontFamily: FONT_DISPLAY, fontSize: 16, letterSpacing: '2px', cursor: 'pointer', textTransform: 'uppercase' }}>{t('finish')}</button>
    </div>
  </div>
}
