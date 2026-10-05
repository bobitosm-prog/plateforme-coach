'use client'

import {useCallback, useEffect, useRef, useState} from 'react'
import {useLocale, useTranslations} from 'next-intl'
import {dailyEnergy, energyTotal, hasDailyEnergyBridge, type DailyEnergy} from '@/lib/health/daily-energy'
import styles from './DailyEnergyCard.module.css'

/** Health totals are transient UI state, never persisted or sent to an API/analytics. */
export default function DailyEnergyCard({account, date, consumed}: {account: string; date: string; consumed: number | null}) {
  const t = useTranslations('daily_energy')
  const locale = useLocale()
  const [available, setAvailable] = useState(false)
  const [data, setData] = useState<DailyEnergy | null>(null)
  const [busy, setBusy] = useState(false)
  const alive = useRef(false)
  const pending = useRef(false)
  const request = useCallback(async (action: 'read' | 'connect' | 'disconnect') => {
    if (pending.current) return
    pending.current = true
    setBusy(true)
    const result = await dailyEnergy(action, account, date)
    if (alive.current) { setData(result); setBusy(false) }
    pending.current = false
  }, [account, date])
  useEffect(() => {
    alive.current = true
    if (!hasDailyEnergyBridge()) return () => { alive.current = false }
    setAvailable(true)
    void request('read')
    const refresh = () => {
      if (document.visibilityState === 'visible') void request('read')
      else setData(null)
    }
    document.addEventListener('visibilitychange', refresh)
    const timer = setInterval(() => { if (document.visibilityState === 'visible') void request('read') }, 60000)
    return () => { alive.current = false; clearInterval(timer); document.removeEventListener('visibilitychange', refresh) }
  }, [request])
  if (!available) return null
  const number = new Intl.NumberFormat(locale, {maximumFractionDigits: 0})
  const format = (value: number | null | undefined) => typeof value === 'number' && Number.isFinite(value) && value >= 0 ? number.format(value) : '—'
  const total = data ? energyTotal(data) : null
  const connected = data?.status === 'ready'
  const difference = total !== null && consumed !== null ? consumed - total : null
  return <section className={styles.card} aria-label={t('title')} aria-busy={busy} data-daily-energy>
    <div className={styles.heading}><h2>{t('title')}</h2><span>{t('estimate')}</span></div>
    <p className={styles.copy}>{t('intro')}</p>
    {connected && <>
      <div className={styles.metrics}>
        <div><span>{t('burned')}</span><strong>{format(total)} <small>kcal</small></strong></div>
        <div><span>{t('eaten')}</span><strong>{format(consumed)} <small>kcal</small></strong></div>
      </div>
      {difference !== null && <p className={styles.balance}>{t('difference', {value:`${difference > 0 ? '+' : difference < 0 ? '−' : ''}${number.format(Math.abs(difference))}`})}</p>}
      {total === null && <p role="status" className={styles.copy}>{t('missing')}</p>}
      {consumed === null && <p className={styles.copy}>{t('foodMissing')}</p>}
    </>}
    {!connected && <p className={styles.copy} role="status">{t(!data ? 'loading' : data.status === 'off' ? 'consent' : 'error')}</p>}
    <details className={styles.details} open={!connected}>
      <summary>{t('details')}</summary>
      {connected && <>
        <p className={styles.copy}>{t('breakdown', {active:format(data.active), resting:format(data.resting)})}</p>
        <p className={styles.copy}>{t('updated', {time:new Intl.DateTimeFormat(locale, {hour:'2-digit',minute:'2-digit',timeZone:'Europe/Zurich'}).format(data.through)})}</p>
      </>}
    <div className={styles.actions}>
      <button type="button" disabled={busy} onClick={() => void request(data?.status === 'off' ? 'connect' : 'read')}>{t(data?.status === 'off' ? 'connect' : 'refresh')}</button>
      {data && data.status !== 'off' && <button type="button" disabled={busy} onClick={() => void request('disconnect')}>{t('disconnect')}</button>}
    </div>
    <p className={styles.footnote}>{t('note')}</p>
    </details>
  </section>
}
