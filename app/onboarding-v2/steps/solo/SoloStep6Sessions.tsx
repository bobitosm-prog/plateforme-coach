'use client'
import { useTranslations } from 'next-intl'
import { colors, fonts, mutedStyle } from '@/lib/design-tokens'

interface SoloStep6SessionsProps {
  sessions: number
  setSessions: (v: number) => void
}

export default function SoloStep6Sessions({ sessions, setSessions }: SoloStep6SessionsProps) {
  const t = useTranslations('onboarding_v2')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 16 }}>
      {/* Big number */}
      <span
        style={{
          fontFamily: fonts.headline,
          fontSize: 48,
          fontWeight: 700,
          color: colors.gold,
          marginBottom: 8,
          textAlign: 'center',
        }}
      >
        {sessions}
      </span>

      {/* Unit label */}
      <span style={{ ...mutedStyle, fontSize: 12, marginBottom: 32 }}>
        {t('solo.step6.unit')}
      </span>

      {/* Slider */}
      <input
        type="range"
        min={1}
        max={6}
        value={sessions}
        onChange={(e) => setSessions(Number(e.target.value))}
        style={{
          width: '100%',
          height: 4,
          borderRadius: 999,
          appearance: 'none',
          WebkitAppearance: 'none',
          cursor: 'pointer',
          accentColor: colors.gold,
          background: `${colors.gold}1a`,
        }}
      />

      {/* Min/max labels */}
      <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', marginTop: 8 }}>
        <span style={{ ...mutedStyle, fontSize: 12 }}>1x</span>
        <span style={{ ...mutedStyle, fontSize: 12 }}>6x</span>
      </div>
    </div>
  )
}
