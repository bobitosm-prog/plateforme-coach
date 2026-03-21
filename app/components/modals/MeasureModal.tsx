'use client'
import { useState } from 'react'
import { X } from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { BG_CARD, BG_BASE, BORDER, TEXT_MUTED, TEXT_PRIMARY, ORANGE } from '../../../lib/design-tokens'

interface MeasureModalProps {
  measurements: any[]
  onSave: (data: Record<string, number>, date: string) => Promise<void>
  onClose: () => void
}

const MEASURE_FIELDS = [
  { key: 'waist', label: 'Tour de taille', unit: 'cm' },
  { key: 'hips', label: 'Tour de hanches', unit: 'cm' },
  { key: 'chest', label: 'Tour de poitrine', unit: 'cm' },
  { key: 'arms', label: 'Tour de bras', unit: 'cm' },
  { key: 'thighs', label: 'Tour de cuisses', unit: 'cm' },
]

export default function MeasureModal({ measurements, onSave, onClose }: MeasureModalProps) {
  const [measureForm, setMeasureForm] = useState<Record<string, string>>({
    waist: '', hips: '', chest: '', arms: '', thighs: '',
  })
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])

  async function handleSave() {
    const data: Record<string, number> = {}
    Object.entries(measureForm).forEach(([k, v]) => { if (v) data[k] = parseFloat(v) })
    if (Object.keys(data).length === 0) return
    await onSave(data, date)
  }

  const hasValue = Object.values(measureForm).some(v => v !== '')
  const last5 = measurements.slice(0, 5)

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)', zIndex: 50, overflowY: 'auto' }}>
      <div style={{ background: BG_CARD, borderRadius: '24px 24px 0 0', padding: '24px 20px 40px', marginTop: 64, minHeight: '90vh' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h3 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '1.4rem', fontWeight: 700, letterSpacing: '0.06em', margin: 0 }}>MES MENSURATIONS</h3>
          <button onClick={onClose} style={{ width: 32, height: 32, background: '#2A2A2A', borderRadius: '50%', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={14} color={TEXT_MUTED} /></button>
        </div>

        {/* Inputs */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
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

        {/* Date */}
        <div style={{ marginBottom: 20 }}>
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
          disabled={!hasValue}
          style={{ width: '100%', background: hasValue ? ORANGE : '#2A2A2A', color: hasValue ? '#fff' : TEXT_MUTED, fontWeight: 700, padding: '16px', borderRadius: 14, border: 'none', cursor: hasValue ? 'pointer' : 'default', fontFamily: "'Barlow Condensed', sans-serif", fontSize: '1rem', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 24, transition: 'all 200ms' }}
        >
          Sauvegarder
        </button>

        {/* History */}
        {last5.length > 0 && (
          <div>
            <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: TEXT_MUTED, display: 'block', marginBottom: 12 }}>Historique (5 derniers)</span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {last5.map((m: any, i: number) => (
                <div key={m.id || i} style={{ background: BG_BASE, border: `1px solid ${BORDER}`, borderRadius: 12, padding: '12px 16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '0.75rem', fontWeight: 700, color: i === 0 ? ORANGE : TEXT_MUTED }}>
                      {format(new Date(m.date), 'd MMM yyyy', { locale: fr })}
                    </span>
                    {i === 0 && <span style={{ fontSize: '0.62rem', color: ORANGE, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Dernier</span>}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 4 }}>
                    {MEASURE_FIELDS.map(({ key, label }) => {
                      const val = m[key]
                      return val ? (
                        <div key={key} style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: '0.95rem', fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, color: TEXT_PRIMARY }}>{val}</div>
                          <div style={{ fontSize: '0.56rem', color: TEXT_MUTED, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label.replace('Tour de ', '')}</div>
                        </div>
                      ) : (
                        <div key={key} style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: '0.95rem', color: TEXT_MUTED }}>—</div>
                          <div style={{ fontSize: '0.56rem', color: TEXT_MUTED, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label.replace('Tour de ', '')}</div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
