'use client'

import { Check, ChevronRight, Dumbbell, Play } from 'lucide-react'
import { useTranslations } from 'next-intl'
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
  const viewState = getTodayHeroState(training)
  if (viewState === 'loading') return <section className={styles.hero} aria-busy="true" aria-label={t('loading')}>
    <div><div className={styles.skeletonLine} /><div className={`${styles.skeletonLine} ${styles.skeletonTitle}`} /><div className={styles.skeletonLine} /></div>
  </section>

  if (viewState === 'error') return <section className={`${styles.hero} ${styles.error}`} role="status">
    <div><p className={styles.heroLabel}>{t('label')}</p><h2 className={styles.heroTitle}>{t('errorTitle')}</h2><p className={styles.heroCopy}>{t('errorCopy')}</p></div>
    {onOpenProgram && <div className={styles.actions}><button type="button" className={`${styles.button} ${styles.secondary}`} onClick={onOpenProgram}>{t('openProgram')}</button></div>}
  </section>

  const session = training.session
  if (viewState === 'completed' && session) return <section className={`${styles.hero} ${styles.success}`}>
    <div><p className={styles.heroLabel}><Check size={15} aria-hidden="true" /> {t('completedLabel')}</p><h2 className={styles.heroTitle}>{t('completedTitle')}</h2><p className={styles.heroCopy}>{session.title || t('sessionFallback')}</p></div>
    {onOpenSession && <div className={styles.actions}><button type="button" className={`${styles.button} ${styles.secondary}`} onClick={() => onOpenSession(session)}>{t('viewSession')} <ChevronRight size={16} aria-hidden="true" /></button></div>}
  </section>

  if (viewState === 'rest') return <section className={styles.hero}>
    <div><p className={styles.heroLabel}>{t('label')}</p><h2 className={styles.heroTitle}>{t('restTitle')}</h2><p className={styles.heroCopy}>{t('restCopy')}</p></div>
    {onOpenProgram && <div className={styles.actions}><button type="button" className={`${styles.button} ${styles.secondary}`} onClick={onOpenProgram}>{t('openProgram')}</button></div>}
  </section>

  if (viewState === 'scheduled' && session) return <section className={styles.hero}>
    <div><p className={styles.heroLabel}>{t('label')}</p><h2 className={styles.heroTitle}>{session.title || t('sessionFallback')}</h2><div className={styles.meta}>
      {session.scheduledAt && <span>{new Date(session.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>}
      {session.exercises.length > 0 && <span>{t('exerciseCount', { count: session.exercises.length })}</span>}
      <span>{t(`source.${training.source}`)}</span>
    </div></div>
    {onStartSession && <div className={styles.actions}><button type="button" className={`${styles.button} ${styles.primary}`} onClick={() => onStartSession(session)}><Play size={16} fill="currentColor" aria-hidden="true" /> {t('start')}</button></div>}
  </section>

  return <section className={styles.hero}>
    <div><p className={styles.heroLabel}>{t('label')}</p><h2 className={styles.heroTitle}>{training.hasProgram ? t('emptyTodayTitle') : t('noProgramTitle')}</h2><p className={styles.heroCopy}>{training.hasProgram ? t('emptyTodayCopy') : t('noProgramCopy')}</p></div>
    <div className={styles.actions}>
      {onStartFreeSession && <button type="button" className={`${styles.button} ${styles.primary}`} onClick={onStartFreeSession}><Dumbbell size={16} aria-hidden="true" /> {t('freeSession')}</button>}
      {onOpenProgram && <button type="button" className={`${styles.button} ${styles.secondary}`} onClick={onOpenProgram}>{t('openProgram')}</button>}
    </div>
  </section>
}
