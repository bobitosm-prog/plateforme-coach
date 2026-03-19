'use client'
import { useState } from 'react'
import { X } from 'lucide-react'
import { BG_CARD, BG_BASE, BORDER, TEXT_MUTED, TEXT_PRIMARY, GREEN } from '../../../lib/design-tokens'

interface MeasureModalProps {
  onSave: (data: Record<string, number>) => Promise<void>
  onClose: () => void
}

const MEASURE_FIELDS = [
  { key: 'chest', label: 'Poitrine', unit: 'cm' },
  { key: 'waist', label: 'Taille', unit: 'cm' },
  { key: 'hips', label: 'Hanches', unit: 'cm' },
  { key: 'left_arm', label: 'Bras gauche', unit: 'cm' },
  { key: 'right_arm', label: 'Bras droit', unit: 'cm' },
  { key: 'left_thigh', label: 'Cuisse gauche', unit: 'cm' },
  { key: 'right_thigh', label: 'Cuisse droite', unit: 'cm' },
  { key: 'body_fat', label: '% Masse grasse', unit: '%' },
  { key: 'muscle_mass', label: 'Masse musculaire', unit: 'kg' },
]

export default function MeasureModal({ onSave, onClose }: MeasureModalProps) {
  const [measureForm, setMeasureForm] = useState<Record<string, string>>({
    chest: '', waist: '', hips: '', left_arm: '', right_arm: '',
    left_thigh: '', right_thigh: '', body_fat: '', muscle_mass: '',
  })

  async function handleSave() {
    const data: Record<string, number> = {}
    Object.entries(measureForm).forEach(([k, v]) => { if (v) data[k] = parseFloat(v) })
    await onSave(data)
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)', zIndex: 50, overflowY: 'auto' }}>
      <div style={{ background: BG_CARD, borderRadius: '24px 24px 0 0', padding: '24px 20px 40px', marginTop: 64, minHeight: '90vh' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h3 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '1.4rem', fontWeight: 700, letterSpacing: '0.06em', margin: 0 }}>MENSURATIONS</h3>
          <button onClick={onClose} style={{ width: 32, height: 32, background: '#2A2A2A', borderRadius: '50%', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={14} color={TEXT_MUTED} /></button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {MEASURE_FIELDS.map(({ key, label, unit }) => (
            <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 12, background: BG_BASE, border: `1px solid ${BORDER}`, borderRadius: 12, padding: '12px 16px' }}>
              <span style={{ fontSize: '0.85rem', color: TEXT_MUTED, flex: 1 }}>{label}</span>
              <input
                type="number"
                step="0.1"
                value={measureForm[key]}
                onChange={e => setMeasureForm(p => ({ ...p, [key]: e.target.value }))}
                placeholder="—"
                style={{ background: 'transparent', color: TEXT_PRIMARY, fontSize: '0.95rem', fontWeight: 700, textAlign: 'right', width: 64, outline: 'none', border: 'none' }}
              />
              <span style={{ color: TEXT_MUTED, fontSize: '0.75rem', width: 24 }}>{unit}</span>
            </div>
          ))}
        </div>
        <button onClick={handleSave} style={{ width: '100%', background: GREEN, color: '#000', fontWeight: 700, padding: '16px', borderRadius: 14, border: 'none', cursor: 'pointer', fontFamily: "'Barlow Condensed', sans-serif", fontSize: '1rem', letterSpacing: '0.08em', textTransform: 'uppercase', marginTop: 20 }}>Enregistrer</button>
      </div>
    </div>
  )
}
