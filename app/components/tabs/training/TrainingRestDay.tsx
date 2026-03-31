'use client'
import { Moon, CheckCircle2 } from 'lucide-react'
import { BG_CARD, BG_BASE, BORDER, RADIUS_CARD } from '../../../../lib/design-tokens'

const GREEN = '#22C55E'
const TEXT_PRIMARY = '#F5F5F5'
const TEXT_MUTED   = '#6B7280'

export default function TrainingRestDay() {
  return (
    <div style={{ padding: '0 16px' }}>
      <div style={{ background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: RADIUS_CARD, padding: '40px 24px', textAlign: 'center' }}>
        <Moon size={44} color={TEXT_MUTED} style={{ marginBottom: 16 }} />
        <p style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '1.5rem', fontWeight: 700, color: TEXT_PRIMARY, margin: '0 0 6px', letterSpacing: '0.04em' }}>JOUR DE REPOS</p>
        <p style={{ fontSize: '0.8rem', color: TEXT_MUTED, margin: '0 0 24px' }}>La récupération fait partie du progrès.</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, textAlign: 'left' }}>
          {['Marche légère 20–30 min', 'Étirements statiques 15 min', 'Hydratation optimale (2L+)', 'Sommeil 7–9 heures'].map((tip, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: BG_BASE, borderRadius: 10 }}>
              <CheckCircle2 size={16} color={GREEN} />
              <span style={{ fontSize: '0.85rem', color: TEXT_MUTED }}>{tip}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
