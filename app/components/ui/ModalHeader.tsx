'use client'

import { colors, fonts } from '../../../lib/design-tokens'

interface ModalHeaderProps {
  title: string
  onClose: () => void
  badge?: string
  action?: { label: string; onClick: () => void }
}

export default function ModalHeader({ title, onClose, badge, action }: ModalHeaderProps) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', flexShrink: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1 }}>
        <div style={{ width: 3.5, height: 22, background: colors.gold, borderRadius: 2, flexShrink: 0 }} />
        <span style={{ fontFamily: fonts.alt, fontSize: 20, fontWeight: 700, letterSpacing: '0.1em', color: colors.gold, textTransform: 'uppercase', lineHeight: 1 }}>{title}</span>
        {badge && <span style={{ fontSize: 10, fontWeight: 700, color: colors.gold, background: colors.goldDim, padding: '3px 8px', borderRadius: 999, flexShrink: 0, letterSpacing: '0.1em', textTransform: 'uppercase' }}>{badge}</span>}
        <div style={{ flexGrow: 1, height: 1, background: colors.goldRule }} />
        {action && <button onClick={action.onClick} style={{ background: 'transparent', border: 'none', fontFamily: fonts.alt, fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', color: colors.gold, textTransform: 'uppercase', cursor: 'pointer', flexShrink: 0, padding: 0 }}>{action.label}</button>}
      </div>
      <button onClick={onClose} aria-label="Fermer" style={{ width: 36, height: 36, borderRadius: 12, background: colors.surface2, border: `1px solid ${colors.divider}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: colors.textMuted, fontSize: 16, flexShrink: 0, marginLeft: 14 }}>✕</button>
    </div>
  )
}
