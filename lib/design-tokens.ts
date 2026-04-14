// ─── MOOVX Stitch Design System ───
// Single source of truth. Change ONE value → applies EVERYWHERE.

import type React from 'react'

// ══════════════════════════════════════════
// COLORS
// ══════════════════════════════════════════

export const colors = {
  background: '#131313',
  surface: '#0e0e0e',
  surfaceHigh: '#1c1b1b',
  gold: '#e6c364',
  goldContainer: '#c9a84c',
  goldBorder: 'rgba(201,168,76,0.15)',
  goldDim: 'rgba(230,195,100,0.08)',
  goldRule: 'rgba(201,168,76,0.25)',
  text: '#e5e2e1',
  textMuted: '#d0c5b2',
  textDim: '#99907e',
  success: '#4ade80',
  error: '#ef4444',
  blue: '#60a5fa',
  orange: '#fb923c',
} as const

// ══════════════════════════════════════════
// TYPOGRAPHY
// ══════════════════════════════════════════

export const fonts = {
  headline: "'Plus Jakarta Sans', sans-serif",
  body: "'Inter', sans-serif",
} as const

// ══════════════════════════════════════════
// RADII
// ══════════════════════════════════════════

export const radii = {
  card: 16,
  button: 12,
  input: 12,
  pill: 8,
  full: 999,
} as const

// ══════════════════════════════════════════
// INLINE STYLE PRESETS (for style={{...}})
// ══════════════════════════════════════════

/** Standard card container */
export const cardStyle: React.CSSProperties = {
  background: colors.surface,
  border: `1px solid ${colors.goldBorder}`,
  borderRadius: radii.card,
  boxShadow: '0 4px 24px rgba(0,0,0,0.6)',
}

// ─── Typography inline presets ───

/** Page title (ex: "ENTRAÎNEMENT", "NUTRITION") */
export const pageTitleStyle: React.CSSProperties = {
  fontFamily: fonts.headline,
  fontSize: 24,
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.15em',
  color: colors.text,
}

/** Card section title — gold, uppercase, small (ex: "HYDRATATION", "ON FIRE") */
export const titleStyle: React.CSSProperties = {
  fontFamily: fonts.headline,
  fontSize: 14,
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.15em',
  color: colors.gold,
}

/** Subtitle (ex: "Objectif : 3L", "80/100 XP") */
export const subtitleStyle: React.CSSProperties = {
  fontFamily: fonts.body,
  fontSize: 12,
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  color: colors.textMuted,
}

/** Big stat number (ex: "66.2 KG", "2575") */
export const statStyle: React.CSSProperties = {
  fontFamily: fonts.headline,
  fontSize: 28,
  fontWeight: 800,
  color: colors.text,
}

/** Small stat (ex: "145G", "PROT") */
export const statSmallStyle: React.CSSProperties = {
  fontFamily: fonts.headline,
  fontSize: 18,
  fontWeight: 700,
  color: colors.gold,
}

/** Body text (descriptions, paragraphs) */
export const bodyStyle: React.CSSProperties = {
  fontFamily: fonts.body,
  fontSize: 14,
  color: colors.textMuted,
}

/** Label (ex: "VOIR TOUT", "SEMAINE") */
export const labelStyle: React.CSSProperties = {
  fontFamily: fonts.body,
  fontSize: 12,
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  color: colors.gold,
  background: 'none',
  border: 'none',
  cursor: 'pointer',
}

/** Muted text (ex: timestamps, dates) */
export const mutedStyle: React.CSSProperties = {
  fontFamily: fonts.body,
  fontSize: 12,
  color: colors.textDim,
}

/** Badge (ex: "AVANCÉ", "POITRINE") */
export const badgeStyle: React.CSSProperties = {
  fontFamily: fonts.body,
  fontSize: 12,
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  color: colors.gold,
  background: colors.goldDim,
  padding: '4px 12px',
  borderRadius: radii.pill,
  display: 'inline-block',
}

/** Primary CTA button */
export const btnPrimary: React.CSSProperties = {
  background: `linear-gradient(135deg, ${colors.gold}, ${colors.goldContainer})`,
  color: '#0D0B08',
  fontFamily: fonts.headline,
  fontWeight: 700,
  borderRadius: radii.button,
  border: 'none',
  cursor: 'pointer',
  textTransform: 'uppercase',
  letterSpacing: '0.12em',
  fontSize: 14,
}

/** Secondary button */
export const btnSecondary: React.CSSProperties = {
  background: colors.surface,
  border: `1px solid ${colors.goldBorder}`,
  color: colors.gold,
  fontFamily: fonts.headline,
  fontWeight: 700,
  borderRadius: radii.button,
  cursor: 'pointer',
  textTransform: 'uppercase',
  letterSpacing: '0.12em',
  fontSize: 14,
}

/** Input field */
export const inputStyle: React.CSSProperties = {
  background: colors.surface,
  border: `1px solid ${colors.goldBorder}`,
  borderRadius: radii.input,
  color: colors.text,
  fontFamily: fonts.body,
  fontSize: 14,
  padding: '12px 16px',
  outline: 'none',
}

/** Modal overlay */
export const modalOverlay: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(0,0,0,0.75)',
  backdropFilter: 'blur(8px)',
  zIndex: 50,
}

/** Modal container */
export const modalContainer: React.CSSProperties = {
  background: colors.background,
  border: `1px solid ${colors.goldBorder}`,
  borderRadius: radii.card,
  boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
}

// ══════════════════════════════════════════
// TAILWIND CLASS PRESETS (for className="")
// ══════════════════════════════════════════

export const tw = {
  // Layout
  card: "bg-[#0e0e0e] border border-[rgba(201,168,76,0.15)] rounded-2xl shadow-[0_4px_24px_rgba(0,0,0,0.6)]",
  modalOverlay: "fixed inset-0 bg-black/75 backdrop-blur-sm z-50",
  modalContainer: "bg-[#131313] border border-[rgba(201,168,76,0.15)] rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.5)] p-6",
  navBar: "bg-[#0e0e0e] border-t border-[rgba(201,168,76,0.15)]",
  navActive: "text-[#e6c364]",
  navInactive: "text-white/30",

  // Buttons
  btnPrimary: "bg-gradient-to-r from-[#e6c364] to-[#c9a84c] text-black font-['Plus_Jakarta_Sans'] font-bold rounded-xl px-6 py-3 uppercase tracking-wider text-sm",
  btnSecondary: "bg-[#0e0e0e] border border-[rgba(201,168,76,0.15)] text-[#e6c364] font-bold rounded-xl px-6 py-3 uppercase tracking-wider text-sm",
  btnGhost: "bg-transparent border border-[rgba(201,168,76,0.25)] text-[#e6c364] font-bold rounded-xl px-6 py-3 uppercase tracking-wider text-sm",

  // Inputs
  input: "bg-[#0e0e0e] border border-[rgba(201,168,76,0.15)] rounded-xl px-4 py-3 text-white font-['Inter'] text-sm focus:border-[#e6c364] outline-none",
  select: "bg-[#0e0e0e] border border-[rgba(201,168,76,0.15)] rounded-xl px-4 py-3 text-white font-['Inter'] text-sm focus:border-[#e6c364] outline-none appearance-none",
  textarea: "bg-[#0e0e0e] border border-[rgba(201,168,76,0.15)] rounded-xl px-4 py-3 text-white font-['Inter'] text-sm focus:border-[#e6c364] outline-none resize-none",

  // Badges
  badge: "bg-[#e6c364]/10 text-[#e6c364] font-['Inter'] text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider",
  badgeSuccess: "bg-[#4ade80]/10 text-[#4ade80] font-['Inter'] text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider",
  badgeError: "bg-[#ef4444]/10 text-[#ef4444] font-['Inter'] text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider",

  // Typography
  pageTitle: "font-['Plus_Jakarta_Sans'] text-2xl font-bold uppercase tracking-[0.15em] text-white",
  cardTitle: "font-['Plus_Jakarta_Sans'] text-sm font-bold uppercase tracking-[0.15em] text-[#e6c364]",
  subtitle: "font-['Inter'] text-xs font-semibold uppercase tracking-wider text-white/50",
  stat: "font-['Plus_Jakarta_Sans'] text-3xl font-bold text-white",
  statSmall: "font-['Plus_Jakarta_Sans'] text-lg font-bold text-[#e6c364]",
  body: "font-['Inter'] text-sm text-white/70",
  label: "font-['Inter'] text-xs font-bold uppercase tracking-wider text-[#e6c364]",
  muted: "font-['Inter'] text-xs text-white/30",
} as const

// ══════════════════════════════════════════
// LEGACY ALIASES (backward compat — DO NOT USE in new code)
// ══════════════════════════════════════════

export const BG_BASE = colors.background
export const BG_CARD = colors.surface
export const BG_CARD_2 = colors.surfaceHigh
export const SURFACE_HIGH = colors.surfaceHigh
export const BORDER = colors.goldBorder
export const GOLD = colors.gold
export const GOLD_BRIGHT = colors.gold
export const GOLD_DIM = colors.goldDim
export const GOLD_RULE = colors.goldRule
export const GOLD_GLOW = '0 0 20px rgba(230,195,100,0.15)'
export const GOLD_BORDER_STRONG = colors.goldRule
export const GREEN = colors.success
export const RED = colors.error
export const BLUE = colors.blue
export const ORANGE = colors.gold
export const TEXT_PRIMARY = colors.text
export const TEXT_MUTED = colors.textMuted
export const TEXT_DIM = colors.textDim
export const RADIUS_CARD = radii.card
export const RADIUS_BTN = radii.button
export const RADIUS_INPUT = radii.input
export const RADIUS_PILL = radii.pill
export const FONT_DISPLAY = fonts.headline
export const FONT_ALT = fonts.body
export const FONT_BODY = fonts.body

// ══════════════════════════════════════════
// DATA CONSTANTS (not design — keep as-is)
// ══════════════════════════════════════════

export const MUSCLE_COLORS: Record<string, string> = {
  'Poitrine': '#EF4444',
  'Dos': '#3B82F6',
  'Épaules': '#8B5CF6',
  'Bras': '#F97316',
  'Jambes': '#22C55E',
  'Abdos': '#EAB308',
  'Fessiers': '#EC4899',
  'Cardio': '#06B6D4',
  'Pectoraux': '#EF4444',
  'Biceps': '#F97316',
  'Triceps': '#F97316',
  'Quadriceps': '#22C55E',
  'Ischio-jambiers': '#22C55E',
  'Mollets': '#22C55E',
}
export const MUSCLE_GROUPS_FILTER = ['Tous', 'Pectoraux', 'Dos', 'Épaules', 'Biceps', 'Triceps', 'Quadriceps', 'Ischio-jambiers', 'Fessiers', 'Mollets', 'Abdos']

export const MEAL_TYPES = [
  { id: 'breakfast', label: 'Petit-déj', icon: '🥣' },
  { id: 'lunch', label: 'Déjeuner', icon: '🍽️' },
  { id: 'dinner', label: 'Dîner', icon: '🌙' },
  { id: 'snack', label: 'Collation', icon: '🍎' },
]

export const ACTIVITY_LEVELS = [
  { id: 'sedentary', label: 'Sédentaire', sub: 'Bureau, peu/pas de sport', mult: 1.2 },
  { id: 'light', label: 'Légèrement actif', sub: '1-3 séances/semaine', mult: 1.375 },
  { id: 'moderate', label: 'Modérément actif', sub: '3-5 séances/semaine', mult: 1.55 },
  { id: 'active', label: 'Très actif', sub: '6-7 séances/semaine', mult: 1.725 },
  { id: 'extreme', label: 'Extrêmement actif', sub: 'Athlète / 2x/jour', mult: 1.9 },
]

export const JS_DAYS_FR = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi']
export const WEEK_DAYS = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche']

export const NUTRITION_DAYS: { key: string; label: string }[] = [
  { key: 'lundi',    label: 'Lun' },
  { key: 'mardi',    label: 'Mar' },
  { key: 'mercredi', label: 'Mer' },
  { key: 'jeudi',    label: 'Jeu' },
  { key: 'vendredi', label: 'Ven' },
  { key: 'samedi',   label: 'Sam' },
  { key: 'dimanche', label: 'Dim' },
]

export function todayNutritionKey(): string {
  const jsDay = new Date().getDay()
  return jsDay === 0 ? 'dimanche' : NUTRITION_DAYS[jsDay - 1].key
}

export function calcMifflinStJeor(weight: number, height: number, age: number, gender: string) {
  const base = 10 * weight + 6.25 * height - 5 * age
  return gender === 'male' ? base + 5 : base - 161
}
export function calcKatchMcArdle(weight: number, bodyFatPct: number) {
  const leanMass = weight * (1 - bodyFatPct / 100)
  return 370 + 21.6 * leanMass
}
export function calcHarrisBenedict(weight: number, height: number, age: number, gender: string) {
  return gender === 'male'
    ? 88.362 + 13.397 * weight + 4.799 * height - 5.677 * age
    : 447.593 + 9.247 * weight + 3.098 * height - 4.330 * age
}
