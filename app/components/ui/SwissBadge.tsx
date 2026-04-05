'use client'
import { BG_BASE, GOLD, GOLD_BORDER_STRONG, FONT_ALT } from '../../../lib/design-tokens'

interface SwissBadgeProps {
  variant?: 'solid' | 'outline'
  text?: string
}

export default function SwissBadge({ variant = 'solid', text = 'SWISS MADE' }: SwissBadgeProps) {
  const isSolid = variant === 'solid'
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      background: isSolid ? GOLD : 'transparent',
      color: isSolid ? BG_BASE : GOLD,
      fontFamily: FONT_ALT, fontWeight: 700, fontSize: 8,
      letterSpacing: 2, padding: '3px 8px', borderRadius: 4,
      textTransform: 'uppercase',
      border: isSolid ? 'none' : `1px solid ${GOLD_BORDER_STRONG}`,
    }}>
      {text}
    </span>
  )
}
