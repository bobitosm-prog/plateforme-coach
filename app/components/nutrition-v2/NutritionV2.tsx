'use client'

import type { ReactNode } from 'react'

import type { NutritionViewModel } from '../../../lib/nutrition/nutrition-dashboard-model'
import NutritionHero from './NutritionHero'
import NutritionQuickCard from './NutritionQuickCard'
import styles from './NutritionV2.module.css'

interface NutritionV2Props {
  model: NutritionViewModel
  selectedDate: string
  onAddMeal: () => void
  onRetry: () => void
  onPhoto?: () => void
  onBarcode?: () => void
  children: ReactNode
}

export default function NutritionV2({
  model,
  selectedDate,
  onAddMeal,
  onRetry,
  onPhoto,
  onBarcode,
  children,
}: NutritionV2Props) {
  return <section className={styles.shell} data-nutrition-v2>
    <NutritionHero
      model={model}
      selectedDate={selectedDate}
      onAddMeal={onAddMeal}
      onRetry={onRetry}
    />
    <NutritionQuickCard
      state={model.summary.state}
      consumed={{
        calories: model.consumed.data?.calories ?? null,
        protein: model.consumed.data?.protein ?? null,
        carbs: model.consumed.data?.carbs ?? null,
        fat: model.consumed.data?.fat ?? null,
      }}
      targets={{
        calories: model.targets.data?.calories ?? null,
        protein: model.targets.data?.protein ?? null,
        carbs: model.targets.data?.carbs ?? null,
        fat: model.targets.data?.fat ?? null,
      }}
    />
    <div className={styles.legacyContent} data-nutrition-legacy-content>
      {children}
    </div>
  </section>
}
