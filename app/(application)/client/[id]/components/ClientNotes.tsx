'use client'
import { CalendarClock, Check, Save, Archive, Trash2 } from 'lucide-react'
import {
  BG_BASE, BG_CARD, BG_CARD_2, BORDER, GOLD, GOLD_DIM, GOLD_RULE,
  GREEN, RED, TEXT_PRIMARY, TEXT_MUTED, TEXT_DIM,
  RADIUS_CARD, FONT_DISPLAY, FONT_ALT, FONT_BODY,
} from '@/lib/design-tokens'

interface ClientNotesProps {
  notes: string
  notesSaved: boolean
  notesSaving: boolean
  onNotesChange: (val: string) => void
  saveNotes: () => void
  showToast: (msg: string) => void
}

export default function ClientNotes({ notes, notesSaved, notesSaving, onNotesChange, saveNotes, showToast }: ClientNotesProps) {
  return (
    <div style={{ animation: 'fadeIn 200ms ease', display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div className="card">
        <p className="section-title">Prochain RDV</p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, background: BG_BASE, borderRadius: RADIUS_CARD, padding: 14, borderLeft: `3px solid ${GOLD}`, marginBottom: 12 }}>
          <div style={{ width: 38, height: 38, background: GOLD_DIM, borderRadius: RADIUS_CARD, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <CalendarClock size={17} color={GOLD} strokeWidth={2} />
          </div>
          <div>
            <div style={{ fontFamily: FONT_DISPLAY, fontSize: '1.1rem', fontWeight: 400, color: TEXT_PRIMARY, letterSpacing: '1px', textTransform: 'uppercase' }}>À planifier</div>
            <div style={{ fontSize: '0.78rem', fontFamily: FONT_BODY, color: TEXT_MUTED, marginTop: 2 }}>Aucun RDV planifié</div>
          </div>
        </div>
        <button className="btn-primary" style={{ width: '100%' }} onClick={() => showToast('Planification de RDV à venir')}>Planifier un RDV</button>
      </div>

      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <p className="section-title" style={{ marginBottom: 0 }}>Notes coach</p>
          <div style={{ fontSize: '0.7rem', fontFamily: FONT_ALT, fontWeight: 700, color: GREEN, display: 'flex', alignItems: 'center', gap: 4, opacity: notesSaved ? 1 : 0, transition: 'opacity 300ms ease' }}>
            <Check size={11} strokeWidth={2.5} />Sauvegardé
          </div>
        </div>
        <textarea
          value={notes}
          onChange={e => onNotesChange(e.target.value)}
          placeholder="Ajoutez vos observations, programmes, remarques…"
          style={{ width: '100%', background: BG_BASE, border: `1px solid ${BORDER}`, borderRadius: 12, padding: '12px 14px', fontFamily: FONT_BODY, fontSize: '0.9rem', color: TEXT_PRIMARY, resize: 'vertical', minHeight: 120, lineHeight: 1.6, outline: 'none' }}
        />
        <button className="btn-secondary" style={{ width: '100%', marginTop: 10 }} onClick={saveNotes} disabled={notesSaving}>
          <Save size={13} strokeWidth={2.5} />{notesSaving ? 'Sauvegarde…' : 'Sauvegarder les notes'}
        </button>
      </div>

      <div className="card">
        <p className="section-title" style={{ color: RED }}>Zone avancée</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <button className="btn-ghost" style={{ justifyContent: 'flex-start', color: TEXT_MUTED, width: '100%' }} onClick={() => showToast('Archivage à implémenter')}>
            <Archive size={14} strokeWidth={2} />Archiver le client
          </button>
          <button className="btn-ghost" style={{ justifyContent: 'flex-start', color: RED, width: '100%' }} onClick={() => showToast('Suppression à implémenter')}>
            <Trash2 size={14} strokeWidth={2} />Supprimer le client
          </button>
        </div>
      </div>
    </div>
  )
}
