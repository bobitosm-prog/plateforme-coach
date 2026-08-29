import { useTranslations } from 'next-intl'
import styles from './TrainingV2.module.css'

interface RestTimerCompactProps {
  state: 'running' | 'finished'
  remainingSeconds: number
  onSkip: () => void
  onAddThirtySeconds: () => void
  onDismissFinished: () => void
}

function formatRemaining(seconds: number): string {
  const safeSeconds = Math.max(0, Math.ceil(seconds))
  const minutes = Math.floor(safeSeconds / 60)
  return `${String(minutes).padStart(2, '0')}:${String(safeSeconds % 60).padStart(2, '0')}`
}

export default function RestTimerCompact({
  state,
  remainingSeconds,
  onSkip,
  onAddThirtySeconds,
  onDismissFinished,
}: RestTimerCompactProps) {
  const t = useTranslations('training_tab.v2')

  if (state === 'finished') {
    return (
      <section className={styles.restTimer} data-state="finished">
        <div className={styles.restTimerFinished} role="status" aria-live="assertive">
          <span>{t('restFinished')}</span>
          <strong>{t('nextSetReadyShort')}</strong>
        </div>
        <button type="button" onClick={onDismissFinished} aria-label={t('dismissRestFinished')}>
          {t('continue')}
        </button>
      </section>
    )
  }

  return (
    <section className={styles.restTimer} data-state="running" aria-label={t('restTimer')}>
      <div className={styles.restTimerReadout}>
        <span>{t('restTimer')}</span>
        <strong aria-hidden="true">{formatRemaining(remainingSeconds)}</strong>
        <span className={styles.srOnly}>{t('restRemaining', { seconds: Math.max(0, Math.ceil(remainingSeconds)) })}</span>
      </div>
      <div className={styles.restTimerActions}>
        <button type="button" onClick={onSkip} aria-label={t('skipRest')}>{t('skipRest')}</button>
        <button type="button" onClick={onAddThirtySeconds} aria-label={t('addRestTime')}>+30 s</button>
      </div>
    </section>
  )
}
