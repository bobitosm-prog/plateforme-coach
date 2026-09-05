'use client'

import { Plus, RefreshCw } from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'

import type {
  NutritionDomainState,
  NutritionViewModel,
} from '../../../lib/nutrition/nutrition-dashboard-model'
import { addNutritionDays, NUTRITION_TIME_ZONE } from '../../../lib/nutrition/nutrition-date'
import styles from './NutritionV2.module.css'

export type CalorieBalance =
  | { kind: 'target_missing'; amount: null }
  | { kind: 'remaining'; amount: number }
  | { kind: 'reached'; amount: 0 }
  | { kind: 'above'; amount: number }

export function getNutritionHeroState(model: NutritionViewModel): NutritionDomainState {
  if (model.summary.state === 'loading' || model.consumed.state === 'loading') return 'loading'
  if (model.summary.state === 'error' || model.consumed.state === 'error') return 'error'
  if (model.consumed.state === 'empty') return 'empty'
  if (model.summary.state === 'partial' || model.targets.state !== 'ready') return 'partial'
  return 'ready'
}

export function getCalorieBalance(consumed: number, target: number | null): CalorieBalance {
  if (target == null || !Number.isFinite(target) || target <= 0) return { kind: 'target_missing', amount: null }
  const difference = target - consumed
  if (difference > 0) return { kind: 'remaining', amount: difference }
  if (difference < 0) return { kind: 'above', amount: Math.abs(difference) }
  return { kind: 'reached', amount: 0 }
}

export function getNutritionDateLabel({
  selectedDate,
  todayDate,
  locale,
  todayLabel,
  yesterdayLabel,
}: {
  selectedDate: string
  todayDate: string
  locale: string
  todayLabel: string
  yesterdayLabel: string
}): string {
  if (selectedDate === todayDate) return todayLabel
  if (selectedDate === addNutritionDays(todayDate, -1)) return yesterdayLabel
  return new Intl.DateTimeFormat(locale, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: NUTRITION_TIME_ZONE,
  }).format(new Date(`${selectedDate}T12:00:00Z`))
}

export default function NutritionHero({
  model,
  selectedDate,
  onAddMeal,
  onRetry,
}: {
  model: NutritionViewModel
  selectedDate: string
  onAddMeal: () => void
  onRetry: () => void
}) {
  const t = useTranslations('nutrition_tab.v2')
  const locale = useLocale()
  const state = getNutritionHeroState(model)
  const number = new Intl.NumberFormat(locale, { maximumFractionDigits: 0 })
  const consumedCalories = model.consumed.data?.calories ?? null
  const consumedProtein = model.consumed.data?.protein ?? null
  const calorieTarget = model.targets.data?.calories && model.targets.data.calories > 0
    ? model.targets.data.calories
    : null
  const proteinTarget = model.targets.data?.protein && model.targets.data.protein > 0
    ? model.targets.data.protein
    : null
  const balance = consumedCalories == null ? null : getCalorieBalance(consumedCalories, calorieTarget)
  const dateLabel = getNutritionDateLabel({
    selectedDate,
    todayDate: model.day.localDateKey,
    locale,
    todayLabel: t('today'),
    yesterdayLabel: t('yesterday'),
  })

  const balanceLabel = balance?.kind === 'remaining'
    ? t('remaining', { count: number.format(balance.amount) })
    : balance?.kind === 'above'
      ? t('above', { count: number.format(balance.amount) })
      : balance?.kind === 'reached'
        ? t('reached')
        : t('targetMissing')

  return <header
    className={styles.hero}
    aria-labelledby="nutrition-v2-title"
    aria-busy={state === 'loading'}
    data-state={state}
  >
    <div className={styles.heroTop}>
      <div>
        <p className={styles.eyebrow}>{t('eyebrow')}</p>
        <h1 id="nutrition-v2-title" className={styles.title}>{t('title')}</h1>
        <p className={styles.dateLabel}>{dateLabel}</p>
      </div>
      {state !== 'loading' && state !== 'error' && <button type="button" className={styles.primaryButton} onClick={onAddMeal}>
        <Plus size={17} aria-hidden="true" /> {state === 'empty' ? t('addFirstMeal') : t('addMeal')}
      </button>}
    </div>

    {state === 'loading' && <div className={styles.heroState} aria-live="polite">
      <span className={`${styles.skeleton} ${styles.skeletonWide}`} />
      <span className={styles.skeleton} />
      <span className={styles.srOnly}>{t('loading')}</span>
    </div>}

    {state === 'error' && <div className={styles.heroState} role="status">
      <strong>{t('errorTitle')}</strong>
      <span>{t('errorCopy')}</span>
      <button type="button" className={styles.secondaryButton} onClick={onRetry}>
        <RefreshCw size={16} aria-hidden="true" /> {t('retry')}
      </button>
    </div>}

    {state === 'empty' && <div className={styles.heroState}>
      <strong>{t('emptyTitle')}</strong>
      <span>{t('emptyCopy')}</span>
    </div>}

    {(state === 'ready' || state === 'partial') && consumedCalories != null && consumedProtein != null && <div className={styles.heroSummary}>
      <div className={styles.primaryMetric}>
        <span>{t('calories')}</span>
        <strong>
          {number.format(consumedCalories)}
          {calorieTarget != null && <small> / {number.format(calorieTarget)} kcal</small>}
          {calorieTarget == null && <small> kcal</small>}
        </strong>
        <p data-balance={balance?.kind}>{balanceLabel}</p>
        {calorieTarget != null && <div
          className={styles.progressTrack}
          role="progressbar"
          aria-label={t('calorieProgress')}
          aria-valuemin={0}
          aria-valuemax={calorieTarget}
          aria-valuenow={Math.min(consumedCalories, calorieTarget)}
          aria-valuetext={`${number.format(consumedCalories)} / ${number.format(calorieTarget)} kcal. ${balanceLabel}`}
        >
          <span style={{ width: `${Math.min(100, Math.max(0, consumedCalories / calorieTarget * 100))}%` }} />
        </div>}
      </div>
      <div className={styles.supportingMetric}>
        <span>{t('protein')}</span>
        <strong>
          {number.format(consumedProtein)}
          {proteinTarget != null && <small> / {number.format(proteinTarget)} g</small>}
          {proteinTarget == null && <small> g</small>}
        </strong>
        <p>{proteinTarget == null ? t('targetMissing') : t('proteinProgress')}</p>
      </div>
      {state === 'partial' && <p className={styles.partialNotice}>{t('partial')}</p>}
    </div>}
  </header>
}
