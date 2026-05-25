// lib/i18n-muscle.ts — Localized muscle_group labels (FR DB values → i18n display)

import type { Locale } from './seo'

/**
 * Map DB FR value → i18n key.
 * "Abdominaux" and "Abdos" both map to 'abs' (DB debt).
 */
const MUSCLE_KEY_MAP: Record<string, string> = {
  'Tous': 'all',
  'Quadriceps': 'quads',
  'Dos': 'back',
  'Pectoraux': 'chest',
  'Épaules': 'shoulders',
  'Triceps': 'triceps',
  'Biceps': 'biceps',
  'Fessiers': 'glutes',
  'Ischio-jambiers': 'hamstrings',
  'Abdos': 'abs',
  'Abdominaux': 'abs',
  'Mollets': 'calves',
  'Corps Entier': 'fullBody',
  'Jambes': 'quads',
  'Cardio': 'cardio',
}

/**
 * Returns the localized muscle label for display.
 * @param dbValue - The FR muscle_group value from DB
 * @param locale - Current locale ('fr'|'en'|'de')
 * @param t - useTranslations('muscles') function
 * @returns Translated label, or dbValue as fallback if unknown
 */
export function getMuscleLabel(
  dbValue: string | null | undefined,
  locale: Locale,
  t: (key: string) => string
): string {
  if (!dbValue) return ''
  const i18nKey = MUSCLE_KEY_MAP[dbValue]
  if (!i18nKey) return dbValue // fallback for unknown DB values
  return t(i18nKey)
}

export { MUSCLE_KEY_MAP }
