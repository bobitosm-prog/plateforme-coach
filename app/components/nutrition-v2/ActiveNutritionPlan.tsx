'use client'

import { CalendarDays, ChevronDown, ShoppingCart, UtensilsCrossed } from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'
import { useMemo, useState } from 'react'

import type { ActiveNutritionPlan as ActiveNutritionPlanModel } from '../../../lib/nutrition/nutrition-dashboard-model'
import {
  computeDayTotals,
  DAYS,
  MEAL_TYPE_TO_KEY,
  parseMealPlan,
  type Day,
  type MealKey,
} from '../../../lib/meal-plan'
import styles from './NutritionV2.module.css'

interface ActiveNutritionPlanProps {
  activePlan: ActiveNutritionPlanModel
  todayKey: string
  onImportMeal: (mealType: MealKey, dayKey: Day) => void
  onOpenShoppingList: () => void
  onConfigurePlan?: () => void
  onRetry: () => void
}

export default function ActiveNutritionPlan({
  activePlan,
  todayKey,
  onImportMeal,
  onOpenShoppingList,
  onConfigurePlan,
  onRetry,
}: ActiveNutritionPlanProps) {
  const t = useTranslations('nutrition_tab.v2.activePlan')
  const locale = useLocale()
  const parsedPlan = useMemo(() => parseMealPlan(activePlan.plan), [activePlan.plan])
  const availableDays = DAYS.filter(day => parsedPlan[day])
  const initialDay = availableDays.includes(todayKey as Day) ? todayKey as Day : availableDays[0] ?? 'lundi'
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [selectedDay, setSelectedDay] = useState<Day>(initialDay)
  const [expandedMeal, setExpandedMeal] = useState<MealKey | null>(null)

  if (activePlan.state === 'loading') {
    return <section className={styles.activePlan} aria-labelledby="active-plan-title">
      <h2 id="active-plan-title" className={styles.srOnly}>{t('eyebrow')}</h2>
      <div className={styles.activePlanSkeleton} aria-label={t('loading')} aria-live="polite">
        <span className={styles.skeleton} />
        <span className={`${styles.skeleton} ${styles.skeletonWide}`} />
      </div>
    </section>
  }

  if (activePlan.state === 'error') {
    return <section className={styles.activePlan} aria-labelledby="active-plan-title">
      <p className={styles.eyebrow}>{t('eyebrow')}</p>
      <div className={styles.activePlanState} role="status">
        <strong id="active-plan-title">{t('errorTitle')}</strong>
        <span>{t('errorBody')}</span>
        <button type="button" onClick={onRetry}>{t('retry')}</button>
      </div>
    </section>
  }

  if (activePlan.state === 'empty' || activePlan.source === 'none' || !activePlan.plan) {
    return <section className={styles.activePlan} aria-labelledby="active-plan-title">
      <p className={styles.eyebrow}>{t('eyebrow')}</p>
      <div className={styles.activePlanState}>
        <UtensilsCrossed size={22} aria-hidden="true" />
        <strong id="active-plan-title">{t('emptyTitle')}</strong>
        <span>{t('emptyBody')}</span>
        {onConfigurePlan && <button type="button" onClick={onConfigurePlan}>{t('configure')}</button>}
      </div>
    </section>
  }

  const selectedPlanDay = parsedPlan[selectedDay]
  const sourceLabel = activePlan.source === 'coach' ? t('coachSource') : t('personalSource')
  const updatedLabel = activePlan.updatedAt
    ? t('updated', { date: new Date(activePlan.updatedAt).toLocaleDateString(locale, { day: 'numeric', month: 'long' }) })
    : null

  return <section className={styles.activePlan} aria-labelledby="active-plan-title">
    <div className={styles.activePlanHeader}>
      <div>
        <p className={styles.eyebrow}>{t('eyebrow')}</p>
        <h2 id="active-plan-title">{sourceLabel}</h2>
        <p>{activePlan.source === 'coach' ? t('coachBody') : t('personalBody')}</p>
        {updatedLabel && <span>{updatedLabel}</span>}
      </div>
      <CalendarDays size={22} aria-hidden="true" />
    </div>

    {activePlan.state === 'partial' && <p className={styles.activePlanNotice} role="status">{t('partial')}</p>}

    <div className={styles.activePlanActions}>
      <button
        type="button"
        aria-expanded={detailsOpen}
        aria-controls="active-plan-details"
        onClick={() => setDetailsOpen(open => !open)}
      >
        {detailsOpen ? t('hidePlan') : t('viewPlan')}
        <ChevronDown size={16} aria-hidden="true" />
      </button>
      <button type="button" onClick={onOpenShoppingList}>
        <ShoppingCart size={16} aria-hidden="true" />
        {t('shoppingList')}
      </button>
    </div>

    {detailsOpen && <div id="active-plan-details" className={styles.activePlanDetails}>
      <div className={styles.activePlanDayHeading}>
        <strong>{selectedDay === todayKey ? t('today') : t('selectedDay')}</strong>
        <span>{t(`days.${selectedDay}`)}</span>
      </div>

      <div className={styles.activePlanDaySelector} aria-label={t('chooseDay')}>
        {availableDays.map(day => <button
          key={day}
          type="button"
          aria-pressed={selectedDay === day}
          onClick={() => {
            setSelectedDay(day)
            setExpandedMeal(null)
          }}
        >
          <span>{t(`daysShort.${day}`)}</span>
          {day === todayKey && <small>{t('todayShort')}</small>}
        </button>)}
      </div>

      {!selectedPlanDay?.meals.length && <p className={styles.activePlanNoMeals}>{t('noMeals')}</p>}

      <div className={styles.activePlanMeals}>
        {selectedPlanDay?.meals.map(meal => {
          const mealKey = MEAL_TYPE_TO_KEY[meal.type]
          const totals = meal.foods.reduce((sum, food) => ({
            kcal: sum.kcal + food.kcal,
            prot: sum.prot + food.prot,
            carb: sum.carb + food.carb,
            fat: sum.fat + food.fat,
          }), { kcal: 0, prot: 0, carb: 0, fat: 0 })
          const expanded = expandedMeal === mealKey
          return <article key={mealKey} className={styles.activePlanMeal}>
            <div className={styles.activePlanMealSummary}>
              <button
                type="button"
                aria-expanded={expanded}
                aria-controls={`active-plan-meal-${mealKey}`}
                onClick={() => setExpandedMeal(expanded ? null : mealKey)}
              >
                <span>
                  <strong>{t(`meals.${mealKey}`)}</strong>
                  <small>{t('mealSummary', { count: meal.foods.length, calories: Math.round(totals.kcal) })}</small>
                </span>
                <ChevronDown size={16} aria-hidden="true" />
              </button>
              {selectedDay === todayKey && <button type="button" onClick={() => onImportMeal(mealKey, selectedDay)}>
                {t('addToJournal')}
              </button>}
            </div>
            {expanded && <div id={`active-plan-meal-${mealKey}`} className={styles.activePlanFoods}>
              {meal.foods.map((food, index) => <div key={`${food.name}-${index}`}>
                <span><strong>{food.name}</strong>{food.qty > 0 && <small>{food.qty} g</small>}</span>
                <span>{food.kcal > 0 ? `${Math.round(food.kcal)} kcal` : '—'}</span>
              </div>)}
              <p>{t('macros', {
                protein: Math.round(totals.prot),
                carbs: Math.round(totals.carb),
                fat: Math.round(totals.fat),
              })}</p>
            </div>}
          </article>
        })}
      </div>

      {selectedPlanDay && <p className={styles.activePlanDayTotal}>
        {t('dayTotal', { calories: Math.round((selectedPlanDay.totals ?? computeDayTotals(selectedPlanDay)).kcal) })}
      </p>}
    </div>}
  </section>
}
