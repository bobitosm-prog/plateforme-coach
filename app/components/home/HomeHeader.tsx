'use client'

import {
  colors,
  fonts,
} from '../../../lib/design-tokens'

const TEXT_PRIMARY = colors.text
const TEXT_DIM = colors.textDim
const GOLD = colors.gold
const FONT_DISPLAY = fonts.headline
const FONT_ALT = fonts.alt

interface HomeHeaderProps {
  firstName: string
  displayAvatar?: string
  level: number
  streak: number
  onLevelClick: () => void
}

export default function HomeHeader({
  firstName, displayAvatar, level, streak, onLevelClick,
}: HomeHeaderProps) {
  return (
    <div style={{
      padding: '16px 20px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
    }}>
      {/* Left — Avatar + Name + Level */}
      <button
        onClick={onLevelClick}
        aria-label="Voir mon niveau"
        style={{
          display: 'flex', alignItems: 'center', gap: 12,
          background: 'transparent', border: 'none', padding: 0,
          cursor: 'pointer', textAlign: 'left',
          fontFamily: 'inherit',
        }}
      >
        {/* Avatar */}
        <div style={{
          width: 48, height: 48, borderRadius: '50%',
          border: `2px solid ${GOLD}`,
          overflow: 'hidden', flexShrink: 0,
          background: colors.surface,
        }}>
          {displayAvatar ? (
            <img src={displayAvatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <div style={{
              width: '100%', height: '100%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: FONT_DISPLAY, fontSize: 20, color: GOLD,
            }}>
              {firstName?.[0]?.toUpperCase() || '?'}
            </div>
          )}
        </div>

        {/* Name + Level */}
        <div>
          <div style={{
            fontFamily: FONT_DISPLAY, fontSize: 20, fontWeight: 400,
            color: TEXT_PRIMARY, letterSpacing: '0.02em', lineHeight: 1,
            textTransform: 'uppercase',
          }}>
            {firstName}
          </div>
          <div style={{
            fontFamily: FONT_ALT, fontSize: 11, fontWeight: 700,
            letterSpacing: '0.15em', color: TEXT_DIM,
            textTransform: 'uppercase', marginTop: 4,
            display: 'flex', alignItems: 'center', gap: 4,
          }}>
            NIVEAU {level} <span style={{ opacity: 0.5 }}>&rsaquo;</span>
          </div>
        </div>
      </button>

      {/* Right — Streak */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
          <span style={{
            fontFamily: FONT_ALT, fontSize: 9, fontWeight: 700,
            letterSpacing: '0.18em', color: TEXT_DIM,
          }}>
            STREAK
          </span>
          <span style={{
            fontFamily: FONT_DISPLAY, fontSize: 18,
            color: GOLD, letterSpacing: '0.02em', lineHeight: 1,
          }}>
            {streak} JOUR{streak > 1 ? 'S' : ''}
          </span>
        </div>

        {/* Hexagon flame SVG */}
        <div className={streak > 0 ? 'flame-pulse' : undefined} style={{ display: 'inline-flex' }}>
        <svg viewBox="0 0 48 48" width="44" height="44" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="hexGold" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#e6c364" />
              <stop offset="100%" stopColor="#c9a84c" />
            </linearGradient>
          </defs>
          <polygon
            points="24,4 42,14 42,34 24,44 6,34 6,14"
            fill="url(#hexGold)"
            stroke="#e6c364"
            strokeWidth="1.5"
            opacity="0.95"
          />
          <g transform="translate(12,12) scale(0.85)">
            <path
              d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"
              fill="#0e0e0e"
              stroke="#0e0e0e"
              strokeWidth="0"
            />
          </g>
        </svg>
        </div>
      </div>
    </div>
  )
}
