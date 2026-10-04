'use client'
import { AiConsentDeclinedError } from '@/lib/ai/consent-policy'
import { aiFetch } from '@/lib/ai/consent-client'
import dynamic from 'next/dynamic'
import React, { useEffect, useState } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { Trash2, Camera, Pencil, Droplets } from 'lucide-react'
import ImportPlanSheet from './nutrition/ImportPlanSheet'
import FoodSearch from '../FoodSearch'
import { prepareSavedFood, resizeSavedFood, savedMealTotals, validSavedMeal } from '../../../lib/nutrition/saved-meal-editor'
import { normalizeFoodItem } from '../../../lib/utils/food'
import ShoppingList from '../ShoppingList'
import NutritionPlanConsistencyNotice from '../nutrition-v2/NutritionPlanConsistencyNotice'
import { RailOverlay } from '../ui/RailOverlay'
import ModalHeader from '../ui/ModalHeader'
import SectionTitle from '../ui/SectionTitle'
import AiQuotaBadge from '../ui/AiQuotaBadge'
import {
  fonts, colors, subtitleStyle, statSmallStyle, bodyStyle, labelStyle, mutedStyle, cardStyle, Z_MODAL,
} from '../../../lib/design-tokens'
import { parseMealPlan, getMealByKey, type Day, type DayPlan, type MealKey } from '../../../lib/meal-plan'
import type { UserCapabilities } from '../../../lib/entitlements/capabilities'
import type { ActiveCoachResolutionState } from '../../../lib/coach-relations/repository'
import useNutritionDashboardModel from '../../hooks/useNutritionDashboardModel'
import { getNutritionDayKey } from '../../../lib/nutrition/nutrition-date'
import { normalizeNutritionMealType, type NutritionMealType } from '../../../lib/nutrition/nutrition-dashboard-model'
import NutritionV2 from '../nutrition-v2/NutritionV2'
import TodayMeals from '../nutrition-v2/TodayMeals'
import ActiveNutritionPlan from '../nutrition-v2/ActiveNutritionPlan'
import NutritionTools from '../nutrition-v2/NutritionTools'
import MealContextChooser from '../nutrition-v2/MealContextChooser'
import MealComposer, { type MealComposerSource } from '../nutrition-v2/MealComposer'
import MealAddSheet from '../nutrition-v2/MealAddSheet'
import quickEntryStyles from '../nutrition-v2/NutritionQuickEntry.module.css'

const RecipesSection = dynamic(() => import('../RecipesSection'), { ssr: false })
// MEAL_LABELS moved inside component to use translations — see getMealLabel()
const MEAL_ORDER: MealKey[] = ['petit_dejeuner', 'dejeuner', 'collation', 'diner']
const NUTRITION_MEAL_TO_KEY: Record<NutritionMealType, MealKey> = {
  breakfast: 'petit_dejeuner',
  lunch: 'dejeuner',
  snack: 'collation',
  dinner: 'diner',
}

type SubTab = 'today' | 'plan' | 'recipes' | 'meals'
type PendingMealAction = 'food' | 'photo'
export type SavedMealsLoadState = 'idle' | 'loading' | 'ready' | 'empty' | 'error'

export function resolveSavedMealsLoadState(error: unknown, meals: unknown[]): SavedMealsLoadState {
  if (error) return 'error'
  return meals.length > 0 ? 'ready' : 'empty'
}

interface PhotoFoodEstimate {
  name: string
  quantity_g: number
  calories: number
  proteins: number
  carbs: number
  fats: number
}

interface PhotoAnalysisResult {
  foods: PhotoFoodEstimate[]
  total_calories?: number
}

interface NutritionTabProps {
  profile: any
  capabilities: UserCapabilities
  coachRelationStatus: ActiveCoachResolutionState['status']
  coachRelationIsAuthoritative: boolean
  coachId: string | null
  supabase: any
  userId: string
  fetchAll: () => Promise<void>
  onOpenProgramSettings: () => void
  onOpenBarcode: () => void
  quickAction?: 'photo' | null
  onQuickActionHandled?: () => void
}

export default function NutritionTab({ profile, capabilities, coachRelationStatus, coachRelationIsAuthoritative, coachId, supabase, userId, onOpenProgramSettings, onOpenBarcode, quickAction, onQuickActionHandled }: NutritionTabProps) {
  const nt = useTranslations('nutrition_tab')
  const locale = useLocale()
  const MEAL_LABEL_MAP: Record<string, string> = { petit_dejeuner: 'breakfast', dejeuner: 'lunch', collation: 'snack', diner: 'dinner' }
  const getMealLabel = (key: string) => nt(`meals.${MEAL_LABEL_MAP[key] || key}`)
  const MEAL_LABELS: Record<string, string> = { petit_dejeuner: getMealLabel('petit_dejeuner'), dejeuner: getMealLabel('dejeuner'), collation: getMealLabel('collation'), diner: getMealLabel('diner') }
  const [showFoodSearch, setShowFoodSearch] = useState<string | null>(null) // meal_type or null
  const [composer, setComposer] = useState<{mealType: MealKey; date: string; initialFoods?: Record<string, any>[]; initialSource?: MealComposerSource} | null>(null)
  const [addingMeal, setAddingMeal] = useState<MealKey | null>(null)
  const [pendingMealAction, setPendingMealAction] = useState<PendingMealAction | null>(null)
  const [showShoppingModal, setShowShoppingModal] = useState(false)
  const [importingMeal, setImportingMeal] = useState<{ mealType: MealKey; dayKey: Day } | null>(null)
  const [swappingFoodId, setSwappingFoodId] = useState<string | null>(null)
  const [showPhotoCapture, setShowPhotoCapture] = useState(false)
  const [photoMealTarget, setPhotoMealTarget] = useState('')
  const [analyzingPhoto, setAnalyzingPhoto] = useState(false)
  const [photoResults, setPhotoResults] = useState<PhotoAnalysisResult | null>(null)
  const [photoError, setPhotoError] = useState<string | null>(null)
  // Meal save/copy/reuse
  const [mealActionError, setMealActionError] = useState<string | null>(null)
  const [showSaveMealPopup, setShowSaveMealPopup] = useState(false)
  const [saveMealData, setSaveMealData] = useState<any>(null)
  const [saveMealName, setSaveMealName] = useState('')
  const [saveMealType, setSaveMealType] = useState<string | null>(null)
  const [showCopyMealPopup, setShowCopyMealPopup] = useState(false)
  const [copyMealData, setCopyMealData] = useState<any>(null)
  const [copyTargetDate, setCopyTargetDate] = useState('')
  const [copyTargetMealType, setCopyTargetMealType] = useState('')
  const [showSavedMeals, setShowSavedMeals] = useState(false)
  const [savedMeals, setSavedMeals] = useState<any[]>([])
  const [savedMealsState, setSavedMealsState] = useState<SavedMealsLoadState>('idle')
  const [useSavedMealTarget, setUseSavedMealTarget] = useState('')
  // Mes repas tab state
  const [myMeals, setMyMeals] = useState<any[]>([])
  const [myMealsError, setMyMealsError] = useState<string | null>(null)
  const [myMealsSearch, setMyMealsSearch] = useState('')
  const [myMealsFilter, setMyMealsFilter] = useState('all')
  const [mealToJournal, setMealToJournal] = useState<any>(null)
  const [editMealError, setEditMealError] = useState<string | null>(null)
  const saveMealLock = React.useRef(false)
  const [editingMeal, setEditingMeal] = useState<any>(null)
  const [confirmDeleteMeal, setConfirmDeleteMeal] = useState<string | null>(null)
  const [editMealSaving, setEditMealSaving] = useState(false)
  const [editMealSaved, setEditMealSaved] = useState(false)
  const [editAddFoodQuery, setEditAddFoodQuery] = useState('')
  const [editAddFoodResults, setEditAddFoodResults] = useState<any[]>([])
  const photoInputRef = React.useRef<HTMLInputElement>(null)
  const nutritionDashboard = useNutritionDashboardModel({
    supabase,
    userId,
    profile,
    capabilities,
    coachRelation: { status: coachRelationStatus, coachId, isAuthoritative: coachRelationIsAuthoritative },
  })
  const { model: nutritionModel, selectedDate, setSelectedDate, dailyLogs, refresh: refreshNutrition } = nutritionDashboard
  const today = nutritionModel.day.localDateKey
  const todayKey = nutritionModel.day.dayKey
  const waterToday = nutritionModel.hydration.data?.consumedMl ?? 0
  const [subTab, setSubTab] = useState<SubTab>('today')

  async function addWater(ml: number) {
    if (!userId) return
    await supabase.from('water_intake').insert({ user_id: userId, amount_ml: ml, date: today })
    await refreshNutrition()
  }

  // Fetch saved meals for "Mes Repas" tab
  useEffect(() => {
    if (subTab === 'meals' && userId) {
      setMyMealsError(null)
      supabase.from('saved_meals').select('*').eq('user_id', userId).order('created_at', { ascending: false })
        .then(({ data, error }: any) => {
          if (error) {
            setMyMeals([])
            setMyMealsError(nt('chrome.savedMealsError'))
            return
          }
          setMyMeals(data || [])
        })
    }
  }, [nt, subTab, supabase, userId])

  async function deleteDailyLog(id: string) {
    await supabase.from('daily_food_logs').delete().eq('id', id)
    await refreshNutrition()
  }

  async function updateFoodQuantity(id: string, newQty: number) {
    if (!newQty || newQty <= 0) return
    const log = dailyLogs.find(l => l.id === id)
    if (!log) return
    const oldQty = log.quantity_g || 100
    const ratio = newQty / oldQty
    const updated = { quantity_g: newQty, calories: Math.round((log.calories || 0) * ratio), protein: Math.round((log.protein || 0) * ratio * 10) / 10, carbs: Math.round((log.carbs || 0) * ratio * 10) / 10, fat: Math.round((log.fat || 0) * ratio * 10) / 10 }
    await supabase.from('daily_food_logs').update(updated).eq('id', id)
    await refreshNutrition()
  }

  async function loadSavedMeals(targetMealType: string) {
    setUseSavedMealTarget(targetMealType)
    setShowSavedMeals(true)
    setSavedMealsState('loading')
    const { data, error } = await supabase
      .from('saved_meals')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
    const meals = Array.isArray(data) ? data : []
    const nextState = resolveSavedMealsLoadState(error, meals)
    setSavedMeals(nextState === 'error' ? [] : meals)
    setSavedMealsState(nextState)
  }

  async function handlePhotoCapture(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setAnalyzingPhoto(true)
    setPhotoError(null)
    const reader = new FileReader()
    reader.onload = async () => {
      const base64 = (reader.result as string).split(',')[1]
      try {
        const res = await aiFetch('/api/analyze-meal-photo', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ image: base64 }) }, userId)
        if (!res.ok) throw new Error('PHOTO_ANALYSIS_FAILED')
        const data = await res.json() as PhotoAnalysisResult
        if (!Array.isArray(data.foods)) throw new Error('PHOTO_ANALYSIS_INVALID')
        setPhotoResults(data)
      } catch (error) {
        setPhotoResults(null)
        if (!(error instanceof AiConsentDeclinedError)) setPhotoError(nt('chrome.photoError'))
      }
      finally { setAnalyzingPhoto(false) }
    }
    reader.onerror = () => {
      setAnalyzingPhoto(false)
      setPhotoError(nt('chrome.photoError'))
    }
    reader.readAsDataURL(file)
  }

  function updatePhotoFoodQuantity(index: number, quantity: number) {
    if (!Number.isFinite(quantity) || quantity <= 0) return
    setPhotoResults(current => {
      if (!current) return current
      const foods = current.foods.map((food, foodIndex) => {
        if (foodIndex !== index) return food
        const previousQuantity = Math.max(food.quantity_g || 100, 1)
        const ratio = quantity / previousQuantity
        return {
          ...food,
          quantity_g: quantity,
          calories: Math.round((food.calories || 0) * ratio),
          proteins: Math.round((food.proteins || 0) * ratio * 10) / 10,
          carbs: Math.round((food.carbs || 0) * ratio * 10) / 10,
          fats: Math.round((food.fats || 0) * ratio * 10) / 10,
        }
      })
      return { ...current, foods }
    })
  }

  async function addPhotoFoods() {
    if (!photoResults?.foods) return
    for (const food of photoResults.foods) {
      const { error } = await supabase.from('daily_food_logs').insert({
        user_id: userId, date: today, meal_type: photoMealTarget,
        custom_name: food.name, quantity_g: food.quantity_g || 100,
        calories: food.calories || 0, protein: food.proteins || 0, carbs: food.carbs || 0, fat: food.fats || 0,
      })
      if (error) {
        setPhotoError(nt('chrome.photoSaveError'))
        return
      }
    }
    setShowPhotoCapture(false)
    setPhotoResults(null)
    await refreshNutrition()
  }

  async function clearMeal(mealType: string) {
    const normalizedTarget = normalizeNutritionMealType(mealType)
    const toDelete = dailyLogs.filter(l => normalizeNutritionMealType(l.meal_type) === normalizedTarget)
    for (const l of toDelete) await supabase.from('daily_food_logs').delete().eq('id', l.id)
    await refreshNutrition()
  }

  async function applySavedMeal(meal: any, targetMealType: string) {
    setComposer({mealType: targetMealType as MealKey, date: selectedDate, initialFoods: meal.foods ?? []})
  }

  async function copyMealToDate(foods: any[], targetDate: string, targetMealType: string) {
    for (const food of foods) {
      await supabase.from('daily_food_logs').insert({
        user_id: userId, date: targetDate, meal_type: targetMealType,
        custom_name: food.custom_name || food.name, quantity_g: food.quantity_g || 100,
        calories: food.calories || 0, protein: food.protein || food.proteins || 0,
        carbs: food.carbs || 0, fat: food.fat || food.fats || 0,
      })
    }
    await refreshNutrition()
  }

  async function importMealFromPlan(mealType: MealKey, dayKey: Day) {
    const planDay = getPlanDayData(dayKey)
    if (!planDay || dayKey !== todayKey) return
    const foods = getMealByKey(planDay.day, mealType)
    if (!foods.length) return
    setMealActionError(null)
    const inserts = foods.map(f => ({
      user_id: userId, date: today, meal_type: mealType,
      custom_name: f.name || 'Aliment', quantity_g: f.qty || 100,
      calories: f.kcal, protein: f.prot, carbs: f.carb, fat: f.fat,
    }))
    const { error } = await supabase.from('daily_food_logs').insert(inserts)
    if (error) {
      setMealActionError(nt('v2.todayMeals.importError'))
      return
    }
    setImportingMeal(null)
    await refreshNutrition()
  }

  // Get plan data normalized to the canonical DayPlan format.
  // Plan authority is resolved by the unified Nutrition model.
  function getPlanDayData(dayKey: Day): { day: DayPlan; planId: string | null } | null {
    const plan = nutritionModel.activePlan.plan
    if (!plan) return null
    const day = parseMealPlan(plan)[dayKey]
    if (day) return { day, planId: nutritionModel.activePlan.id }
    return null
  }

  const nutritionManaged = nutritionModel.coachRelation.status === 'active' && !capabilities.nutrition

  useEffect(() => {
    if (quickAction !== 'photo') return
    setPendingMealAction('photo')
    onQuickActionHandled?.()
  }, [onQuickActionHandled, quickAction])

  function chooseMealContext(mealType: MealKey) {
    const action = pendingMealAction
    setPendingMealAction(null)
    if (action === 'photo') setComposer({mealType, date: selectedDate, initialSource: 'photo'})
    else if (action) setAddingMeal(mealType)
  }


  return (
    <NutritionV2
      userId={userId}
      model={nutritionModel}
      selectedDate={selectedDate}
      onAddMeal={() => {
        setSubTab('today')
        setPendingMealAction('food')
      }}
      onRetry={() => void refreshNutrition()}
      onPhoto={() => setPendingMealAction('photo')}
      onBarcode={onOpenBarcode}
      onDateChange={setSelectedDate}
      compactToday={subTab === 'today'}
    >

      {/* PILLS NAVIGATION */}
      <div className={quickEntryStyles.pageTabs} role="group" aria-label={nt('v2.title')}>
        {([
          { id: 'today' as SubTab, label: nt('tabs.journal') },
          { id: 'plan' as SubTab, label: nt('tabs.plan') },
        ]).map(({ id, label }) => {
          return (
            <button type="button" key={id} onClick={() => setSubTab(id)} aria-pressed={subTab === id}>
              {label}
            </button>
          )
        })}
      </div>

      {addingMeal && <MealAddSheet
        mealLabel={MEAL_LABELS[addingMeal]}
        photoEnabled={capabilities.ai}
        onClose={() => setAddingMeal(null)}
        onSelect={initialSource => {
          setComposer({mealType: addingMeal, date: selectedDate, initialSource})
          setAddingMeal(null)
        }}
      />}

      {/* Food search modal */}
      {composer && <MealComposer
        key={`${userId}-${composer.date}-${composer.mealType}`}
        supabase={supabase} userId={userId} date={composer.date} mealType={composer.mealType}
        mealLabel={MEAL_LABELS[composer.mealType]}
        plannedFoods={composer.date === today && getPlanDayData(todayKey) ? getMealByKey(getPlanDayData(todayKey)!.day, composer.mealType) : []}
        initialFoods={composer.initialFoods}
        initialSource={composer.initialSource ?? 'recent'}
        photoEnabled={capabilities.ai}
        onSaved={refreshNutrition}
        onClose={() => { setComposer(null); void refreshNutrition() }}
      />}
      {showFoodSearch && (
        <FoodSearch
          supabase={supabase}
          userId={userId}
          defaultMealType={showFoodSearch}
          dateOverride={selectedDate}
          onAdded={async () => {
            if (swappingFoodId) { await supabase.from('daily_food_logs').delete().eq('id', swappingFoodId); setSwappingFoodId(null) }
            setShowFoodSearch(null)
            await refreshNutrition()
          }}
          onClose={() => { setShowFoodSearch(null); setSwappingFoodId(null) }}
        />
      )}

      {pendingMealAction && <MealContextChooser
        onClose={() => setPendingMealAction(null)}
        onSelect={chooseMealContext}
      />}

      {/* MON PLAN TAB — daily logs as source of truth */}
      {subTab === 'plan' && nutritionModel.activePlan.state === 'ready' && <NutritionPlanConsistencyNotice
        plan={nutritionModel.activePlan.plan} profile={profile} source={nutritionModel.activePlan.source}
      />}
      {subTab === 'today' && ((): React.ReactNode => {
        const waterGoal = profile?.water_goal || 3000
        const pctWater = Math.min(100, Math.round((waterToday / waterGoal) * 100))
        const canAddWater = selectedDate === today

        return (
          <div style={{ padding: '0 4px' }}>
            <section className={quickEntryStyles.section}>
              <TodayMeals
                key={`journal:${userId}:${selectedDate}`}
                journalMode
                model={nutritionModel}
                selectedDate={selectedDate}
                actionError={mealActionError}
                onRetry={() => void refreshNutrition()}
                onChooseMeal={() => setPendingMealAction('food')}
                onAddFood={mealType => setAddingMeal(NUTRITION_MEAL_TO_KEY[mealType])}
                onImportPlan={mealType => setImportingMeal({
                  mealType: NUTRITION_MEAL_TO_KEY[mealType],
                  dayKey: getNutritionDayKey(selectedDate) as Day,
                })}
                onPhoto={mealType => {
                  setPhotoMealTarget(NUTRITION_MEAL_TO_KEY[mealType])
                  setPhotoError(null)
                  setShowPhotoCapture(true)
                }}
                onSavedMeals={mealType => {
                  void loadSavedMeals(NUTRITION_MEAL_TO_KEY[mealType])
                }}
                onSaveMeal={meal => {
                  const mealType = NUTRITION_MEAL_TO_KEY[meal.type]
                  setSaveMealData({ mealType, foods: meal.logged.map(log => ({ name: log.custom_name || log.food_name, quantity: log.quantity_g, calories: log.calories, proteins: log.protein, carbs: log.carbs, fats: log.fat })) })
                  setSaveMealName('')
                  setSaveMealType(mealType)
                  setEditMealError(null); setShowSaveMealPopup(true)
                }}
                onCopyMeal={meal => {
                  const mealType = NUTRITION_MEAL_TO_KEY[meal.type]
                  setCopyMealData({ mealType, foods: meal.logged })
                  setCopyTargetDate('')
                  setCopyTargetMealType(mealType)
                  setShowCopyMealPopup(true)
                }}
                onClearMeal={mealType => void clearMeal(NUTRITION_MEAL_TO_KEY[mealType])}
                onReplaceFood={(mealType, logId) => {
                  setSwappingFoodId(logId)
                  setShowFoodSearch(NUTRITION_MEAL_TO_KEY[mealType])
                }}
                onDeleteFood={logId => void deleteDailyLog(logId)}
                onUpdateFood={(logId, quantity) => void updateFoodQuantity(logId, quantity)}
              />
            </section>

            {/* Hydration remains a separate legacy module during the progressive migration. */}
            <div className={quickEntryStyles.hydrationCard}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ display: 'grid', width: 38, height: 38, placeItems: 'center', borderRadius: 12, background: '#2b271e' }}>
                  <Droplets size={18} color="#e6c364" aria-hidden="true" />
                </div>
                <div>
                  <span style={{ ...subtitleStyle, display: 'block', fontSize: 10, letterSpacing: '0.12em' }}>{nt('chrome.hydration')}</span>
                  <strong style={{ fontFamily: fonts.body, fontSize: 17, color: '#f7f4ed', fontWeight: 750 }}>
                    {(waterToday / 1000).toFixed(1)}L <span style={{ ...mutedStyle, fontSize: 11 }}>/ {(waterGoal / 1000).toFixed(1)}L · {pctWater}%</span>
                  </strong>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, flex: '1 1 170px', maxWidth: 240 }}>
                <button onClick={() => canAddWater && addWater(250)} disabled={!canAddWater} style={{ minHeight: 44, flex: 1, padding: '8px 10px', borderRadius: 10, background: '#2b271e', border: 'none', color: '#e6c364', fontFamily: fonts.body, fontSize: 12, fontWeight: 750, cursor: canAddWater ? 'pointer' : 'not-allowed', opacity: canAddWater ? 1 : 0.4 }}>{nt('chrome.addWater250')}</button>
                <button onClick={() => canAddWater && addWater(500)} disabled={!canAddWater} style={{ minHeight: 44, flex: 1, padding: '8px 10px', borderRadius: 10, background: '#2b271e', border: 'none', color: '#e6c364', fontFamily: fonts.body, fontSize: 12, fontWeight: 750, cursor: canAddWater ? 'pointer' : 'not-allowed', opacity: canAddWater ? 1 : 0.4 }}>{nt('chrome.addWater500')}</button>
              </div>
            </div>

            <div className={quickEntryStyles.utilityLinks}>
              <button type="button" onClick={() => setSubTab('meals')}>{nt('v2.tools.savedMeals')}</button>
              {capabilities.nutrition && <button type="button" onClick={() => setSubTab('recipes')}>{nt('v2.tools.recipes')}</button>}
            </div>

          </div>
        )
      })()}

      {/* The legacy Plan tab now delegates to the single V2 plan representation. */}
      {subTab === 'plan' && <ActiveNutritionPlan
        key={`${nutritionModel.activePlan.id ?? 'none'}-${nutritionModel.activePlan.state}-${nutritionModel.activePlan.updatedAt ?? 'none'}`}
        activePlan={nutritionModel.activePlan}
        todayKey={todayKey}
        onImportMeal={(mealType, dayKey) => {
          if (dayKey !== todayKey) return
          const planDay = getPlanDayData(dayKey)
          setComposer({mealType, date: today, initialFoods: planDay ? getMealByKey(planDay.day,mealType) : []})
        }}
        onOpenShoppingList={() => setShowShoppingModal(true)}
        onConfigurePlan={capabilities.nutrition ? onOpenProgramSettings : undefined}
        onRetry={() => void refreshNutrition()}
      />}

      {importingMeal && (() => {
        const planDay = getPlanDayData(importingMeal.dayKey)
        const foods = planDay ? getMealByKey(planDay.day, importingMeal.mealType) : []
        return <ImportPlanSheet
          mealLabel={MEAL_LABELS[importingMeal.mealType]}
          foods={foods}
          isCoachManaged={nutritionManaged}
          onImport={() => void importMealFromPlan(importingMeal.mealType, importingMeal.dayKey)}
          onClose={() => setImportingMeal(null)}
        />
      })()}

      {/* Recipes sub-tab */}
      {subTab === 'recipes' && (
        <div style={{ padding: '0 20px', paddingBottom: 'calc(160px + env(safe-area-inset-bottom, 0px))' }}>
          <RecipesSection supabase={supabase} userId={userId} aiAllowed={capabilities.ai} />
        </div>
      )}

      {/* Mes Repas sub-tab */}
      {subTab === 'meals' && (
        <div style={{ padding: '0 20px', paddingBottom: 'calc(160px + env(safe-area-inset-bottom, 0px))' }}>
          <SectionTitle noPadding title={nt('chrome.myMeals')} />
          <div style={{ ...cardStyle, padding: 16 }}>
            {myMealsError && <p role="status" style={{ ...bodyStyle, color: colors.error, margin: '0 0 12px' }}>{myMealsError}</p>}
            {/* Search */}
            <input value={myMealsSearch} onChange={e => setMyMealsSearch(e.target.value)} placeholder={nt('chrome.searchMeal')} style={{ width: '100%', background: colors.background, border: `1px solid ${colors.goldBorder}`, borderRadius: 12, padding: '10px 14px', color: colors.text, fontFamily: fonts.body, fontSize: 13, outline: 'none', marginBottom: 12 }} />
            {/* Filter pills */}
            <div style={{ display: 'flex', gap: 6, marginBottom: 16, overflowX: 'auto', scrollbarWidth: 'none' }}>
              {[{ k: 'all', l: nt('filters.all') }, { k: 'petit_dejeuner', l: nt('filters.breakfast') }, { k: 'dejeuner', l: nt('filters.lunch') }, { k: 'diner', l: nt('filters.dinner') }, { k: 'collation', l: nt('filters.snack') }].map(({ k, l }) => (
                <button key={k} onClick={() => setMyMealsFilter(k)} style={{
                  fontSize: 9, fontFamily: fonts.alt, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.18em',
                  padding: '8px 14px', borderRadius: 10, whiteSpace: 'nowrap', cursor: 'pointer', transition: 'all 0.15s',
                  background: myMealsFilter === k ? 'rgba(230,195,100,0.15)' : 'rgba(255,255,255,0.06)',
                  backdropFilter: 'blur(8px)',
                  border: `1px solid ${myMealsFilter === k ? colors.gold : 'rgba(255,255,255,0.1)'}`,
                  color: myMealsFilter === k ? colors.gold : colors.textDim,
                }}>{l}</button>
              ))}
            </div>
            {/* Meals list */}
            {(() => {
              const filtered = myMeals.filter(m => {
                if (myMealsFilter !== 'all' && m.meal_type !== myMealsFilter) return false
                if (myMealsSearch && !m.name?.toLowerCase().includes(myMealsSearch.toLowerCase())) return false
                return true
              })
              return filtered.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {filtered.map((meal: any) => {
                    const foods = meal.foods || []
                    const { total_calories: kcal, total_proteins: prot, total_carbs: carbs, total_fats: fat } = savedMealTotals(foods)
                    return (
                      <div key={meal.id} style={{ background: colors.surfaceHigh, border: `1px solid ${colors.goldBorder}`, borderRadius: 12, padding: 12 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 13, fontWeight: 700, color: colors.text, fontFamily: fonts.body }}>{meal.name || 'Repas sans nom'}</div>
                            <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
                              {meal.meal_type && <span style={{ fontSize: 9, fontFamily: fonts.body, fontWeight: 700, color: colors.gold, background: colors.goldDim, padding: '1px 6px', borderRadius: 999, textTransform: 'uppercase' }}>{MEAL_LABELS[meal.meal_type] || meal.meal_type}</span>}
                            </div>
                            <div style={{ ...bodyStyle, marginTop: 4, fontSize: 11 }}>{Math.round(kcal)} kcal · {Math.round(prot)}g P · {Math.round(carbs)}g G · {Math.round(fat)}g L</div>
                            <div style={{ ...mutedStyle, marginTop: 2 }}>{meal.created_at ? new Date(meal.created_at).toLocaleDateString(locale) : ''}</div>
                          </div>
                          <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                            <button aria-label={nt('editor.edit')} onClick={() => { setEditMealError(null); setEditMealSaved(false); setEditAddFoodQuery(''); setEditAddFoodResults([]); setEditingMeal({ ...meal, foods: (meal.foods || []).map(prepareSavedFood) }) }} style={{ background: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, width: 32, height: 32, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s' }}><Pencil size={14} color={colors.textMuted} /></button>
                            {confirmDeleteMeal === meal.id ? (
                              <button onClick={async () => { await supabase.from('saved_meals').delete().eq('id', meal.id); setMyMeals(prev => prev.filter(m => m.id !== meal.id)); setConfirmDeleteMeal(null) }} style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '4px 8px', cursor: 'pointer', fontSize: 10, color: colors.error, fontFamily: fonts.body, fontWeight: 700 }}>CONFIRMER</button>
                            ) : (
                              <button onClick={() => setConfirmDeleteMeal(meal.id)} style={{ background: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, width: 32, height: 32, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s' }}><Trash2 size={14} color={colors.error} /></button>
                            )}
                          </div>
                        </div>
                        <button type="button" disabled={!foods.length} onClick={() => setMealToJournal(meal)} style={{ width: '100%', minHeight: 44, marginTop: 12, borderRadius: 10, background: colors.gold, color: colors.onGold, border: 'none', fontWeight: 700 }}>{nt('editor.addToJournal')}</button>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div style={{ ...bodyStyle, textAlign: 'center', padding: '24px 16px', fontStyle: 'italic', lineHeight: 1.6 }}>
                  Aucun repas sauvegardé. Ajoute un repas depuis l&apos;onglet Journal pour le retrouver ici.
                </div>
              )
            })()}
            {/* Create meal button */}
            <button onClick={() => {
              setEditMealError(null); setEditMealSaved(false); setEditAddFoodQuery(''); setEditAddFoodResults([])
              setEditingMeal({ name: '', meal_type: 'dejeuner', foods: [] })
            }} style={{ width: '100%', marginTop: 16, padding: '14px 0', background: `linear-gradient(135deg, ${colors.gold}, ${colors.goldContainer})`, color: colors.onGold, fontFamily: fonts.headline, fontWeight: 700, borderRadius: 12, border: 'none', cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.12em', fontSize: 13, textAlign: 'center' }}>
              + CRÉER UN REPAS
            </button>
          </div>
        </div>
      )}

      {mealToJournal && <MealContextChooser onClose={() => setMealToJournal(null)} onSelect={mealType => {
        setComposer({ mealType, date: selectedDate, initialFoods: mealToJournal.foods })
        setMealToJournal(null)
        setSubTab('today')
      }} />}

      {/* Meal edit modal */}
      {editingMeal && (<RailOverlay>
        <div style={{ position: 'fixed', inset: 0, zIndex: Z_MODAL, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
          <div style={{ background: colors.background, border: `1px solid ${colors.goldBorder}`, borderRadius: '20px 20px 0 0', width: '100%', maxWidth: 480, maxHeight: '85dvh', overflow: 'auto' }}>
            <ModalHeader title={editingMeal.name || 'Modifier le repas'} onClose={() => { if (!saveMealLock.current) setEditingMeal(null) }} />
            <fieldset disabled={editMealSaving} style={{ padding: '0 24px 24px', margin: 0, border: 0, minWidth: 0 }}>
            <label style={{ display: 'block', color: colors.text, marginBottom: 12 }}>{nt('editor.name')}
              <input aria-label={nt('editor.name')} maxLength={100} value={editingMeal.name} onChange={e => { setEditMealSaved(false); setEditingMeal({ ...editingMeal, name: e.target.value }) }} style={{ width: '100%', boxSizing: 'border-box', minHeight: 44, fontSize: 16, background: colors.surfaceHigh, color: colors.text, border: `1px solid ${colors.goldBorder}`, borderRadius: 10, padding: 10 }} />
            </label>
            <label style={{ display: 'block', color: colors.text, marginBottom: 16 }}>{nt('editor.type')}
              <select aria-label={nt('editor.type')} value={editingMeal.meal_type} onChange={e => { setEditMealSaved(false); setEditingMeal({ ...editingMeal, meal_type: e.target.value }) }} style={{ width: '100%', minHeight: 44, fontSize: 16, background: colors.surfaceHigh, color: colors.text, border: `1px solid ${colors.goldBorder}`, borderRadius: 10, padding: 10 }}>
                {MEAL_ORDER.map(key => <option key={key} value={key}>{MEAL_LABELS[key]}</option>)}
              </select>
            </label>
            {editMealError && <p role="alert" style={{ color: colors.error }}>{editMealError}</p>}
            {/* Food items list */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}>
              {(editingMeal.foods || []).map((food: any, idx: number) => (
                <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 8, background: colors.surfaceHigh, borderRadius: 10, padding: '8px 10px', border: `1px solid ${colors.goldDim}` }}>
                  <div style={{ flex: 1, minWidth: 0, overflowWrap: 'anywhere' }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: colors.text, fontFamily: fonts.body }}>{food.name}</div>
                    <div style={{ fontSize: 10, color: colors.textDim, fontFamily: fonts.body }}>{Math.round(food.calories || 0)} kcal · {Math.round((food.protein || 0) * 10) / 10}g P</div>
                  </div>
                  <input type="number" inputMode="decimal" min="0.1" max="10000" step="any" aria-label={`${food.name} — ${nt('editor.grams')}`} value={food.quantity ?? ''} onChange={e => {
                    const newFoods = [...editingMeal.foods]
                    newFoods[idx] = resizeSavedFood(food, e.target.value)
                    setEditMealSaved(false); setEditingMeal({ ...editingMeal, foods: newFoods })
                  }} style={{ width: 64, minHeight: 44, flexShrink: 0, textAlign: 'center', background: colors.background, border: `1px solid ${colors.goldBorder}`, borderRadius: 8, padding: '4px', color: colors.text, fontFamily: fonts.body, fontSize: 16 }} />
                  <span style={{ fontSize: 10, color: colors.textDim }}>g</span>
                  <button onClick={() => {
                    const newFoods = editingMeal.foods.filter((_: any, i: number) => i !== idx)
                    setEditMealSaved(false); setEditingMeal({ ...editingMeal, foods: newFoods })
                  }} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, display: 'flex', alignItems: 'center' }}><Trash2 size={14} color={colors.error} /></button>
                </div>
              ))}
            </div>
            {/* Inline food search — adds directly to editingMeal.foods */}
            <div style={{ marginBottom: 12 }}>
              <input value={editAddFoodQuery} onChange={async (e) => {
                setEditAddFoodQuery(e.target.value)
                if (e.target.value.length >= 2) {
                  const q = `%${e.target.value}%`
                  const [fitRes, ansesRes] = await Promise.all([
                    supabase.from('food_items').select('id, name, energy_kcal, proteins, carbohydrates, fat, source').eq('source', 'fitness').ilike('name', q).limit(8),
                    supabase.from('food_items').select('id, name, energy_kcal, proteins, carbohydrates, fat, source').eq('source', 'ANSES').ilike('name', q).limit(6),
                  ])
                  const results = [
                    ...(fitRes.data || []).map((f: any) => normalizeFoodItem(f)),
                    ...(ansesRes.data || []).map((f: any) => normalizeFoodItem(f)),
                  ]
                  setEditAddFoodResults(results)
                } else { setEditAddFoodResults([]) }
              }} placeholder="+ Ajouter un aliment..." style={{ width: '100%', boxSizing: 'border-box', minHeight: 44, background: colors.background, border: `1px solid ${colors.goldBorder}`, borderRadius: 12, padding: '10px 14px', color: colors.text, fontFamily: fonts.body, fontSize: 16, outline: 'none' }} />
              {editAddFoodResults.length > 0 && (
                <div style={{ maxHeight: 150, overflowY: 'auto', borderRadius: 10, border: `1px solid ${colors.goldBorder}`, background: colors.surface, marginTop: 4 }}>
                  {editAddFoodResults.map((f: any) => (
                    <button key={f.id} onClick={() => {
                      const newFood = prepareSavedFood({ food_id: f.id, source: f.source, name: f.nom, calories: f.calories, protein: f.proteines, carbs: f.glucides, fat: f.lipides, quantity: 100 })
                      setEditMealSaved(false); setEditingMeal({ ...editingMeal, foods: [...(editingMeal.foods || []), newFood] })
                      setEditAddFoodQuery('')
                      setEditAddFoodResults([])
                    }} style={{ display: 'block', width: '100%', padding: '8px 12px', background: 'transparent', border: 'none', borderBottom: `1px solid ${colors.goldDim}`, cursor: 'pointer', textAlign: 'left' }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: colors.text, fontFamily: fonts.body, display: 'flex', alignItems: 'center', gap: 6 }}>{f.nom}{f.source === 'fitness' ? <span style={{ fontSize: 7, fontWeight: 700, letterSpacing: 1, padding: '1px 5px', borderRadius: 4, background: colors.goldDim, color: colors.gold, border: `1px solid ${colors.goldBorder}` }}>FITNESS</span> : <span style={{ fontSize: 7, fontWeight: 700, letterSpacing: 1, padding: '1px 5px', borderRadius: 4, background: 'rgba(96,165,250,0.1)', color: colors.blue, border: '1px solid rgba(96,165,250,0.2)' }}>CIQUAL</span>}</div>
                      <div style={{ fontSize: 9, color: colors.textDim }}>{f.calories} kcal · {f.proteines}g P · {f.glucides}g G · {f.lipides}g L</div>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button onClick={async () => {
              if (saveMealLock.current || !validSavedMeal(editingMeal)) return
              saveMealLock.current = true
              setEditMealSaving(true); setEditMealSaved(false); setEditMealError(null)
              const foods = editingMeal.foods.map(prepareSavedFood)
              const payload = { name: editingMeal.name.trim(), meal_type: editingMeal.meal_type, foods, ...savedMealTotals(foods) }
              try {
                const query = editingMeal.id
                  ? supabase.from('saved_meals').update(payload).eq('id', editingMeal.id).eq('user_id', userId)
                  : supabase.from('saved_meals').insert({ ...payload, user_id: userId })
                const { data, error } = await query.select().single()
                if (error || !data) throw new Error('SAVE_FAILED')
                setMyMeals(prev => [data, ...prev.filter(m => m.id !== data.id)])
                setEditingMeal({ ...data, foods: data.foods.map(prepareSavedFood) })
                setEditMealSaved(true)
              } catch { setEditMealError(nt('editor.saveError')) }
              finally { saveMealLock.current = false; setEditMealSaving(false) }
            }} disabled={editMealSaving || !validSavedMeal(editingMeal)} style={{ width: '100%', padding: '14px 0', background: `linear-gradient(135deg, ${colors.gold}, ${colors.goldContainer})`, color: colors.onGold, fontFamily: fonts.headline, fontWeight: 700, borderRadius: 12, border: 'none', cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.12em', fontSize: 13, marginBottom: 8, opacity: editMealSaving ? 0.6 : 1 }}>
              {editMealSaving ? nt('actions.saving') : editMealSaved ? nt('actions.saved') : nt('actions.save')}
            </button>
            {editingMeal.id && <button onClick={async () => {
              if (confirm(nt('actions.deleteConfirm'))) {
                await supabase.from('saved_meals').delete().eq('id', editingMeal.id)
                setMyMeals(prev => prev.filter(m => m.id !== editingMeal.id))
                setEditingMeal(null)
              }
            }} style={{ width: '100%', padding: '12px 0', background: 'transparent', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 12, color: colors.error, fontFamily: fonts.body, fontSize: 12, fontWeight: 700, cursor: 'pointer', textAlign: 'center' }}>SUPPRIMER LE REPAS</button>}
            </fieldset>
          </div>
        </div>
      </RailOverlay>)}

      {/* Shopping list modal */}
      {showShoppingModal && nutritionModel.activePlan.plan && (
        <ShoppingList
          planData={nutritionModel.activePlan.plan}
          onClose={() => setShowShoppingModal(false)}
        />
      )}

      {/* ═══ PHOTO MEAL SCAN ═══ */}
      {showPhotoCapture && (<RailOverlay>
        <>
          <div onClick={() => { setShowPhotoCapture(false); setPhotoResults(null); setPhotoError(null) }} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: Z_MODAL }} />
          <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: 'calc(100% - 32px)', maxWidth: 440, maxHeight: '80vh', background: colors.surface, border: `1px solid ${colors.goldBorder}`, borderRadius: 16, zIndex: Z_MODAL, display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 24px 80px rgba(0,0,0,0.6)' }}>
            <ModalHeader title={nt('chrome.scanMeal')} onClose={() => { setShowPhotoCapture(false); setPhotoResults(null); setPhotoError(null) }} />
            <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
              <AiQuotaBadge />
              <p style={{ ...mutedStyle, margin: '0 0 14px', lineHeight: 1.5 }}>{nt('chrome.photoEstimate')}</p>
              {photoError && <p role="status" style={{ ...bodyStyle, color: colors.error, margin: '0 0 14px' }}>{photoError}</p>}
              <input ref={photoInputRef} type="file" accept="image/*" capture="environment" onChange={handlePhotoCapture} style={{ display: 'none' }} />
              {!photoResults && !analyzingPhoto && (
                <button onClick={() => photoInputRef.current?.click()} style={{ width: '100%', padding: '40px 20px', background: colors.goldDim, border: `2px dashed ${colors.goldRule}`, borderRadius: 16, cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                  <Camera size={48} color={colors.gold} />
                  <span style={{ ...statSmallStyle, letterSpacing: 2 }}>{nt('chrome.takePhoto')}</span>
                  <span style={mutedStyle}>{nt('chrome.orGallery')}</span>
                </button>
              )}
              {analyzingPhoto && (
                <div style={{ textAlign: 'center', padding: '40px 0' }}>
                  <div style={{ width: 48, height: 48, borderRadius: '50%', border: `3px solid ${colors.goldDim}`, borderTopColor: colors.gold, animation: 'spin 1s linear infinite', margin: '0 auto 16px' }} />
                  <div style={{ ...statSmallStyle, letterSpacing: 2 }}>ANALYSE EN COURS...</div>
                </div>
              )}
              {photoResults?.foods && (
                <>
                  <div style={{ ...labelStyle, fontSize: 10, letterSpacing: 3, marginBottom: 12 }}>{photoResults.foods.length} aliments detectes</div>
                  {photoResults.foods.map((f, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: i < photoResults.foods.length - 1 ? `1px solid ${colors.goldDim}` : 'none' }}>
                      <div>
                        <div style={{ fontFamily: fonts.body, fontSize: 14, color: colors.text }}>{f.name}</div>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6, fontFamily: fonts.body, fontSize: 11, color: colors.textMuted }}>
                          <span>{nt('chrome.quantityEstimate')}</span>
                          <input
                            type="number"
                            min="1"
                            step="1"
                            value={f.quantity_g}
                            aria-label={`${nt('chrome.quantityEstimate')} ${f.name}`}
                            onChange={event => updatePhotoFoodQuantity(i, Number(event.target.value))}
                            style={{ width: 68, minHeight: 44, padding: '6px 8px', borderRadius: 8, border: `1px solid ${colors.goldBorder}`, background: colors.background, color: colors.text }}
                          />
                          <span>g · P:{f.proteins}g G:{f.carbs}g L:{f.fats}g</span>
                        </label>
                      </div>
                      <span style={{ ...statSmallStyle, fontSize: 16 }}>{f.calories}</span>
                    </div>
                  ))}
                  <div style={{ background: colors.goldDim, borderRadius: 12, padding: '12px 16px', marginTop: 16, textAlign: 'center' }}>
                    <span style={{ ...statSmallStyle, fontSize: 24 }}>{photoResults.foods.reduce((total, food) => total + (food.calories || 0), 0)} KCAL</span>
                  </div>
                </>
              )}
            </div>
            {photoResults?.foods && (
              <div style={{ padding: '16px 20px', borderTop: `1px solid ${colors.goldDim}`, display: 'flex', gap: 12, flexShrink: 0 }}>
                <button onClick={() => { setPhotoResults(null); setPhotoError(null) }} style={{ flex: 1, padding: 14, background: 'transparent', border: `1.5px solid rgba(212,168,67,0.5)`, borderRadius: 12, color: colors.gold, fontFamily: fonts.headline, fontSize: 16, letterSpacing: 2, cursor: 'pointer' }}>{nt('chrome.retake')}</button>
                <button onClick={addPhotoFoods} style={{ flex: 1, padding: 14, border: 'none', background: `linear-gradient(135deg, #E8C97A, #D4A843, ${colors.goldContainer}, #8B6914)`, borderRadius: 12, color: colors.onGold, fontFamily: fonts.headline, fontSize: 16, letterSpacing: 2, cursor: 'pointer' }}>{nt('chrome.addAll')}</button>
              </div>
            )}
          </div>
        </>
      </RailOverlay>)}

      {/* ═══ SAVE MEAL POPUP ═══ */}
      {showSaveMealPopup && saveMealData && (<RailOverlay>
        <>
          <div onClick={() => { if (!saveMealLock.current) setShowSaveMealPopup(false) }} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: Z_MODAL }} />
          <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: 'calc(100% - 32px)', boxSizing: 'border-box', maxHeight: '85dvh', overflowY: 'auto', maxWidth: 400, background: colors.surface, border: `1px solid ${colors.goldBorder}`, borderRadius: 16, padding: 24, zIndex: Z_MODAL, boxShadow: '0 4px 24px rgba(0,0,0,0.6)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <div style={{ width: 3, height: 18, background: colors.gold, borderRadius: 2, flexShrink: 0 }} />
              <h3 style={{ fontFamily: fonts.alt, fontSize: 20, fontWeight: 700, letterSpacing: '0.1em', color: colors.gold, textTransform: 'uppercase', margin: 0, lineHeight: 1 }}>{nt('saveMealPopup.title')}</h3>
            </div>
            <input type="text" placeholder={nt('saveMealPopup.placeholder')} value={saveMealName} onChange={e => setSaveMealName(e.target.value)} autoFocus style={{ width: '100%', padding: '12px 14px', background: colors.background, border: `1px solid ${colors.goldBorder}`, borderRadius: 10, color: colors.text, fontFamily: fonts.body, fontSize: 16, boxSizing: 'border-box', outline: 'none', marginBottom: 12 }} />
            <div style={{ background: colors.background, borderRadius: 10, padding: 12, marginBottom: 16, border: `1px solid ${colors.goldDim}` }}>
              <div style={{ ...subtitleStyle, fontSize: 9, letterSpacing: 2, marginBottom: 8 }}>{nt('saveMealPopup.foodCount', { count: saveMealData.foods.length })}</div>
              {saveMealData.foods.map((f: any, i: number) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', fontFamily: fonts.body, fontSize: 12 }}>
                  <span style={{ color: colors.text }}>{f.name}</span>
                  <span style={{ color: colors.gold }}>{f.calories} kcal</span>
                </div>
              ))}
            </div>
            {editMealError && <p role="alert" style={{ color: colors.error }}>{editMealError}</p>}
            <div style={{ display: 'flex', gap: 12 }}>
              <button onClick={() => { if (!saveMealLock.current) setShowSaveMealPopup(false) }} style={{ flex: 1, padding: 14, background: 'transparent', border: `1.5px solid rgba(212,168,67,0.5)`, borderRadius: 12, color: colors.gold, fontFamily: fonts.headline, fontSize: 16, letterSpacing: 2, cursor: 'pointer' }}>{nt('saveMealPopup.cancel')}</button>
              <button disabled={editMealSaving || !saveMealName.trim()} onClick={async () => {
                if (saveMealLock.current) return
                saveMealLock.current = true; setEditMealSaving(true); setEditMealError(null)
                try {
                const foods = Array.isArray(saveMealData?.foods) ? saveMealData.foods as Record<string, unknown>[] : []
                const { error } = await supabase.from('saved_meals').insert({
                  user_id: userId,
                  name: saveMealName,
                  meal_type: saveMealType,
                  foods,
                  ...savedMealTotals(foods),
                })
                if (error) throw new Error('SAVE_FAILED')
                setShowSaveMealPopup(false); setSaveMealName('')
                } catch { setEditMealError(nt('editor.saveError')) }
                finally { saveMealLock.current = false; setEditMealSaving(false) }
              }} style={{ flex: 1, padding: 14, background: saveMealName.trim() ? `linear-gradient(135deg, #E8C97A, #D4A843, ${colors.goldContainer}, #8B6914)` : colors.surfaceHigh, border: 'none', borderRadius: 12, color: saveMealName.trim() ? colors.onGold : colors.textDim, fontFamily: fonts.headline, fontSize: 16, letterSpacing: 2, cursor: 'pointer' }}>{nt('saveMealPopup.save')}</button>
            </div>
          </div>
        </>
      </RailOverlay>)}

      {/* ═══ COPY MEAL POPUP ═══ */}
      {showCopyMealPopup && copyMealData && (<RailOverlay>
        <>
          <div onClick={() => setShowCopyMealPopup(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: Z_MODAL }} />
          <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: 'calc(100% - 32px)', maxWidth: 400, background: colors.surface, border: `1px solid ${colors.goldBorder}`, borderRadius: 16, padding: 24, zIndex: Z_MODAL, boxShadow: '0 4px 24px rgba(0,0,0,0.6)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <div style={{ width: 3, height: 18, background: colors.gold, borderRadius: 2, flexShrink: 0 }} />
              <h3 style={{ fontFamily: fonts.alt, fontSize: 20, fontWeight: 700, letterSpacing: '0.1em', color: colors.gold, textTransform: 'uppercase', margin: 0, lineHeight: 1 }}>{nt('copyMealPopup.title')}</h3>
            </div>
            <div style={{ ...subtitleStyle, fontSize: 10, letterSpacing: 2, marginBottom: 6 }}>{nt('copyMealPopup.date')}</div>
            <div style={{ display: 'flex', gap: 6, marginBottom: 8, flexWrap: 'wrap' }}>
              {[{ l: nt('copy.tomorrow'), d: 1 }, { l: nt('copy.plus2d'), d: 2 }, { l: nt('copy.plus3d'), d: 3 }, { l: nt('copy.plus1w'), d: 7 }].map(s => {
                const dt = new Date(Date.now() + s.d * 86400000).toISOString().split('T')[0]
                return <button key={s.l} onClick={() => setCopyTargetDate(dt)} style={{ padding: '6px 12px', borderRadius: 20, border: copyTargetDate === dt ? `1px solid ${colors.gold}` : `1px solid ${colors.goldDim}`, background: copyTargetDate === dt ? colors.goldDim : 'transparent', color: copyTargetDate === dt ? colors.gold : colors.textMuted, fontFamily: fonts.body, fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>{s.l}</button>
              })}
            </div>
            <input type="date" value={copyTargetDate} onChange={e => setCopyTargetDate(e.target.value)} min={today} style={{ width: '100%', padding: '10px 14px', background: colors.background, border: `1px solid ${colors.goldBorder}`, borderRadius: 10, color: colors.text, fontFamily: fonts.body, fontSize: 14, outline: 'none', marginBottom: 12, colorScheme: 'dark' }} />
            <div style={{ ...subtitleStyle, fontSize: 10, letterSpacing: 2, marginBottom: 6 }}>{nt('copyMealPopup.meal')}</div>
            <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
              {MEAL_ORDER.map(t => <button key={t} onClick={() => setCopyTargetMealType(t)} style={{ padding: '6px 12px', borderRadius: 20, border: copyTargetMealType === t ? `1px solid ${colors.gold}` : `1px solid ${colors.goldDim}`, background: copyTargetMealType === t ? colors.goldDim : 'transparent', color: copyTargetMealType === t ? colors.gold : colors.textMuted, fontFamily: fonts.body, fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>{MEAL_LABELS[t]}</button>)}
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <button onClick={() => setShowCopyMealPopup(false)} style={{ flex: 1, padding: 14, background: 'transparent', border: `1.5px solid rgba(212,168,67,0.5)`, borderRadius: 12, color: colors.gold, fontFamily: fonts.headline, fontSize: 16, letterSpacing: 2, cursor: 'pointer' }}>{nt('copyMealPopup.cancel')}</button>
              <button disabled={!copyTargetDate || !copyTargetMealType} onClick={async () => { await copyMealToDate(copyMealData.foods, copyTargetDate, copyTargetMealType); setShowCopyMealPopup(false) }} style={{ flex: 1, padding: 14, background: (copyTargetDate && copyTargetMealType) ? `linear-gradient(135deg, #E8C97A, #D4A843, ${colors.goldContainer}, #8B6914)` : colors.surfaceHigh, border: 'none', borderRadius: 12, color: (copyTargetDate && copyTargetMealType) ? colors.onGold : colors.textDim, fontFamily: fonts.headline, fontSize: 16, letterSpacing: 2, cursor: 'pointer' }}>{nt('copyMealPopup.copy')}</button>
            </div>
          </div>
        </>
      </RailOverlay>)}

      {/* ═══ SAVED MEALS POPUP ═══ */}
      {showSavedMeals && (<RailOverlay>
        <>
          <div onClick={() => setShowSavedMeals(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: Z_MODAL }} />
          <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: 'calc(100% - 32px)', maxWidth: 440, maxHeight: '75vh', background: colors.surface, border: `1px solid ${colors.goldBorder}`, borderRadius: 16, zIndex: Z_MODAL, display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 4px 24px rgba(0,0,0,0.6)' }}>
            <ModalHeader title={nt('savedMeals.title')} onClose={() => setShowSavedMeals(false)} />
            <div style={{ flex: 1, overflowY: 'auto', padding: '8px 20px 20px' }}>
              {savedMealsState === 'loading' ? (
                <div role="status" style={{ textAlign: 'center', padding: '40px 0', ...bodyStyle }}>{nt('savedMeals.loading')}</div>
              ) : savedMealsState === 'error' ? (
                <div role="status" style={{ textAlign: 'center', padding: '40px 0', ...bodyStyle }}>
                  <p style={{ margin: '0 0 14px' }}>{nt('savedMeals.error')}</p>
                  <button type="button" onClick={() => void loadSavedMeals(useSavedMealTarget)} style={{ minHeight: 44, padding: '8px 16px', borderRadius: 10, border: `1px solid ${colors.goldBorder}`, background: 'transparent', color: colors.gold, cursor: 'pointer' }}>{nt('savedMeals.retry')}</button>
                </div>
              ) : savedMealsState === 'empty' ? (
                <div style={{ textAlign: 'center', padding: '40px 0', ...bodyStyle }}>{nt('savedMeals.empty')}</div>
              ) : savedMealsState === 'ready' ? savedMeals.map((meal: any) => (
                <button key={meal.id} onClick={async () => { await applySavedMeal(meal, useSavedMealTarget); setShowSavedMeals(false) }} style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 0', background: 'none', border: 'none', borderBottom: `1px solid ${colors.goldDim}`, cursor: 'pointer', textAlign: 'left' }}>
                  <div>
                    <div style={{ ...bodyStyle, color: colors.text, fontWeight: 500 }}>{meal.name}</div>
                    <div style={{ ...mutedStyle, fontSize: 11, marginTop: 2 }}>{nt('savedMeals.foodCount', { count: (meal.foods || []).length })}</div>
                  </div>
                  <div style={statSmallStyle}>{Math.round(meal.total_calories || 0)}</div>
                </button>
              )) : null}
            </div>
          </div>
        </>
      </RailOverlay>)}
    </NutritionV2>
  )
}
