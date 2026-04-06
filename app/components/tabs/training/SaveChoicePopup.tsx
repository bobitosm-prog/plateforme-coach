'use client'
import { BG_CARD, BORDER, GOLD, GOLD_DIM, TEXT_PRIMARY, TEXT_MUTED, FONT_DISPLAY, FONT_BODY } from '../../../../lib/design-tokens'

interface Props {
  onSaveModified: () => void
  onSaveOriginal: () => void
  onClose: () => void
}

export default function SaveChoicePopup({ onSaveModified, onSaveOriginal, onClose }: Props) {
  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1100 }} />
      <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: 'calc(100% - 40px)', maxWidth: 380, background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: 20, padding: 24, zIndex: 1101, textAlign: 'center' }}>
        <div style={{ width: 56, height: 56, borderRadius: 16, background: GOLD_DIM, border: `1px solid ${BORDER}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, margin: '0 auto 16px' }}>💾</div>
        <h3 style={{ fontFamily: FONT_DISPLAY, fontSize: 22, letterSpacing: 2, color: TEXT_PRIMARY, marginBottom: 8 }}>SEANCE MODIFIEE</h3>
        <p style={{ fontFamily: FONT_BODY, fontSize: 14, color: TEXT_MUTED, lineHeight: 1.6, marginBottom: 24 }}>Tu as ajoute des exercices. Veux-tu les garder pour les prochaines fois ?</p>
        <button onClick={onSaveModified} style={{ width: '100%', padding: 16, background: 'linear-gradient(135deg, #E8C97A, #D4A843, #C9A84C, #8B6914)', color: '#0D0B08', fontFamily: FONT_DISPLAY, fontSize: 16, letterSpacing: 2, border: 'none', borderRadius: 12, cursor: 'pointer', marginBottom: 10, boxShadow: '0 4px 20px rgba(212,168,67,0.2)' }}>GARDER LES MODIFICATIONS</button>
        <button onClick={onSaveOriginal} style={{ width: '100%', padding: 16, background: 'transparent', color: GOLD, fontFamily: FONT_DISPLAY, fontSize: 16, letterSpacing: 2, border: '1.5px solid rgba(212,168,67,0.5)', borderRadius: 12, cursor: 'pointer' }}>GARDER LA SEANCE DE BASE</button>
      </div>
    </>
  )
}
