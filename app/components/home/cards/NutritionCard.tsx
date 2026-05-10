'use client'

import { UtensilsCrossed } from 'lucide-react'
import { colors, fonts } from '../../../../lib/design-tokens'

const GOLD = colors.gold
const FONT_DISPLAY = fonts.headline
const FONT_ALT = fonts.alt
const FONT_BODY = fonts.body
const TEXT_DIM = colors.textDim

const cardStyle: React.CSSProperties = {
  background: colors.surface2,
  border: `1px solid ${colors.divider}`,
  borderRadius: 16,
  padding: 12,
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
}

interface NutritionCardProps {
  consumedKcal: number
  calorieGoal: number
  proteinGoal?: number
  carbsGoal?: number
  fatGoal?: number
}

export default function NutritionCard({
  consumedKcal, calorieGoal, proteinGoal, carbsGoal, fatGoal,
}: NutritionCardProps) {
  const macros = [
    { label: 'PROTEINES', value: proteinGoal, color: '#4ade80' },
    { label: 'GLUCIDES', value: carbsGoal, color: '#e6c364' },
    { label: 'LIPIDES', value: fatGoal, color: '#fb923c' },
  ]

  return (
    <div style={cardStyle}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <UtensilsCrossed size={12} color={GOLD} />
        <span style={{ fontFamily: FONT_ALT, fontSize: 9, fontWeight: 700, letterSpacing: '0.18em', color: GOLD, textTransform: 'uppercase' }}>
          Nutrition
        </span>
      </div>

      {/* Big kcal */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <div style={{ fontFamily: FONT_DISPLAY, fontSize: 26, fontWeight: 400, color: '#ffffff', lineHeight: 1 }}>
          {consumedKcal}
        </div>
        <div style={{ fontFamily: FONT_ALT, fontSize: 9, fontWeight: 700, letterSpacing: '0.18em', color: TEXT_DIM, marginTop: 2 }}>
          KCAL
        </div>
      </div>

      {/* Macro bars */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {macros.map(({ label, value, color }) => (
          <div key={label}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
              <span style={{ fontFamily: FONT_ALT, fontSize: 8, fontWeight: 700, letterSpacing: '0.15em', color: TEXT_DIM }}>
                {label}
              </span>
              <span style={{ fontFamily: FONT_BODY, fontSize: 10, fontWeight: 600, color: value ? color : TEXT_DIM }}>
                {value ? `${value}g` : '—'}
              </span>
            </div>
            <div style={{ width: '100%', height: 3, borderRadius: 2, background: `${color}18`, overflow: 'hidden' }}>
              <div style={{ width: value ? '100%' : '0%', height: '100%', borderRadius: 2, background: color, opacity: value ? 1 : 0.2 }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
