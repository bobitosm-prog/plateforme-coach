'use client'

import type {
  ProgressionPeriod,
  ProgressionViewModel,
} from '../../../lib/progression/progression-dashboard-model'
import KeyTrends from './KeyTrends'
import ProgressionHero from './ProgressionHero'
import styles from './ProgressionV2.module.css'

export interface ProgressionV2Props {
  model: ProgressionViewModel
  onPeriodChange: (period: ProgressionPeriod) => void
  onAddMeasurement: () => void
}

export default function ProgressionV2({
  model,
  onPeriodChange,
  onAddMeasurement,
}: ProgressionV2Props) {
  return <section className={styles.shell} data-progression-v2>
    <ProgressionHero
      model={model}
      onPeriodChange={onPeriodChange}
      onAddMeasurement={onAddMeasurement}
    />
    <KeyTrends model={model} />
  </section>
}
