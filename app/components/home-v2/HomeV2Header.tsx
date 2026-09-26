'use client'

import { CalendarDays, Flame, Sparkles, UserRound } from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'
import Image from 'next/image'
import type { HomeViewModel } from '../../../lib/home/home-dashboard-model'
import styles from './HomeV2.module.css'

export interface HomeV2HeaderActions {
  onOpenTraining?: () => void
  onOpenProgression?: () => void
  onOpenAccount?: () => void
}

export default function HomeV2Header({
  identity,
  today,
  onOpenTraining,
  onOpenProgression,
  onOpenAccount,
}: Pick<HomeViewModel, 'identity' | 'today'> & HomeV2HeaderActions) {
  const t = useTranslations('home.v2')
  const locale = useLocale()
  const date = new Date(`${today.localDateKey}T12:00:00Z`)
  const formattedDate = new Intl.DateTimeFormat(locale, {
    weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC',
  }).format(date)

  return <header className={styles.header} data-interactive-header>
    <div className={styles.headerTop}>
      <span className={styles.wordmark} aria-label="MoovX">Moov<span>X</span></span>
      <div className={styles.identity}>
        <div className={styles.metrics} aria-label={t('secondaryMetrics')}>
          {identity.streak > 0 && <button type="button" className={styles.metric} onClick={onOpenProgression} aria-label={t('openStreak', { count: identity.streak })}>
            <Flame size={14} aria-hidden="true" /> {identity.streak}
          </button>}
          {identity.xp != null && <button type="button" className={styles.metric} onClick={onOpenProgression} aria-label={t('openXp', { count: identity.xp })}>
            <Sparkles size={13} aria-hidden="true" /> {identity.xp} XP
          </button>}
        </div>
        <button type="button" className={styles.brandButton} onClick={onOpenAccount} aria-label={t('openAccount')}>
          {identity.avatar
            ? <Image className={styles.accountAvatar} src={identity.avatar} alt="" width={44} height={44} unoptimized />
            : <UserRound size={22} aria-hidden="true" />}
        </button>
      </div>
    </div>
    <div className={styles.headerCopy}>
      <p className={styles.eyebrow}>{t('hello', { name: identity.firstName })}</p>
      <h1 className={styles.title}>{t('today')}</h1>
      <button type="button" className={styles.dateButton} onClick={onOpenTraining}>
        <CalendarDays size={15} aria-hidden="true" />
        <span>{formattedDate}</span>
      </button>
    </div>
  </header>
}
