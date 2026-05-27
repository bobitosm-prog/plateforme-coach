'use client'
import { CheckCircle2 } from 'lucide-react'
import { colors, fonts, cardStyle, radii } from '@/lib/design-tokens'
import { ICON_MAP } from './iconMap'

interface OptionCardProps {
  iconName: string
  label: string
  selected: boolean
  onClick: () => void
}

export default function OptionCard({ iconName, label, selected, onClick }: OptionCardProps) {
  const IconComp = ICON_MAP[iconName]

  return (
    <button
      onClick={onClick}
      style={{
        ...cardStyle,
        padding: 16,
        display: 'flex',
        alignItems: 'center',
        textAlign: 'left',
        width: '100%',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        border: selected
          ? `1px solid ${colors.gold}66`
          : `1px solid ${colors.goldBorder}`,
        background: selected ? `${colors.gold}14` : colors.surface,
      }}
    >
      {/* Icon circle */}
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: 10,
          background: `${colors.gold}14`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginRight: 12,
          flexShrink: 0,
        }}
      >
        {IconComp && <IconComp size={20} color={colors.gold} />}
      </div>

      {/* Label */}
      <span
        style={{
          fontFamily: fonts.body,
          fontSize: 14,
          fontWeight: 600,
          color: colors.text,
          flexGrow: 1,
        }}
      >
        {label}
      </span>

      {/* Check indicator */}
      {selected && (
        <div
          style={{
            width: 24,
            height: 24,
            borderRadius: 12,
            background: colors.gold,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <CheckCircle2 size={16} color={colors.background} />
        </div>
      )}
    </button>
  )
}
