import type { CSSProperties } from 'react'
import { BG_BASE, BG_CARD, BORDER, FONT_ALT, FONT_BODY, GOLD, GOLD_DIM, TEXT_MUTED, TEXT_PRIMARY } from '@/lib/design-tokens'

export const builderInputStyle: CSSProperties = {
  background: BG_BASE, border: `1px solid ${BORDER}`, color: TEXT_PRIMARY,
  padding: '14px 16px', fontFamily: FONT_BODY, fontSize: '1rem', width: '100%', outline: 'none',
}

export const builderLabelStyle: CSSProperties = {
  fontFamily: FONT_ALT, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em',
  color: TEXT_MUTED, marginBottom: 8,
}

export function builderSelectionStyle(selected: boolean): CSSProperties {
  return {
    padding: 14, border: `1.5px solid ${selected ? GOLD : BORDER}`,
    background: selected ? GOLD_DIM : BG_CARD, color: selected ? GOLD : TEXT_PRIMARY,
    cursor: 'pointer', fontFamily: FONT_ALT, fontWeight: 700, fontSize: 14,
    textTransform: 'uppercase', letterSpacing: '1px',
  }
}
