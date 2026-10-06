'use client'

import { Apple, ArrowUpRight, Camera, HeartPulse, ScanLine } from 'lucide-react'
import { useMemo } from 'react'
import { useLocale, useTranslations } from 'next-intl'

import { deriveDailyStatusPresentation } from '../../../lib/home/daily-status-presentation'
import type { HomeTrainingSession, HomeViewModel } from '../../../lib/home/home-dashboard-model'
import { BodyMap } from '../home/modals/RecoveryModal'
import TodayHero from './TodayHero'
import styles from './HomeV2.module.css'

export {
  resolveDailyRecoveryStatus,
  resolveDailyTrainingStatus,
} from '../../../lib/home/daily-status-presentation'

export function createHomeNutritionNumberFormatter(locale: string, maximumFractionDigits: 0 | 1) {
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: 0,
    maximumFractionDigits,
    useGrouping: false,
  })
}

interface DailyStatusProps extends Pick<HomeViewModel, 'training' | 'nutrition' | 'recovery'> {
  onStartSession?: (session: HomeTrainingSession) => void
  onOpenSession?: (session: HomeTrainingSession) => void
  onOpenProgram?: () => void
  onStartFreeSession?: () => void
  onOpenNutrition?: () => void
  onNutritionPhoto?: () => void
  onNutritionBarcode?: () => void
  onOpenRecovery: () => void
}

export default function DailyStatus({
  training,
  nutrition,
  recovery,
  onStartSession,
  onOpenSession,
  onOpenProgram,
  onStartFreeSession,
  onOpenNutrition,
  onNutritionPhoto,
  onNutritionBarcode,
  onOpenRecovery,
}: DailyStatusProps) {
  const t = useTranslations('home.v2.dailyStatus')
  const homeT = useTranslations('home.v2')
  const { planned, completed } = training.weeklySummary
  const weeklyPercent = planned > 0 ? Math.min(100, Math.max(0, completed / planned * 100)) : 0
  const recoveryT = useTranslations('home.v2.recoveryModal.muscles')
  const nutritionQuickT = useTranslations('nutrition_tab.v2.quickCard')
  const locale = useLocale()
  const presentation = useMemo(
    () => deriveDailyStatusPresentation({ training, nutrition, recovery }),
    [nutrition, recovery, training],
  )

  const recoveryZones = useMemo(() => new Map(
    (recovery.state === 'loading' || recovery.state === 'error' ? [] : recovery.zones)
      .map(zone => [zone.zone, zone]),
  ), [recovery.state, recovery.zones])

  const calorieNumber = createHomeNutritionNumberFormatter(locale, 0)
  const macroNumber = createHomeNutritionNumberFormatter(locale, 1)
  const priorityZoneNames = presentation.recovery.priorityZones.map(zone => recoveryT(zone))
  const nutritionReady = nutrition.state !== 'loading' && nutrition.state !== 'error'
  const nutritionDetail = nutritionReady && nutrition.caloriesConsumed != null && nutrition.caloriesTarget != null
    ? t('nutrition.calories', {
        consumed: calorieNumber.format(nutrition.caloriesConsumed),
        target: calorieNumber.format(nutrition.caloriesTarget),
      })
    : t(`nutrition.detail.${presentation.nutrition.status}`)
  const macros = [
    ['protein', nutrition.macrosConsumed.protein, nutrition.macrosTarget.protein],
    ['carbs', nutrition.macrosConsumed.carbs, nutrition.macrosTarget.carbs],
    ['fat', nutrition.macrosConsumed.fat, nutrition.macrosTarget.fat],
  ] as const
  const availableMacros = macros.flatMap(([key, consumed, target]) => (
    nutritionReady && consumed != null && target != null ? [[key, consumed, target] as const] : []
  ))
  const recoveryDetail = priorityZoneNames.length > 0
    ? priorityZoneNames.join(' · ')
    : t(`recovery.detail.${presentation.recovery.status}`)
  const recoveryCountParts = (['leave_alone', 'recovering', 'probably_ready'] as const).flatMap(status => {
    const count = presentation.recovery.counts[status]
    return count > 0 ? [t(`recovery.counts.${status}`, { count })] : []
  })

  return <section className={styles.statusSection} aria-labelledby="daily-status-title">
    <h2 id="daily-status-title" className={styles.sectionTitle}>{t('title')}</h2>
    <div className={styles.statusCockpit}>
      <div className={styles.dailyPair} aria-label={t('detailsLabel')}>
        <article className={styles.statusTile} data-domain="nutrition" data-tone={presentation.nutrition.tone} aria-busy={nutrition.state === 'loading'}>
          <span className={styles.statusTileIcon} aria-hidden="true"><Apple size={20} /></span>
          <div className={styles.statusTileCopy}>
            <span className={styles.statusTileLabel}>{t('nutrition.label')}</span>
            <strong>{t(`nutrition.${presentation.nutrition.status}`)}</strong>
            <p>{nutritionDetail}</p>
            {availableMacros.length > 0 && <div className={styles.statusTileFacts}>
              {availableMacros.map(([key, consumed, target]) => <span key={key}>
                {t(`nutrition.${key}`)} {macroNumber.format(consumed)} / {macroNumber.format(target)} g
              </span>)}
            </div>}
          </div>
          <div className={styles.statusTileActions}>
            {onOpenNutrition && <button type="button" className={styles.statusTileLink} onClick={onOpenNutrition}>
              {t('actions.open_nutrition')} <ArrowUpRight size={15} aria-hidden="true" />
            </button>}
            {onNutritionPhoto && <button type="button" className={styles.statusTileIconAction} onClick={onNutritionPhoto} aria-label={nutritionQuickT('photoLabel')}><Camera size={18} aria-hidden="true" /></button>}
            {onNutritionBarcode && <button type="button" className={styles.statusTileIconAction} onClick={onNutritionBarcode} aria-label={nutritionQuickT('barcodeLabel')}><ScanLine size={18} aria-hidden="true" /></button>}
          </div>
        </article>

        <div className={styles.trainingCard}>
          <TodayHero
            training={training}
            onStartSession={onStartSession}
            onOpenSession={onOpenSession}
            onOpenProgram={onOpenProgram}
            onStartFreeSession={onStartFreeSession}
          />
          {planned > 0 && <div className={styles.weeklyProgress}>
            <div className={styles.weeklyProgressCopy}>
              <span>{homeT('weeklyProgressTitle')}</span>
              <strong>{homeT('weeklyProgressCount', { completed, planned })}</strong>
            </div>
            <div className={styles.weeklyProgressTrack} role="progressbar"
              aria-label={homeT('weeklyProgressTitle')} aria-valuemin={0} aria-valuemax={planned}
              aria-valuenow={Math.min(planned, Math.max(0, completed))}>
              <span style={{ width: `${weeklyPercent}%` }} />
            </div>
          </div>}
        </div>
      </div>

      <article className={`${styles.statusTile} ${styles.recoveryOverview}`} data-domain="recovery" data-tone={presentation.recovery.tone} aria-busy={recovery.state === 'loading'}>
        <span className={styles.statusTileIcon} aria-hidden="true"><HeartPulse size={20} /></span>
        <div className={styles.statusTileCopy}>
          <span className={styles.statusTileLabel}>{t('recovery.label')}</span>
          <strong>{t(`recovery.${presentation.recovery.status}`)}</strong>
          <p>{recoveryDetail}</p>
          {recoveryCountParts.length > 0 && <div className={styles.statusTileFacts}>{recoveryCountParts.join(' · ')}</div>}
        </div>
        <div className={styles.recoveryBodies}>
          <BodyMap side="front" zones={recoveryZones} />
          <BodyMap side="back" zones={recoveryZones} />
        </div>
        <div className={styles.statusTileActions}>
          <button type="button" className={styles.statusTileLink} onClick={onOpenRecovery}>
            {t('actions.open_recovery')} <ArrowUpRight size={15} aria-hidden="true" />
          </button>
        </div>
      </article>
    </div>
  </section>
}
