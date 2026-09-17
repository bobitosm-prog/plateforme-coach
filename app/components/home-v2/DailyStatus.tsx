'use client'

import { Activity, Apple, ChevronRight, Dumbbell, HeartPulse } from 'lucide-react'
import { useMemo, useState, type ReactNode } from 'react'
import { useLocale, useTranslations } from 'next-intl'

import {
  deriveDailyStatusPresentation,
  type DailyStatusDomain,
  type DailyStatusTone,
  type DailyTrainingAction,
} from '../../../lib/home/daily-status-presentation'
import type { HomeTrainingSession, HomeViewModel } from '../../../lib/home/home-dashboard-model'
import NutritionQuickCard from '../nutrition-v2/NutritionQuickCard'
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

interface SignalRowProps {
  id: DailyStatusDomain
  icon: ReactNode
  label: string
  status: string
  detail: string
  tone: DailyStatusTone
  selected: boolean
  busy: boolean
  onSelect: (domain: DailyStatusDomain) => void
}

function SignalRow({ id, icon, label, status, detail, tone, selected, busy, onSelect }: SignalRowProps) {
  return <button
    type="button"
    className={styles.statusSignal}
    data-domain={id}
    data-tone={tone}
    data-active={selected}
    aria-expanded={selected}
    aria-controls="daily-status-panel"
    aria-busy={busy}
    onClick={() => onSelect(id)}
  >
    <span className={styles.statusSignalIcon}>{icon}</span>
    <span className={styles.statusSignalMain}>
      <span className={styles.statusSignalLabel}><i aria-hidden="true" />{label}</span>
      <strong>{status}</strong>
      <small>{detail}</small>
    </span>
    <ChevronRight className={styles.statusChevron} size={19} aria-hidden="true" />
  </button>
}

function SummaryMarker({ label, tone }: { label: string; tone: DailyStatusTone }) {
  return <span className={styles.statusSummaryMarker} data-tone={tone} title={label} aria-hidden="true" />
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
  const recoveryT = useTranslations('home.v2.recoveryModal.muscles')
  const locale = useLocale()
  const presentation = useMemo(
    () => deriveDailyStatusPresentation({ training, nutrition, recovery }),
    [nutrition, recovery, training],
  )
  const [userSelectedDomain, setUserSelectedDomain] = useState<DailyStatusDomain | null>(null)
  const selectedDomain = userSelectedDomain ?? presentation.initialDomain

  const calorieNumber = createHomeNutritionNumberFormatter(locale, 0)
  const macroNumber = createHomeNutritionNumberFormatter(locale, 1)
  const priorityZoneNames = presentation.recovery.priorityZones.map(zone => recoveryT(zone))
  const macros = [
    ['protein', nutrition.macrosConsumed.protein, nutrition.macrosTarget.protein],
    ['carbs', nutrition.macrosConsumed.carbs, nutrition.macrosTarget.carbs],
    ['fat', nutrition.macrosConsumed.fat, nutrition.macrosTarget.fat],
  ] as const
  const availableMacros = macros.flatMap(([key, consumed, target]) => (
    consumed != null && target != null ? [[key, consumed, target] as const] : []
  ))

  const exerciseCountLabel = presentation.training.exerciseCount != null && presentation.training.exerciseCount > 0
    ? t('training.exerciseCount', { count: presentation.training.exerciseCount })
    : null
  const trainingFacts = [
    training.session?.title || null,
    exerciseCountLabel,
    presentation.training.weeklyPlanned > 0
      ? t('training.weekly', {
          completed: presentation.training.weeklyCompleted,
          planned: presentation.training.weeklyPlanned,
        })
      : null,
  ].filter((fact): fact is string => Boolean(fact))
  const trainingDetail = [training.session?.title || null, exerciseCountLabel]
    .filter((fact): fact is string => Boolean(fact))
    .join(' · ') || t(`training.detail.${presentation.training.status}`)
  const nutritionDetail = nutrition.caloriesConsumed != null && nutrition.caloriesTarget != null
    ? t('nutrition.calories', {
        consumed: calorieNumber.format(nutrition.caloriesConsumed),
        target: calorieNumber.format(nutrition.caloriesTarget),
      })
    : t(`nutrition.detail.${presentation.nutrition.status}`)
  const recoveryDetail = priorityZoneNames.length > 0
    ? priorityZoneNames.join(' · ')
    : t(`recovery.detail.${presentation.recovery.status}`)
  const recoveryCountParts = (['leave_alone', 'recovering', 'probably_ready'] as const).flatMap(status => {
    const count = presentation.recovery.counts[status]
    return count > 0 ? [t(`recovery.counts.${status}`, { count })] : []
  })

  const trainingActionHandlers: Record<Exclude<DailyTrainingAction, null>, (() => void) | undefined> = {
    start_session: training.session && onStartSession ? () => onStartSession(training.session!) : undefined,
    open_session: training.session && onOpenSession ? () => onOpenSession(training.session!) : undefined,
    open_program: onOpenProgram,
    start_free_session: onStartFreeSession,
  }
  const trainingAction = presentation.training.action
  const panelAction = selectedDomain === 'training'
    ? trainingAction ? trainingActionHandlers[trainingAction] : undefined
    : selectedDomain === 'nutrition'
      ? onOpenNutrition
      : onOpenRecovery
  const actionKey = selectedDomain === 'training'
    ? trainingAction
    : selectedDomain === 'nutrition'
      ? 'open_nutrition'
      : 'open_recovery'

  return <section className={styles.statusSection} aria-labelledby="daily-status-title">
    <h2 id="daily-status-title" className={styles.sectionTitle}>{t('title')}</h2>
    <div className={styles.statusCockpit}>
      <header className={styles.statusSummary}>
        <div className={styles.statusSummaryRing} aria-hidden="true"><Activity size={22} /></div>
        <div className={styles.statusSummaryCopy}>
          <p>{t('summary.eyebrow')}</p>
          <strong>{t(`summary.${presentation.summary}.title`)}</strong>
          <small>{t(`summary.${presentation.summary}.copy`)}</small>
        </div>
        <div className={styles.statusSummaryMarkers} aria-label={t('summary.indicators')}>
          <SummaryMarker label={t('training.label')} tone={presentation.training.tone} />
          <SummaryMarker label={t('nutrition.label')} tone={presentation.nutrition.tone} />
          <SummaryMarker label={t('recovery.label')} tone={presentation.recovery.tone} />
        </div>
      </header>

      <div className={styles.statusSignals} aria-label={t('detailsLabel')}>
        <SignalRow
          id="training"
          icon={<Dumbbell size={19} aria-hidden="true" />}
          label={t('training.label')}
          status={t(`training.${presentation.training.status}`)}
          detail={trainingDetail}
          tone={presentation.training.tone}
          selected={selectedDomain === 'training'}
          busy={training.state === 'loading'}
          onSelect={setUserSelectedDomain}
        />
        <SignalRow
          id="nutrition"
          icon={<Apple size={19} aria-hidden="true" />}
          label={t('nutrition.label')}
          status={t(`nutrition.${presentation.nutrition.status}`)}
          detail={nutritionDetail}
          tone={presentation.nutrition.tone}
          selected={selectedDomain === 'nutrition'}
          busy={nutrition.state === 'loading'}
          onSelect={setUserSelectedDomain}
        />
        <SignalRow
          id="recovery"
          icon={<HeartPulse size={19} aria-hidden="true" />}
          label={t('recovery.label')}
          status={t(`recovery.${presentation.recovery.status}`)}
          detail={recoveryDetail}
          tone={presentation.recovery.tone}
          selected={selectedDomain === 'recovery'}
          busy={recovery.state === 'loading'}
          onSelect={setUserSelectedDomain}
        />
      </div>

      <div
        id="daily-status-panel"
        className={styles.statusPanel}
        data-domain={selectedDomain}
        data-tone={presentation[selectedDomain].tone}
        role={presentation[selectedDomain].status === 'error' ? 'status' : 'region'}
        aria-live="polite"
        aria-labelledby={`daily-status-${selectedDomain}-panel-title`}
      >
        <div className={styles.statusPanelTop}>
          <div>
            <h3 id={`daily-status-${selectedDomain}-panel-title`}>
              {t(`${selectedDomain}.panel.${presentation[selectedDomain].status}.title`)}
            </h3>
            <p>{t(`${selectedDomain}.panel.${presentation[selectedDomain].status}.copy`)}</p>
          </div>
          {panelAction && actionKey && <button type="button" className={styles.statusAction} onClick={panelAction}>
            {t(`actions.${actionKey}`)}
          </button>}
        </div>

        {selectedDomain === 'training' && trainingFacts.length > 0 && <p className={styles.statusFact}>
          {trainingFacts.join(' · ')}
        </p>}
        {selectedDomain === 'nutrition' && <div className={styles.statusNutritionQuick}>
          <NutritionQuickCard
            compact
            state={nutrition.state}
            consumed={{
              calories: nutrition.caloriesConsumed,
              protein: nutrition.macrosConsumed.protein,
              carbs: nutrition.macrosConsumed.carbs,
              fat: nutrition.macrosConsumed.fat,
            }}
            targets={{
              calories: nutrition.caloriesTarget,
              protein: nutrition.macrosTarget.protein,
              carbs: nutrition.macrosTarget.carbs,
              fat: nutrition.macrosTarget.fat,
            }}
            onPhoto={onNutritionPhoto}
            onBarcode={onNutritionBarcode}
          />
          {availableMacros.length > 0 && <div className={styles.statusNutritionConsumed}>
            {availableMacros.map(([key, consumed, target]) => <span key={key}>
              {t(`nutrition.${key}`)} {macroNumber.format(consumed)} / {macroNumber.format(target)} g
            </span>)}
          </div>}
        </div>}
        {selectedDomain === 'recovery' && recoveryCountParts.length > 0 && <p className={styles.statusFact}>
          {recoveryCountParts.join(' · ')}
        </p>}
      </div>
    </div>
  </section>
}
