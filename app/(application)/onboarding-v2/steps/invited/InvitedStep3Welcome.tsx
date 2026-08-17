'use client'
import { useTranslations } from 'next-intl'
import { Check } from 'lucide-react'
import { colors, fonts } from '@/lib/design-tokens'

interface InvitedStep3WelcomeProps {
  firstName: string
  coachName: string | null
}

export default function InvitedStep3Welcome({
  firstName,
  coachName,
}: InvitedStep3WelcomeProps) {
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
        paddingTop: 40,
      }}
    >
      {/* Success icon */}
      <div
        style={{
          width: 72,
          height: 72,
          borderRadius: '50%',
          background: `linear-gradient(135deg, ${colors.gold}, ${colors.goldContainer})`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Check size={36} color="#0D0B08" strokeWidth={3} />
      </div>

      {/* Title */}
      <h2
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
        {t('welcome.title', { firstName: firstName || '...' })}
      </h2>

      {/* Subtitle */}
      <p
        style={{
          fontFamily: fonts.body,
          fontSize: 15,
          color: colors.textMuted,
          lineHeight: 1.6,
          maxWidth: 300,
        }}
      >
        {coachName
          ? t('welcome.subtitleWithCoach', { coachName })
          : t('welcome.subtitle')}
      </p>
    </div>
  )
}
