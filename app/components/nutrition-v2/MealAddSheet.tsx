'use client'

import { Camera, FolderOpen, Search, ScanBarcode } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { RailOverlay } from '../ui/RailOverlay'
import TrainingSheet from '../training-v2/TrainingSheet'
import type { MealComposerSource } from './MealComposer'
import styles from './NutritionQuickEntry.module.css'

export default function MealAddSheet({ mealLabel, photoEnabled, onSelect, onClose }: {
  mealLabel: string
  photoEnabled: boolean
  onSelect: (source: MealComposerSource) => void
  onClose: () => void
}) {
  const t = useTranslations('nutrition_tab.journal')
  return <RailOverlay><TrainingSheet viewportContained title={mealLabel} description={t('addTitle')} onClose={onClose}>
    <div className={styles.addOptions}>
      <button type="button" onClick={() => onSelect('recent')}><Search size={22} aria-hidden="true"/><span>{t('food')}</span></button>
      <button type="button" onClick={() => onSelect('saved')}><FolderOpen size={22} aria-hidden="true"/><span>{t('saved')}</span></button>
      {photoEnabled && <button type="button" onClick={() => onSelect('photo')}><Camera size={22} aria-hidden="true"/><span>{t('photo')}</span></button>}
      <button type="button" onClick={() => onSelect('barcode')}><ScanBarcode size={22} aria-hidden="true"/><span>{t('barcode')}</span></button>
    </div>
  </TrainingSheet></RailOverlay>
}
