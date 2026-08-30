'use client'
import dynamic from 'next/dynamic'
import React, { useEffect, useState } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { ChevronLeft, ChevronRight, Trash2, Camera, Pencil, CalendarDays, Droplets } from 'lucide-react'
import ImportPlanSheet from './nutrition/ImportPlanSheet'
import FoodSearch from '../FoodSearch'
import { normalizeFoodItem } from '../../../lib/utils/food'
import ShoppingList from '../ShoppingList'
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
import { addNutritionDays, getNutritionDayKey } from '../../../lib/nutrition/nutrition-date'
import { normalizeNutritionMealType, type NutritionMealType } from '../../../lib/nutrition/nutrition-dashboard-model'
import NutritionV2 from '../nutrition-v2/NutritionV2'
import TodayMeals from '../nutrition-v2/TodayMeals'
import ActiveNutritionPlan from '../nutrition-v2/ActiveNutritionPlan'
import NutritionTools from '../nutrition-v2/NutritionTools'
import MealContextChooser from '../nutrition-v2/MealContextChooser'

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
  coachId: string | null
  supabase: any
  userId: string
  fetchAll: () => Promise<void>
  onOpenProgramSettings: () => void
}

export default function NutritionTab({ profile, capabilities, coachRelationStatus, coachId, supabase, userId, onOpenProgramSettings }: NutritionTabProps) {
  const nt = useTranslations('nutrition_tab')
  const locale = useLocale()
  const MEAL_LABEL_MAP: Record<string, string> = { petit_dejeuner: 'breakfast', dejeuner: 'lunch', collation: 'snack', diner: 'dinner' }
  const getMealLabel = (key: string) => nt(`meals.${MEAL_LABEL_MAP[key] || key}`)
  const MEAL_LABELS: Record<string, string> = { petit_dejeuner: getMealLabel('petit_dejeuner'), dejeuner: getMealLabel('dejeuner'), collation: getMealLabel('collation'), diner: getMealLabel('diner') }
  const [showFoodSearch, setShowFoodSearch] = useState<string | null>(null) // meal_type or null
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
  const [editingMeal, setEditingMeal] = useState<any>(null)
  const [confirmDeleteMeal, setConfirmDeleteMeal] = useState<string | null>(null)
  const [editMealSaving, setEditMealSaving] = useState(false)
  const [editMealSaved, setEditMealSaved] = useState(false)
  const [editAddFoodQuery, setEditAddFoodQuery] = useState('')
  const [editAddFoodResults, setEditAddFoodResults] = useState<any[]>([])
  const photoInputRef = React.useRef<HTMLInputElement>(null)
  const calScrollRef = React.useRef<HTMLDivElement>(null)
  const nutritionDashboard = useNutritionDashboardModel({
    supabase,
    userId,
    profile,
    capabilities,
    coachRelation: { status: coachRelationStatus, coachId },
  })
  const { model: nutritionModel, selectedDate, setSelectedDate, dailyLogs, daysWithMeals, refresh: refreshNutrition } = nutritionDashboard
  const today = nutritionModel.day.localDateKey
  const todayKey = nutritionModel.day.dayKey
  const waterToday = nutritionModel.hydration.data?.consumedMl ?? 0
  const calendarDays = React.useMemo(() => {
    const dates: string[] = []
    for (let i = -30; i <= 7; i += 1) dates.push(addNutritionDays(today, i))
    return dates
  }, [today])

  const [subTab, setSubTab] = useState<SubTab>('today')

  useEffect(() => {
    const timer = window.setTimeout(() => {
      document.getElementById(`cal-${today}`)?.scrollIntoView({ behavior: 'instant', inline: 'center', block: 'nearest' })
    }, 100)
    return () => window.clearTimeout(timer)
  }, [today])

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
        const res = await fetch('/api/analyze-meal-photo', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ image: base64 }) })
        if (!res.ok) throw new Error('PHOTO_ANALYSIS_FAILED')
        const data = await res.json() as PhotoAnalysisResult
        if (!Array.isArray(data.foods)) throw new Error('PHOTO_ANALYSIS_INVALID')
        setPhotoResults(data)
      } catch {
        setPhotoResults(null)
        setPhotoError(nt('chrome.photoError'))
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
    for (const food of (meal.foods || [])) {
      await supabase.from('daily_food_logs').insert({
        user_id: userId, date: today, meal_type: targetMealType,
        custom_name: food.name, quantity_g: food.quantity || food.quantity_g || 100,
        calories: food.calories || 0, protein: food.proteins || food.protein || 0,
        carbs: food.carbs || 0, fat: food.fats || food.fat || 0,
      })
    }
    await refreshNutrition()
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

  function chooseMealContext(mealType: MealKey) {
    const action = pendingMealAction
    setPendingMealAction(null)
    if (action === 'food') {
      setShowFoodSearch(mealType)
      return
    }
    if (action === 'photo') {
      setPhotoMealTarget(mealType)
      setPhotoError(null)
      setShowPhotoCapture(true)
    }
  }


  return (
    <NutritionV2
      model={nutritionModel}
      selectedDate={selectedDate}
      onAddMeal={() => {
        setSubTab('today')
        setPendingMealAction('food')
      }}
      onRetry={() => void refreshNutrition()}
    >

      {/* PILLS NAVIGATION */}
      <div style={{ display: 'flex', gap: 6, padding: '12px 20px 16px', overflowX: 'auto', scrollbarWidth: 'none' }}>
        {([
          { id: 'today' as SubTab, label: nt('tabs.journal') },
          { id: 'plan' as SubTab, label: nt('tabs.plan') },
        ]).map(({ id, label }) => {
          const active = subTab === id
          return (
            <button key={id} onClick={() => setSubTab(id)} style={{
              padding: '6px 12px', cursor: 'pointer', whiteSpace: 'nowrap',
              fontFamily: fonts.body, fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase',
              borderRadius: 12,
              background: active ? colors.goldBorder : 'transparent',
              border: active ? `1px solid ${colors.goldContainer}66` : `1px solid ${colors.goldBorder}`,
              color: active ? colors.gold : 'rgba(255,255,255,0.4)',
            }}>
              {label}
            </button>
          )
        })}
      </div>

      {/* Food search modal */}
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
      {subTab === 'today' && ((): React.ReactNode => {
        const isViewingPast = selectedDate < today
        const waterGoal = profile?.water_goal || 3000
        const pctWater = Math.min(100, Math.round((waterToday / waterGoal) * 100))
        const canAddWater = selectedDate === today
        const glassBtn: React.CSSProperties = { width: 44, height: 44, borderRadius: 10, background: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }

        return (
          <div style={{ padding: '0 4px' }}>
            {/* ═══ CALENDAR STRIP ═══ */}
            <div style={{ background: colors.surface2, border: `1px solid ${colors.divider}`, borderRadius: 16, padding: 14, marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <span style={{ fontFamily: fonts.alt, fontSize: 11, fontWeight: 700, letterSpacing: '0.18em', color: colors.textDim }}>{new Date(selectedDate + 'T12:00:00').toLocaleDateString(locale, { month: 'long', year: 'numeric' }).toUpperCase()}</span>
                <div style={{ display: 'flex', gap: 8 }}>
                  {selectedDate !== today && (
                    <button onClick={() => setSelectedDate(today)} style={{ ...glassBtn, width: 'auto', padding: '6px 12px', fontFamily: fonts.alt, fontSize: 9, fontWeight: 700, letterSpacing: '0.18em', color: colors.gold, textTransform: 'uppercase' }}>
                      {nt('chrome.today')}
                    </button>
                  )}
                  <button onClick={() => calScrollRef.current?.scrollBy({ left: -150, behavior: 'smooth' })} aria-label="Précédent" style={glassBtn}>
                    <ChevronLeft size={16} color={colors.gold} />
                  </button>
                  <button onClick={() => calScrollRef.current?.scrollBy({ left: 150, behavior: 'smooth' })} aria-label="Suivant" style={glassBtn}>
                    <ChevronRight size={16} color={colors.gold} />
                  </button>
                </div>
              </div>
              <div ref={calScrollRef} style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 4, scrollSnapType: 'x mandatory', scrollbarWidth: 'none' }}>
                {calendarDays.map(dt => {
                  const d = new Date(dt + 'T12:00:00')
                  const sel = dt === selectedDate, isTd = dt === today, hasMl = daysWithMeals.has(dt), fut = dt > today
                  return (
                    <button key={dt} id={`cal-${dt}`} onClick={() => !fut && setSelectedDate(dt)} disabled={fut} title={fut ? nt('chrome.futureDate') : undefined} aria-disabled={fut} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, padding: '10px 8px', minWidth: 44, borderRadius: 12, border: sel ? `2px solid ${colors.gold}` : isTd ? `1px solid ${colors.goldRule}` : `1px solid ${colors.divider}`, background: sel ? `${colors.gold}12` : 'transparent', cursor: fut ? 'not-allowed' : 'pointer', transition: 'all 0.15s', opacity: fut ? 0.35 : 1, scrollSnapAlign: 'center', flexShrink: 0 }}>
                      <span style={{ fontFamily: fonts.alt, fontSize: 9, fontWeight: 700, letterSpacing: '0.15em', color: sel ? colors.gold : colors.textDim }}>{d.toLocaleDateString(locale, { weekday: 'short' }).replace('.', '').toUpperCase()}</span>
                      <span style={{ fontFamily: fonts.headline, fontSize: 20, fontWeight: 400, lineHeight: 1, color: sel ? colors.gold : isTd ? colors.gold : colors.text }}>{d.getDate()}</span>
                      <div style={{ width: 6, height: 6, borderRadius: '50%', background: hasMl ? colors.gold : 'transparent' }} />
                    </button>
                  )
                })}
              </div>
            </div>
            {isViewingPast && (
              <div style={{ background: colors.goldDim, border: `1px solid ${colors.goldRule}`, borderRadius: 12, padding: '10px 16px', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
                <CalendarDays size={16} color={colors.orange} />
                <span style={{ ...bodyStyle, fontSize: 13, color: colors.gold }}>{new Date(selectedDate + 'T12:00:00').toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long' })}</span>
              </div>
            )}
            <TodayMeals
              model={nutritionModel}
              selectedDate={selectedDate}
              actionError={mealActionError}
              onRetry={() => void refreshNutrition()}
              onChooseMeal={() => setPendingMealAction('food')}
              onAddFood={mealType => setShowFoodSearch(NUTRITION_MEAL_TO_KEY[mealType])}
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
                setShowSaveMealPopup(true)
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
            {/* Hydration remains a separate legacy module during the progressive migration. */}
            <div style={{ ...cardStyle, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: 14, marginBottom: 12, flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ display: 'grid', width: 38, height: 38, placeItems: 'center', borderRadius: 12, background: 'rgba(111,183,232,0.12)' }}>
                  <Droplets size={18} color="#6FB7E8" aria-hidden="true" />
                </div>
                <div>
                  <span style={{ ...subtitleStyle, display: 'block', fontSize: 10, letterSpacing: '0.12em' }}>{nt('chrome.hydration')}</span>
                  <strong style={{ fontFamily: fonts.headline, fontSize: 17, color: '#6FB7E8', fontWeight: 500 }}>
                    {(waterToday / 1000).toFixed(1)}L <span style={{ ...mutedStyle, fontSize: 11 }}>/ {(waterGoal / 1000).toFixed(1)}L · {pctWater}%</span>
                  </strong>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, flex: '1 1 170px', maxWidth: 240 }}>
                <button onClick={() => canAddWater && addWater(250)} disabled={!canAddWater} style={{ minHeight: 44, flex: 1, padding: '8px 10px', borderRadius: 10, background: 'rgba(111,183,232,0.12)', border: 'none', color: '#6FB7E8', fontFamily: fonts.alt, fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', cursor: canAddWater ? 'pointer' : 'not-allowed', opacity: canAddWater ? 1 : 0.4 }}>{nt('chrome.addWater250')}</button>
                <button onClick={() => canAddWater && addWater(500)} disabled={!canAddWater} style={{ minHeight: 44, flex: 1, padding: '8px 10px', borderRadius: 10, background: 'rgba(111,183,232,0.12)', border: 'none', color: '#6FB7E8', fontFamily: fonts.alt, fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', cursor: canAddWater ? 'pointer' : 'not-allowed', opacity: canAddWater ? 1 : 0.4 }}>{nt('chrome.addWater500')}</button>
              </div>
            </div>

            <NutritionTools
              photoEnabled={capabilities.ai}
              recipesEnabled={capabilities.nutrition}
              onAddFood={() => setPendingMealAction('food')}
              onPhoto={() => setPendingMealAction('photo')}
              onSavedMeals={() => setSubTab('meals')}
              onRecipes={() => setSubTab('recipes')}
            />

          </div>
        )
      })()}

      {/* The legacy Plan tab now delegates to the single V2 plan representation. */}
      {subTab === 'plan' && <ActiveNutritionPlan
        key={`${nutritionModel.activePlan.id ?? 'none'}-${nutritionModel.activePlan.state}-${nutritionModel.activePlan.updatedAt ?? 'none'}`}
        activePlan={nutritionModel.activePlan}
        todayKey={todayKey}
        onImportMeal={(mealType, dayKey) => setImportingMeal({ mealType, dayKey })}
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
          <RecipesSection supabase={supabase} userId={userId} profile={profile} aiAllowed={capabilities.ai} />
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
                    const kcal = foods.reduce((s: number, f: any) => s + (f.calories || 0), 0)
                    const prot = foods.reduce((s: number, f: any) => s + (f.protein || 0), 0)
                    const carbs = foods.reduce((s: number, f: any) => s + (f.carbs || 0), 0)
                    const fat = foods.reduce((s: number, f: any) => s + (f.fat || 0), 0)
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
                            <button onClick={() => setEditingMeal(meal)} style={{ background: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, width: 32, height: 32, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s' }}><Pencil size={14} color={colors.textMuted} /></button>
                            {confirmDeleteMeal === meal.id ? (
                              <button onClick={async () => { await supabase.from('saved_meals').delete().eq('id', meal.id); setMyMeals(prev => prev.filter(m => m.id !== meal.id)); setConfirmDeleteMeal(null) }} style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '4px 8px', cursor: 'pointer', fontSize: 10, color: colors.error, fontFamily: fonts.body, fontWeight: 700 }}>CONFIRMER</button>
                            ) : (
                              <button onClick={() => setConfirmDeleteMeal(meal.id)} style={{ background: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, width: 32, height: 32, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s' }}><Trash2 size={14} color={colors.error} /></button>
                            )}
                          </div>
                        </div>
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
            <button onClick={async () => {
              const { data } = await supabase.from('saved_meals').insert({ user_id: userId, name: 'Nouveau repas', meal_type: 'dejeuner', foods: [] }).select().single()
              if (data) { setMyMeals(prev => [data, ...prev]); setEditingMeal(data) }
            }} style={{ width: '100%', marginTop: 16, padding: '14px 0', background: `linear-gradient(135deg, ${colors.gold}, ${colors.goldContainer})`, color: colors.onGold, fontFamily: fonts.headline, fontWeight: 700, borderRadius: 12, border: 'none', cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.12em', fontSize: 13, textAlign: 'center' }}>
              + CRÉER UN REPAS
            </button>
          </div>
        </div>
      )}

      {/* Meal edit modal */}
      {editingMeal && (<RailOverlay>
        <div style={{ position: 'fixed', inset: 0, zIndex: Z_MODAL, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
          <div style={{ background: colors.background, border: `1px solid ${colors.goldBorder}`, borderRadius: '20px 20px 0 0', width: '100%', maxWidth: 480, maxHeight: '85vh', overflow: 'auto' }}>
            <ModalHeader title={editingMeal.name || 'Modifier le repas'} onClose={() => setEditingMeal(null)} />
            <div style={{ padding: '0 24px 24px' }}>
            {/* Food items list */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}>
              {(editingMeal.foods || []).map((food: any, idx: number) => (
                <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 8, background: colors.surfaceHigh, borderRadius: 10, padding: '8px 10px', border: `1px solid ${colors.goldDim}` }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: colors.text, fontFamily: fonts.body }}>{food.name}</div>
                    <div style={{ fontSize: 10, color: colors.textDim, fontFamily: fonts.body }}>{food.calories || 0} kcal · {food.protein || 0}g P</div>
                  </div>
                  <input type="number" value={food.quantity || 100} onChange={e => {
                    const newFoods = [...editingMeal.foods]
                    const ratio = (parseFloat(e.target.value) || 100) / (food.quantity || 100)
                    newFoods[idx] = { ...food, quantity: parseFloat(e.target.value) || 0, calories: Math.round((food.calories || 0) * ratio), protein: Math.round((food.protein || 0) * ratio), carbs: Math.round((food.carbs || 0) * ratio), fat: Math.round((food.fat || 0) * ratio) }
                    setEditingMeal({ ...editingMeal, foods: newFoods })
                  }} style={{ width: 50, textAlign: 'center', background: colors.background, border: `1px solid ${colors.goldBorder}`, borderRadius: 8, padding: '4px', color: colors.text, fontFamily: fonts.body, fontSize: 12, outline: 'none' }} />
                  <span style={{ fontSize: 10, color: colors.textDim }}>g</span>
                  <button onClick={() => {
                    const newFoods = editingMeal.foods.filter((_: any, i: number) => i !== idx)
                    setEditingMeal({ ...editingMeal, foods: newFoods })
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
              }} placeholder="+ Ajouter un aliment..." style={{ width: '100%', background: colors.background, border: `1px solid ${colors.goldBorder}`, borderRadius: 12, padding: '10px 14px', color: colors.text, fontFamily: fonts.body, fontSize: 12, outline: 'none' }} />
              {editAddFoodResults.length > 0 && (
                <div style={{ maxHeight: 150, overflowY: 'auto', borderRadius: 10, border: `1px solid ${colors.goldBorder}`, background: colors.surface, marginTop: 4 }}>
                  {editAddFoodResults.map((f: any) => (
                    <button key={f.id} onClick={() => {
                      const newFood = { name: f.nom, calories: f.calories, protein: f.proteines, carbs: f.glucides, fat: f.lipides, quantity: 100 }
                      setEditingMeal({ ...editingMeal, foods: [...(editingMeal.foods || []), newFood] })
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
              setEditMealSaving(true)
              const foods = editingMeal.foods || []
              const totals = {
                total_calories: foods.reduce((s: number, f: Record<string, unknown>) => s + (Number(f.calories) || 0), 0),
                total_protein: foods.reduce((s: number, f: Record<string, unknown>) => s + (Number(f.protein ?? f.proteins) || 0), 0),
                total_carbs: foods.reduce((s: number, f: Record<string, unknown>) => s + (Number(f.carbs) || 0), 0),
                total_fat: foods.reduce((s: number, f: Record<string, unknown>) => s + (Number(f.fat ?? f.fats) || 0), 0),
              }
              await supabase.from('saved_meals').update({ foods, ...totals }).eq('id', editingMeal.id)
              setMyMeals(prev => prev.map(m => m.id === editingMeal.id ? { ...m, foods, ...totals } : m))
              setEditMealSaving(false)
              setEditMealSaved(true)
              setTimeout(() => setEditMealSaved(false), 2000)
            }} disabled={editMealSaving} style={{ width: '100%', padding: '14px 0', background: `linear-gradient(135deg, ${colors.gold}, ${colors.goldContainer})`, color: colors.onGold, fontFamily: fonts.headline, fontWeight: 700, borderRadius: 12, border: 'none', cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.12em', fontSize: 13, marginBottom: 8, opacity: editMealSaving ? 0.6 : 1 }}>
              {editMealSaving ? nt('actions.saving') : editMealSaved ? nt('actions.saved') : nt('actions.save')}
            </button>
            <button onClick={async () => {
              if (confirm(nt('actions.deleteConfirm'))) {
                await supabase.from('saved_meals').delete().eq('id', editingMeal.id)
                setMyMeals(prev => prev.filter(m => m.id !== editingMeal.id))
                setEditingMeal(null)
              }
            }} style={{ width: '100%', padding: '12px 0', background: 'transparent', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 12, color: colors.error, fontFamily: fonts.body, fontSize: 12, fontWeight: 700, cursor: 'pointer', textAlign: 'center' }}>SUPPRIMER LE REPAS</button>
            </div>
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
          <div onClick={() => setShowSaveMealPopup(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: Z_MODAL }} />
          <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: 'calc(100% - 32px)', maxWidth: 400, background: colors.surface, border: `1px solid ${colors.goldBorder}`, borderRadius: 16, padding: 24, zIndex: Z_MODAL, boxShadow: '0 4px 24px rgba(0,0,0,0.6)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <div style={{ width: 3, height: 18, background: colors.gold, borderRadius: 2, flexShrink: 0 }} />
              <h3 style={{ fontFamily: fonts.alt, fontSize: 20, fontWeight: 700, letterSpacing: '0.1em', color: colors.gold, textTransform: 'uppercase', margin: 0, lineHeight: 1 }}>{nt('saveMealPopup.title')}</h3>
            </div>
            <input type="text" placeholder={nt('saveMealPopup.placeholder')} value={saveMealName} onChange={e => setSaveMealName(e.target.value)} autoFocus style={{ width: '100%', padding: '12px 14px', background: colors.background, border: `1px solid ${colors.goldBorder}`, borderRadius: 10, color: colors.text, fontFamily: fonts.body, fontSize: 14, outline: 'none', marginBottom: 12 }} />
            <div style={{ background: colors.background, borderRadius: 10, padding: 12, marginBottom: 16, border: `1px solid ${colors.goldDim}` }}>
              <div style={{ ...subtitleStyle, fontSize: 9, letterSpacing: 2, marginBottom: 8 }}>{nt('saveMealPopup.foodCount', { count: saveMealData.foods.length })}</div>
              {saveMealData.foods.map((f: any, i: number) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', fontFamily: fonts.body, fontSize: 12 }}>
                  <span style={{ color: colors.text }}>{f.name}</span>
                  <span style={{ color: colors.gold }}>{f.calories} kcal</span>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <button onClick={() => setShowSaveMealPopup(false)} style={{ flex: 1, padding: 14, background: 'transparent', border: `1.5px solid rgba(212,168,67,0.5)`, borderRadius: 12, color: colors.gold, fontFamily: fonts.headline, fontSize: 16, letterSpacing: 2, cursor: 'pointer' }}>{nt('saveMealPopup.cancel')}</button>
              <button disabled={!saveMealName.trim()} onClick={async () => {
                const foods = Array.isArray(saveMealData?.foods) ? saveMealData.foods as Record<string, unknown>[] : []
                await supabase.from('saved_meals').insert({
                  user_id: userId,
                  name: saveMealName,
                  meal_type: saveMealType,
                  foods,
                  total_calories: foods.reduce((sum, food) => sum + (Number(food.calories) || 0), 0),
                  total_protein: foods.reduce((sum, food) => sum + (Number(food.proteins ?? food.protein) || 0), 0),
                  total_carbs: foods.reduce((sum, food) => sum + (Number(food.carbs) || 0), 0),
                  total_fat: foods.reduce((sum, food) => sum + (Number(food.fats ?? food.fat) || 0), 0),
                })
                setShowSaveMealPopup(false); setSaveMealName('')
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
