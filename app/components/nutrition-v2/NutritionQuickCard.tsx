'use client'

import { Apple, Beef, Camera, Flame, ScanLine, Wheat } from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'
import type { CSSProperties, ReactNode } from 'react'

import styles from './NutritionQuickCard.module.css'

export type NutritionQuickCardState = 'loading' | 'ready' | 'partial' | 'empty' | 'error'

export interface NutritionQuickValues {
  calories: number | null
  protein: number | null
  carbs: number | null
  fat: number | null
}

interface NutritionQuickCardProps {
  state: NutritionQuickCardState
  consumed: NutritionQuickValues
  targets: NutritionQuickValues
  onPhoto?: () => void
  onBarcode?: () => void
  compact?: boolean
}

export function getNutritionRemaining(consumed: number | null, target: number | null): number | null {
  if (consumed == null || target == null || !Number.isFinite(consumed) || !Number.isFinite(target) || target <= 0) return null
  return Math.max(0, target - consumed)
}

function MacroRow({
  icon,
  label,
  value,
  tone,
}: {
  icon: ReactNode
  label: string
  value: string
  tone: 'protein' | 'carbs' | 'fat'
}) {
  return <div className={styles.macroRow} data-tone={tone}>
    <span className={styles.macroIcon} aria-hidden="true">{icon}</span>
    <span>
      <strong>{value}</strong>
      <small>{label}</small>
    </span>
  </div>
}

export default function NutritionQuickCard({
  state,
  consumed,
  targets,
  onPhoto,
  onBarcode,
  compact = false,
}: NutritionQuickCardProps) {
  const t = useTranslations('nutrition_tab.v2.quickCard')
  const locale = useLocale()
  const number = new Intl.NumberFormat(locale, { maximumFractionDigits: 0 })
  const isLoading = state === 'loading'
  const isError = state === 'error'
  const calorieRemaining = getNutritionRemaining(consumed.calories, targets.calories)
  const caloriesAbove = consumed.calories != null && targets.calories != null && targets.calories > 0
    ? Math.max(0, consumed.calories - targets.calories)
    : 0
  const calorieProgress = consumed.calories != null && targets.calories != null && targets.calories > 0
    ? Math.min(100, Math.max(0, consumed.calories / targets.calories * 100))
    : 0
  const remaining = {
    protein: getNutritionRemaining(consumed.protein, targets.protein),
    carbs: getNutritionRemaining(consumed.carbs, targets.carbs),
    fat: getNutritionRemaining(consumed.fat, targets.fat),
  }
  const display = (value: number | null) => isLoading ? '…' : isError || value == null ? '—' : `${number.format(value)} g`
  const ringStyle = { '--nutrition-progress': `${calorieProgress * 3.6}deg` } as CSSProperties

  return <section
    className={styles.card}
    data-compact={compact || undefined}
    data-state={state}
    aria-label={t('label')}
    aria-busy={isLoading}
  >
    <div className={styles.energy}>
      <div className={styles.ring} style={ringStyle}>
        <div>
          <strong>{isLoading ? '…' : isError || calorieRemaining == null ? '—' : number.format(caloriesAbove > 0 ? caloriesAbove : calorieRemaining)}</strong>
          <span>{caloriesAbove > 0 ? t('caloriesAbove') : t('caloriesRemaining')}</span>
        </div>
      </div>
      {!isLoading && !isError && calorieRemaining == null && <small className={styles.missing}>{t('targetMissing')}</small>}
    </div>

    <div className={styles.macros} aria-label={t('macrosRemaining')}>
      <MacroRow icon={<Beef size={18} />} label={t('protein')} value={display(remaining.protein)} tone="protein" />
      <MacroRow icon={<Wheat size={18} />} label={t('carbs')} value={display(remaining.carbs)} tone="carbs" />
      <MacroRow icon={<Flame size={18} />} label={t('fat')} value={display(remaining.fat)} tone="fat" />
    </div>

    <div className={styles.actions}>
      {onPhoto && <button type="button" onClick={onPhoto} aria-label={t('photoLabel')}>
        <Camera size={22} aria-hidden="true" />
        <span>{t('photo')}</span>
      </button>}
      {onBarcode && <button type="button" onClick={onBarcode} aria-label={t('barcodeLabel')}>
        <ScanLine size={22} aria-hidden="true" />
        <span>{t('barcode')}</span>
      </button>}
      {!onPhoto && !onBarcode && <span className={styles.decorativeIcon} aria-hidden="true"><Apple size={25} /></span>}
    </div>
  </section>
}
