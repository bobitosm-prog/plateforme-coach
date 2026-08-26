'use client'

import { Camera, ChevronDown, Images, Plus } from 'lucide-react'
import Image from 'next/image'
import { useTranslations } from 'next-intl'

import type { ProgressionViewModel } from '../../../lib/progression/progression-dashboard-model'
import styles from './ProgressionV2.module.css'

type PhotoState = ProgressionViewModel['photos']['state']

interface TransformationPhotosProps {
  state: PhotoState
  photos: TransformationPhoto[]
  signedUrls: Record<string, string>
  open: boolean
  onToggle: () => void
  onAdd: () => void
  onCompare: () => void
}

export interface TransformationPhoto {
  id: string
  photo_url: string
  date?: string | null
}

export function shouldLoadSignedPhotoUrls(open: boolean, count: number): boolean {
  return open && count > 0
}

export default function TransformationPhotos({
  state,
  photos,
  signedUrls,
  open,
  onToggle,
  onAdd,
  onCompare,
}: TransformationPhotosProps) {
  const t = useTranslations('progress.v2')
  const previews = photos.length >= 2 ? [photos[photos.length - 1], photos[0]] : photos.slice(0, 1)

  return <section className={styles.secondaryCard} aria-labelledby="progression-photos-title">
    <button type="button" className={styles.secondaryToggle} onClick={onToggle} aria-expanded={open} aria-controls="progression-photos-content">
      <span className={styles.secondaryIcon}><Images size={18} aria-hidden="true" /></span>
      <span><strong id="progression-photos-title">{t('history.photos.title')}</strong><small>{t('history.photos.subtitle')}</small></span>
      <ChevronDown size={18} aria-hidden="true" data-open={open} />
    </button>

    {open && <div id="progression-photos-content" className={styles.secondaryContent}>
      {state === 'loading' && <div className={styles.compactState} aria-busy="true"><span className={styles.skeleton} />{t('states.loading')}</div>}
      {state === 'error' && <div className={styles.compactState} role="status"><strong>{t('states.unavailable')}</strong><span>{t('history.photos.unavailable')}</span></div>}
      {state === 'empty' && <div className={styles.compactState}>
        <Camera size={22} aria-hidden="true" />
        <strong>{t('history.photos.emptyTitle')}</strong>
        <span>{t('history.photos.empty')}</span>
        <button type="button" className={styles.secondaryButton} onClick={onAdd}><Plus size={15} aria-hidden="true" />{t('history.photos.add')}</button>
      </div>}
      {(state === 'ready' || state === 'partial') && <>
        <div className={styles.photoPreviewGrid} aria-busy={previews.some(photo => !signedUrls[photo.id])}>
          {previews.map((photo, index) => <div className={styles.photoPreview} key={photo.id}>
            {signedUrls[photo.id]
              ? <Image src={signedUrls[photo.id]} alt={index === 0 ? t('history.photos.before') : t('history.photos.after')} fill sizes="(max-width: 767px) 45vw, 220px" unoptimized />
              : <span className={styles.skeleton} />}
          </div>)}
        </div>
        <div className={styles.secondaryActions}>
          <button type="button" className={styles.secondaryButton} onClick={onAdd}><Plus size={15} aria-hidden="true" />{t('history.photos.add')}</button>
          {photos.length >= 2 && <button type="button" className={styles.secondaryButton} onClick={onCompare}>{t('history.photos.compare')}</button>}
        </div>
      </>}
    </div>}
  </section>
}
