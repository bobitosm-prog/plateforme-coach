'use client'

import type { ReactNode } from 'react'
import { useTranslations } from 'next-intl'

import type {
  ProgressionPeriod,
  ProgressionViewModel,
} from '../../../lib/progression/progression-dashboard-model'
import KeyTrends from './KeyTrends'
import BodyMeasurements from './BodyMeasurements'
import ExerciseProgression from './ExerciseProgression'
import PersonalRecordsV2 from './PersonalRecordsV2'
import ProgressionHero from './ProgressionHero'
import WeeklyVolumeTrend from './WeeklyVolumeTrend'
import WeightHistory from './WeightHistory'
import styles from './ProgressionV2.module.css'

export interface ProgressionV2Props {
  model: ProgressionViewModel
  onPeriodChange: (period: ProgressionPeriod) => void
  onAddWeight: () => void
  onAddBodyMeasurement: () => void
  activeSection: ProgressionSection
  onSectionNavigate: (section: ProgressionSection) => void
  children: ReactNode
}

export type ProgressionSection = 'weight' | 'performance' | 'body' | 'history'

export default function ProgressionV2({
  model,
  onPeriodChange,
  onAddWeight,
  onAddBodyMeasurement,
  activeSection,
  onSectionNavigate,
  children,
}: ProgressionV2Props) {
  const t = useTranslations('progress.v2')

  return <section className={styles.shell} data-progression-v2>
    <ProgressionHero
      model={model}
      onPeriodChange={onPeriodChange}
      onAddMeasurement={onAddWeight}
    />
    <KeyTrends model={model} />
    <nav className={styles.sectionNav} aria-label={t('history.navigationLabel')}>
      {(['weight', 'performance', 'body', 'history'] as const).map(section => <button
        type="button"
        key={section}
        className={styles.sectionNavButton}
        aria-pressed={activeSection === section}
        onClick={() => onSectionNavigate(section)}
      >{t(`history.navigation.${section}`)}</button>)}
    </nav>
    <WeightHistory weight={model.weight} onAddWeight={onAddWeight} />
    <div className={styles.performanceGrid}>
      <PersonalRecordsV2 records={model.records} />
      <ExerciseProgression exerciseProgress={model.exerciseProgress} />
    </div>
    <WeeklyVolumeTrend volume={model.volume} />
    <BodyMeasurements measurements={model.measurements} onAddMeasurement={onAddBodyMeasurement} />
    {children}
  </section>
}
