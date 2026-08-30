'use client'

import { X } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useEffect, useRef } from 'react'

import type { MealKey } from '../../../lib/meal-plan'
import { RailOverlay } from '../ui/RailOverlay'
import styles from './NutritionV2.module.css'

export const MEAL_CONTEXT_OPTIONS: ReadonlyArray<{
  key: 'breakfast' | 'lunch' | 'snack' | 'dinner'
  value: MealKey
}> = [
  { key: 'breakfast', value: 'petit_dejeuner' },
  { key: 'lunch', value: 'dejeuner' },
  { key: 'snack', value: 'collation' },
  { key: 'dinner', value: 'diner' },
]

interface MealContextChooserProps {
  onClose: () => void
  onSelect: (mealType: MealKey) => void
}

export default function MealContextChooser({ onClose, onSelect }: MealContextChooserProps) {
  const t = useTranslations('nutrition_tab.v2.mealChooser')
  const dialogRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    dialogRef.current?.querySelector<HTMLButtonElement>('[data-meal-choice]')?.focus()

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
        return
      }
      if (event.key !== 'Tab' || !dialogRef.current) return
      const controls = Array.from(dialogRef.current.querySelectorAll<HTMLButtonElement>('button:not(:disabled)'))
      if (controls.length === 0) return
      const first = controls[0]
      const last = controls[controls.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  return <RailOverlay>
    <div className={styles.mealChooserLayer}>
      <button type="button" className={styles.mealChooserBackdrop} aria-label={t('close')} onClick={onClose} />
      <div ref={dialogRef} className={styles.mealChooser} role="dialog" aria-modal="true" aria-labelledby="meal-context-title" aria-describedby="meal-context-description">
        <div className={styles.mealChooserHeader}>
          <div>
            <p className={styles.eyebrow}>{t('eyebrow')}</p>
            <h2 id="meal-context-title">{t('title')}</h2>
          </div>
          <button type="button" className={styles.mealChooserClose} aria-label={t('close')} onClick={onClose}>
            <X size={18} aria-hidden="true" />
          </button>
        </div>
        <p id="meal-context-description" className={styles.mealChooserDescription}>{t('description')}</p>
        <div className={styles.mealChooserGrid} role="group" aria-label={t('title')}>
          {MEAL_CONTEXT_OPTIONS.map(option => <button
            key={option.value}
            type="button"
            data-meal-choice
            onClick={() => onSelect(option.value)}
          >{t(option.key)}</button>)}
        </div>
      </div>
    </div>
  </RailOverlay>
}
