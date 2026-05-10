'use client'

import { Calendar, Clock, CheckCircle, ArrowRight } from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import {
  colors, fonts,
} from '../../../lib/design-tokens'
import { getHeroImage } from '../../../lib/session-types'

const GOLD = colors.gold
const FONT_DISPLAY = fonts.headline
const FONT_ALT = fonts.alt
const FONT_BODY = fonts.body

export type HeroState = 'active' | 'done' | 'rest' | 'no-program' | 'no-exercises'

interface HeroSessionCardProps {
  state: HeroState
  sessionTitle: string
  todayExercises: any[]
  todaySession: { id: string; created_at: string } | null
  onStart: () => void
  onCalendar: () => void
  onViewDetail?: () => void
}

function shortenSessionTitle(title: string | null | undefined): string {
  return (title || '').split('(')[0].trim().toUpperCase()
}

function getHeroTitle(state: HeroState, sessionTitle: string): string {
  switch (state) {
    case 'active': case 'done': return shortenSessionTitle(sessionTitle) || 'SÉANCE'
    case 'rest': return 'JOUR DE REPOS'
    case 'no-program': return 'AUCUN PROGRAMME'
    case 'no-exercises': return 'AUCUN EXERCICE'
  }
}

export default function HeroSessionCard({
  state, sessionTitle, todayExercises, todaySession,
  onStart, onCalendar, onViewDetail,
}: HeroSessionCardProps) {
  const heroImage = state === 'rest' || state === 'no-program' || state === 'no-exercises'
    ? '/images/hero/hero-default.webp'
    : getHeroImage(sessionTitle)

  const duration = Math.max(20, Math.round(
    todayExercises.reduce((s: number, e: any) => s + ((e.sets || 3) * 1.5), 0)
  ))

  return (
    <div style={{
      position: 'relative', height: 260, borderRadius: 20,
      overflow: 'hidden', marginBottom: 24, marginInline: 20,
    }}>
      {/* Background image */}
      <img
        src={heroImage}
        alt=""
        style={{
          position: 'absolute', inset: 0,
          width: '100%', height: '100%', objectFit: 'cover',
          filter: state === 'done' ? 'saturate(0.4) brightness(0.5)' : 'none',
        }}
      />

      {/* Gradient overlay */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'linear-gradient(90deg, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.7) 45%, rgba(0,0,0,0.15) 100%)',
      }} />

      {/* Green tint for done state */}
      {state === 'done' && (
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(74,222,128,0.12)' }} />
      )}

      {/* Content */}
      <div style={{
        position: 'relative', padding: 24,
        display: 'flex', flexDirection: 'column',
        height: '100%', justifyContent: 'space-between',
      }}>
        {/* Top row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <span style={{
            fontFamily: FONT_ALT, fontSize: 10, fontWeight: 700,
            letterSpacing: '0.2em', color: GOLD, textTransform: 'uppercase',
          }}>
            {state === 'done' ? 'SÉANCE TERMINÉE' : 'SÉANCE DU JOUR'}
          </span>
          <button
            onClick={onCalendar}
            aria-label="Voir le programme"
            style={{
              width: 36, height: 36, borderRadius: 12,
              background: 'rgba(255,255,255,0.08)',
              backdropFilter: 'blur(8px)',
              border: '1px solid rgba(255,255,255,0.1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', flexShrink: 0,
            }}
          >
            <Calendar size={18} color={GOLD} />
          </button>
        </div>

        {/* Middle */}
        <div>
          <div style={{
            fontFamily: FONT_DISPLAY, fontSize: 44, fontWeight: 400,
            color: '#ffffff', letterSpacing: '0.01em', lineHeight: 1,
            textTransform: 'uppercase', marginBottom: 12,
            maxWidth: '70%',
          }}>
            {getHeroTitle(state, sessionTitle)}
          </div>

          {/* Subtitle */}
          {state === 'active' && (
            <div style={{
              fontFamily: FONT_ALT, fontSize: 11, fontWeight: 700,
              letterSpacing: '0.15em', color: 'rgba(255,255,255,0.85)',
              textTransform: 'uppercase',
              display: 'flex', alignItems: 'center', gap: 6,
            }}>
              <Clock size={14} />
              {todayExercises.length} EXOS &bull; ~{duration} MIN
            </div>
          )}
          {state === 'done' && todaySession && (
            <div style={{
              fontFamily: FONT_ALT, fontSize: 11, fontWeight: 700,
              letterSpacing: '0.15em', color: 'rgba(255,255,255,0.85)',
              textTransform: 'uppercase',
              display: 'flex', alignItems: 'center', gap: 6,
            }}>
              <CheckCircle size={14} color={colors.success} />
              TERMINEE &bull; {format(new Date(todaySession.created_at), 'HH:mm', { locale: fr })}
            </div>
          )}
          {state === 'rest' && (
            <div style={{
              fontFamily: FONT_ALT, fontSize: 11, fontWeight: 700,
              letterSpacing: '0.15em', color: 'rgba(255,255,255,0.85)',
              textTransform: 'uppercase',
            }}>
              RECUPERATION ACTIVE
            </div>
          )}
          {(state === 'no-program' || state === 'no-exercises') && (
            <div style={{
              fontFamily: FONT_ALT, fontSize: 11, fontWeight: 700,
              letterSpacing: '0.15em', color: 'rgba(255,255,255,0.85)',
              textTransform: 'uppercase',
            }}>
              DEMARRE QUAND TU VEUX
            </div>
          )}
        </div>

        {/* Bottom */}
        <div>
          {state === 'active' && (
            <button
              onClick={onStart}
              style={{
                padding: '14px 28px',
                background: GOLD, color: '#0e0e0e',
                fontFamily: FONT_ALT, fontSize: 12, fontWeight: 800,
                letterSpacing: '0.18em', textTransform: 'uppercase',
                border: 'none', borderRadius: 10, cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 8,
              }}
            >
              COMMENCER <ArrowRight size={16} strokeWidth={2.5} />
            </button>
          )}
          {state === 'done' && (
            <button
              onClick={onViewDetail || onCalendar}
              style={{
                padding: '14px 28px',
                background: 'transparent',
                border: `1px solid ${GOLD}`, color: GOLD,
                fontFamily: FONT_ALT, fontSize: 12, fontWeight: 800,
                letterSpacing: '0.18em', textTransform: 'uppercase',
                borderRadius: 10, cursor: 'pointer',
              }}
            >
              VOIR LA SEANCE
            </button>
          )}
          {state === 'rest' && (
            <p style={{
              fontFamily: FONT_BODY, fontSize: 13,
              color: 'rgba(255,255,255,0.7)', margin: 0,
              maxWidth: '75%', lineHeight: 1.4,
            }}>
              Profite-en pour mobilite, etirements, hydratation.
            </p>
          )}
          {(state === 'no-program' || state === 'no-exercises') && (
            <button
              onClick={onStart}
              style={{
                padding: '14px 28px',
                background: GOLD, color: '#0e0e0e',
                fontFamily: FONT_ALT, fontSize: 12, fontWeight: 800,
                letterSpacing: '0.18em', textTransform: 'uppercase',
                border: 'none', borderRadius: 10, cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 8,
              }}
            >
              SEANCE LIBRE <ArrowRight size={16} strokeWidth={2.5} />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
