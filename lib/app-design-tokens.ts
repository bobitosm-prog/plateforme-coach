/**
 * Client application theme shared with the approved Home/Training/Nutrition UI.
 * Keep the legacy exports for marketing and management screens until audited.
 * Data constants and behavior remain owned by design-tokens and their domain modules.
 */
import type { CSSProperties } from 'react'
import * as legacy from './design-tokens'
export * from './design-tokens'

const outfit = "var(--font-body), 'Outfit', sans-serif"
export const fonts = { headline: outfit, body: outfit, display: outfit, alt: outfit } as const
export const colors = {
  ...legacy.colors,
  background: '#111110', surface: '#171611', surfaceHigh: '#28251d',
  surfaceCard: '#211f18', surface2: '#211f18', gold: '#dfbf70',
  goldContainer: '#dfbf70', goldBorder: '#393326',
  goldDim: 'rgba(223,191,112,.10)', goldRule: '#51462f',
  text: '#f5f2ea', textMuted: '#b7b0a0', textDim: '#aaa69b', divider: '#393326',
} as const
export const radii = { ...legacy.radii, card: 20, button: 13 } as const
export const FONT_DISPLAY = outfit, FONT_ALT = outfit, FONT_BODY = outfit
export const BG_BASE = colors.background, BG_CARD = colors.surfaceCard
export const BG_CARD_2 = colors.surfaceHigh, SURFACE_HIGH = colors.surfaceHigh
export const BORDER = colors.goldBorder, GOLD = colors.gold, GOLD_BRIGHT = colors.gold
export const GOLD_DIM = colors.goldDim, GOLD_RULE = colors.goldRule, GOLD_BORDER_STRONG = colors.goldRule
export const TEXT_PRIMARY = colors.text, TEXT_MUTED = colors.textMuted, TEXT_DIM = colors.textDim
export const RADIUS_CARD = radii.card, RADIUS_BTN = radii.button

export const cardStyle: CSSProperties = { ...legacy.cardStyle, background: colors.surfaceCard, border: `1px solid ${colors.goldBorder}`, borderRadius: radii.card, boxShadow: 'none' }
export const pageTitleStyle: CSSProperties = { ...legacy.pageTitleStyle, fontFamily: outfit, fontSize: 'clamp(28px, 7vw, 36px)', textTransform: 'none', letterSpacing: '-.04em', lineHeight: 1.08, color: colors.text }
export const titleStyle: CSSProperties = { ...legacy.titleStyle, fontFamily: outfit, color: colors.gold, letterSpacing: '.08em' }
export const sectionTitleStyle = titleStyle
export const cardTitleAbove = { ...titleStyle, marginBottom: 8 }
export const titleLineStyle = { ...legacy.titleLineStyle, background: colors.goldRule }
export const subtitleStyle: CSSProperties = { ...legacy.subtitleStyle, fontFamily: outfit, color: colors.textMuted, textTransform: 'none', letterSpacing: 0 }
export const statStyle = { ...legacy.statStyle, fontFamily: outfit, color: colors.text }
export const statSmallStyle = { ...legacy.statSmallStyle, fontFamily: outfit, color: colors.gold }
export const bodyStyle = { ...legacy.bodyStyle, fontFamily: outfit, color: colors.textMuted }
export const labelStyle = { ...legacy.labelStyle, fontFamily: outfit, color: colors.gold }
export const mutedStyle = { ...legacy.mutedStyle, fontFamily: outfit, color: colors.textDim }
export const badgeStyle = { ...legacy.badgeStyle, fontFamily: outfit, color: colors.gold, background: colors.goldDim }
export const btnPrimary: CSSProperties = { ...legacy.btnPrimary, background: colors.gold, fontFamily: outfit, fontSize: 15, minHeight: 48, borderRadius: radii.button, textTransform: 'none', letterSpacing: 0, boxShadow: 'none' }
export const btnSecondary: CSSProperties = { ...legacy.btnSecondary, background: colors.surfaceCard, border: `1px solid ${colors.goldRule}`, color: colors.gold, fontFamily: outfit, fontSize: 15, minHeight: 44, borderRadius: radii.button, textTransform: 'none', letterSpacing: 0 }
export const btnGhost: CSSProperties = { ...btnSecondary, background: 'transparent' }
export const inputStyle: CSSProperties = { ...legacy.inputStyle, background: colors.surface, border: `1px solid ${colors.goldRule}`, color: colors.text, fontFamily: outfit, fontSize: 16, minHeight: 48 }
export const modalContainer: CSSProperties = { ...legacy.modalContainer, fontFamily: outfit, background: colors.surfaceCard, border: `1px solid ${colors.goldBorder}`, borderRadius: radii.card }
export const emptyStateStyle = { ...legacy.emptyStateStyle, fontFamily: outfit, color: colors.textMuted }
