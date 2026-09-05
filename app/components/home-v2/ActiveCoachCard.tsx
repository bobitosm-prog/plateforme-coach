'use client'
/* eslint-disable @next/next/no-img-element -- Coach avatars use the existing remote image path. */

import { ArrowRight, CalendarDays, MessageCircle, UserRound } from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'
import type { HomeViewModel } from '../../../lib/home/home-dashboard-model'
import styles from './HomeV2.module.css'

interface CoachAppointmentView {
  scheduledAt: string
  location: string | null
}

interface CoachMessageView {
  content: string | null
  createdAt: string | null
}

export function hasActiveHomeCoach(coach: HomeViewModel['coach']): boolean {
  return coach.relationStatus === 'active'
    && coach.state !== 'error'
    && typeof coach.coachId === 'string'
    && coach.coachId.trim().length > 0
}

export function toCoachAppointmentView(value: unknown): CoachAppointmentView | null {
  if (!value || typeof value !== 'object') return null
  const appointment = value as Record<string, unknown>
  const scheduledAt = typeof appointment.scheduled_at === 'string'
    ? appointment.scheduled_at
    : typeof appointment.scheduledAt === 'string'
      ? appointment.scheduledAt
      : null
  if (!scheduledAt || Number.isNaN(Date.parse(scheduledAt))) return null
  return {
    scheduledAt,
    location: typeof appointment.location === 'string' && appointment.location.trim()
      ? appointment.location.trim()
      : null,
  }
}

export function toCoachMessageView(value: unknown | 'unavailable'): CoachMessageView | null {
  if (value === 'unavailable' || !value || typeof value !== 'object') return null
  const message = value as Record<string, unknown>
  const createdAt = typeof message.created_at === 'string' && !Number.isNaN(Date.parse(message.created_at))
    ? message.created_at
    : typeof message.createdAt === 'string' && !Number.isNaN(Date.parse(message.createdAt))
      ? message.createdAt
      : null
  const content = typeof message.content === 'string' && message.content.trim()
    ? message.content.trim().slice(0, 120)
    : null
  return content || createdAt ? { content, createdAt } : null
}

export default function ActiveCoachCard({
  coach,
  onOpenMessages,
}: {
  coach: HomeViewModel['coach']
  onOpenMessages?: () => void
}) {
  const t = useTranslations('home.v2.activeCoach')
  const locale = useLocale()
  if (!hasActiveHomeCoach(coach)) return null

  if (coach.state === 'loading') {
    return <article className={`${styles.intelligenceCard} ${styles.coachCard}`} aria-live="polite" aria-busy="true">
      <h2 className={styles.intelligenceLabel}><span>{t('label')}</span></h2>
      <div className={styles.insightLoading}>
        <div className={`${styles.skeletonLine} ${styles.insightSkeleton}`} />
        <span>{t('loading')}</span>
      </div>
    </article>
  }

  const appointment = toCoachAppointmentView(coach.nextAppointment)
  const lastMessage = toCoachMessageView(coach.lastMessage)
  const coachName = coach.coachDisplayName || t('nameFallback')
  const formatDate = (value: string, options: Intl.DateTimeFormatOptions) => (
    new Intl.DateTimeFormat(locale, options).format(new Date(value))
  )

  return <article className={`${styles.intelligenceCard} ${styles.coachCard}`}>
    <h2 className={styles.intelligenceLabel}><span>{t('label')}</span></h2>
    <div className={styles.coachIdentity}>
      {coach.coachAvatar
        ? <img className={styles.coachAvatar} src={coach.coachAvatar} alt={t('avatarAlt', { name: coachName })} />
        : <span className={`${styles.coachAvatar} ${styles.coachAvatarFallback}`} aria-hidden="true"><UserRound size={22} /></span>}
      <strong className={styles.coachName}>{coachName}</strong>
    </div>
    <div className={styles.coachDetails}>
      {lastMessage && <div className={styles.coachDetail}>
        <MessageCircle size={16} aria-hidden="true" />
        <span><strong>{t('lastMessage')}</strong>{lastMessage.createdAt ? ` · ${formatDate(lastMessage.createdAt, { hour: '2-digit', minute: '2-digit' })}` : ''}
          {lastMessage.content && <small>{lastMessage.content}</small>}
        </span>
      </div>}
      {appointment && <div className={styles.coachDetail}>
        <CalendarDays size={16} aria-hidden="true" />
        <span><strong>{t('nextAppointment')}</strong> · {formatDate(appointment.scheduledAt, { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
          {appointment.location && <small>{appointment.location}</small>}
        </span>
      </div>}
    </div>
    <button type="button" className={styles.intelligenceCta} onClick={onOpenMessages}>
      {t('cta')} <ArrowRight size={15} aria-hidden="true" />
    </button>
  </article>
}
