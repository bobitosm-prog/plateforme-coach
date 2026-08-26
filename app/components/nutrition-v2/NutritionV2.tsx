'use client'

import type { ReactNode } from 'react'

import type { NutritionViewModel } from '../../../lib/nutrition/nutrition-dashboard-model'
import NutritionHero from './NutritionHero'
import NutritionMacros from './NutritionMacros'
import styles from './NutritionV2.module.css'

interface NutritionV2Props {
  model: NutritionViewModel
  selectedDate: string
  onAddMeal: () => void
  onRetry: () => void
  children: ReactNode
}

export default function NutritionV2({
  model,
  selectedDate,
  onAddMeal,
  onRetry,
  children,
}: NutritionV2Props) {
  return <section className={styles.shell} data-nutrition-v2>
    <NutritionHero
      model={model}
      selectedDate={selectedDate}
      onAddMeal={onAddMeal}
      onRetry={onRetry}
    />
    <NutritionMacros model={model} />
    <div className={styles.legacyContent} data-nutrition-legacy-content>
      {children}
    </div>
  </section>
}
