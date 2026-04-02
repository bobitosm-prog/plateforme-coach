'use client'
import { useState } from 'react'
import { X } from 'lucide-react'
import {
  BG_CARD, BG_CARD_2, BG_BASE, BORDER, TEXT_MUTED, TEXT_PRIMARY, GOLD, GOLD_RULE,
  FONT_DISPLAY, FONT_ALT, FONT_BODY, RADIUS_CARD,
} from '../../../lib/design-tokens'

interface WeightModalProps {
  currentWeight?: number
  onSave: (value: number, date: string) => Promise<void>
  onClose: () => void
}

export default function WeightModal({ currentWeight, onSave, onClose }: WeightModalProps) {
  const [weightForm, setWeightForm] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])

  async function handleSave() {
    if (!weightForm) return
    await onSave(parseFloat(weightForm), date)
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)', zIndex: 50, display: 'flex', alignItems: 'flex-end' }}>
      <div style={{ background: BG_CARD, borderTop: `1px solid ${BORDER}`, border: `1px solid ${BORDER}`, borderRadius: `${RADIUS_CARD}px ${RADIUS_CARD}px 0 0`, padding: '24px 20px 40px', width: '100%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h3 style={{ fontFamily: FONT_DISPLAY, fontSize: '1.4rem', fontWeight: 700, letterSpacing: '2px', margin: 0, color: TEXT_PRIMARY }}>ENREGISTRER MON POIDS</h3>
          <button onClick={onClose} style={{ width: 32, height: 32, background: BG_CARD_2, borderRadius: 0, border: `1px solid ${BORDER}`, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={14} color={TEXT_MUTED} /></button>
        </div>
        <div style={{ position: 'relative', marginBottom: 16 }}>
          <input
            type="number"
            step="0.1"
            value={weightForm}
            onChange={e => setWeightForm(e.target.value)}
            placeholder="0.0"
            autoFocus
            style={{ width: '100%', background: BG_BASE, border: `1px solid ${BORDER}`, borderRadius: 0, padding: '20px 48px 20px 20px', color: GOLD, fontSize: '3rem', fontFamily: FONT_DISPLAY, fontWeight: 700, textAlign: 'center', outline: 'none' }}
          />
          <span style={{ position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)', color: TEXT_MUTED, fontSize: '0.9rem', fontWeight: 600, fontFamily: FONT_ALT }}>kg</span>
        </div>
        {currentWeight && <p style={{ textAlign: 'center', color: TEXT_MUTED, fontSize: '0.75rem', marginBottom: 16, fontFamily: FONT_BODY, fontWeight: 300 }}>Précédent : <span style={{ fontFamily: FONT_DISPLAY, color: GOLD }}>{currentWeight}</span> kg</p>}
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', fontSize: 11, fontFamily: FONT_ALT, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '2px', color: TEXT_MUTED, marginBottom: 8 }}>Date</label>
          <input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            style={{ width: '100%', background: BG_BASE, border: `1px solid ${BORDER}`, borderRadius: 0, padding: '12px 16px', color: TEXT_PRIMARY, fontSize: '0.95rem', outline: 'none', colorScheme: 'dark', fontFamily: FONT_BODY }}
          />
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={onClose}
            style={{ flex: 1, background: 'transparent', border: `1px solid ${GOLD_RULE}`, color: TEXT_PRIMARY, fontFamily: FONT_ALT, fontWeight: 700, padding: '16px', borderRadius: 0, cursor: 'pointer', fontSize: '1rem', letterSpacing: '0.08em', textTransform: 'uppercase', transition: 'all 200ms' }}
          >
            Annuler
          </button>
          <button
            onClick={handleSave}
            disabled={!weightForm}
            style={{ flex: 2, background: weightForm ? GOLD : '#2A2A2A', color: weightForm ? '#050505' : TEXT_MUTED, fontFamily: FONT_ALT, fontWeight: 800, padding: '16px', borderRadius: 0, border: 'none', cursor: weightForm ? 'pointer' : 'default', fontSize: '1rem', letterSpacing: '0.08em', textTransform: 'uppercase', transition: 'all 200ms', clipPath: 'polygon(6px 0%, 100% 0%, calc(100% - 6px) 100%, 0% 100%)' }}
          >
            Sauvegarder
          </button>
        </div>
      </div>
    </div>
  )
}
