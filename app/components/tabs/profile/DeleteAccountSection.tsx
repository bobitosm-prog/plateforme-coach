'use client'
import { useState } from 'react'
import { Trash2 } from 'lucide-react'
import { BG_BASE, BG_CARD, BORDER, GOLD_RULE, RED, TEXT_PRIMARY, TEXT_MUTED, RADIUS_CARD, FONT_DISPLAY, FONT_ALT, FONT_BODY } from '../../../../lib/design-tokens'

export default function DeleteAccountSection({ session }: { session: any }) {
  const [showModal, setShowModal] = useState(false)
  const [confirmText, setConfirmText] = useState('')
  const [deleting, setDeleting] = useState(false)

  async function deleteAccount() {
    if (confirmText !== 'SUPPRIMER') return
    setDeleting(true)
    try {
      const res = await fetch('/api/delete-account', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: session.user.id }),
      })
      if (res.ok) { window.location.href = '/login' }
      else { const { error } = await res.json(); alert(`Erreur : ${error || 'Echec'}`); setDeleting(false) }
    } catch { alert('Erreur reseau'); setDeleting(false) }
  }

  return (
    <>
      <button onClick={() => setShowModal(true)} style={{ width: '100%', background: 'transparent', border: `1px solid ${RED}`, borderRadius: 12, padding: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, cursor: 'pointer', marginTop: 24 }}>
        <Trash2 size={16} color={RED} />
        <span style={{ fontSize: '0.82rem', fontFamily: FONT_ALT, fontWeight: 600, color: RED }}>Supprimer mon compte</span>
      </button>
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)', zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: BG_CARD, border: `1px solid ${RED}`, borderRadius: RADIUS_CARD, padding: 24, maxWidth: 400, width: '100%' }}>
            <h3 style={{ fontFamily: FONT_DISPLAY, fontSize: '1.2rem', fontWeight: 700, letterSpacing: '2px', color: RED, margin: '0 0 12px' }}>SUPPRIMER MON COMPTE</h3>
            <p style={{ fontSize: '0.82rem', color: TEXT_MUTED, lineHeight: 1.6, margin: '0 0 16px', fontFamily: FONT_BODY, fontWeight: 300 }}>Toutes tes donnees seront supprimees definitivement. Cette action est irreversible.</p>
            <p style={{ fontSize: '0.78rem', color: TEXT_MUTED, margin: '0 0 8px', fontFamily: FONT_BODY }}>Tape <strong style={{ color: RED }}>SUPPRIMER</strong> pour confirmer :</p>
            <input value={confirmText} onChange={e => setConfirmText(e.target.value)} placeholder="SUPPRIMER" style={{ width: '100%', background: BG_BASE, border: `1px solid ${confirmText === 'SUPPRIMER' ? RED : BORDER}`, borderRadius: 12, padding: '10px 14px', color: TEXT_PRIMARY, fontSize: '0.9rem', outline: 'none', marginBottom: 16, fontFamily: FONT_BODY }} />
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => { setShowModal(false); setConfirmText('') }} style={{ flex: 1, padding: '12px', background: 'transparent', border: `1px solid ${GOLD_RULE}`, borderRadius: 12, color: TEXT_PRIMARY, fontFamily: FONT_ALT, fontSize: '0.85rem', cursor: 'pointer' }}>Annuler</button>
              <button onClick={deleteAccount} disabled={confirmText !== 'SUPPRIMER' || deleting} style={{ flex: 1, padding: '12px', background: confirmText === 'SUPPRIMER' ? RED : '#333', borderRadius: 12, border: 'none', color: '#fff', fontFamily: FONT_ALT, fontSize: '0.9rem', fontWeight: 700, cursor: confirmText === 'SUPPRIMER' ? 'pointer' : 'default', opacity: confirmText === 'SUPPRIMER' ? 1 : 0.5 }}>{deleting ? 'Suppression...' : 'Supprimer'}</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
