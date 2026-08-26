'use client'

import { ChevronDown, Copy, FolderOpen, ImagePlus, MoreHorizontal, Pencil, Plus, RefreshCw, Save, Trash2 } from 'lucide-react'
import { useTranslations } from 'next-intl'
import type { KeyboardEvent as ReactKeyboardEvent } from 'react'
import { useEffect, useRef, useState } from 'react'

import type {
  NutritionLogRow,
  NutritionMealModel,
  NutritionMealStatus,
  NutritionMealType,
  NutritionViewModel,
} from '../../../lib/nutrition/nutrition-dashboard-model'
import type { Food } from '../../../lib/meal-plan'
import styles from './NutritionV2.module.css'

const MEAL_ORDER: NutritionMealType[] = ['breakfast', 'lunch', 'snack', 'dinner']

export type NutritionNextAction = {
  kind: 'retry' | 'add_first' | 'log_planned' | 'continue_partial' | 'complete_protein' | 'view_journal' | 'complete_day'
  mealType: NutritionMealType | null
}

export function resolveNutritionNextAction({
  model,
  selectedDate,
  hour,
}: {
  model: NutritionViewModel
  selectedDate: string
  hour: number
}): NutritionNextAction {
  if (model.meals.state === 'error' || model.consumed.state === 'error') {
    return { kind: 'retry', mealType: null }
  }

  const meals = model.meals.data ?? []
  const isPast = selectedDate < model.day.localDateKey
  const isFuture = selectedDate > model.day.localDateKey
  if (isFuture) return { kind: 'view_journal', mealType: null }

  if (isPast) {
    const incomplete = meals.find(meal => meal.status === 'empty' || meal.status === 'planned' || meal.status === 'partially_logged')
    return incomplete
      ? { kind: 'complete_day', mealType: incomplete.type }
      : { kind: 'view_journal', mealType: meals.find(meal => meal.logged.length)?.type ?? null }
  }

  const partial = meals.find(meal => meal.status === 'partially_logged')
  if (partial) return { kind: 'continue_partial', mealType: partial.type }

  const planned = meals.find(meal => meal.status === 'planned')
  if (planned) return { kind: 'log_planned', mealType: planned.type }

  const loggedCount = meals.reduce((count, meal) => count + meal.logged.length, 0)
  if (loggedCount === 0) return { kind: 'add_first', mealType: 'breakfast' }

  const protein = model.consumed.data?.protein
  const proteinTarget = model.targets.data?.protein
  if (hour >= 16 && protein != null && proteinTarget != null && proteinTarget > 0 && protein < proteinTarget) {
    return { kind: 'complete_protein', mealType: 'snack' }
  }

  return { kind: 'view_journal', mealType: meals.find(meal => meal.logged.length)?.type ?? null }
}

export function getMealPrimaryAction(status: NutritionMealStatus): 'add' | 'log' | 'continue' | 'view' {
  if (status === 'empty') return 'add'
  if (status === 'planned') return 'log'
  if (status === 'partially_logged') return 'continue'
  return 'view'
}

function sumLoggedCalories(logs: NutritionLogRow[]): number {
  return logs.reduce((total, log) => total + (Number(log.calories) || 0), 0)
}

function foodName(food: unknown): string {
  if (!food || typeof food !== 'object') return ''
  return String((food as Partial<Food>).name ?? '')
}

interface TodayMealsProps {
  model: NutritionViewModel
  selectedDate: string
  actionError: string | null
  onRetry: () => void
  onAddFood: (mealType: NutritionMealType) => void
  onImportPlan: (mealType: NutritionMealType) => void
  onPhoto: (mealType: NutritionMealType) => void
  onSavedMeals: (mealType: NutritionMealType) => void
  onSaveMeal: (meal: NutritionMealModel) => void
  onCopyMeal: (meal: NutritionMealModel) => void
  onClearMeal: (mealType: NutritionMealType) => void
  onReplaceFood: (mealType: NutritionMealType, logId: string) => void
  onDeleteFood: (logId: string) => void
  onUpdateFood: (logId: string, quantity: number) => void
}

export default function TodayMeals({
  model,
  selectedDate,
  actionError,
  onRetry,
  onAddFood,
  onImportPlan,
  onPhoto,
  onSavedMeals,
  onSaveMeal,
  onCopyMeal,
  onClearMeal,
  onReplaceFood,
  onDeleteFood,
  onUpdateFood,
}: TodayMealsProps) {
  const t = useTranslations('nutrition_tab.v2.todayMeals')
  const [openMeal, setOpenMeal] = useState<NutritionMealType | null>(null)
  const [editingLogId, setEditingLogId] = useState<string | null>(null)
  const [activeLogId, setActiveLogId] = useState<string | null>(null)
  const [moreMenuMeal, setMoreMenuMeal] = useState<NutritionMealType | null>(null)
  const [quantity, setQuantity] = useState('')
  const moreMenuRef = useRef<HTMLDivElement>(null)
  const moreButtonRef = useRef<HTMLButtonElement>(null)
  const meals = model.meals.data ?? []
  const isToday = selectedDate === model.day.localDateKey
  const currentHour = new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit',
    hour12: false,
    timeZone: 'Europe/Zurich',
  }).formatToParts(new Date()).find(part => part.type === 'hour')?.value
  const nextAction = resolveNutritionNextAction({ model, selectedDate, hour: Number(currentHour ?? 12) })

  useEffect(() => {
    if (!moreMenuMeal) return

    const focusFrame = window.requestAnimationFrame(() => {
      moreMenuRef.current?.querySelector<HTMLButtonElement>('[role="menuitem"]')?.focus()
    })

    const closeOnOutsideClick = (event: PointerEvent) => {
      if (!moreMenuRef.current?.contains(event.target as Node)) setMoreMenuMeal(null)
    }
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      setMoreMenuMeal(null)
      moreButtonRef.current?.focus()
    }

    document.addEventListener('pointerdown', closeOnOutsideClick)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      window.cancelAnimationFrame(focusFrame)
      document.removeEventListener('pointerdown', closeOnOutsideClick)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [moreMenuMeal])

  const navigateMenu = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    const items = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="menuitem"]'))
    const currentIndex = items.indexOf(document.activeElement as HTMLButtonElement)
    let nextIndex: number | null = null
    if (event.key === 'ArrowDown') nextIndex = (currentIndex + 1) % items.length
    if (event.key === 'ArrowUp') nextIndex = (currentIndex - 1 + items.length) % items.length
    if (event.key === 'Home') nextIndex = 0
    if (event.key === 'End') nextIndex = items.length - 1
    if (nextIndex == null || items.length === 0) return
    event.preventDefault()
    items[nextIndex]?.focus()
  }

  const openOrAct = (meal: NutritionMealModel) => {
    const action = getMealPrimaryAction(meal.status)
    if (action === 'add') return onAddFood(meal.type)
    if (action === 'log' && isToday) return onImportPlan(meal.type)
    setOpenMeal(meal.type)
  }

  const runNextAction = () => {
    if (nextAction.kind === 'retry') return onRetry()
    if (!nextAction.mealType) return setOpenMeal(meals.find(meal => meal.logged.length)?.type ?? null)
    if (nextAction.kind === 'log_planned' && isToday) return onImportPlan(nextAction.mealType)
    if (nextAction.kind === 'add_first' || nextAction.kind === 'complete_protein' || nextAction.kind === 'complete_day') {
      return onAddFood(nextAction.mealType)
    }
    setOpenMeal(nextAction.mealType)
  }

  return <section className={styles.todayMeals} aria-labelledby="today-meals-title">
    <div className={styles.todayMealsHeading}>
      <div>
        <p className={styles.eyebrow}>{t('eyebrow')}</p>
        <h2 id="today-meals-title">{t('title')}</h2>
      </div>
      <span>{t('count', { count: MEAL_ORDER.length })}</span>
    </div>

    <aside className={styles.nextAction} aria-labelledby="nutrition-next-action-title">
      <div>
        <span id="nutrition-next-action-title">{t('nextAction.title')}</span>
        <strong>{t(`nextAction.${nextAction.kind}`, {
          meal: nextAction.mealType ? t(`meal.${nextAction.mealType}`) : '',
        })}</strong>
      </div>
      <button type="button" onClick={runNextAction}>{nextAction.kind === 'retry' ? t('retry') : t('open')}</button>
    </aside>

    {actionError && <p className={styles.mealActionError} role="status">{actionError}</p>}

    {model.meals.state === 'loading' && <div className={styles.mealsState} aria-live="polite">{t('loading')}</div>}
    {model.meals.state === 'error' && <div className={styles.mealsState} role="status">
      <strong>{t('error')}</strong>
      <button type="button" onClick={onRetry}>{t('retry')}</button>
    </div>}

    {model.meals.state !== 'loading' && model.meals.state !== 'error' && <div className={styles.mealList}>
      {MEAL_ORDER.map(type => {
        const meal = meals.find(entry => entry.type === type) ?? { type, planned: [], logged: [], completed: false, status: 'empty' as const }
        const expanded = openMeal === type
        const primaryAction = getMealPrimaryAction(meal.status)
        const calories = sumLoggedCalories(meal.logged)
        const activeLog = meal.logged.find(log => log.id === activeLogId) ?? meal.logged[0] ?? null
        const plannedNames = meal.planned.map(foodName).filter(Boolean)
        const summary = meal.status === 'planned'
          ? t('plannedSummary', { food: plannedNames.slice(0, 2).join(', ') || t('plannedMeal') })
          : meal.logged.length
            ? t('loggedSummary', { count: Math.round(calories) })
            : t('emptySummary')

        return <article key={type} className={styles.mealRow} data-status={meal.status}>
          <div className={styles.mealRowMain}>
            <button
              type="button"
              className={styles.mealToggle}
              aria-expanded={expanded}
              aria-controls={`nutrition-meal-${type}`}
              onClick={() => setOpenMeal(expanded ? null : type)}
            >
              <span className={styles.mealText}>
                <strong>{t(`meal.${type}`)}</strong>
                <span><b>{t(`status.${meal.status}`)}</b> · {summary}</span>
              </span>
              <ChevronDown size={18} aria-hidden="true" />
            </button>
            <button type="button" className={styles.mealPrimaryAction} onClick={() => openOrAct(meal)}>
              {t(`action.${primaryAction}`)}
            </button>
          </div>

          {expanded && <div id={`nutrition-meal-${type}`} className={styles.mealDetail}>
            {model.meals.state === 'partial' && <p className={styles.partialNotice}>{t('partial')}</p>}

            {plannedNames.length > 0 && <div className={styles.mealDetailGroup}>
              <h3>{t('planned')}</h3>
              <ul>{plannedNames.map((name, index) => <li key={`${name}-${index}`}>{name}</li>)}</ul>
            </div>}

            <div className={styles.mealDetailGroup}>
              <h3>{t('logged')}</h3>
              {meal.logged.length === 0 && <p>{t('noLoggedFoods')}</p>}
              {meal.logged.map(log => <div key={log.id} className={styles.loggedFood}>
                {editingLogId === log.id ? <div>
                  <strong>{log.custom_name || log.food_name || t('foodFallback')}</strong>
                  <div className={styles.quantityEditor}>
                    <input
                      aria-label={t('quantity')}
                      type="number"
                      min="1"
                      value={quantity}
                      onChange={event => setQuantity(event.target.value)}
                    />
                    <button type="button" onClick={() => {
                      onUpdateFood(log.id, Number(quantity))
                      setEditingLogId(null)
                    }}>{t('save')}</button>
                    <button type="button" onClick={() => setEditingLogId(null)}>{t('cancel')}</button>
                  </div>
                </div> : <button
                  type="button"
                  className={styles.foodSelector}
                  aria-pressed={activeLog?.id === log.id}
                  onClick={() => setActiveLogId(log.id)}
                >
                  <strong>{log.custom_name || log.food_name || t('foodFallback')}</strong>
                  <span>{log.quantity_g ?? 0} g · {Math.round(Number(log.calories) || 0)} kcal</span>
                </button>}
              </div>)}
            </div>

            <div className={styles.mealActionArea} ref={moreMenuMeal === type ? moreMenuRef : undefined}>
              <div className={styles.mealActionBar} aria-label={t('mealActions')}>
                {activeLog && <button type="button" aria-label={`${t('edit')} — ${activeLog.custom_name || activeLog.food_name || t('foodFallback')}`} onClick={() => {
                  setEditingLogId(activeLog.id)
                  setQuantity(String(activeLog.quantity_g || 100))
                }}><Pencil size={15} aria-hidden="true" /><span>{t('compactEdit')}</span></button>}
                <button type="button" aria-label={t('savedMeals')} onClick={() => onSavedMeals(type)}><FolderOpen size={15} aria-hidden="true" /><span>{t('savedMeals')}</span></button>
                {meal.logged.length > 0 && <button type="button" aria-label={t('saveMeal')} onClick={() => onSaveMeal(meal)}><Save size={15} aria-hidden="true" /><span>{t('compactSave')}</span></button>}
                {meal.logged.length > 0 && <button type="button" aria-label={t('copyMeal')} onClick={() => onCopyMeal(meal)}><Copy size={15} aria-hidden="true" /><span>{t('copyMeal')}</span></button>}
                <button
                  type="button"
                  aria-label={t('moreActions')}
                  aria-expanded={moreMenuMeal === type}
                  aria-haspopup="menu"
                  aria-controls={`nutrition-meal-more-${type}`}
                  onClick={event => {
                    moreButtonRef.current = event.currentTarget
                    setMoreMenuMeal(current => current === type ? null : type)
                  }}
                ><MoreHorizontal size={16} aria-hidden="true" /><span>{t('more')}</span></button>
              </div>

              {moreMenuMeal === type && <div id={`nutrition-meal-more-${type}`} className={styles.mealOverflowMenu} role="menu" aria-label={t('moreActions')} onKeyDown={navigateMenu}>
                <button type="button" role="menuitem" onClick={() => {
                  onAddFood(type)
                  setMoreMenuMeal(null)
                }}><Plus size={16} aria-hidden="true" />{t('food')}</button>
                {meal.planned.length > 0 && isToday && <button type="button" role="menuitem" onClick={() => {
                  onImportPlan(type)
                  setMoreMenuMeal(null)
                }}><Plus size={16} aria-hidden="true" />{t('fromPlan')}</button>}
                {model.tools.photoAnalysis && <button type="button" role="menuitem" onClick={() => {
                  onPhoto(type)
                  setMoreMenuMeal(null)
                }}><ImagePlus size={16} aria-hidden="true" />{t('photo')}</button>}
                {activeLog && <button type="button" role="menuitem" onClick={() => {
                  onReplaceFood(type, activeLog.id)
                  setMoreMenuMeal(null)
                }}><RefreshCw size={16} aria-hidden="true" />{t('replace')}</button>}
                {meal.logged.length > 0 && <div className={styles.mealOverflowSeparator} role="separator" />}
                {meal.logged.length > 0 && <button type="button" role="menuitem" data-destructive onClick={() => {
                  onClearMeal(type)
                  setMoreMenuMeal(null)
                }}><Trash2 size={16} aria-hidden="true" />{t('clearMeal')}</button>}
                {activeLog && <button type="button" role="menuitem" data-destructive onClick={() => {
                  onDeleteFood(activeLog.id)
                  setMoreMenuMeal(null)
                }}><Trash2 size={16} aria-hidden="true" />{t('delete')}</button>}
              </div>}
            </div>
          </div>}
        </article>
      })}
    </div>}
  </section>
}
