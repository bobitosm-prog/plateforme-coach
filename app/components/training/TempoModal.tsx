'use client'

import { Fragment } from 'react'
import { ArrowDown, Pause, ArrowUp } from 'lucide-react'
import { useTranslations } from 'next-intl'
import {
  BG_BASE,
  GOLD,
  GOLD_DIM,
  GOLD_RULE,
  TEXT_PRIMARY,
  TEXT_MUTED,
  FONT_DISPLAY,
  FONT_ALT,
  FONT_BODY,
  colors,
} from '../../../lib/design-tokens'

interface TempoModalProps {
  tempo: string
  exerciseName: string
  onClose: () => void
}

function parseTempoValues(tempo: string): string[] | null {
  const parts = tempo.trim().split('-').map(p => p.trim())
  if (parts.length < 3) return null
  return parts.slice(0, 3)
}

export default function TempoModal({ tempo, exerciseName, onClose }: TempoModalProps) {
  const t = useTranslations('training_tab.tempo')
  const tempoValues = parseTempoValues(tempo)
  const parts = tempo.split('-')

  const phases = tempoValues ? [
    {
      label: t('phases.eccentricLabel'),
      description: t('modal.eccentricDetail', { seconds: tempoValues[0] }),
      icon: ArrowDown,
      seconds: `${tempoValues[0]}s`,
    },
    {
      label: t('phases.pauseLabel'),
      description: tempoValues[1] === '0' ? t('modal.pauseNone') : t('modal.pauseDetail', { seconds: tempoValues[1] }),
      icon: Pause,
      seconds: `${tempoValues[1]}s`,
    },
    {
      label: t('phases.concentricLabel'),
      description: t('modal.concentricDetail', { seconds: tempoValues[2] }),
      icon: ArrowUp,
      seconds: `${tempoValues[2]}s`,
    },
  ] : null

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(0,0,0,0.85)',
        backdropFilter: 'blur(12px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: BG_BASE,
          border: `1px solid ${GOLD_RULE}`,
          borderRadius: 20,
          padding: '28px 24px',
          maxWidth: 360,
          width: '100%',
          animation: 'wsPopIn 0.3s ease-out',
        }}
      >
        {/* Header — Tempo géant */}
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div
            style={{
              color: GOLD,
              fontSize: 10,
              letterSpacing: 3,
              fontWeight: 700,
              fontFamily: FONT_ALT,
              marginBottom: 12,
            }}
          >
            {t('modal.prescribed')}
          </div>
          {phases ? (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'baseline', gap: 8 }}>
              {parts.slice(0, 3).map((n, i) => (
                <Fragment key={i}>
                  <span
                    style={{
                      color: GOLD,
                      fontSize: 48,
                      fontWeight: 800,
                      fontFamily: FONT_DISPLAY,
                      letterSpacing: -1,
                      lineHeight: 1,
                    }}
                  >
                    {n}
                  </span>
                  {i < 2 && (
                    <span style={{ color: GOLD_RULE, fontSize: 32, fontFamily: FONT_DISPLAY }}>—</span>
                  )}
                </Fragment>
              ))}
            </div>
          ) : (
            <div
              style={{
                color: GOLD,
                fontSize: 24,
                fontFamily: FONT_DISPLAY,
                fontWeight: 800,
                letterSpacing: 2,
              }}
            >
              {tempo}
            </div>
          )}
          <div
            style={{
              color: TEXT_MUTED,
              fontSize: 11,
              fontFamily: FONT_BODY,
              marginTop: 8,
              fontStyle: 'italic',
            }}
          >
            {exerciseName}
          </div>
        </div>

        {/* Separator */}
        <div style={{ height: 1, background: GOLD_RULE, margin: '0 0 20px', opacity: 0.5 }} />

        {/* Phases */}
        {phases ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 24 }}>
            {phases.map((phase, idx) => {
              const Icon = phase.icon
              return (
                <div
                  key={idx}
                  style={{ display: 'flex', alignItems: 'center', gap: 12 }}
                >
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: '50%',
                      background: GOLD_DIM,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <Icon size={18} color={GOLD} strokeWidth={2.5} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'baseline',
                        marginBottom: 2,
                      }}
                    >
                      <span
                        style={{
                          color: TEXT_PRIMARY,
                          fontSize: 13,
                          fontWeight: 700,
                          fontFamily: FONT_ALT,
                          letterSpacing: 0.5,
                        }}
                      >
                        {phase.label}
                      </span>
                      <span
                        style={{
                          color: GOLD,
                          fontSize: 14,
                          fontWeight: 800,
                          fontFamily: FONT_DISPLAY,
                        }}
                      >
                        {phase.seconds}
                      </span>
                    </div>
                    <div
                      style={{
                        color: TEXT_MUTED,
                        fontSize: 11,
                        fontFamily: FONT_BODY,
                        lineHeight: 1.4,
                      }}
                    >
                      {phase.description}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div
            style={{
              color: TEXT_MUTED,
              fontSize: 13,
              fontFamily: FONT_BODY,
              textAlign: 'center',
              marginBottom: 24,
              lineHeight: 1.5,
            }}
          >
            {t('modal.invalidFormat')}
          </div>
        )}

        {/* CTA */}
        <button
          onClick={onClose}
          style={{
            width: '100%',
            padding: 14,
            background: GOLD,
            border: 'none',
            borderRadius: 12,
            color: colors.onGold,
            fontFamily: FONT_ALT,
            fontWeight: 800,
            fontSize: 13,
            letterSpacing: 2,
            cursor: 'pointer',
            textTransform: 'uppercase',
          }}
        >
          {t('modal.understood')}
        </button>
      </div>
    </div>
  )
}
