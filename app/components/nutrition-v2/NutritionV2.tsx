'use client'

import type { ReactNode } from 'react'

import type { NutritionViewModel } from '../../../lib/nutrition/nutrition-dashboard-model'
import NutritionHero from './NutritionHero'
import DailyEnergyCard from './DailyEnergyCard'
import NutritionQuickCard from './NutritionQuickCard'
import styles from './NutritionV2.module.css'

interface NutritionV2Props {
  userId?: string
  model: NutritionViewModel
  selectedDate: string
  onAddMeal: () => void
  onRetry: () => void
  onPhoto?: () => void
  onBarcode?: () => void
  onDateChange?: (date: string) => void
  compactToday?: boolean
  children: ReactNode
}

export default function NutritionV2({
  userId,
  model,
  selectedDate,
  onAddMeal,
  onRetry,
  onPhoto,
  onBarcode,
  compactToday = false,
  onDateChange,
  children,
}: NutritionV2Props) {
  return <section className={`${styles.shell} ${styles.athleteLayout}`} data-nutrition-v2>
    <NutritionHero
      model={model}
      selectedDate={selectedDate}
      compact={compactToday}
      onDateChange={onDateChange}
      onAddMeal={onAddMeal}
      onRetry={onRetry}
    />
    {userId && <DailyEnergyCard key={`${userId}:${selectedDate}`} account={userId} date={selectedDate}
      consumed={['ready','empty'].includes(model.consumed.state) ? model.consumed.data?.calories ?? null : null} />}
    {!compactToday && <NutritionQuickCard
      key={userId}
      userId={userId}
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
    />}
    <div className={styles.legacyContent} data-nutrition-legacy-content>
      {children}
    </div>
  </section>
}
