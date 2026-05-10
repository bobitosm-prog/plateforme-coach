'use client'

import { Zap } from 'lucide-react'
import { colors, fonts } from '../../../../lib/design-tokens'

const GOLD = colors.gold
const FONT_DISPLAY = fonts.headline
const FONT_ALT = fonts.alt
const FONT_BODY = fonts.body

function getEnergyLabel(pct: number): { text: string; color: string } {
  if (pct >= 70) return { text: 'Bonne', color: '#4ade80' }
  if (pct >= 40) return { text: 'Moyenne', color: '#e6c364' }
  return { text: 'Faible', color: '#fb923c' }
}

const cardStyle: React.CSSProperties = {
  background: colors.surface2,
  border: `1px solid ${colors.divider}`,
  borderRadius: 16,
  padding: 12,
  display: 'flex',
  flexDirection: 'column',
  gap: 10,
}

interface EnergyCardProps {
  consumedKcal: number
  calorieGoal: number
  weekData: Array<{ day: string; calories: number }>
}

export default function EnergyCard({ consumedKcal, calorieGoal, weekData }: EnergyCardProps) {
  const calPct = calorieGoal > 0 ? Math.min(100, Math.round((consumedKcal / calorieGoal) * 100)) : 0
  const label = getEnergyLabel(calPct)
  const r = 32
  const circ = 2 * Math.PI * r

  // Sparkline points
  const hasData = weekData.some(d => d.calories > 0)
  const maxCal = Math.max(1, ...weekData.map(d => d.calories))
  const sparkPoints = weekData.map((d, i) => {
    const x = weekData.length > 1 ? (i / (weekData.length - 1)) * 100 : 50
    const y = 38 - (d.calories / maxCal) * 34
    return `${x},${y}`
  }).join(' ')

  return (
    <div style={cardStyle}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <Zap size={12} color={GOLD} />
        <span style={{ fontFamily: FONT_ALT, fontSize: 9, fontWeight: 700, letterSpacing: '0.18em', color: GOLD, textTransform: 'uppercase' }}>
          Energie
        </span>
      </div>

      {/* Ring */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ position: 'relative', width: 80, height: 80 }}>
          <svg viewBox="0 0 80 80" width={80} height={80} style={{ transform: 'rotate(-90deg)' }}>
            <defs>
              <linearGradient id="energyGold" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#e6c364" />
                <stop offset="100%" stopColor="#c9a84c" />
              </linearGradient>
            </defs>
            <circle cx="40" cy="40" r={r} fill="none" stroke="#2a2a2a" strokeWidth="6" />
            <circle cx="40" cy="40" r={r} fill="none" stroke="url(#energyGold)" strokeWidth="6"
              strokeLinecap="round" strokeDasharray={circ}
              strokeDashoffset={circ * (1 - calPct / 100)}
              style={{ transition: 'stroke-dashoffset 1.5s ease' }}
            />
          </svg>
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontFamily: FONT_DISPLAY, fontSize: 18, fontWeight: 400, color: GOLD, lineHeight: 1 }}>{calPct}%</span>
            <span style={{ fontFamily: FONT_BODY, fontSize: 9, color: label.color, marginTop: 2 }}>{label.text}</span>
          </div>
        </div>
      </div>

      {/* Sparkline */}
      {hasData && (
        <svg viewBox="0 0 100 40" width="100%" height={40} preserveAspectRatio="none">
          <polyline
            points={sparkPoints}
            fill="none"
            stroke={GOLD}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}
    </div>
  )
}
