'use client'
import { BG_CARD, BORDER, GOLD, GOLD_DIM, TEXT_PRIMARY, TEXT_MUTED, RADIUS_CARD, FONT_ALT, FONT_BODY } from '../../../../lib/design-tokens'

export default function ActionBtn({ icon: Icon, label, sub, onClick }: { icon: any; label: string; sub: string; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{ background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: RADIUS_CARD, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer', width: '100%', minHeight: 60 }}>
      <div style={{ width: 38, height: 38, borderRadius: RADIUS_CARD, background: GOLD_DIM, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Icon size={18} color={GOLD} />
      </div>
      <div style={{ textAlign: 'left' }}>
        <div style={{ fontFamily: FONT_ALT, fontSize: '0.92rem', fontWeight: 800, letterSpacing: '2px', textTransform: 'uppercase', color: TEXT_PRIMARY }}>+ {label.toUpperCase()}</div>
        <div style={{ fontFamily: FONT_BODY, fontSize: '0.68rem', color: TEXT_MUTED, marginTop: 2 }}>{sub}</div>
      </div>
    </button>
  )
}
