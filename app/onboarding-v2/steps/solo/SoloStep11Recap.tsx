'use client'
import { useTranslations } from 'next-intl'
import { colors, fonts, cardStyle, radii } from '@/lib/design-tokens'

interface SoloStep10RecapProps {
  tdee: number
  calorieGoal: number
  protein: number
  carbs: number
  fat: number
  goalLabel: string
}

function MacroRow({ label, value, unit }: { label: string; value: number; unit: string }) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '10px 0',
        borderBottom: `1px solid rgba(255,255,255,0.04)`,
      }}
    >
      <span style={{ fontFamily: fonts.body, fontSize: 14, color: colors.textMuted }}>
        {label}
      </span>
      <span style={{ fontFamily: fonts.headline, fontSize: 18, fontWeight: 700, color: colors.text }}>
        {value} <span style={{ fontSize: 12, color: colors.textDim }}>{unit}</span>
      </span>
    </div>
  )
}

export default function SoloStep10Recap({ tdee, calorieGoal, protein, carbs, fat }: SoloStep10RecapProps) {
  const t = useTranslations('onboarding_v2')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24 }}>
      {/* Macros card */}
      <div style={{ ...cardStyle, width: '100%', padding: 20 }}>
        <MacroRow label={t('solo.step10.tdee')} value={tdee} unit="kcal" />
        <MacroRow label={t('solo.step10.calorieGoal')} value={calorieGoal} unit="kcal" />
        <MacroRow label={t('solo.step10.protein')} value={protein} unit="g" />
        <MacroRow label={t('solo.step10.carbs')} value={carbs} unit="g" />
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingTop: 10,
          }}
        >
          <span style={{ fontFamily: fonts.body, fontSize: 14, color: colors.textMuted }}>
            {t('solo.step10.fat')}
          </span>
          <span style={{ fontFamily: fonts.headline, fontSize: 18, fontWeight: 700, color: colors.text }}>
            {fat} <span style={{ fontSize: 12, color: colors.textDim }}>g</span>
          </span>
        </div>
      </div>

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
        {t('solo.step10.trialBadge')}
      </span>
    </div>
  )
}
