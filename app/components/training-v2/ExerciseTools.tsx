import { useState } from 'react'
import { useTranslations } from 'next-intl'
import styles from './TrainingV2.module.css'

interface ExerciseToolsProps {
  notes: string | null
  technique: string | null
  videoAvailable: boolean
  onOpenDetails: () => void
  onOpenVideo: () => void
  onReplace: () => void
}

export default function ExerciseTools({
  notes,
  technique,
  videoAvailable,
  onOpenDetails,
  onOpenVideo,
  onReplace,
}: ExerciseToolsProps) {
  const t = useTranslations('training_tab.v2')
  const [open, setOpen] = useState(false)
  const [panel, setPanel] = useState<'technique' | 'notes' | null>(null)

  const togglePanel = (next: 'technique' | 'notes') => {
    setPanel(current => current === next ? null : next)
  }

  return (
    <section className={styles.exerciseTools} aria-label={t('exerciseTools')}>
      <button
        type="button"
        className={styles.exerciseToolsToggle}
        aria-expanded={open}
        onClick={() => { setOpen(value => !value); setPanel(null) }}
      >
        <span>{t('exerciseTools')}</span>
        <span aria-hidden="true">{open ? '−' : '+'}</span>
      </button>

      {open && (
        <div className={styles.exerciseToolsBody}>
          <div className={styles.exerciseToolsGrid}>
            <button type="button" onClick={onOpenDetails}>{t('details')}</button>
            {videoAvailable && <button type="button" onClick={onOpenVideo}>{t('video')}</button>}
            {technique && (
              <button type="button" aria-expanded={panel === 'technique'} onClick={() => togglePanel('technique')}>
                {t('technique')}
              </button>
            )}
            {notes && (
              <button type="button" aria-expanded={panel === 'notes'} onClick={() => togglePanel('notes')}>
                {t('notes')}
              </button>
            )}
            <button type="button" onClick={onReplace}>{t('replaceForSession')}</button>
          </div>

          {panel === 'technique' && technique && <div className={styles.exerciseToolPanel}>{technique}</div>}
          {panel === 'notes' && notes && <div className={styles.exerciseToolPanel}>{notes}</div>}
        </div>
      )}
    </section>
  )
}
