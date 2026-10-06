 'use client'
import { useId, useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { X, Video, Lightbulb } from 'lucide-react'
import { useTranslations, useLocale } from 'next-intl'
import { getExerciseName, getExerciseDescription, getExerciseTips } from '../../lib/i18n-exercise'
import { exerciseMedia } from '../../lib/exercise-video-media'
import { RailOverlay } from './ui/RailOverlay'
import { getMuscleLabel } from '../../lib/i18n-muscle'
import styles from './ExerciseInfoPopup.module.css'

interface ExerciseInfo {
  name: string
  muscle_group?: string
  equipment?: string
  instructions?: string
  tips?: string
  description?: string
  video_url?: string
  gif_url?: string
  name_en?: string | null
  name_de?: string | null
  description_en?: string | null
  description_de?: string | null
  tips_en?: string | null
  tips_de?: string | null
}

interface ExerciseInfoPopupProps {
  info: ExerciseInfo
  onClose: () => void
}

export default function ExerciseInfoPopup({ info, onClose }: ExerciseInfoPopupProps) {
  const [failedVideo, setFailedVideo] = useState<string | null>(null)
  const t = useTranslations('exerciseInfo')
  const locale = useLocale() as 'fr' | 'en' | 'de'
  const tMuscle = useTranslations('muscles')
  const displayName = getExerciseName(info, locale)
  const displayDesc = getExerciseDescription(info, locale)
  const displayTips = getExerciseTips(info, locale)
  const media = exerciseMedia(info.video_url)
  const titleId = useId()
  return <Dialog.Root open onOpenChange={open => { if (!open) onClose() }}>
    <RailOverlay>
      <Dialog.Overlay className={styles.backdrop} />
      <Dialog.Content className={styles.dialog} aria-labelledby={titleId} aria-describedby={undefined}>
        <header className={styles.header}>
          <div className={styles.heading}>
            <span className={styles.eyebrow}><Video size={16} aria-hidden="true" />{t('exercise')}</span>
            <Dialog.Title id={titleId} className={styles.title}>{displayName}</Dialog.Title>
            {info.muscle_group && <span className={styles.badge}>{getMuscleLabel(info.muscle_group, locale, tMuscle)}</span>}
          </div>
          <Dialog.Close className={styles.close} aria-label={t('close')}><X size={22} /></Dialog.Close>
        </header>
        <div className={styles.body}>
          {media.video && failedVideo !== media.video ? <div className={styles.media}>
            <video key={media.video} src={media.video} poster={media.poster} controls preload="metadata" onError={() => setFailedVideo(media.video || null)} autoPlay loop muted playsInline aria-label={displayName} />
          </div> : info.gif_url ? <div className={styles.media}><img src={info.gif_url} alt={displayName} /></div> : <div className={styles.empty} role="status"><Video size={28} aria-hidden="true" /><p>{t(failedVideo && failedVideo === media.video ? 'unavailable' : 'comingSoon')}</p></div>}
          {displayDesc && <section className={styles.section}><h3>{t('description')}</h3><p>{displayDesc}</p></section>}
          {info.instructions && <section className={styles.section}><h3>{t('execution')}</h3><p>{info.instructions}</p></section>}
          {displayTips && <section className={styles.tips}><h3><Lightbulb size={17} aria-hidden="true" />{t('tips')}</h3><p>{displayTips}</p></section>}
        </div>
      </Dialog.Content>
    </RailOverlay>
  </Dialog.Root>
}
