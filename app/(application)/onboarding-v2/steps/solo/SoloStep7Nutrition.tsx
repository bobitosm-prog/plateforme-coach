'use client'
import { NUTRITION_OPTS } from '@/lib/onboarding-options'
import OptionStep from './shared/OptionStep'

interface SoloStep7NutritionProps {
  selected: number | null
  onSelect: (index: number) => void
}

export default function SoloStep7Nutrition({ selected, onSelect }: SoloStep7NutritionProps) {
  return (
    <OptionStep
      options={NUTRITION_OPTS}
      selectedIndex={selected}
      onSelect={onSelect}
      labelKey="solo.step7.options"
    />
  )
}
