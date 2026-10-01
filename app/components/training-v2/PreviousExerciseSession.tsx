"use client"
import { useEffect, useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import type { SupabaseClient } from '@supabase/supabase-js'
import { loadLastExerciseSession, type HistoricalSet } from '@/lib/training/last-exercise-session'
import { isLoadMode } from '@/lib/training/load-volume'
import styles from './TrainingV2.module.css'

export default function PreviousExerciseSession({ db, userId, exerciseId, name }: { db: SupabaseClient; userId: string; exerciseId: string | null; name: string }) {
  const t = useTranslations('previousWorkout')
  const mode = useTranslations('trainingLoad')
  const locale = useLocale()
  const [rows, setRows] = useState<HistoricalSet[] | null>(null)
  const [error, setError] = useState(false)
  const [retry, setRetry] = useState(0)
  useEffect(() => {
    const controller = new AbortController()
    setRows(null); setError(false)
    loadLastExerciseSession(db, userId, exerciseId, name, controller.signal)
      .then(data => { if (!controller.signal.aborted) setRows(data) })
      .catch(() => { if (!controller.signal.aborted) setError(true) })
    return () => controller.abort()
  }, [db, userId, exerciseId, name, retry])
  const date = rows?.[0]?.created_at?.slice(0, 10)
  return <section className={styles.previousSession} aria-label={t('title')}>
    <div className={styles.metricLabel}>{t('title')}{date ? ` · ${new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${date}T12:00:00Z`))}` : ''}</div>
    <div role="status">{error ? t('error') : rows === null ? t('loading') : !rows.length ? t('empty') : null}</div>
    {error && <button type="button" onClick={() => setRetry(n => n + 1)}>{t('retry')}</button>}
    {!!rows?.length && <ol className={styles.previousSets}>{rows.map((row, index) => <li key={row.id}>
      <span>{row.parent_set_number ? t('stage', { number: row.set_number }) : t('set', { number: row.set_number })}</span>
      <strong>{row.duration_seconds ? `${row.duration_seconds} s` : `${row.weight ?? '—'} kg × ${row.reps ?? '—'}`}</strong>
      {(index === 0 || row.load_mode !== rows[index - 1].load_mode) && <small>{mode(isLoadMode(row.load_mode) ? row.load_mode : 'legacy')}</small>}
    </li>)}</ol>}
  </section>
}
