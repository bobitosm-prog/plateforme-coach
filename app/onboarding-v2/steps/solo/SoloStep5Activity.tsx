'use client'
import { ACTIVITY_OPTS } from '@/lib/onboarding-options'
import OptionStep from './shared/OptionStep'

interface SoloStep5ActivityProps {
  selected: number | null
  onSelect: (index: number) => void
}

export default function SoloStep5Activity({ selected, onSelect }: SoloStep5ActivityProps) {
  return (
    <OptionStep
      options={ACTIVITY_OPTS}
      selectedIndex={selected}
      onSelect={onSelect}
      labelKey="solo.step5.options"
    />
  )
}
