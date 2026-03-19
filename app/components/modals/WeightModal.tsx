'use client'
import { useState } from 'react'
import { X } from 'lucide-react'
import { BG_CARD, BG_BASE, BORDER, TEXT_MUTED, TEXT_PRIMARY, GREEN } from '../../../lib/design-tokens'

interface WeightModalProps {
  currentWeight?: number
  onSave: (value: number) => Promise<void>
  onClose: () => void
}

export default function WeightModal({ currentWeight, onSave, onClose }: WeightModalProps) {
  const [weightForm, setWeightForm] = useState('')

  async function handleSave() {
    if (!weightForm) return
    await onSave(parseFloat(weightForm))
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)', zIndex: 50, display: 'flex', alignItems: 'flex-end' }}>
      <div style={{ background: BG_CARD, borderTop: `1px solid ${BORDER}`, borderRadius: '24px 24px 0 0', padding: '24px 20px 40px', width: '100%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h3 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '1.4rem', fontWeight: 700, letterSpacing: '0.06em', margin: 0 }}>LOG POIDS</h3>
          <button onClick={onClose} style={{ width: 32, height: 32, background: '#2A2A2A', borderRadius: '50%', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={14} color={TEXT_MUTED} /></button>
        </div>
        <div style={{ position: 'relative', marginBottom: 16 }}>
          <input
            type="number"
            step="0.1"
            value={weightForm}
            onChange={e => setWeightForm(e.target.value)}
            placeholder="0.0"
            style={{ width: '100%', background: BG_BASE, border: `1px solid ${BORDER}`, borderRadius: 16, padding: '20px 48px 20px 20px', color: TEXT_PRIMARY, fontSize: '3rem', fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, textAlign: 'center', outline: 'none' }}
          />
          <span style={{ position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)', color: TEXT_MUTED, fontSize: '0.9rem', fontWeight: 600 }}>kg</span>
        </div>
        {currentWeight && <p style={{ textAlign: 'center', color: TEXT_MUTED, fontSize: '0.75rem', marginBottom: 16 }}>Précédent : {currentWeight} kg</p>}
        <button onClick={handleSave} style={{ width: '100%', background: GREEN, color: '#000', fontWeight: 700, padding: '16px', borderRadius: 14, border: 'none', cursor: 'pointer', fontFamily: "'Barlow Condensed', sans-serif", fontSize: '1rem', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Enregistrer</button>
      </div>
    </div>
  )
}
