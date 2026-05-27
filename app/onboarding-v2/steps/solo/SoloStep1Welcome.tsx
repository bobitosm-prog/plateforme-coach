'use client'
import { useTranslations } from 'next-intl'
import { Dumbbell } from 'lucide-react'
import { colors, fonts, radii } from '@/lib/design-tokens'

export default function SoloStep1Welcome() {
  const t = useTranslations('onboarding_v2')

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        gap: 24,
        paddingTop: 48,
      }}
    >
      {/* Icon */}
      <div
        style={{
          width: 80,
          height: 80,
          borderRadius: '50%',
          background: `linear-gradient(135deg, ${colors.gold}, ${colors.goldContainer})`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Dumbbell size={36} color="#0D0B08" strokeWidth={2.5} />
      </div>

      {/* Title */}
      <h1
        style={{
          fontFamily: fonts.headline,
          fontSize: 32,
          fontWeight: 800,
          color: colors.text,
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          margin: 0,
        }}
      >
        {t('solo.step1.title')}
      </h1>

      {/* Subtitle */}
      <p
        style={{
          fontFamily: fonts.body,
          fontSize: 15,
          color: colors.textMuted,
          lineHeight: 1.6,
          maxWidth: 300,
          margin: 0,
        }}
      >
        {t('solo.step1.subtitle')}
      </p>

      {/* Trial badge */}
      <span
        style={{
          fontFamily: fonts.body,
          fontSize: 13,
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          color: colors.gold,
          background: colors.goldDim,
          padding: '8px 20px',
          borderRadius: radii.full,
        }}
      >
        {t('solo.step1.trialBadge')}
      </span>
    </div>
  )
}
