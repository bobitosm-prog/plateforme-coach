'use client'

import { BookOpen, FolderHeart, ImagePlus, Plus } from 'lucide-react'
import { useTranslations } from 'next-intl'

import styles from './NutritionV2.module.css'

interface NutritionToolsProps {
  photoEnabled: boolean
  recipesEnabled: boolean
  onAddFood: () => void
  onPhoto: () => void
  onSavedMeals: () => void
  onRecipes: () => void
}

export default function NutritionTools({
  photoEnabled,
  recipesEnabled,
  onAddFood,
  onPhoto,
  onSavedMeals,
  onRecipes,
}: NutritionToolsProps) {
  const t = useTranslations('nutrition_tab.v2.tools')

  return <section className={styles.tools} aria-labelledby="nutrition-tools-title">
    <div className={styles.toolsHeading}>
      <div>
        <p className={styles.eyebrow}>{t('eyebrow')}</p>
        <h2 id="nutrition-tools-title">{t('title')}</h2>
      </div>
      <span>{t('secondary')}</span>
    </div>
    <div className={styles.toolsGrid}>
      <button type="button" onClick={onAddFood}>
        <Plus size={18} aria-hidden="true" />
        <span><strong>{t('addFood')}</strong><small>{t('addFoodBody')}</small></span>
      </button>
      {photoEnabled && <button type="button" onClick={onPhoto}>
        <ImagePlus size={18} aria-hidden="true" />
        <span><strong>{t('photo')}</strong><small>{t('photoBody')}</small></span>
      </button>}
      <button type="button" onClick={onSavedMeals}>
        <FolderHeart size={18} aria-hidden="true" />
        <span><strong>{t('savedMeals')}</strong><small>{t('savedMealsBody')}</small></span>
      </button>
      {recipesEnabled && <button type="button" onClick={onRecipes}>
        <BookOpen size={18} aria-hidden="true" />
        <span><strong>{t('recipes')}</strong><small>{t('recipesBody')}</small></span>
      </button>}
    </div>
    <p className={styles.toolsScannerStatus}>{t('scannerPending')}</p>
  </section>
}
