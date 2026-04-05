'use client'
import { BG_BASE, FONT_DISPLAY, TEXT_DIM, TEXT_MUTED } from '../../../lib/design-tokens'

interface GoldButtonProps {
  label: string
  onClick?: () => void
  disabled?: boolean
  fullWidth?: boolean
}

export default function GoldButton({ label, onClick, disabled = false, fullWidth = true }: GoldButtonProps) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      width: fullWidth ? '100%' : 'auto',
      padding: '16px 24px',
      background: disabled ? TEXT_DIM : 'linear-gradient(135deg, #E8C97A 0%, #D4A843 40%, #C9A84C 70%, #8B6914 100%)',
      color: disabled ? TEXT_MUTED : BG_BASE,
      fontFamily: FONT_DISPLAY,
      fontSize: 18, letterSpacing: 3,
      border: 'none', borderRadius: 12,
      cursor: disabled ? 'not-allowed' : 'pointer',
      boxShadow: disabled ? 'none' : '0 4px 24px rgba(212,168,67,0.25)',
      position: 'relative', overflow: 'hidden',
      transition: 'all 0.3s ease',
      opacity: disabled ? 0.5 : 1,
    }}>
      {!disabled && <div style={{
        position: 'absolute', top: 0, left: '-100%',
        width: '60%', height: '100%',
        background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.25), transparent)',
        animation: 'shimmer 3s ease-in-out infinite',
      }} />}
      <span style={{ position: 'relative', zIndex: 1 }}>{label}</span>
    </button>
  )
}
