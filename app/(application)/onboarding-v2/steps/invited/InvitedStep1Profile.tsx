'use client'
import { useTranslations } from 'next-intl'
import { colors, fonts, inputStyle, cardStyle, radii } from '@/lib/design-tokens'

interface InvitedStep1ProfileProps {
  firstName: string
  setFirstName: (v: string) => void
  birthDate: string
  setBirthDate: (v: string) => void
  gender: 'male' | 'female' | ''
  setGender: (v: 'male' | 'female') => void
}

export default function InvitedStep1Profile({
  firstName,
  setFirstName,
  birthDate,
  setBirthDate,
  gender,
  setGender,
}: InvitedStep1ProfileProps) {
  const t = useTranslations('onboarding_v2')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* First name */}
      <div>
        <label htmlFor="coach-onboarding-first-name"
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
          {t('profile.firstNameLabel')}
        </label>
        <input
          id="coach-onboarding-first-name"
          type="text"
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
          placeholder={t('profile.firstNamePlaceholder')}
          style={{ ...inputStyle, width: '100%' }}
        />
      </div>

      {/* Birth date */}
      <div>
        <label htmlFor="coach-onboarding-birth-date"
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
          {t('profile.birthDateLabel')}
        </label>
        <input
          id="coach-onboarding-birth-date"
          type="date"
          value={birthDate}
          onChange={(e) => setBirthDate(e.target.value)}
          style={{
            ...inputStyle,
            width: '100%',
            colorScheme: 'dark',
          }}
        />
      </div>

      {/* Gender */}
      <div>
        <div
          style={{
            fontFamily: fonts.body,
            fontSize: 12,
            fontWeight: 600,
            color: colors.textMuted,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            marginBottom: 12,
            display: 'block',
          }}
        >
          {t('profile.genderLabel')}
        </div>
        <div role="group" aria-label={t('profile.genderLabel')} style={{ display: 'flex', gap: 12 }}>
          {(['male', 'female'] as const).map((g) => (
            <button
              type="button"
              aria-pressed={gender === g}
              key={g}
              onClick={() => setGender(g)}
              style={{
                ...cardStyle,
                flex: 1,
                padding: '14px 16px',
                textAlign: 'center',
                fontFamily: fonts.body,
                fontSize: 14,
                fontWeight: 600,
                color: gender === g ? colors.gold : colors.textMuted,
                border: gender === g
                  ? `2px solid ${colors.gold}`
                  : '1px solid rgba(255,255,255,0.06)',
                borderRadius: radii.button,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
            >
              {t(`profile.${g}`)}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
