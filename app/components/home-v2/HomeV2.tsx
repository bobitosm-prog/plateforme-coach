'use client'

import type { ReactNode } from 'react'
import type { HomeViewModel, HomeTrainingSession } from '../../../lib/home/home-dashboard-model'
import HomeV2Header from './HomeV2Header'
import DailyStatus from './DailyStatus'
import WatchReadinessCard from './WatchReadinessCard'
import ProgressionSnapshot from './ProgressionSnapshot'
import AthenaInsightCard from './AthenaInsightCard'
import ActiveCoachCard from './ActiveCoachCard'
import { type NextBestAction } from '../../../lib/home/next-best-action'
import { resolveAthenaHomeInsight } from '../../../lib/home/athena-home-insight'
import styles from './HomeV2.module.css'

export interface HomeV2Actions {
  onStartSession?: (session: HomeTrainingSession) => void
  onOpenSession?: (session: HomeTrainingSession) => void
  onOpenProgram?: () => void
  onStartFreeSession?: () => void
  onOpenNutrition?: () => void
  onNutritionPhoto?: () => void
  onNutritionBarcode?: () => void
  onNextBestAction?: (action: NextBestAction) => void
  onOpenProgression?: () => void
  onOpenRecovery?: () => void
  onOpenAthena?: () => void
  onOpenMessages?: () => void
  onOpenAccount?: () => void
  onOpenTraining?: () => void
}

export default function HomeV2({ model, actions, children }: { model: HomeViewModel; actions: HomeV2Actions; children?: ReactNode }) {
  const athenaInsight = resolveAthenaHomeInsight(model)
  return <div className={styles.shell} data-home-v2>
    <HomeV2Header
      identity={model.identity}
      today={model.today}
      weekCalendar={model.weekCalendar}
      onOpenAthena={actions.onOpenAthena}
      onOpenTraining={actions.onOpenTraining}
      onOpenProgression={actions.onOpenProgression}
      onOpenAccount={actions.onOpenAccount}
    />
    <WatchReadinessCard />
    <DailyStatus
      training={model.training}
      nutrition={model.nutrition}
      recovery={model.recovery}
      onStartSession={actions.onStartSession}
      onOpenSession={actions.onOpenSession}
      onOpenProgram={actions.onOpenProgram}
      onStartFreeSession={actions.onStartFreeSession}
      onOpenNutrition={actions.onOpenNutrition}
      onNutritionPhoto={actions.onNutritionPhoto}
      onNutritionBarcode={actions.onNutritionBarcode}
      onOpenRecovery={() => actions.onOpenRecovery?.()}
    />
    {children && <div className={styles.lowerContent}>{children}</div>}
    <ProgressionSnapshot progression={model.progression} onOpenProgression={actions.onOpenProgression} />
    <div className={styles.intelligenceGrid}>
      <AthenaInsightCard insight={athenaInsight} onOpenAthena={actions.onOpenAthena} />
      <ActiveCoachCard coach={model.coach} onOpenMessages={actions.onOpenMessages} />
    </div>
  </div>
}
