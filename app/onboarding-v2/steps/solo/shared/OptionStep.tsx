'use client'
import { useTranslations } from 'next-intl'
import type { OnboardingOption } from '@/lib/onboarding-options'
import OptionCard from './OptionCard'

interface OptionStepProps {
  options: OnboardingOption[]
  selectedIndex: number | null
  onSelect: (index: number) => void
  labelKey: string // i18n namespace key, e.g. 'solo.step4.options'
}

export default function OptionStep({ options, selectedIndex, onSelect, labelKey }: OptionStepProps) {
  const t = useTranslations('onboarding_v2')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {options.map((opt, i) => (
        <OptionCard
          key={opt.id}
          iconName={opt.icon}
          label={t(`${labelKey}.${opt.id}`)}
          selected={selectedIndex === i}
          onClick={() => onSelect(i)}
        />
      ))}
    </div>
  )
}
