'use client'
import { useTranslations } from 'next-intl'
import { colors, fonts, inputStyle } from '@/lib/design-tokens'

interface SoloStep3BodyProps {
  weight: string
  setWeight: (v: string) => void
  height: string
  setHeight: (v: string) => void
  goalWeight: string
  setGoalWeight: (v: string) => void
}

function NumField({
  label,
  unit,
  value,
  onChange,
  placeholder,
}: {
  label: string
  unit: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
}) {
  return (
    <div>
      <label
        style={{
          fontFamily: fonts.body,
          fontSize: 12,
          fontWeight: 600,
          color: colors.textMuted,
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          marginBottom: 8,
          display: 'block',
        }}
      >
        {label}
      </label>
      <div style={{ position: 'relative' }}>
        <input
          type="number"
          inputMode="decimal"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          style={{ ...inputStyle, width: '100%', paddingRight: 48 }}
        />
        <span
          style={{
            position: 'absolute',
            right: 16,
            top: '50%',
            transform: 'translateY(-50%)',
            fontFamily: fonts.body,
            fontSize: 13,
            color: colors.textDim,
          }}
        >
          {unit}
        </span>
      </div>
    </div>
  )
}

export default function SoloStep3Body({
  weight,
  setWeight,
  height,
  setHeight,
  goalWeight,
  setGoalWeight,
}: SoloStep3BodyProps) {
  const t = useTranslations('onboarding_v2')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <NumField
        label={t('solo.step3.weightLabel')}
        unit="kg"
        value={weight}
        onChange={setWeight}
        placeholder="75"
      />
      <NumField
        label={t('solo.step3.heightLabel')}
        unit="cm"
        value={height}
        onChange={setHeight}
        placeholder="178"
      />
      <NumField
        label={t('solo.step3.goalWeightLabel')}
        unit="kg"
        value={goalWeight}
        onChange={setGoalWeight}
        placeholder="72"
      />
    </div>
  )
}
