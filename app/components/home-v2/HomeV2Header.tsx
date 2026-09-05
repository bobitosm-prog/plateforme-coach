'use client'

import { useLocale, useTranslations } from 'next-intl'
import Image from 'next/image'
import type { HomeViewModel } from '../../../lib/home/home-dashboard-model'
import styles from './HomeV2.module.css'

export default function HomeV2Header({ identity, today }: Pick<HomeViewModel, 'identity' | 'today'>) {
  const t = useTranslations('home.v2')
  const locale = useLocale()
  const date = new Date(`${today.localDateKey}T12:00:00Z`)
  const formattedDate = new Intl.DateTimeFormat(locale, {
    weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC',
  }).format(date)

  return <header className={styles.header}>
    <div>
      <p className={styles.eyebrow}>{t('hello', { name: identity.firstName })}</p>
      <h1 className={styles.title}>{t('today')}</h1>
      <p className={styles.date}>{formattedDate}</p>
    </div>
    <div className={styles.identity}>
      <div className={styles.metrics} aria-label={t('secondaryMetrics')}>
        {identity.streak > 0 && <span className={styles.metric}>🔥 {identity.streak}</span>}
        {identity.xp != null && <span className={styles.metric}>{identity.xp} XP</span>}
      </div>
      {identity.avatar
        ? <Image className={styles.avatar} src={identity.avatar} alt={t('avatarAlt')} width={42} height={42} unoptimized />
        : <span className={`${styles.avatar} ${styles.avatarFallback}`} aria-hidden="true">{identity.firstName.slice(0, 1).toUpperCase()}</span>}
    </div>
  </header>
}
