'use client'

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
}

export default function ProgressionV2({
  model,
  onPeriodChange,
  onAddWeight,
  onAddBodyMeasurement,
}: ProgressionV2Props) {
  return <section className={styles.shell} data-progression-v2>
    <ProgressionHero
      model={model}
      onPeriodChange={onPeriodChange}
      onAddMeasurement={onAddWeight}
    />
    <KeyTrends model={model} />
    <div className={styles.performanceGrid}>
      <PersonalRecordsV2 records={model.records} />
      <ExerciseProgression exerciseProgress={model.exerciseProgress} />
    </div>
    <WeeklyVolumeTrend volume={model.volume} />
    <WeightHistory weight={model.weight} onAddWeight={onAddWeight} />
    <BodyMeasurements measurements={model.measurements} onAddMeasurement={onAddBodyMeasurement} />
  </section>
}
