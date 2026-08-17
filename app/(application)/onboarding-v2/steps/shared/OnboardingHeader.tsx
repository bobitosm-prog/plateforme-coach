'use client'
import { colors, fonts } from '@/lib/design-tokens'

interface OnboardingHeaderProps {
  currentStep: number
  totalSteps: number
}

export default function OnboardingHeader({ currentStep, totalSteps }: OnboardingHeaderProps) {
  return (
    <div style={{ padding: '16px 20px 0' }}>
      {/* Progress bar */}
      <div style={{ display: 'flex', gap: 6 }}>
        {Array.from({ length: totalSteps }, (_, i) => (
          <div
            key={i}
            style={{
              flex: 1,
              height: 3,
              borderRadius: 2,
              background: i < currentStep ? colors.gold : 'rgba(255,255,255,0.08)',
              transition: 'background 0.3s ease',
            }}
          />
        ))}
      </div>

      {/* Step indicator */}
      <p
        style={{
          fontFamily: fonts.body,
          fontSize: 12,
          color: colors.textDim,
          textAlign: 'right',
          marginTop: 8,
        }}
      >
        {currentStep}/{totalSteps}
      </p>
    </div>
  )
}
