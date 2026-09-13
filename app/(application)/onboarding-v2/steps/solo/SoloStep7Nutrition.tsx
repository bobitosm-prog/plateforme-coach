'use client'
import { useTranslations } from 'next-intl'
import { DIETARY_PATTERN_OPTS, NUTRITION_OPTS } from '@/lib/onboarding-options'
import { colors, fonts } from '@/lib/design-tokens'
import OptionStep from './shared/OptionStep'

interface SoloStep7NutritionProps {
  habit: number | null
  dietaryPattern: number | null
  onHabitSelect: (index: number) => void
  onDietaryPatternSelect: (index: number) => void
}

const labelStyle = {
  color: colors.textMuted,
  fontFamily: fonts.body,
  fontSize: 12,
  fontWeight: 700,
  letterSpacing: '0.08em',
  margin: 0,
  textTransform: 'uppercase' as const,
}

export default function SoloStep7Nutrition({
  habit,
  dietaryPattern,
  onHabitSelect,
  onDietaryPatternSelect,
}: SoloStep7NutritionProps) {
  const t = useTranslations('onboarding_v2')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <p style={labelStyle}>{t('redesign.nutrition.habit')}</p>
        <OptionStep
          options={NUTRITION_OPTS}
          selectedIndex={habit}
          onSelect={onHabitSelect}
          labelKey="solo.step7.options"
        />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <p style={labelStyle}>{t('redesign.nutrition.dietaryPattern')}</p>
        <OptionStep
          options={DIETARY_PATTERN_OPTS}
          selectedIndex={dietaryPattern}
          onSelect={onDietaryPatternSelect}
          labelKey="redesign.nutrition.patterns"
        />
      </div>
    </div>
  )
}
