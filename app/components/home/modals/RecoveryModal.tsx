'use client'

import { X } from 'lucide-react'
import { colors, fonts } from '../../../../lib/design-tokens'
import MuscleHeatMap from '../../ui/MuscleHeatMap'

const GOLD = colors.gold
const FONT_DISPLAY = fonts.headline
const FONT_ALT = fonts.alt
const FONT_BODY = fonts.body
const TEXT_DIM = colors.textDim
const TEXT_MUTED = colors.textMuted

function getRecoveryStatus(muscleStatus: Record<string, number>): { text: string; color: string; caption: string } {
  const values = Object.values(muscleStatus)
  if (!values.length) return { text: 'GOOD', color: '#4ade80', caption: 'Tu es pret a attaquer fort. Tous les groupes principaux sont recuperes.' }
  const avg = values.reduce((a, b) => a + b, 0) / values.length
  if (avg < 0.3) return { text: 'GOOD', color: '#4ade80', caption: 'Tu es pret a attaquer fort. Tous les groupes principaux sont recuperes.' }
  if (avg < 0.6) return { text: 'WATCH', color: '#fb923c', caption: 'Quelques zones travaillent encore. Adapte ton entrainement aujourd\'hui.' }
  return { text: 'RECOVER', color: '#ef4444', caption: 'Recuperation en cours. Privilegie repos actif ou cardio leger.' }
}

const SC = [
  { fill: '#4ade80', label: 'Frais' },
  { fill: '#D4A843', label: 'Recupere' },
  { fill: '#EF4444', label: 'Fatigue' },
]

interface RecoveryModalProps {
  muscleStatus: Record<string, number>
  onClose: () => void
}

export default function RecoveryModal({ muscleStatus, onClose }: RecoveryModalProps) {
  const status = getRecoveryStatus(muscleStatus)

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 50,
        background: 'rgba(0,0,0,0.85)',
        backdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 16,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: colors.surface,
          borderRadius: 20,
          border: `1px solid ${colors.divider}`,
          padding: 24,
          maxWidth: 720, width: '100%',
          maxHeight: '90vh', overflowY: 'auto',
          position: 'relative',
        }}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          aria-label="Fermer"
          style={{
            position: 'absolute', top: 16, right: 16,
            background: 'transparent', border: 'none',
            cursor: 'pointer', padding: 8, color: TEXT_MUTED,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <X size={20} />
        </button>

        {/* Header */}
        <div style={{ marginBottom: 24 }}>
          <h2 style={{
            fontFamily: FONT_DISPLAY, fontSize: 22, fontWeight: 400,
            color: GOLD, letterSpacing: '0.02em', margin: 0,
            textTransform: 'uppercase',
          }}>
            Recuperation musculaire
          </h2>
        </div>

        {/* Status global */}
        <div style={{ marginBottom: 24 }}>
          <div style={{
            fontFamily: FONT_ALT, fontSize: 9, fontWeight: 700,
            letterSpacing: '0.18em', color: TEXT_DIM,
            textTransform: 'uppercase', marginBottom: 6,
          }}>
            Etat general
          </div>
          <div style={{
            fontFamily: FONT_DISPLAY, fontSize: 24, fontWeight: 400,
            color: status.color, letterSpacing: '0.05em', marginBottom: 8,
          }}>
            {status.text}
          </div>
          <p style={{
            fontFamily: FONT_BODY, fontSize: 13,
            color: TEXT_MUTED, margin: 0, lineHeight: 1.5,
            maxWidth: 480,
          }}>
            {status.caption}
          </p>
        </div>

        {/* MuscleHeatMap full (face + back + labels + legend) */}
        <MuscleHeatMap muscleStatus={muscleStatus} hideTitle />
      </div>
    </div>
  )
}
