'use client'
import { useState } from 'react'
import { X } from 'lucide-react'
import { BG_CARD, BG_BASE, BORDER, TEXT_MUTED, TEXT_PRIMARY, ORANGE } from '../../../lib/design-tokens'

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
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)', zIndex: 50, display: 'flex', alignItems: 'flex-end' }}>
      <div style={{ background: BG_CARD, borderTop: `1px solid ${BORDER}`, borderRadius: '24px 24px 0 0', padding: '24px 20px 40px', width: '100%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h3 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '1.4rem', fontWeight: 700, letterSpacing: '0.06em', margin: 0 }}>ENREGISTRER MON POIDS</h3>
          <button onClick={onClose} style={{ width: 32, height: 32, background: '#2A2A2A', borderRadius: '50%', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={14} color={TEXT_MUTED} /></button>
        </div>
        <div style={{ position: 'relative', marginBottom: 16 }}>
          <input
            type="number"
            step="0.1"
            value={weightForm}
            onChange={e => setWeightForm(e.target.value)}
            placeholder="0.0"
            autoFocus
            style={{ width: '100%', background: BG_BASE, border: `1px solid ${BORDER}`, borderRadius: 16, padding: '20px 48px 20px 20px', color: TEXT_PRIMARY, fontSize: '3rem', fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, textAlign: 'center', outline: 'none' }}
          />
          <span style={{ position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)', color: TEXT_MUTED, fontSize: '0.9rem', fontWeight: 600 }}>kg</span>
        </div>
        {currentWeight && <p style={{ textAlign: 'center', color: TEXT_MUTED, fontSize: '0.75rem', marginBottom: 16 }}>Précédent : {currentWeight} kg</p>}
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: TEXT_MUTED, marginBottom: 8 }}>Date</label>
          <input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            style={{ width: '100%', background: BG_BASE, border: `1px solid ${BORDER}`, borderRadius: 12, padding: '12px 16px', color: TEXT_PRIMARY, fontSize: '0.95rem', outline: 'none', colorScheme: 'dark' }}
          />
        </div>
        <button
          onClick={handleSave}
          disabled={!weightForm}
          style={{ width: '100%', background: weightForm ? ORANGE : '#2A2A2A', color: weightForm ? '#fff' : TEXT_MUTED, fontWeight: 700, padding: '16px', borderRadius: 14, border: 'none', cursor: weightForm ? 'pointer' : 'default', fontFamily: "'Barlow Condensed', sans-serif", fontSize: '1rem', letterSpacing: '0.08em', textTransform: 'uppercase', transition: 'all 200ms' }}
        >
          Sauvegarder
        </button>
      </div>
    </div>
  )
}
