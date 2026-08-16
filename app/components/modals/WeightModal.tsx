'use client'
import { useId, useRef, useState } from 'react'
import {
  BG_CARD, BG_BASE, BORDER, TEXT_MUTED, TEXT_PRIMARY, GOLD, GOLD_RULE,
  FONT_DISPLAY, FONT_ALT, FONT_BODY, RADIUS_CARD, colors,
} from '../../../lib/design-tokens'
import DashboardMeasurementDialogShell from './DashboardMeasurementDialogShell'

interface WeightModalProps {
  currentWeight?: number
  onSave: (value: number, date: string) => Promise<void>
  onClose: () => void
}

export default function WeightModal({ currentWeight, onSave, onClose }: WeightModalProps) {
  const reactId = useId()
  const weightInputId = `dashboard-weight-input-${reactId}`
  const dateInputId = `dashboard-weight-date-${reactId}`
  const weightInputRef = useRef<HTMLInputElement>(null)
  const [weightForm, setWeightForm] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])

  async function handleSave() {
    if (!weightForm) return
    await onSave(parseFloat(weightForm), date)
  }

  return (
    <DashboardMeasurementDialogShell
      title="ENREGISTRER MON POIDS"
      initialFocusRef={weightInputRef}
      onClose={onClose}
      overlayStyle={{ display: 'flex', alignItems: 'flex-end' }}
      panelStyle={{ background: BG_CARD, borderTop: `1px solid ${BORDER}`, border: `1px solid ${BORDER}`, borderRadius: `${RADIUS_CARD}px ${RADIUS_CARD}px 0 0`, padding: '24px 20px 40px', width: '100%' }}
      headerMarginBottom={20}
    >
        <div style={{ position: 'relative', marginBottom: 16 }}>
          <label htmlFor={weightInputId} style={{ position: 'absolute', width: 1, height: 1, padding: 0, margin: -1, overflow: 'hidden', clip: 'rect(0, 0, 0, 0)', whiteSpace: 'nowrap', border: 0 }}>Poids en kilogrammes</label>
          <input
            ref={weightInputRef}
            id={weightInputId}
            type="number"
            step="0.1"
            value={weightForm}
            onChange={e => setWeightForm(e.target.value)}
            placeholder="0.0"
            style={{ width: '100%', background: BG_BASE, border: `1px solid ${BORDER}`, borderRadius: 12, padding: '20px 48px 20px 20px', color: GOLD, fontSize: '3rem', fontFamily: FONT_DISPLAY, fontWeight: 700, textAlign: 'center', outline: 'none' }}
          />
          <span style={{ position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)', color: TEXT_MUTED, fontSize: '0.9rem', fontWeight: 600, fontFamily: FONT_ALT }}>kg</span>
        </div>
        {currentWeight && <p style={{ textAlign: 'center', color: TEXT_MUTED, fontSize: '0.75rem', marginBottom: 16, fontFamily: FONT_BODY, fontWeight: 300 }}>Précédent : <span style={{ fontFamily: FONT_DISPLAY, color: GOLD }}>{currentWeight}</span> kg</p>}
        <div style={{ marginBottom: 16 }}>
          <label htmlFor={dateInputId} style={{ display: 'block', fontSize: 11, fontFamily: FONT_ALT, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '2px', color: TEXT_MUTED, marginBottom: 8 }}>Date</label>
          <input
            id={dateInputId}
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            style={{ width: '100%', background: BG_BASE, border: `1px solid ${BORDER}`, borderRadius: 12, padding: '12px 16px', color: TEXT_PRIMARY, fontSize: '0.95rem', outline: 'none', colorScheme: 'dark', fontFamily: FONT_BODY }}
          />
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={onClose}
            style={{ flex: 1, background: 'transparent', border: `1px solid ${GOLD_RULE}`, color: TEXT_PRIMARY, fontFamily: FONT_ALT, fontWeight: 700, padding: '16px', borderRadius: 12, cursor: 'pointer', fontSize: '1rem', letterSpacing: '0.08em', textTransform: 'uppercase', transition: 'all 200ms' }}
          >
            Annuler
          </button>
          <button
            onClick={handleSave}
            disabled={!weightForm}
            style={{ flex: 2, background: weightForm ? GOLD : '#2A2A2A', color: weightForm ? colors.onGold : TEXT_MUTED, fontFamily: FONT_ALT, fontWeight: 800, padding: '16px', borderRadius: 12, border: 'none', cursor: weightForm ? 'pointer' : 'default', fontSize: '1rem', letterSpacing: '0.08em', textTransform: 'uppercase', transition: 'all 200ms',  }}
          >
            Sauvegarder
          </button>
        </div>
    </DashboardMeasurementDialogShell>
  )
}
