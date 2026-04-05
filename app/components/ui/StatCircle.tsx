'use client'
import { BG_CARD, GOLD, BORDER, TEXT_MUTED, FONT_DISPLAY, FONT_ALT } from '../../../lib/design-tokens'

interface StatCircleProps {
  value: string | number
  label: string
  icon?: string
}

export default function StatCircle({ value, label, icon }: StatCircleProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
      <div style={{
        width: 72, height: 72, borderRadius: '50%',
        border: `1.5px solid ${BORDER}`,
        background: BG_CARD,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        transition: 'all 0.3s ease',
      }}>
        {icon && <span style={{ fontSize: 12 }}>{icon}</span>}
        <span style={{ fontFamily: FONT_DISPLAY, fontSize: 22, color: GOLD, lineHeight: 1 }}>{value}</span>
      </div>
      <span style={{
        fontFamily: FONT_ALT, fontWeight: 700, fontSize: 9,
        letterSpacing: 2, color: TEXT_MUTED, textTransform: 'uppercase',
      }}>{label}</span>
    </div>
  )
}
