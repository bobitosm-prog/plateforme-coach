'use client'

import { Apple, Dumbbell, HeartPulse } from 'lucide-react'
import { useTranslations } from 'next-intl'
import type { HomeDomainState, HomeViewModel } from '../../../lib/home/home-dashboard-model'
import styles from './HomeV2.module.css'

export type DailyTrainingStatus = 'scheduled' | 'completed' | 'rest' | 'empty' | 'loading' | 'error'
export type DailyNutritionStatus = HomeDomainState
export type DailyRecoveryStatus = 'ready' | 'watch' | 'recover' | 'unavailable' | 'loading' | 'error'

export function resolveDailyTrainingStatus(training: HomeViewModel['training']): DailyTrainingStatus {
  if (training.state === 'loading') return 'loading'
  if (training.state === 'error') return 'error'
  if (training.dayStatus === 'completed') return 'completed'
  if (training.dayStatus === 'rest') return 'rest'
  if (training.dayStatus === 'scheduled') return 'scheduled'
  return 'empty'
}

export function resolveDailyRecoveryStatus(recovery: HomeViewModel['recovery']): DailyRecoveryStatus {
  if (recovery.state === 'loading') return 'loading'
  if (recovery.state === 'error') return 'error'
  return recovery.status ?? 'unavailable'
}

function StatusCard({ icon, label, status, state, children }: { icon: React.ReactNode; label: string; status: string; state: HomeDomainState; children?: React.ReactNode }) {
  return <article className={styles.statusCard} aria-busy={state === 'loading'} role={state === 'error' ? 'status' : undefined}>
    <div className={styles.statusTop}><span className={styles.statusIcon}>{icon}</span><span className={styles.statusLabel}>{label}</span></div>
    <strong className={styles.statusValue}>{status}</strong>
    {children && <div className={styles.statusDetails}>{children}</div>}
  </article>
}

export default function DailyStatus({ training, nutrition, recovery }: Pick<HomeViewModel, 'training' | 'nutrition' | 'recovery'>) {
  const t = useTranslations('home.v2.dailyStatus')
  const trainingStatus = resolveDailyTrainingStatus(training)
  const recoveryStatus = resolveDailyRecoveryStatus(recovery)
  const nutritionStatus = nutrition.state
  const macros = [
    ['protein', nutrition.macrosConsumed.protein, nutrition.macrosTarget.protein],
    ['carbs', nutrition.macrosConsumed.carbs, nutrition.macrosTarget.carbs],
    ['fat', nutrition.macrosConsumed.fat, nutrition.macrosTarget.fat],
  ] as const

  return <section className={styles.statusSection} aria-labelledby="daily-status-title">
    <h2 id="daily-status-title" className={styles.sectionTitle}>{t('title')}</h2>
    <div className={styles.statusGrid}>
      <StatusCard icon={<Dumbbell size={18} aria-hidden="true" />} label={t('training.label')} status={t(`training.${trainingStatus}`)} state={training.state}>
        {trainingStatus === 'scheduled' && training.session && <span>{t('training.exerciseCount', { count: training.session.exercises.length })}</span>}
      </StatusCard>
      <StatusCard icon={<Apple size={18} aria-hidden="true" />} label={t('nutrition.label')} status={t(`nutrition.${nutritionStatus}`)} state={nutrition.state}>
        {nutritionStatus === 'ready' && nutrition.caloriesConsumed != null && nutrition.caloriesTarget != null && <>
          <span className={styles.calories}>{nutrition.caloriesConsumed} / {nutrition.caloriesTarget} kcal</span>
          <div className={styles.macroList}>{macros.map(([key, consumed, target]) => consumed != null && target != null
            ? <span key={key}>{t(`nutrition.${key}`)} {consumed}/{target}g</span>
            : null)}</div>
        </>}
      </StatusCard>
      <StatusCard icon={<HeartPulse size={18} aria-hidden="true" />} label={t('recovery.label')} status={t(`recovery.${recoveryStatus}`)} state={recovery.state} />
    </div>
  </section>
}
