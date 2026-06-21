'use client'

import { colors, fonts } from '../../../lib/design-tokens'

interface SectionTitleProps {
  title: string
  action?: { label: string; onClick: () => void }
  noPadding?: boolean
}

export default function SectionTitle({ title, action, noPadding }: SectionTitleProps) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20, padding: noPadding ? 0 : '0 20px' }}>
      <div style={{ width: 3, height: 16, background: colors.gold, borderRadius: 2, flexShrink: 0 }} />
      <span style={{
        fontFamily: fonts.alt, fontSize: 13, fontWeight: 700,
        letterSpacing: '0.16em', color: colors.gold,
        textTransform: 'uppercase', lineHeight: 1,
      }}>{title}</span>
      {action && (
        <>
          <div style={{ flexGrow: 1, height: 1, background: colors.goldRule }} />
          <button onClick={action.onClick} aria-label={action.label} style={{
            background: 'transparent', border: 'none', fontFamily: fonts.alt,
            fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', color: colors.gold,
            textTransform: 'uppercase', cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0, padding: 0,
          }}>{action.label}</button>
        </>
      )}
    </div>
  )
}
