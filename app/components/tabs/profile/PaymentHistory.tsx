'use client'
import { useState, useEffect } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { BG_BASE, BG_CARD, BORDER, GOLD, GREEN, RED, TEXT_PRIMARY, TEXT_MUTED, RADIUS_CARD, FONT_ALT, FONT_BODY } from '../../../../lib/app-design-tokens'

export default function PaymentHistory({ supabase, userId }: { supabase: any; userId: string }) {
  const t = useTranslations('profile.billing')
  const locale = useLocale()
  const [payments, setPayments] = useState<any[]>([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    if (!userId) return
    supabase.from('payments').select('*').eq('client_id', userId).order('paid_at', { ascending: false }).limit(20)
      .then(({ data }: any) => { setPayments(data || []); setLoaded(true) })
  }, [userId])

  if (!loaded) return null

  return (
    <div style={{ background: '#211f18', border: '1px solid #393326', borderRadius: 20, padding: 18, marginBottom: 8 }}>
      <h2 style={{ marginTop: 0, fontFamily: FONT_BODY, fontSize: 13, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: GOLD, marginBottom: 12 }}>{t('title')}</h2>
      {payments.length === 0 ? (
        <p style={{ fontSize: 15, color: TEXT_MUTED, margin: 0, fontFamily: FONT_BODY, fontWeight: 300 }}>{t('empty')}</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {payments.map((p: any) => {
            const statusColor = p.status === 'paid' ? GREEN : p.status === 'refunded' ? GOLD : RED
            const statusLabel = p.status === 'paid' ? t('statusPaid') : p.status === 'refunded' ? t('statusRefunded') : t('statusFailed')
            return (
              <div key={p.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', padding: '10px 12px', background: BG_BASE, borderRadius: RADIUS_CARD, border: `1px solid ${BORDER}` }}>
                <div>
                  <div style={{ fontSize: 15, color: TEXT_PRIMARY, fontFamily: FONT_BODY, fontWeight: 400 }}>CHF {p.amount || 30}</div>
                  <div style={{ fontSize: 13, color: TEXT_MUTED, marginTop: 2, fontFamily: FONT_BODY, fontWeight: 300 }}>{p.paid_at ? new Date(p.paid_at).toLocaleDateString(locale) : t('noDate')}</div>
                </div>
                <span style={{ fontSize: 13, fontFamily: FONT_BODY, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: statusColor, background: `${statusColor}20`, borderRadius: RADIUS_CARD, padding: '4px 8px' }}>{statusLabel}</span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
