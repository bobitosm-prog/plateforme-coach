'use client'

import { Brain, Moon } from 'lucide-react'
import { useTranslations } from 'next-intl'

import type { ProgressionTrend, ProgressionViewModel } from '../../../lib/progression/progression-dashboard-model'
import styles from './ProgressionV2.module.css'

type WellbeingModel = ProgressionViewModel['wellbeing']

export function getWellbeingState(wellbeing: WellbeingModel) {
  return wellbeing.state
}

function trendKey(trend: ProgressionTrend): 'up' | 'down' | 'stable' | 'unknown' {
  return trend
}

export default function WellbeingCompact({ wellbeing }: { wellbeing: WellbeingModel }) {
  const t = useTranslations('progress.v2')

  return <section className={styles.secondaryCard} aria-labelledby="progression-wellbeing-title">
    <div className={styles.secondaryHeading}>
      <p className={styles.eyebrow}>{t('history.eyebrow')}</p>
      <h2 id="progression-wellbeing-title">{t('history.wellbeing.title')}</h2>
      <p>{t('history.wellbeing.subtitle')}</p>
    </div>
    {wellbeing.state === 'loading' && <div className={styles.compactState} aria-busy="true"><span className={styles.skeleton} />{t('states.loading')}</div>}
    {wellbeing.state === 'error' && <div className={styles.compactState} role="status"><strong>{t('states.unavailable')}</strong><span>{t('history.wellbeing.unavailable')}</span></div>}
    {wellbeing.state === 'empty' && <div className={styles.compactState}><strong>{t('states.insufficient')}</strong><span>{t('history.wellbeing.empty')}</span></div>}
    {(wellbeing.state === 'ready' || wellbeing.state === 'partial') && <>
      {wellbeing.state === 'partial' && <p className={styles.inlineNotice}>{t('history.wellbeing.partial')}</p>}
      <div className={styles.wellbeingGrid}>
        <article><Brain size={18} aria-hidden="true" /><span>{t('history.wellbeing.mood')}</span><strong>{t(`trend.${trendKey(wellbeing.moodTrend)}`)}</strong></article>
        <article><Moon size={18} aria-hidden="true" /><span>{t('history.wellbeing.sleep')}</span><strong>{t(`trend.${trendKey(wellbeing.sleepTrend)}`)}</strong></article>
      </div>
    </>}
  </section>
}
