'use client'

import { useState } from 'react'
import { Apple, Check, Dumbbell, Minus } from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'
import { homeWeekKeys, type HomeCalendarDay, type HomeCalendarStatus } from '../../../lib/home/home-week-calendar'
import styles from './HomeV2.module.css'

function Status({ value }: { value: HomeCalendarStatus }) {
  return <span className={styles.calendarStatus} data-status={value} aria-hidden="true">
    {value === 'done' ? <Check size={15} strokeWidth={2.5} /> : value === 'rest' ? <Minus size={13} /> : value === 'unknown' ? '?' : null}
  </span>
}

export default function HomeWeekCalendar({ todayKey, days }: { todayKey: string; days?: readonly HomeCalendarDay[] }) {
  const t = useTranslations('home.v2.calendar')
  const locale = useLocale()
  const [selection, setSelection] = useState({ todayKey, dateKey: todayKey })
  const selectedKey = selection.todayKey === todayKey ? selection.dateKey : todayKey
  const week = days ?? homeWeekKeys(todayKey).map(dateKey => ({ dateKey, nutrition: 'unknown' as const, sport: 'unknown' as const }))
  const selected = week.find(day => day.dateKey === selectedKey) ?? week[0]
  const weekday = new Intl.DateTimeFormat(locale, { weekday: 'short', timeZone: 'UTC' })
  const fullDate = new Intl.DateTimeFormat(locale, { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' })
  const dateFor = (key: string) => new Date(`${key}T12:00:00Z`)
  const detail = (day: HomeCalendarDay) => `${t(`nutrition.${day.nutrition}`)} · ${t(`sport.${day.sport}`)}`

  return <section className={styles.calendar} aria-label={t('title')}>
    <div className={styles.calendarLabels}>
      <span><Apple size={14} aria-hidden="true" />{t('nutritionLabel')}</span>
      <span><Dumbbell size={14} aria-hidden="true" />{t('sportLabel')}</span>
    </div>
    <div className={styles.calendarColumns} role="group" aria-label={t('title')}>
      {week.map(day => <button type="button" key={day.dateKey}
        className={styles.calendarDay}
        aria-pressed={selected.dateKey === day.dateKey}
        aria-current={day.dateKey === todayKey ? 'date' : undefined}
        aria-label={`${fullDate.format(dateFor(day.dateKey))} : ${detail(day)}`}
        onClick={() => setSelection({ todayKey, dateKey: day.dateKey })}>
        <span className={styles.calendarWeekday}>{weekday.format(dateFor(day.dateKey)).replace('.', '')}</span>
        <strong className={styles.calendarDate}>{Number(day.dateKey.slice(-2))}</strong>
        <Status value={day.nutrition} />
        <Status value={day.sport} />
      </button>)}
    </div>
    <div className={styles.calendarLegend}>
      <span><Check size={12} aria-hidden="true" />{t('done')}</span>
      <span><span className={styles.calendarEmpty} aria-hidden="true" />{t('empty')}</span>
      <span><Minus size={12} aria-hidden="true" />{t('rest')}</span>
    </div>
    <div className={styles.calendarDetail} aria-live="polite" aria-atomic="true">
      <strong>{fullDate.format(dateFor(selected.dateKey))}{selected.dateKey === todayKey ? ` · ${t('today')}` : ''}</strong>
      <span>{detail(selected)}</span>
    </div>
  </section>
}
