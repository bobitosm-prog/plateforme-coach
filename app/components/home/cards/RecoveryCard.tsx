'use client'

import { User } from 'lucide-react'
import { colors, fonts } from '../../../../lib/design-tokens'

const GOLD = colors.gold
const FONT_DISPLAY = fonts.headline
const FONT_ALT = fonts.alt
const TEXT_DIM = colors.textDim

function getRecoveryStatus(muscleStatus: Record<string, number>): { text: string; color: string } {
  const values = Object.values(muscleStatus)
  if (!values.length) return { text: 'GOOD', color: '#4ade80' }
  const avg = values.reduce((a, b) => a + b, 0) / values.length
  if (avg < 0.3) return { text: 'GOOD', color: '#4ade80' }
  if (avg < 0.6) return { text: 'WATCH', color: '#fb923c' }
  return { text: 'RECOVER', color: '#ef4444' }
}

const cardStyle: React.CSSProperties = {
  background: colors.surface2,
  border: `1px solid ${colors.divider}`,
  borderRadius: 16,
  padding: 12,
  display: 'flex',
  flexDirection: 'column',
  gap: 10,
  cursor: 'pointer',
}

interface RecoveryCardProps {
  muscleStatus: Record<string, number>
  onCardClick: () => void
}

export default function RecoveryCard({ muscleStatus, onCardClick }: RecoveryCardProps) {
  const status = getRecoveryStatus(muscleStatus)

  return (
    <div style={cardStyle} onClick={onCardClick}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <User size={12} color={GOLD} />
        <span style={{ fontFamily: FONT_ALT, fontSize: 9, fontWeight: 700, letterSpacing: '0.18em', color: GOLD, textTransform: 'uppercase' }}>
          Recup.
        </span>
      </div>

      {/* Body image */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
        <img
          src="/images/recovery/body-front.webp"
          alt="Silhouette recuperation"
          style={{
            maxHeight: '100%',
            maxWidth: '90%',
            objectFit: 'contain',
            filter: 'drop-shadow(0 0 12px rgba(230,195,100,0.15))',
          }}
        />
      </div>

      {/* Status */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontFamily: FONT_ALT, fontSize: 8, fontWeight: 700, letterSpacing: '0.18em', color: TEXT_DIM, textTransform: 'uppercase' }}>
          Etat
        </span>
        <span style={{ fontFamily: FONT_DISPLAY, fontSize: 12, fontWeight: 400, color: status.color, letterSpacing: '0.05em' }}>
          {status.text}
        </span>
      </div>
    </div>
  )
}
