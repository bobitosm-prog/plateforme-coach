'use client'
import { useState, useEffect } from 'react'
import { BG_BASE, BG_CARD, BORDER, GOLD, GREEN, RED, TEXT_PRIMARY, TEXT_MUTED, RADIUS_CARD, FONT_ALT, FONT_BODY } from '../../../../lib/design-tokens'

export default function PaymentHistory({ supabase, userId }: { supabase: any; userId: string }) {
  const [payments, setPayments] = useState<any[]>([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    if (!userId) return
    supabase.from('payments').select('*').eq('client_id', userId).order('paid_at', { ascending: false }).limit(20)
      .then(({ data }: any) => { setPayments(data || []); setLoaded(true) })
  }, [userId])

  if (!loaded) return null

  return (
    <div style={{ background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: RADIUS_CARD, padding: 18, marginBottom: 8 }}>
      <div style={{ fontFamily: FONT_ALT, fontSize: 11, fontWeight: 800, letterSpacing: '2px', textTransform: 'uppercase', color: GOLD, marginBottom: 12 }}>Historique des paiements</div>
      {payments.length === 0 ? (
        <p style={{ fontSize: '0.82rem', color: TEXT_MUTED, margin: 0, fontFamily: FONT_BODY, fontWeight: 300 }}>Aucun paiement enregistre</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {payments.map((p: any) => {
            const statusColor = p.status === 'paid' ? GREEN : p.status === 'refunded' ? GOLD : RED
            const statusLabel = p.status === 'paid' ? 'Paye' : p.status === 'refunded' ? 'Rembourse' : 'Echoue'
            return (
              <div key={p.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', background: BG_BASE, borderRadius: RADIUS_CARD, border: `1px solid ${BORDER}` }}>
                <div>
                  <div style={{ fontSize: '0.82rem', color: TEXT_PRIMARY, fontFamily: FONT_BODY, fontWeight: 400 }}>CHF {p.amount || 30}</div>
                  <div style={{ fontSize: '0.65rem', color: TEXT_MUTED, marginTop: 2, fontFamily: FONT_BODY, fontWeight: 300 }}>{p.paid_at ? new Date(p.paid_at).toLocaleDateString('fr-FR') : '—'}</div>
                </div>
                <span style={{ fontSize: 11, fontFamily: FONT_ALT, fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: statusColor, background: `${statusColor}20`, borderRadius: RADIUS_CARD, padding: '4px 8px' }}>{statusLabel}</span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
