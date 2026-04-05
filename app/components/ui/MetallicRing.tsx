'use client'
import { GOLD, GOLD_DIM, TEXT_MUTED, FONT_DISPLAY, FONT_ALT } from '../../../lib/design-tokens'

interface MetallicRingProps {
  progress: number
  value: string
  label: string
  size?: number
}

export default function MetallicRing({ progress, value, label, size = 200 }: MetallicRingProps) {
  const radius = 80
  const circumference = 2 * Math.PI * radius
  const offset = circumference * (1 - Math.min(1, Math.max(0, progress)))

  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <div style={{
        position: 'absolute', inset: -20, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(212,168,67,0.08) 0%, transparent 70%)',
        animation: 'goldPulse 4s ease-in-out infinite',
      }} />
      <svg viewBox="0 0 200 200" width={size} height={size}
        style={{ filter: 'drop-shadow(0 0 20px rgba(212,168,67,0.15))' }}>
        <defs>
          <linearGradient id="metallicGold" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#E8C97A" />
            <stop offset="40%" stopColor="#D4A843" />
            <stop offset="70%" stopColor="#D4A843" />
            <stop offset="100%" stopColor="#8B6914" />
          </linearGradient>
          <filter id="ringGlow">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>
        <circle cx="100" cy="100" r={radius} fill="none" stroke={GOLD_DIM} strokeWidth="10" />
        <circle cx="100" cy="100" r={radius} fill="none"
          stroke="url(#metallicGold)" strokeWidth="10"
          strokeLinecap="round" filter="url(#ringGlow)"
          strokeDasharray={circumference} strokeDashoffset={offset}
          transform="rotate(-90 100 100)"
          style={{ transition: 'stroke-dashoffset 1.5s cubic-bezier(0.4, 0, 0.2, 1)' }} />
        <text x="100" y="88" textAnchor="middle" fill={GOLD}
          fontSize="42" fontFamily={FONT_DISPLAY} letterSpacing="2">{value}</text>
        <text x="100" y="112" textAnchor="middle" fill={TEXT_MUTED}
          fontSize="11" fontFamily={FONT_ALT} fontWeight="700" letterSpacing="3">{label}</text>
      </svg>
    </div>
  )
}
