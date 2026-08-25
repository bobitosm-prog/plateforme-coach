'use client'

import { ArrowRight, Sparkles } from 'lucide-react'
import { useTranslations } from 'next-intl'
import type { AthenaHomeInsight } from '../../../lib/home/athena-home-insight'
import styles from './HomeV2.module.css'

export default function AthenaInsightCard({
  insight,
  onOpenAthena,
}: {
  insight: AthenaHomeInsight
  onOpenAthena?: () => void
}) {
  const t = useTranslations('home.v2.athenaInsight')

  return <article className={`${styles.intelligenceCard} ${styles.athenaInsight}`} data-insight={insight.reason}>
    <div className={styles.intelligenceLabel}>
      <span className={styles.intelligenceIcon}><Sparkles size={17} aria-hidden="true" /></span>
      <span>{t('label')}</span>
    </div>
    {insight.type === 'loading'
      ? <div className={styles.insightLoading} aria-live="polite">
        <div className={`${styles.skeletonLine} ${styles.insightSkeleton}`} />
        <span>{t('loading')}</span>
      </div>
      : <p className={styles.insightMessage}>{t(`messages.${insight.message}`)}</p>}
    <button type="button" className={styles.intelligenceCta} onClick={onOpenAthena}>
      {t('cta')} <ArrowRight size={15} aria-hidden="true" />
    </button>
  </article>
}
