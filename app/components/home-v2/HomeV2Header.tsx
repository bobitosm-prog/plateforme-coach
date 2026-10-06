'use client'

import { Flame, Sparkles } from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'
import Image from 'next/image'
import type { HomeViewModel } from '../../../lib/home/home-dashboard-model'
import styles from './HomeV2.module.css'

export interface HomeV2HeaderActions {
  onOpenAthena?: () => void
  onOpenTraining?: () => void
  onOpenProgression?: () => void
  onOpenAccount?: () => void
}

export default function HomeV2Header({
  identity,
  today,
  onOpenAthena,
  onOpenTraining,
  onOpenProgression,
  onOpenAccount,
}: Pick<HomeViewModel, 'identity' | 'today'> & HomeV2HeaderActions) {
  const t = useTranslations('home.v2')
  const locale = useLocale()
  const date = new Date(`${today.localDateKey}T12:00:00Z`)
  const monday = new Date(date)
  monday.setUTCDate(date.getUTCDate() - (date.getUTCDay() + 6) % 7)
  const week = Array.from({ length: 7 }, (_, offset) => {
    const day = new Date(monday)
    day.setUTCDate(monday.getUTCDate() + offset)
    return day
  })
  const formattedDate = new Intl.DateTimeFormat(locale, {
    weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC',
  }).format(date)
  const weekdayFormatter = new Intl.DateTimeFormat(locale, { weekday: 'short', timeZone: 'UTC' })
  const dayFormatter = new Intl.DateTimeFormat(locale, { day: '2-digit', timeZone: 'UTC' })
  const fullDateFormatter = new Intl.DateTimeFormat(locale, {
    weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC',
  })

  return <header className={styles.header} data-interactive-header>
    <div className={styles.headerTop}>
      <span className={styles.wordmark} aria-label="MOOVX">MOO<span>V</span>X</span>
      <div className={styles.identity}>
        <button type="button" className={styles.athenaButton} onClick={onOpenAthena} aria-label={t('openAthena')}>
          <span aria-hidden="true">A</span><Sparkles size={11} aria-hidden="true" />
        </button>
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
            ? <Image className={styles.headerAvatar} src={identity.avatar} alt="" width={36} height={36} unoptimized />
            : <span className={styles.avatarInitial} aria-hidden="true">{identity.firstName.slice(0, 1).toUpperCase()}</span>}
        </button>
      </div>
    </div>
    <div className={styles.headerCopy}>
      <button type="button" className={styles.dateButton} onClick={onOpenTraining}>
        {formattedDate} · {t('hello', { name: identity.firstName })}
      </button>
      <h1 className={styles.title}>{t('editorialTitleLead')}{' '}<br /><em>{t('editorialTitleAccent')}</em></h1>
    </div>
    <div className={styles.weekStrip} role="group" aria-label={t('weekCalendar')}>
      {week.map(day => {
        const isToday = day.toISOString().slice(0, 10) === today.localDateKey
        return <div
          key={day.toISOString()}
          className={styles.weekDay}
          data-today={isToday}
          aria-current={isToday ? 'date' : undefined}
          aria-label={fullDateFormatter.format(day)}
        >
          <span>{weekdayFormatter.format(day).replace('.', '')}</span>
          <strong>{dayFormatter.format(day)}</strong>
        </div>
      })}
    </div>
  </header>
}
