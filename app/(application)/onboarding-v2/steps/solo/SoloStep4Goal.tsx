'use client'
import { GOALS } from '@/lib/onboarding-options'
import OptionStep from './shared/OptionStep'

interface SoloStep4GoalProps {
  selected: number | null
  onSelect: (index: number) => void
}

export default function SoloStep4Goal({ selected, onSelect }: SoloStep4GoalProps) {
  return (
    <OptionStep
      options={GOALS}
      selectedIndex={selected}
      onSelect={onSelect}
      labelKey="solo.step4.options"
    />
  )
}
