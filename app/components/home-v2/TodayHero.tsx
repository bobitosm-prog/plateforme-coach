'use client'

import { ChevronRight, Dumbbell, HeartPulse } from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'
import type { HomeViewModel, HomeTrainingSession } from '../../../lib/home/home-dashboard-model'
import styles from './HomeV2.module.css'

export interface TodayHeroProps {
  training: HomeViewModel['training']
  onStartSession?: (session: HomeTrainingSession) => void
  onOpenSession?: (session: HomeTrainingSession) => void
  onOpenProgram?: () => void
  onStartFreeSession?: () => void
}

export type TodayHeroState = 'loading' | 'error' | 'scheduled' | 'completed' | 'rest' | 'empty'

export function getTodayHeroState(training: HomeViewModel['training']): TodayHeroState {
  if (training.state === 'loading') return 'loading'
  if (training.state === 'error') return 'error'
  if (training.dayStatus === 'completed') return 'completed'
  if (training.dayStatus === 'rest') return 'rest'
  if (training.dayStatus === 'scheduled') return 'scheduled'
  return 'empty'
}

export default function TodayHero({ training, onStartSession, onOpenSession, onOpenProgram, onStartFreeSession }: TodayHeroProps) {
  const t = useTranslations('home.v2.hero')
  const locale = useLocale()
  const statusT = useTranslations('home.v2.dailyStatus')
  const viewState = getTodayHeroState(training)
  if (viewState === 'loading') return <section className={styles.hero} aria-busy="true" aria-label={t('loading')}>
    <div><div className={styles.skeletonLine} /><div className={`${styles.skeletonLine} ${styles.skeletonTitle}`} /><div className={styles.skeletonLine} /></div>
  </section>

  if (viewState === 'error') return <section className={`${styles.hero} ${styles.error}`} role="status">
    <div><p className={styles.heroLabel}><Dumbbell size={20} aria-hidden="true" />{statusT('training.label')}</p><h3 className={styles.heroTitle}>{t('errorTitle')}</h3><p className={styles.heroCopy}>{t('errorCopy')}</p></div>
    {onOpenProgram && <div className={styles.actions}><button type="button" className={`${styles.button} ${styles.secondary}`} onClick={onOpenProgram}>{t('openProgram')} <ChevronRight size={16} aria-hidden="true" /></button></div>}
  </section>

  const session = training.session
  if (viewState === 'completed' && session) return <section className={`${styles.hero} ${styles.success}`}>
    <div className={styles.heroMain}><div><p className={styles.heroLabel}><Dumbbell size={20} aria-hidden="true" />{statusT('training.label')}</p><h3 className={styles.heroTitle}>{t('completedTitle')}</h3><p className={styles.heroCopy}>{session.title || t('sessionFallback')}{session.exercises.length > 0 ? ` · ${t('exerciseCount', { count: session.exercises.length })}` : ''}</p></div><span className={styles.heroStatusIcon} aria-hidden="true"><Dumbbell size={22} /></span></div>
    {onOpenSession && <div className={styles.actions}><button type="button" className={`${styles.button} ${styles.secondary}`} onClick={() => onOpenSession(session)}>{t('viewSession')} <ChevronRight size={16} aria-hidden="true" /></button></div>}
  </section>

  if (viewState === 'rest') return <section className={`${styles.hero} ${styles.heroRest}`}>
    <div className={styles.heroMain}>
      <div><p className={styles.heroLabel}><Dumbbell size={20} aria-hidden="true" />{statusT('training.label')}</p><h3 className={styles.heroTitle}>{t('restTitle')}</h3><p className={styles.heroCopy}>{t('restCopy')}</p></div>
      <span className={styles.restIcon} aria-hidden="true"><HeartPulse size={26} strokeWidth={1.5} /></span>
    </div>
    {onOpenProgram && <div className={styles.actions}><button type="button" className={`${styles.button} ${styles.primary}`} onClick={onOpenProgram}>{t('openProgram')} <ChevronRight size={16} aria-hidden="true" /></button></div>}
  </section>

  if (viewState === 'scheduled' && session) return <section className={styles.hero}>
    <div className={styles.heroMain}><div><p className={styles.heroLabel}><Dumbbell size={20} aria-hidden="true" />{statusT('training.label')}</p><h3 className={styles.heroTitle}>{session.title || t('sessionFallback')}</h3><div className={styles.meta}>
      {session.scheduledAt && <span>{new Date(session.scheduledAt).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Zurich' })}</span>}
      {session.exercises.length > 0 && <span>{t('exerciseCount', { count: session.exercises.length })}</span>}
      <span>{t(`source.${training.source}`)}</span>
    </div></div><span className={styles.heroStatusIcon} aria-hidden="true"><Dumbbell size={22} /></span></div>
    {onStartSession && <div className={styles.actions}><button type="button" className={`${styles.button} ${styles.primary}`} onClick={() => onStartSession(session)}>{t('start')} <ChevronRight size={16} aria-hidden="true" /></button></div>}
  </section>

  return <section className={styles.hero}>
    <div className={styles.heroMain}><div><p className={styles.heroLabel}><Dumbbell size={20} aria-hidden="true" />{statusT('training.label')}</p><h3 className={styles.heroTitle}>{training.hasProgram ? t('emptyTodayTitle') : t('noProgramTitle')}</h3><p className={styles.heroCopy}>{training.hasProgram ? t('emptyTodayCopy') : t('noProgramCopy')}</p></div><span className={styles.heroStatusIcon} aria-hidden="true"><Dumbbell size={22} /></span></div>
    <div className={styles.actions}>
      {onStartFreeSession && <button type="button" className={`${styles.button} ${styles.primary}`} onClick={onStartFreeSession}>{t('freeSession')} <ChevronRight size={16} aria-hidden="true" /></button>}
      {onOpenProgram && <button type="button" className={`${styles.button} ${styles.secondary}`} onClick={onOpenProgram}>{t('openProgram')} <ChevronRight size={16} aria-hidden="true" /></button>}
    </div>
  </section>
}
