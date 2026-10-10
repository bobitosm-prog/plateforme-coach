'use client'
import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { applePurchaseBridge, loadNativeAppleProducts, nativeApplePurchase, type NativeProduct } from '@/lib/apple/native-purchases'
import LegalDocumentDialog from './LegalDocumentDialog'
import { BG_BASE, BG_CARD, GOLD, TEXT_PRIMARY, TEXT_MUTED, FONT_BODY, FONT_DISPLAY } from '@/lib/design-tokens'
export default function ApplePaywall({ userId, onSignOut, dismissible = false, supported = true }: { userId: string; onSignOut: () => void; dismissible?: boolean; supported?: boolean }) {
  const t = useTranslations('applePurchases')
  const [products, setProducts] = useState<NativeProduct[]>([])
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  useEffect(() => {
    let alive = true
    if (!supported) { setMessage(t('unavailable')); return }
    loadNativeAppleProducts().then(p => { if (alive) setProducts(p) }).catch(() => { if (alive) setMessage(t('unavailable')) })
    return () => { alive = false }
  }, [t, supported])
  async function run(action: 'purchase' | 'restore', productId?: string) {
    if (busy) return
    setBusy(true); setMessage('')
    try {
      const result = await nativeApplePurchase(userId, action, productId)
      setMessage(t(result.status === 'pending' ? 'pending' : result.status === 'cancelled' ? 'cancelled' : result.count === 0 ? 'empty' : result.sandbox ? 'sandbox' : 'success'))
    } catch { setMessage(t('retry')) } finally { setBusy(false) }
  }
  const button = { minHeight: 48, borderRadius: 14, padding: '12px 20px', border: 'none', background: GOLD, color: BG_BASE, cursor: 'pointer', fontWeight: 700 } as const
  return <section style={{ background: BG_BASE, color: TEXT_PRIMARY, padding: 24, minHeight: '100dvh', fontFamily: FONT_BODY }}>
    <h1 style={{ fontFamily: FONT_DISPLAY, color: GOLD }}>{t('title')}</h1><p style={{ color: TEXT_MUTED }}>{t('trial')}</p>
    {products.map((product, i) => <div key={product.id} style={{ background: BG_CARD, borderRadius: 22, padding: 20, marginTop: 16 }}>
      <h2>{t(['monthly', 'yearly', 'lifetime'][i])}</h2>
      <p>{product.displayPrice} {i < 2 ? t(i === 0 ? 'perMonth' : 'perYear') : t('oneTime')}</p>
      <button style={button} disabled={busy} onClick={() => run('purchase', product.id)}>{t('buy')}</button>
    </div>)}
    <p style={{ color: TEXT_MUTED }}>{t('renewal')}</p>
    <button style={button} disabled={busy || !supported || !applePurchaseBridge()} onClick={() => run('restore')}>{t('restore')}</button>
    <p role="status" aria-live="polite">{busy ? t('processing') : message}</p>
    <p><LegalDocumentDialog document="cgu">{t('terms')}</LegalDocumentDialog> · <LegalDocumentDialog document="privacy">{t('privacy')}</LegalDocumentDialog></p>
    <button onClick={onSignOut} style={{ ...button, background: BG_CARD, color: TEXT_PRIMARY }}>{dismissible ? t('close') : t('signOut')}</button>
  </section>
}
