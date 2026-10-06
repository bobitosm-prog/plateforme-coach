'use client'
import { useEffect, useState } from 'react'
import { Dumbbell, ChevronRight, Video } from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'
import { getExerciseName } from '../../../lib/i18n-exercise'
import { exerciseMedia } from '../../../lib/exercise-video-media'
import ExerciseInfoPopup from '../ExerciseInfoPopup'
import styles from '../tabs/TrainingOverview.module.css'

type Exercise = { id: string; name: string; name_en?: string; name_de?: string; muscle_group?: string; video_url?: string; [key: string]: any }
const normalize = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()

export default function ExerciseCatalogCard({ supabase }: { supabase: any }) {
  const t = useTranslations('training_tab.overview')
  const locale = useLocale() as 'fr' | 'en' | 'de'
  const [rows, setRows] = useState<Exercise[]>([])
  const [status, setStatus] = useState('loading')
  const [query, setQuery] = useState('')
  const [count, setCount] = useState(12)
  const [retry, setRetry] = useState(0)
  const [selected, setSelected] = useState<Exercise | null>(null)
  useEffect(() => {
    const controller = new AbortController()
    setStatus('loading')
    // Paginate rather than silently truncating the complete catalog at the API limit.
    ;(async () => {
      const all: Exercise[] = []
      for (let offset = 0; ; offset += 200) {
        const { data, error } = await supabase.from('exercises_catalog').select('*').order('name').order('id').range(offset, offset + 199).abortSignal(controller.signal)
        if (controller.signal.aborted) return
        if (error) throw error
        all.push(...(data || []))
        if (!data || data.length < 200) break
      }
      setRows(all); setStatus('ready')
    })().catch(() => { if (!controller.signal.aborted) setStatus('error') })
    return () => controller.abort()
  }, [supabase, retry])
  const filtered = rows.filter(row => normalize(`${getExerciseName(row, locale)} ${row.name} ${row.muscle_group || ''}`).includes(normalize(query)))
  return <section className={styles.card}>
    <h2 className={styles.label}><Dumbbell size={24} aria-hidden="true" />{t('catalog')}</h2>
    <input className={styles.search} aria-label={t('search')} placeholder={t('search')} value={query} onChange={e => { setQuery(e.target.value); setCount(12) }} />
    {status === 'loading' ? <p role="status" className={styles.hint}>{t('loading')}</p> : status === 'error' ? <div role="alert"><p>{t('error')}</p><button className={styles.link} onClick={() => setRetry(n => n + 1)}>{t('retry')}</button></div> : <>
      <p className={styles.hint}>{t('exerciseCount', { count: filtered.length })}</p>
      {filtered.slice(0, count).map(row => { const media = exerciseMedia(row.video_url); return <button key={row.id} className={styles.catalogRow} onClick={() => setSelected(row)}>{media.poster && <img className={styles.videoThumbnail} src={media.poster} alt="" loading="lazy" />}<span>{getExerciseName(row, locale)}<small>{row.muscle_group} · {row.video_url ? t('video') : t('details')}</small></span>{row.video_url ? <Video size={20} aria-hidden="true" /> : <ChevronRight size={16} aria-hidden="true" />}</button>})}
      {count < filtered.length && <button className={styles.link} onClick={() => setCount(n => n + 20)}>{t('more')}<ChevronRight size={16} /></button>}
    </>}
    {selected && <ExerciseInfoPopup info={selected} onClose={() => setSelected(null)} />}
  </section>
}
