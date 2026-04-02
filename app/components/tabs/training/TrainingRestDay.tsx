'use client'
import { Moon, CheckCircle2 } from 'lucide-react'
import {
  BG_CARD, BG_BASE, BORDER, RADIUS_CARD, GOLD,
  GREEN, TEXT_PRIMARY, TEXT_MUTED,
  FONT_DISPLAY, FONT_BODY,
} from '../../../../lib/design-tokens'

export default function TrainingRestDay() {
  return (
    <div style={{ padding: '0 16px' }}>
      <div style={{ background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: RADIUS_CARD, padding: '40px 24px', textAlign: 'center' }}>
        <Moon size={44} color={GOLD} style={{ marginBottom: 16 }} />
        <p style={{ fontFamily: FONT_DISPLAY, fontSize: '1.5rem', fontWeight: 700, color: TEXT_PRIMARY, margin: '0 0 6px', letterSpacing: '0.04em' }}>JOUR DE REPOS</p>
        <p style={{ fontFamily: FONT_BODY, fontSize: '0.8rem', color: TEXT_MUTED, margin: '0 0 24px' }}>La récupération fait partie du progrès.</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, textAlign: 'left' }}>
          {['Marche légère 20–30 min', 'Étirements statiques 15 min', 'Hydratation optimale (2L+)', 'Sommeil 7–9 heures'].map((tip, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: BG_BASE, borderRadius: RADIUS_CARD }}>
              <CheckCircle2 size={16} color={GREEN} />
              <span style={{ fontFamily: FONT_BODY, fontSize: '0.85rem', color: TEXT_MUTED }}>{tip}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
