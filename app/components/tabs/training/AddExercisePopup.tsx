'use client'
import { BG_BASE, BG_CARD, BORDER, GOLD, GOLD_DIM, TEXT_PRIMARY, TEXT_MUTED, FONT_DISPLAY, FONT_BODY } from '../../../../lib/design-tokens'

interface Props {
  searchQ: string
  onSearchChange: (q: string) => void
  results: any[]
  onSelect: (ex: any) => void
  onClose: () => void
}

export default function AddExercisePopup({ searchQ, onSearchChange, results, onSelect, onClose }: Props) {
  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1100 }} />
      <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: 'calc(100% - 32px)', maxWidth: 420, maxHeight: '70vh', background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: 20, zIndex: 1101, display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 24px 80px rgba(0,0,0,0.6)' }}>
        <div style={{ padding: '20px 20px 12px', borderBottom: `1px solid ${BORDER}`, flexShrink: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <span style={{ fontFamily: FONT_DISPLAY, fontSize: 20, letterSpacing: 2, color: TEXT_PRIMARY }}>AJOUTER UN EXERCICE</span>
            <button onClick={onClose} style={{ background: 'none', border: 'none', color: TEXT_MUTED, fontSize: 22, cursor: 'pointer' }}>✕</button>
          </div>
          <input type="text" placeholder="Rechercher..." value={searchQ} onChange={e => onSearchChange(e.target.value)} autoFocus style={{ width: '100%', padding: '12px 14px', background: BG_BASE, border: `1px solid ${BORDER}`, borderRadius: 10, color: TEXT_PRIMARY, fontFamily: FONT_BODY, fontSize: 14, outline: 'none' }} />
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '4px 20px 20px' }}>
          {results.map((ex: any) => (
            <button key={ex.id} onClick={() => onSelect(ex)} style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 0', background: 'none', border: 'none', borderBottom: `1px solid ${GOLD_DIM}`, cursor: 'pointer', textAlign: 'left' }}>
              <div>
                <div style={{ fontFamily: FONT_BODY, fontSize: 14, color: TEXT_PRIMARY }}>{ex.name}</div>
                <div style={{ fontFamily: FONT_BODY, fontSize: 11, color: TEXT_MUTED }}>{ex.muscle_group || ''}</div>
              </div>
              <span style={{ color: GOLD, fontSize: 22 }}>+</span>
            </button>
          ))}
        </div>
      </div>
    </>
  )
}
