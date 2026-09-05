'use client'

import { useLocale, useTranslations } from 'next-intl'

import type { NutritionViewModel } from '../../../lib/nutrition/nutrition-dashboard-model'
import styles from './NutritionV2.module.css'

const MACROS = [
  { key: 'protein', label: 'protein' },
  { key: 'carbs', label: 'carbs' },
  { key: 'fat', label: 'fat' },
] as const

export default function NutritionMacros({ model }: { model: NutritionViewModel }) {
  const t = useTranslations('nutrition_tab.v2')
  const locale = useLocale()
  const number = new Intl.NumberFormat(locale, { maximumFractionDigits: 0 })
  const state = model.macros.state === 'error'
    ? 'error'
    : model.macros.state === 'loading'
      ? 'loading'
      : model.consumed.state === 'empty'
        ? 'empty'
        : model.targets.state === 'ready'
          ? 'ready'
          : 'partial'

  return <section className={styles.macros} aria-labelledby="nutrition-v2-macros" aria-busy={state === 'loading'} data-state={state}>
    <div className={styles.sectionHeading}>
      <h2 id="nutrition-v2-macros">{t('macrosTitle')}</h2>
      <p>{t('macrosCopy')}</p>
    </div>

    {state === 'loading' && <div className={styles.macroGrid} aria-live="polite">
      {MACROS.map(({ key }) => <span key={key} className={`${styles.skeleton} ${styles.macroSkeleton}`} />)}
      <span className={styles.srOnly}>{t('loading')}</span>
    </div>}

    {state === 'error' && <div className={styles.macroState} role="status">
      <strong>{t('macrosError')}</strong>
      <span>{t('macrosErrorCopy')}</span>
    </div>}

    {(state === 'ready' || state === 'partial' || state === 'empty') && <div className={styles.macroGrid}>
      {MACROS.map(({ key, label }) => {
        const consumed = model.macros.data?.[key] ?? 0
        const target = model.targets.data?.[key]
        const hasTarget = target != null && target > 0
        return <article key={key} className={styles.macroCard}>
          <span>{t(`macro.${label}`)}</span>
          <strong>{number.format(consumed)}{hasTarget ? <small> / {number.format(target)} g</small> : <small> g</small>}</strong>
          <p>{hasTarget ? t('macroTargetDefined') : t('targetMissing')}</p>
        </article>
      })}
    </div>}
  </section>
}
