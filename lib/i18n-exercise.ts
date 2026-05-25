// lib/i18n-exercise.ts — Localized exercise field helpers (FR fallback)

import type { Locale } from './seo'

/**
 * Subset of an exercises_db row with optional i18n columns.
 * Duck-typed so any object with these fields works.
 */
export interface ExerciseI18nFields {
  name?: string | null
  name_en?: string | null
  name_de?: string | null
  description?: string | null
  description_en?: string | null
  description_de?: string | null
  tips?: string | null
  tips_en?: string | null
  tips_de?: string | null
}

/**
 * Returns the localized exercise name, falling back to FR.
 *
 * - locale 'fr' OR translated field null/empty → returns exo.name (FR)
 * - Otherwise returns the translated field
 * - exo null/undefined → ''
 */
export function getExerciseName(
  exo: ExerciseI18nFields | null | undefined,
  locale: Locale
): string {
  if (!exo) return ''
  if (locale === 'fr') return exo.name || ''

  const translated = locale === 'en' ? exo.name_en : exo.name_de
  return (translated && translated.trim()) ? translated : (exo.name || '')
}

/**
 * Returns the localized exercise description, falling back to FR.
 */
export function getExerciseDescription(
  exo: ExerciseI18nFields | null | undefined,
  locale: Locale
): string {
  if (!exo) return ''
  if (locale === 'fr') return exo.description || ''

  const translated = locale === 'en' ? exo.description_en : exo.description_de
  return (translated && translated.trim()) ? translated : (exo.description || '')
}

/**
 * Returns the localized exercise tips, falling back to FR.
 */
export function getExerciseTips(
  exo: ExerciseI18nFields | null | undefined,
  locale: Locale
): string {
  if (!exo) return ''
  if (locale === 'fr') return exo.tips || ''

  const translated = locale === 'en' ? exo.tips_en : exo.tips_de
  return (translated && translated.trim()) ? translated : (exo.tips || '')
}
