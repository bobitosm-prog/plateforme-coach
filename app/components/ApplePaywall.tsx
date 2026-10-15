'use client'
import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { applePurchaseDiagnosticCode, applePurchaseErrorKey, applePurchaseBridge, loadNativeAppleProducts, nativeApplePurchase, type NativeProduct } from '@/lib/apple/native-purchases'
import LegalDocumentDialog from './LegalDocumentDialog'
import { Sparkles, RotateCcw, ArrowLeft } from 'lucide-react'
import styles from './ApplePaywall.module.css'
import homeStyles from './home-v2/HomeV2.module.css'
export default function ApplePaywall({ userId, onSignOut, dismissible = false, supported = true }: { userId: string; onSignOut: () => void; dismissible?: boolean; supported?: boolean }) {
  const t = useTranslations('applePurchases')
  const common = useTranslations('common')
  const [products, setProducts] = useState<NativeProduct[]>([])
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [activeProductId, setActiveProductId] = useState<string | null>(null)
  useEffect(() => {
    let alive = true
    if (!supported) { setMessage(t('unavailable')); return }
    loadNativeAppleProducts().then(p => { if (alive) setProducts(p) }).catch(() => { if (alive) setMessage(t('unavailable')) })
    return () => { alive = false }
  }, [t, supported])
  async function run(action: 'purchase' | 'restore', productId?: string) {
    if (busy) return
    setActiveProductId(action === 'purchase' ? productId ?? null : null)
    setBusy(true); setMessage('')
    try {
      const result = await nativeApplePurchase(userId, action, productId)
      setMessage(t(result.status === 'pending' ? 'pending' : result.status === 'cancelled' ? 'cancelled' : result.count === 0 ? 'empty' : result.sandbox ? 'sandbox' : 'success'))
    } catch (error) {
      const code = applePurchaseDiagnosticCode(error)
      setMessage(`${t(applePurchaseErrorKey(error))}${code ? ` (${code})` : ''}`)
    } finally { setBusy(false) }
  }
  return <section className={styles.page} aria-busy={busy}>
    <div className={styles.shell}>
      <header className={styles.header}>
        {dismissible && <button className={styles.back} onClick={onSignOut} aria-label={t('close')}><ArrowLeft size={22} /></button>}
        <h1 className={homeStyles.title}>{t('titleLead')}<br /><em>{t('titleAccent')}</em></h1>
        <p className={styles.intro}>{t('trial')}</p>
      </header>
      <div className={styles.offers}>
        {products.map((product, i) => <article key={product.id} className={styles.card}>
          <div className={styles.label}><Sparkles size={20} aria-hidden="true" /><h2>{t(i === 0 ? 'monthly' : 'yearly')}</h2></div>
          <p className={styles.price}>{product.displayPrice} <span>{t(i === 0 ? 'perMonth' : 'perYear')}</span></p>
          <button className={styles.primary} disabled={busy} onClick={() => run('purchase', product.id)}>{busy && activeProductId === product.id ? t('processing') : t('buy')}</button>
          {activeProductId === product.id && <p role="status" aria-live="polite" className={styles.offerMessage}>{busy ? t('processing') : message}</p>}
        </article>)}
      </div>
      {!products.length && supported && !message && <p role="status" className={styles.message}>{common('loading')}</p>}
      <div className={styles.details}>
        <p>{t('renewal')}</p>
        <button className={styles.restore} disabled={busy || !supported || !applePurchaseBridge()} onClick={() => run('restore')}><RotateCcw size={18} aria-hidden="true" />{t('restore')}</button>
        {activeProductId === null && <p role="status" aria-live="polite" className={styles.message}>{busy ? t('processing') : message}</p>}
        <div className={styles.legal}><LegalDocumentDialog document="cgu">{t('terms')}</LegalDocumentDialog><LegalDocumentDialog document="privacy">{t('privacy')}</LegalDocumentDialog></div>
        {!dismissible && <button className={styles.restore} onClick={onSignOut}>{t('signOut')}</button>}
      </div>
    </div>
  </section>
}
