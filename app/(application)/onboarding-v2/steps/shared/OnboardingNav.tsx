'use client'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { colors, btnPrimary, btnSecondary } from '@/lib/design-tokens'

interface OnboardingNavProps {
  onBack?: () => void
  onNext: () => void
  nextLabel?: string
  nextDisabled?: boolean
  loading?: boolean
  showBack?: boolean
}

export default function OnboardingNav({
  onBack,
  onNext,
  nextLabel,
  nextDisabled = false,
  loading = false,
  showBack = true,
}: OnboardingNavProps) {
  const t = useTranslations('onboarding_v2')

  return (
    <div
      style={{
        display: 'flex',
        gap: 12,
        padding: '16px 20px 32px',
      }}
    >
      {showBack && onBack && (
        <button
          onClick={onBack}
          style={{
            ...btnSecondary,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '14px 16px',
          }}
        >
          <ChevronLeft size={20} color={colors.gold} />
        </button>
      )}

      <button
        onClick={onNext}
        disabled={nextDisabled || loading}
        style={{
          ...btnPrimary,
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          padding: '14px 24px',
          opacity: nextDisabled || loading ? 0.5 : 1,
        }}
      >
        {loading ? t('nav.saving') : nextLabel || t('nav.continue')}
        {!loading && <ChevronRight size={18} />}
      </button>
    </div>
  )
}
