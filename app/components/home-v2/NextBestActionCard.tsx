'use client'

import { ArrowRight } from 'lucide-react'
import { useTranslations } from 'next-intl'
import type { NextBestAction } from '../../../lib/home/next-best-action'
import styles from './HomeV2.module.css'

export default function NextBestActionCard({ recommendation, onAction }: { recommendation: NextBestAction; onAction: (action: NextBestAction) => void }) {
  const t = useTranslations('home.v2.nextBestAction')
  return <section className={styles.nba} aria-labelledby="next-best-action-title">
    <div>
      <p className={styles.nbaLabel}>{t('label')}</p>
      <h2 id="next-best-action-title" className={styles.nbaTitle}>{t(`${recommendation.reason}.title`)}</h2>
      <p className={styles.nbaCopy}>{t(`${recommendation.reason}.description`)}</p>
    </div>
    <button type="button" className={`${styles.button} ${styles.primary} ${styles.nbaButton}`} onClick={() => onAction(recommendation)}>
      {t(`${recommendation.reason}.cta`)} <ArrowRight size={16} aria-hidden="true" />
    </button>
  </section>
}
