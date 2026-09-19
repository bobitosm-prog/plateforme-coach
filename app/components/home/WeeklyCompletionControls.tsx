'use client'

import React, { useEffect, useId, useState } from 'react'
import { useTranslations } from 'next-intl'
import type { WeeklyCompletionStatus } from '@/lib/weekly-diagnostic/completion'
import styles from '../home-v2/HomeV2.module.css'

export default function WeeklyCompletionControls({ generating, onGenerate }: {
  generating: boolean; onGenerate: () => Promise<void>
}) {
  const t = useTranslations('weeklyCompletion')
  const id = useId()
  const [status, setStatus] = useState<WeeklyCompletionStatus | null>(null)
  const [meals, setMeals] = useState(false)
  const [skip, setSkip] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(false)
  async function refresh() {
    try {
      const response = await fetch('/api/weekly-diagnostic', { cache: 'no-store' })
      const data = await response.json()
      if (!response.ok || !data.completion) throw new Error('Unavailable')
      setStatus(data.completion)
      setError(false)
    } catch { setStatus(null); setError(true) }
  }
  useEffect(() => {
    void refresh()
    const onFocus = () => { void refresh() }
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [])
  async function confirm() {
    setBusy(true)
    setError(false)
    try {
      const response = await fetch('/api/weekly-diagnostic', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'complete-week', weekStart: status?.weekStart, mealsConfirmed: meals, skipTraining: skip }),
      })
      const data = await response.json()
      if (!response.ok || !data.completion) throw new Error('Confirmation failed')
      setStatus(data.completion)
      setMeals(false)
      setSkip(false)
    } catch { setError(true); await refresh(); setError(true) }
    finally { setBusy(false) }
  }
  return <div aria-busy={busy || generating}>
    {error && <p role="alert">{t('error')}</p>}
    {!status ? <button type="button" className={styles.textButton} onClick={() => void refresh()}>{t(error ? 'retry' : 'loading')}</button>
      : status.diagnosticId ? null
        : !status.eligible ? <p>{t('waitSunday')}</p>
          : <>
            <p>{t('period', { start: status.weekStart, end: status.sunday })}</p>
            {status.confirmed ? <>
              <p role="status">{t('ready')}</p>
              <button type="button" className={styles.textButton} disabled={generating || busy || !status.canGenerate}
                onClick={async () => { await onGenerate(); await refresh() }}>
                {t(generating ? 'generating' : 'generate')}
              </button>
            </> : <>
              <p>{t('explanation')}</p>
              {!status.hasMeals && <p role="status">{t('missingMeals')}</p>}
              <label htmlFor={`${id}-meals`}>
                <input id={`${id}-meals`} type="checkbox" checked={meals} disabled={busy || !status.hasMeals}
                  onChange={e => setMeals(e.target.checked)} /> {t('meals')}
              </label>
              {status.trainingState === 'pending' ? <div><label htmlFor={`${id}-skip`}>
                <input id={`${id}-skip`} type="checkbox" checked={skip} disabled={busy} onChange={e => setSkip(e.target.checked)} /> {t('skip')}
              </label></div> : <p>{t(status.trainingState === 'rest' ? 'rest' : 'completed')}</p>}
              <button type="button" className={styles.textButton}
                disabled={busy || generating || !status.hasMeals || !meals || (status.trainingState === 'pending' && !skip)}
                onClick={() => void confirm()}>{t(busy ? 'saving' : 'confirm')}</button>
              <button type="button" className={styles.textButton} disabled={busy} onClick={() => void refresh()}>{t('refresh')}</button>
            </>}
          </>}
  </div>
}
