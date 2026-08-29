import { useEffect, useId, useRef, type ReactNode } from 'react'
import { useTranslations } from 'next-intl'
import styles from './TrainingV2.module.css'

interface TrainingSheetProps {
  title: string
  description?: string
  children: ReactNode
  onClose: () => void
}

export default function TrainingSheet({ title, description, children, onClose }: TrainingSheetProps) {
  const t = useTranslations('training_tab.v2')
  const titleId = useId()
  const sheetRef = useRef<HTMLDivElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)
  const onCloseRef = useRef(onClose)

  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null
    document.body.style.overflow = 'hidden'
    closeRef.current?.focus()

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onCloseRef.current()
        return
      }
      if (event.key !== 'Tab') return
      const focusable = Array.from(sheetRef.current?.querySelectorAll<HTMLElement>(
        'button:not([disabled]), a[href], input:not([disabled]), video[controls], [tabindex]:not([tabindex="-1"])',
      ) ?? [])
      if (focusable.length === 0) return
      const first = focusable[0]
      const last = focusable.at(-1)!
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', onKeyDown)
      previousFocus?.focus()
    }
  }, [])

  return (
    <div className={styles.sheetBackdrop} onMouseDown={event => {
      if (event.target === event.currentTarget) onClose()
    }}>
      <div ref={sheetRef} className={styles.trainingSheet} role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <header className={styles.trainingSheetHeader}>
          <div>
            <h2 id={titleId}>{title}</h2>
            {description && <p>{description}</p>}
          </div>
          <button ref={closeRef} type="button" onClick={onClose} aria-label={t('closeTools')}>×</button>
        </header>
        <div className={styles.trainingSheetBody}>{children}</div>
      </div>
    </div>
  )
}
