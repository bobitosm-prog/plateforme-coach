'use client'
import { EXPERIENCE_OPTS } from '@/lib/onboarding-options'
import OptionStep from './shared/OptionStep'

interface SoloStep8ExperienceProps {
  selected: number | null
  onSelect: (index: number) => void
}

export default function SoloStep8Experience({ selected, onSelect }: SoloStep8ExperienceProps) {
  return (
    <OptionStep
      options={EXPERIENCE_OPTS}
      selectedIndex={selected}
      onSelect={onSelect}
      labelKey="solo.step8.options"
    />
  )
}
