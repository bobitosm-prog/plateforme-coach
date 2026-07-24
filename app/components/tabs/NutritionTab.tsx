'use client'
import React, { useEffect, useState } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { UtensilsCrossed, SlidersHorizontal, ShoppingCart, Sun, Moon, Cookie } from 'lucide-react'
import NutritionPreferences from '../NutritionPreferences'
import ImportPlanSheet from './nutrition/ImportPlanSheet'
import FoodSearch from '../FoodSearch'
import { normalizeFoodItem } from '../../../lib/utils/food'
import RecipesSection from '../RecipesSection'
import ShoppingList from '../ShoppingList'
import SectionTitle from '../ui/SectionTitle'
import AiQuotaBadge from '../ui/AiQuotaBadge'
import { useNutritionJournal, useNutritionPlans } from '../../hooks/nutrition'
import { NutritionCalendarSection } from './nutrition/NutritionCalendarSection'
import { NutritionPlanSection } from './nutrition/NutritionPlanSection'
import { NutritionSummarySection } from './nutrition/NutritionSummarySection'
import { NutritionSavedMealsSection, type NutritionSavedMealView } from './nutrition/NutritionSavedMealsSection'
import { NutritionJournalMealsSection, type NutritionJournalLog } from './nutrition/NutritionJournalMealsSection'
import { NutritionPlanContent } from './nutrition/NutritionPlanContent'
import { NutritionTabOverlays, type EditableMeal, type FoodSearchResult, type OverlayFood, type ReusableMeal } from './nutrition/NutritionTabOverlays'
import {
  prepareEmptySavedMealInsert,
  prepareSavedMealInsert,
  prepareSavedMealUpdate,
  savedMealWriteMessage,
} from '../../../lib/nutrition/saved-meal-persistence'
import {
  persistSavedMealReuse,
  prepareSavedMealReuse,
  savedMealReuseMessage,
} from '../../../lib/nutrition/saved-meal-reuse'
import { SAVED_MEAL_PROJECTION } from '../../../lib/repositories/nutrition/recipes'
import {
  fonts, colors, todayNutritionKey, subtitleStyle, bodyStyle,
} from '../../../lib/design-tokens'
import { parseMealPlan, getMealByKey, type Day, type DayPlan, type MealKey } from '../../../lib/meal-plan'
// MEAL_LABELS moved inside component to use translations — see getMealLabel()
const MEAL_ORDER: MealKey[] = ['petit_dejeuner', 'dejeuner', 'collation', 'diner']
const addDays = (date: string, days: number) => { const value = new Date(`${date}T00:00:00`); value.setDate(value.getDate() + days); return value.toISOString().split('T')[0] }

type SubTab = 'today' | 'plan' | 'scanner' | 'prefs' | 'recipes' | 'meals'

interface NutritionTabProps {
  coachMealPlan: any
  todayKey: string
  setModal: (modal: string) => void
  profile: any
  supabase: any
  userId: string
  fetchAll: () => Promise<void>
}

export default function NutritionTab({ coachMealPlan, todayKey, setModal, profile, supabase, userId, fetchAll }: NutritionTabProps) {
  const nt = useTranslations('nutrition_tab')
  const locale = useLocale()
  const MEAL_LABEL_MAP: Record<string, string> = { petit_dejeuner: 'breakfast', dejeuner: 'lunch', collation: 'snack', diner: 'dinner' }
  const getMealLabel = (key: string) => nt(`meals.${MEAL_LABEL_MAP[key] || key}`)
  const MEAL_LABELS: Record<string, string> = { petit_dejeuner: getMealLabel('petit_dejeuner'), dejeuner: getMealLabel('dejeuner'), collation: getMealLabel('collation'), diner: getMealLabel('diner') }
  const [nutritionDay, setNutritionDay] = useState<string>(todayNutritionKey())
  const [showFoodSearch, setShowFoodSearch] = useState<string | null>(null) // meal_type or null
  const [showShoppingModal, setShowShoppingModal] = useState(false)
  const [importingMeal, setImportingMeal] = useState<MealKey | null>(null)
  const [editingFoodId, setEditingFoodId] = useState<string | null>(null)
  const [editQty, setEditQty] = useState('')
  const [swappingFoodId, setSwappingFoodId] = useState<string | null>(null)
  const [showPhotoCapture, setShowPhotoCapture] = useState(false)
  const [photoMealTarget, setPhotoMealTarget] = useState('')
  const [analyzingPhoto, setAnalyzingPhoto] = useState(false)
  const [photoResults, setPhotoResults] = useState<any>(null)
  // Meal save/copy/reuse
  const [mealMenuOpen, setMealMenuOpen] = useState<string | null>(null)
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
  const [useSavedMealTarget, setUseSavedMealTarget] = useState('')
  const [savedMealReusing, setSavedMealReusing] = useState(false)
  const savedMealReuseInFlight = React.useRef(false)
  const savedMealReuseRequest = React.useRef(0)
  // Mes repas tab state
  const [myMeals, setMyMeals] = useState<any[]>([])
  const [myMealsSearch, setMyMealsSearch] = useState('')
  const [myMealsFilter, setMyMealsFilter] = useState('all')
  const [editingMeal, setEditingMeal] = useState<any>(null)
  const [confirmDeleteMeal, setConfirmDeleteMeal] = useState<string | null>(null)
  const [editMealSaving, setEditMealSaving] = useState(false)
  const [editMealSaved, setEditMealSaved] = useState(false)
  const [saveMealSaving, setSaveMealSaving] = useState(false)
  const [savedMealError, setSavedMealError] = useState<string | null>(null)
  const [editAddFoodQuery, setEditAddFoodQuery] = useState('')
  const [editAddFoodResults, setEditAddFoodResults] = useState<any[]>([])
  const calScrollRef = React.useRef<HTMLDivElement>(null)
  const today = new Date().toISOString().split('T')[0]
  const [selectedDate, setSelectedDate] = useState(today)
  const calendarDays = React.useMemo(() => {
    const d: string[] = []
    for (let i = -30; i <= 7; i++) { const dt = new Date(); dt.setDate(dt.getDate() + i); d.push(dt.toISOString().split('T')[0]) }
    return d
  }, [])

  const journal = useNutritionJournal({ supabase, userId, selectedDate })
  const plans = useNutritionPlans({ supabase, userId, date: today })
  const { dailyLogs, setDailyLogs, daysWithMeals, setDaysWithMeals, waterToday, reload: fetchDailyLogs } = journal
  const { activePersonalPlan: activeMealPlan, loading: loadingPlan, reload: fetchActiveMealPlan } = plans
  const addWater = (ml: number) => journal.addWater(ml, today)
  const [subTab, setSubTab] = useState<SubTab>('today')

  useEffect(() => {
    // Auto-scroll calendar to today
    savedMealReuseRequest.current += 1
    savedMealReuseInFlight.current = false
    setSavedMealReusing(false)
    setTimeout(() => { document.getElementById(`cal-${today}`)?.scrollIntoView({ behavior: 'instant', inline: 'center', block: 'nearest' }) }, 100)
  }, [userId])

  useEffect(() => {
    if (activeMealPlan && !coachMealPlan) setSubTab('today')
  }, [activeMealPlan, coachMealPlan])

  // Fetch saved meals for "Mes Repas" tab
  useEffect(() => {
    if (subTab === 'meals' && userId) {
      supabase.from('saved_meals').select('*').eq('user_id', userId).order('created_at', { ascending: false })
        .then(({ data }: any) => setMyMeals(data || []))
    }
  }, [subTab, userId])

  useEffect(() => {
  }, [activeMealPlan, subTab])

  async function deleteDailyLog(id: string) {
    await supabase.from('daily_food_logs').delete().eq('id', id)
    setDailyLogs(prev => prev.filter(l => l.id !== id))
  }

  async function updateFoodQuantity(id: string, newQty: number) {
    if (!newQty || newQty <= 0) return
    const log = dailyLogs.find(l => l.id === id)
    if (!log) return
    const oldQty = log.quantity_g || 100
    const ratio = newQty / oldQty
    const updated = { quantity_g: newQty, calories: Math.round((log.calories || 0) * ratio), protein: Math.round((log.protein || 0) * ratio * 10) / 10, carbs: Math.round((log.carbs || 0) * ratio * 10) / 10, fat: Math.round((log.fat || 0) * ratio * 10) / 10 }
    await supabase.from('daily_food_logs').update(updated).eq('id', id)
    setDailyLogs(prev => prev.map(l => l.id === id ? { ...l, ...updated } : l))
    setEditingFoodId(null)
  }

  async function handlePhotoCapture(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setAnalyzingPhoto(true)
    const reader = new FileReader()
    reader.onload = async () => {
      const base64 = (reader.result as string).split(',')[1]
      try {
        const res = await fetch('/api/analyze-meal-photo', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ image: base64 }) })
        const data = await res.json()
        setPhotoResults(data)
      } catch { setPhotoResults(null) }
      finally { setAnalyzingPhoto(false) }
    }
    reader.readAsDataURL(file)
  }

  async function addPhotoFoods() {
    if (!photoResults?.foods) return
    for (const food of photoResults.foods) {
      await supabase.from('daily_food_logs').insert({
        user_id: userId, date: today, meal_type: photoMealTarget,
        custom_name: food.name, quantity_g: food.quantity_g || 100,
        calories: food.calories || 0, protein: food.proteins || 0, carbs: food.carbs || 0, fat: food.fats || 0,
      })
    }
    setShowPhotoCapture(false)
    setPhotoResults(null)
    fetchDailyLogs()
  }

  async function clearMeal(mealType: string) {
    const toDelete = dailyLogs.filter(l => l.meal_type === mealType)
    for (const l of toDelete) await supabase.from('daily_food_logs').delete().eq('id', l.id)
    setDailyLogs(prev => prev.filter(l => l.meal_type !== mealType))
  }

  async function applySavedMeal(meal: ReusableMeal, targetMealType: string) {
    if (savedMealReuseInFlight.current) return
    savedMealReuseInFlight.current = true
    const request = ++savedMealReuseRequest.current
    setSavedMealReusing(true)
    setSavedMealError(null)
    const prepared = prepareSavedMealReuse({
      meal,
      userId,
      targetDate: today,
      targetMealType,
    })
    if (prepared.status !== 'ready') {
      if (request === savedMealReuseRequest.current) {
        setSavedMealError(savedMealReuseMessage(prepared))
        setSavedMealReusing(false)
        savedMealReuseInFlight.current = false
      }
      return
    }
    const result = await persistSavedMealReuse(prepared, async inserts => {
      const { error } = await supabase.from('daily_food_logs').insert(inserts)
      return { error }
    })
    if (request !== savedMealReuseRequest.current) return
    savedMealReuseInFlight.current = false
    setSavedMealReusing(false)
    if (result.status === 'write_failed') {
      setSavedMealError(savedMealReuseMessage('write_failed'))
      return
    }
    await fetchDailyLogs()
    setShowSavedMeals(false)
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
  }

  async function importMealFromPlan(mealType: MealKey) {
    if (nutritionDay !== todayKey) return
    const todayPlan = getTodayPlanData()
    if (!todayPlan) return
    const foods = getMealByKey(todayPlan.day, mealType)
    if (!foods.length) return
    setImportingMeal(null)
    const inserts = foods.map(f => ({
      user_id: userId, date: today, meal_type: mealType,
      custom_name: f.name || 'Aliment', quantity_g: f.qty || 100,
      calories: f.kcal, protein: f.prot, carbs: f.carb, fat: f.fat,
    }))
    await supabase.from('daily_food_logs').insert(inserts)
    fetchDailyLogs()
  }

  function getDailyLogsMacros() {
    const r = { kcal: 0, protein: 0, carbs: 0, fat: 0 }
    for (const l of dailyLogs) { r.kcal += l.calories || 0; r.protein += l.protein || 0; r.carbs += l.carbs || 0; r.fat += l.fat || 0 }
    return r
  }

  function getMealRecommendation(mealType: MealKey) {
    const todayPlan = getTodayPlanData()
    if (!todayPlan) return null
    const foods = getMealByKey(todayPlan.day, mealType)
    if (!foods.length) return null
    return foods.reduce(
      (acc, f) => ({ kcal: acc.kcal + f.kcal, protein: acc.protein + f.prot, carbs: acc.carbs + f.carb, fat: acc.fat + f.fat }),
      { kcal: 0, protein: 0, carbs: 0, fat: 0 }
    )
  }

  // Get today's plan data normalized to canonical DayPlan format.
  // Prefers activeMealPlan (AI), falls back to coachMealPlan.
  function getTodayPlanData(): { day: DayPlan; planId: string | null } | null {
    const dayKey = todayNutritionKey().toLowerCase() as Day
    if (activeMealPlan?.plan_data) {
      const parsed = parseMealPlan(activeMealPlan.plan_data)
      const day = parsed[dayKey]
      if (day) return { day, planId: activeMealPlan.id }
    }
    if (coachMealPlan) {
      const parsed = parseMealPlan(coachMealPlan)
      const day = parsed[dayKey]
      if (day) return { day, planId: coachMealPlan.id ?? null }
    }
    return null
  }

  const isInvited = profile?.subscription_type === 'invited'

  // Waiting screen when no plan exists
  function renderWaitingScreen() {
    if (isInvited) {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px 24px', textAlign: 'center' }}>
          <div style={{ fontSize: '3.5rem', marginBottom: 24 }}>🔒</div>
          <h2 style={{ ...subtitleStyle, fontSize: '1.3rem', fontWeight: 800, letterSpacing: '2px', color: colors.text, margin: '0 0 10px' }}>{nt('chrome.coachManaged')}</h2>
          <p style={{ ...bodyStyle, fontSize: '0.82rem', margin: 0, lineHeight: 1.6, maxWidth: 300 }}>
            Ton coach prépare ton plan nutrition personnalisé. Contacte-le via la messagerie.
          </p>
        </div>
      )
    }
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px 24px', textAlign: 'center' }}>
        <div style={{ fontSize: '3.5rem', marginBottom: 24 }}>🍽️</div>
        <h2 style={{ ...subtitleStyle, fontSize: '1.3rem', fontWeight: 800, letterSpacing: '2px', color: colors.text, margin: '0 0 10px' }}>{nt('chrome.noPlan')}</h2>
        <p style={{ ...bodyStyle, fontSize: '0.82rem', margin: '0 0 24px', lineHeight: 1.6, maxWidth: 300 }}>
          {nt('prefs.configurePrompt')}
        </p>
        <button onClick={() => setSubTab('prefs')} style={{ padding: '14px 32px', border: 'none', cursor: 'pointer', background: colors.gold, fontFamily: fonts.body, fontSize: '0.9rem', fontWeight: 800, color: colors.onGold, letterSpacing: '2px', textTransform: 'uppercase',  }}>
          {nt('prefs.configureCta')}
        </button>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', overflowX: 'hidden', maxWidth: '100%' }}>
      {/* PAGE TITLE */}
      <div style={{ padding: '16px 24px 0' }}>
        <div style={{ fontFamily: fonts.headline, fontSize: 24, fontWeight: 400, color: colors.gold, letterSpacing: '0.02em', lineHeight: 1, textTransform: 'uppercase' }}>
          NUTRITION
        </div>
        <div style={{ fontFamily: fonts.alt, fontSize: 11, fontWeight: 700, letterSpacing: '0.15em', color: colors.textDim, textTransform: 'uppercase', marginTop: 4 }}>
          {nt('chrome.calorieGoal', { kcal: profile?.calorie_goal || 2000 })}
        </div>
      </div>

      {/* PILLS NAVIGATION */}
      <div style={{ display: 'flex', gap: 6, padding: '12px 20px 16px', overflowX: 'auto', scrollbarWidth: 'none' }}>
        {([
          { id: 'today' as SubTab, label: nt('tabs.journal') },
          { id: 'plan' as SubTab, label: nt('tabs.plan') },
          ...(!isInvited ? [{ id: 'prefs' as SubTab, label: nt('tabs.prefs') }] : []),
          ...(!isInvited ? [{ id: 'recipes' as SubTab, label: nt('tabs.recipes') }] : []),
          { id: 'meals' as SubTab, label: nt('tabs.meals') },
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
          onAdded={async (insertedLog?: any) => {
            if (swappingFoodId) { await supabase.from('daily_food_logs').delete().eq('id', swappingFoodId); setSwappingFoodId(null) }
            // Optimistic update — inject into state immediately (never null thanks to fallback)
            if (insertedLog) { setDailyLogs(prev => [...prev, insertedLog]) }
            setDaysWithMeals(prev => new Set([...prev, selectedDate]))
            setShowFoodSearch(null)
            // Delayed refetch — wait for read replica sync before overwriting optimistic state
            setTimeout(() => { fetchDailyLogs() }, 2000)
          }}
          onClose={() => { setShowFoodSearch(null); setSwappingFoodId(null) }}
        />
      )}

      {/* MON PLAN TAB — daily logs as source of truth */}
      {subTab === 'today' && (() => {
        const consumed = getDailyLogsMacros()
        const targetKcal = profile?.calorie_goal || 2000
        const targetP = profile?.protein_goal || 140
        const targetG = profile?.carbs_goal || 200
        const targetL = profile?.fat_goal || 60
        const remaining = Math.max(0, targetKcal - consumed.kcal)

        const waterGoal = profile?.water_goal || 3000
        const MEAL_ICONS: Record<string, React.ComponentType<any>> = { petit_dejeuner: Sun, dejeuner: UtensilsCrossed, collation: Cookie, diner: Moon }

        return (
          <div style={{ padding: '0 20px', paddingBottom: 'calc(160px + env(safe-area-inset-bottom, 0px))' }}>
            <NutritionCalendarSection calendarDays={calendarDays} selectedDate={selectedDate} today={today} daysWithMeals={daysWithMeals} locale={locale} scrollRef={calScrollRef} todayLabel={nt('chrome.today')} futureDateLabel={nt('chrome.futureDate')} onSelectDate={setSelectedDate} />
            <NutritionSummarySection consumed={consumed} targets={{ kcal: targetKcal, protein: targetP, carbs: targetG, fat: targetL }} waterMl={waterToday} waterGoalMl={waterGoal} canAddWater={selectedDate === today} remainingLabel={nt('chrome.remaining', { count: remaining })} macroLabels={{ protein: nt('macrosLong.prot'), carbs: nt('macrosLong.gluc'), fat: nt('macrosLong.lip') }} water250Label={nt('chrome.addWater250')} water500Label={nt('chrome.addWater500')} onAddWater={addWater} />

            <NutritionJournalMealsSection mealOrder={MEAL_ORDER} mealLabels={MEAL_LABELS} mealIcons={MEAL_ICONS} logs={dailyLogs as NutritionJournalLog[]} recommendations={Object.fromEntries(MEAL_ORDER.map(meal => [meal, getMealRecommendation(meal)]))} selectedPlanDay={nutritionDay} todayPlanDay={todayKey} isInvited={isInvited} openMenu={mealMenuOpen} editingFoodId={editingFoodId} editQuantity={editQty} labels={{ noFood: nt('chrome.noFoodAdded'), recommended: value => nt('chrome.recommended', { kcal: value.kcal, p: Math.round(value.protein), c: Math.round(value.carbs), f: Math.round(value.fat) }), consumed: value => `Consommé : ${value.kcal} kcal · P:${Math.round(value.protein)}g · G:${Math.round(value.carbs)}g · L:${Math.round(value.fat)}g`, save: nt('mealMenu.saveMeal'), copy: nt('mealMenu.copyToDay'), clear: nt('mealMenu.clearMeal'), replace: nt('mealMenu.replace'), remove: nt('mealMenu.delete'), import: nt('actions.import'), add: nt('chrome.add'), todayOnly: 'Disponible uniquement pour aujourd\'hui' }} onOpenMenu={setMealMenuOpen} onStartSave={(meal, logs) => { setMealMenuOpen(null); setSavedMealError(null); setSaveMealData({ mealType: meal, foods: logs.map(log => ({ name: log.custom_name || log.food_name, quantity: log.quantity_g, calories: log.calories, proteins: log.protein, carbs: log.carbs, fats: log.fat })) }); setSaveMealName(''); setSaveMealType(meal); setShowSaveMealPopup(true) }} onStartCopy={(meal, logs) => { setMealMenuOpen(null); setCopyMealData({ mealType: meal, foods: logs }); setCopyTargetDate(''); setCopyTargetMealType(meal); setShowCopyMealPopup(true) }} onClear={clearMeal} onStartEditQuantity={log => { setEditingFoodId(log.id); setEditQty(String(log.quantity_g || 100)) }} onEditQuantity={setEditQty} onSaveQuantity={updateFoodQuantity} onCancelQuantity={() => setEditingFoodId(null)} onReplace={log => { setSwappingFoodId(log.id); setShowFoodSearch(log.meal_type) }} onDelete={deleteDailyLog} onImport={setImportingMeal} onAdd={setShowFoodSearch} onPhoto={meal => { setPhotoMealTarget(meal); setShowPhotoCapture(true) }} onSavedMeals={meal => { setUseSavedMealTarget(meal); setSavedMealError(null); setShowSavedMeals(true); supabase.from('saved_meals').select(SAVED_MEAL_PROJECTION).eq('user_id', userId).order('created_at', { ascending: false }).then(({ data }: any) => setSavedMeals(data || [])) }} />

            {/* Import confirmation modal */}
            {importingMeal && (() => {
              const todayPlan = getTodayPlanData()
              const foods = todayPlan ? getMealByKey(todayPlan.day, importingMeal) : []
              return (
                <ImportPlanSheet mealLabel={MEAL_LABELS[importingMeal]} foods={foods} isInvited={isInvited} onImport={() => importMealFromPlan(importingMeal)} onClose={() => setImportingMeal(null)} />
              )
            })()}

            {/* Shopping button */}
            {(activeMealPlan?.plan_data || coachMealPlan) && (
              <button onClick={() => setShowShoppingModal(true)} style={{
                width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                padding: '12px', border: `1px solid ${colors.goldRule}`, background: colors.goldDim, cursor: 'pointer',
                fontFamily: fonts.body, fontSize: 12, color: colors.gold, marginBottom: 20,
              }}>
                <ShoppingCart size={14} /> {nt('chrome.shoppingList')}
              </button>
            )}
          </div>
        )
      })()}

      <NutritionPlanSection active={subTab === 'plan'} loading={loadingPlan} hasPersonalPlan={!!activeMealPlan} hasCoachPlan={!!coachMealPlan} emptyView={renderWaitingScreen()} personalPlanView={activeMealPlan ? <NutritionPlanContent mode="personal" plan={activeMealPlan} planData={activeMealPlan.plan_data} selectedDay={nutritionDay} todayKey={todayKey} locale={locale} labels={{ kcal: nt('macros.kcal'), protein: nt('macros.protein'), carbs: nt('macros.carbs'), fat: nt('macros.fat'), noDay: nt('chrome.noPlanForDay', { day: nutritionDay }), noMeals: nt('chrome.noMealsForDay'), shopping: nt('chrome.shoppingList'), breakfast: nt('meals.breakfast'), lunch: nt('meals.lunch'), snack: nt('meals.snack'), dinner: nt('meals.dinner') }} onSelectDay={setNutritionDay} onShopping={() => setShowShoppingModal(true)} /> : null} coachPlanView={coachMealPlan ? <NutritionPlanContent mode="coach" plan={coachMealPlan} planData={coachMealPlan} selectedDay={nutritionDay} todayKey={todayKey} locale={locale} labels={{ kcal: nt('macros.kcal'), protein: nt('macros.protein'), carbs: nt('macros.carbs'), fat: nt('macros.fat'), noDay: nt('chrome.noPlanForDay', { day: nutritionDay }), noMeals: nt('chrome.noMealsForDay'), shopping: nt('chrome.shoppingList'), breakfast: nt('meals.breakfast'), lunch: nt('meals.lunch'), snack: nt('meals.snack'), dinner: nt('meals.dinner') }} onSelectDay={setNutritionDay} onShopping={() => setShowShoppingModal(true)} /> : null} />

      {/* Preferences sub-tab */}
      {subTab === 'prefs' && (
        <div style={{ padding: '0 20px', paddingBottom: 'calc(160px + env(safe-area-inset-bottom, 0px))' }}>
          <AiQuotaBadge />
          <SectionTitle noPadding title={nt('chrome.prefsTitle')} icon={<SlidersHorizontal size={16} />} />
          <NutritionPreferences profile={profile} supabase={supabase} userId={userId} onSaved={fetchAll} onPlanRegenerated={() => { fetchActiveMealPlan(); setSubTab('today') }} />
        </div>
      )}

      {/* Recipes sub-tab */}
      {subTab === 'recipes' && (
        <div style={{ padding: '0 20px', paddingBottom: 'calc(160px + env(safe-area-inset-bottom, 0px))' }}>
          <RecipesSection supabase={supabase} userId={userId} profile={profile} />
        </div>
      )}

      {/* Mes Repas sub-tab */}
      {subTab === 'meals' && (
        <NutritionSavedMealsSection meals={myMeals as NutritionSavedMealView[]} search={myMealsSearch} filter={myMealsFilter} locale={locale} labels={{ title: nt('chrome.myMeals'), search: nt('chrome.searchMeal'), all: nt('filters.all'), breakfast: nt('filters.breakfast'), lunch: nt('filters.lunch'), dinner: nt('filters.dinner'), snack: nt('filters.snack'), empty: 'Aucun repas sauvegardé. Ajoute un repas depuis l’onglet Journal pour le retrouver ici.', create: '+ CRÉER UN REPAS' }} mealLabels={MEAL_LABELS} confirmDeleteId={confirmDeleteMeal} onSearchChange={setMyMealsSearch} onFilterChange={setMyMealsFilter} onEdit={meal => { setSavedMealError(null); setEditingMeal(meal) }} onAskDelete={setConfirmDeleteMeal} onDelete={async id => { await supabase.from('saved_meals').delete().eq('id', id); setMyMeals(previous => previous.filter(meal => meal.id !== id)); setConfirmDeleteMeal(null) }} onCreate={async () => { const payload = prepareEmptySavedMealInsert({ userId, name: 'Nouveau repas', mealType: 'dejeuner' }); const { data } = await supabase.from('saved_meals').insert(payload).select().single(); if (data) { setMyMeals(previous => [data, ...previous]); setEditingMeal(data) } }} />
      )}

      {showShoppingModal && (activeMealPlan?.plan_data || coachMealPlan) && <ShoppingList planData={activeMealPlan?.plan_data || coachMealPlan} onClose={() => setShowShoppingModal(false)} />}
      <NutritionTabOverlays editingMeal={editingMeal as EditableMeal | null} editQuery={editAddFoodQuery} editResults={editAddFoodResults as FoodSearchResult[]} editSaving={editMealSaving} editSaved={editMealSaved} savedMealError={savedMealError} saveMealSaving={saveMealSaving} savedMealReusing={savedMealReusing} photoOpen={showPhotoCapture} analyzingPhoto={analyzingPhoto} photoResult={photoResults} saveOpen={showSaveMealPopup && !!saveMealData} saveFoods={(saveMealData?.foods || []) as OverlayFood[]} saveName={saveMealName} copyOpen={showCopyMealPopup && !!copyMealData} copyDate={copyTargetDate} copyMealType={copyTargetMealType} today={today} mealOrder={MEAL_ORDER} mealLabels={MEAL_LABELS} savedOpen={showSavedMeals} savedMeals={savedMeals as ReusableMeal[]} labels={{ editFallback: 'Modifier le repas', save: nt('actions.save'), saving: nt('actions.saving'), saved: nt('actions.saved'), deleteMeal: 'SUPPRIMER LE REPAS', scan: nt('chrome.scanMeal'), takePhoto: nt('chrome.takePhoto'), gallery: nt('chrome.orGallery'), retake: nt('chrome.retake'), addAll: nt('chrome.addAll'), saveTitle: nt('saveMealPopup.title'), savePlaceholder: nt('saveMealPopup.placeholder'), saveCount: count => nt('saveMealPopup.foodCount', { count }), cancel: nt('saveMealPopup.cancel'), copyTitle: nt('copyMealPopup.title'), copyDate: nt('copyMealPopup.date'), copyMeal: nt('copyMealPopup.meal'), copy: nt('copyMealPopup.copy'), savedTitle: nt('savedMeals.title'), savedEmpty: nt('savedMeals.empty'), savedCount: count => nt('savedMeals.foodCount', { count }), shortcuts: [{ label: nt('copy.tomorrow'), date: addDays(today, 1) }, { label: nt('copy.plus2d'), date: addDays(today, 2) }, { label: nt('copy.plus3d'), date: addDays(today, 3) }, { label: nt('copy.plus1w'), date: addDays(today, 7) }] }} onCloseEdit={() => { setSavedMealError(null); setEditingMeal(null) }} onEditFood={(index, quantity) => { setSavedMealError(null); const foods = [...(editingMeal.foods || [])]; const food = foods[index]; const ratio = (quantity || 100) / (food.quantity || 100); foods[index] = { ...food, quantity: quantity || 0, calories: Math.round((food.calories || 0) * ratio), protein: Math.round((food.protein || 0) * ratio), carbs: Math.round((food.carbs || 0) * ratio), fat: Math.round((food.fat || 0) * ratio) }; setEditingMeal({ ...editingMeal, foods }) }} onRemoveFood={index => { setSavedMealError(null); setEditingMeal({ ...editingMeal, foods: (editingMeal.foods || []).filter((_: unknown, itemIndex: number) => itemIndex !== index) }) }} onEditQuery={async value => { setEditAddFoodQuery(value); if (value.length < 2) { setEditAddFoodResults([]); return } const query = `%${value}%`; const [fitness, anses] = await Promise.all([supabase.from('food_items').select('id, name, energy_kcal, proteins, carbohydrates, fat, source').eq('source', 'fitness').ilike('name', query).limit(8), supabase.from('food_items').select('id, name, energy_kcal, proteins, carbohydrates, fat, source').eq('source', 'ANSES').ilike('name', query).limit(6)]); setEditAddFoodResults([...(fitness.data || []).map((food: any) => normalizeFoodItem(food)), ...(anses.data || []).map((food: any) => normalizeFoodItem(food))]) }} onAddFood={food => { setSavedMealError(null); setEditingMeal({ ...editingMeal, foods: [...(editingMeal.foods || []), { name: food.nom, calories: food.calories, protein: food.proteines, carbs: food.glucides, fat: food.lipides, quantity: 100 }] }); setEditAddFoodQuery(''); setEditAddFoodResults([]) }} onSaveEdit={async () => { if (editMealSaving) return; setEditMealSaving(true); setSavedMealError(null); const prepared = prepareSavedMealUpdate(editingMeal.foods || []); if (!prepared.ok) { setSavedMealError(savedMealWriteMessage(prepared)); setEditMealSaving(false); return } const { error } = await supabase.from('saved_meals').update(prepared.payload).eq('id', editingMeal.id); if (error) { setSavedMealError(savedMealWriteMessage('persistence_error')); setEditMealSaving(false); return } setMyMeals(previous => previous.map(meal => meal.id === editingMeal.id ? { ...meal, ...prepared.payload } : meal)); setEditMealSaving(false); setEditMealSaved(true); setTimeout(() => setEditMealSaved(false), 2000) }} onDeleteEdit={async () => { if (confirm(nt('actions.deleteConfirm'))) { await supabase.from('saved_meals').delete().eq('id', editingMeal.id); setMyMeals(previous => previous.filter(meal => meal.id !== editingMeal.id)); setEditingMeal(null) } }} onPhotoChange={handlePhotoCapture} onClosePhoto={() => { setShowPhotoCapture(false); setPhotoResults(null) }} onRetake={() => setPhotoResults(null)} onAddPhoto={addPhotoFoods} onSaveName={value => { setSavedMealError(null); setSaveMealName(value) }} onCloseSave={() => { setSavedMealError(null); setShowSaveMealPopup(false) }} onSaveMeal={async () => { if (saveMealSaving) return; setSaveMealSaving(true); setSavedMealError(null); const prepared = prepareSavedMealInsert({ userId, name: saveMealName, mealType: saveMealType, foods: saveMealData.foods }); if (!prepared.ok) { setSavedMealError(savedMealWriteMessage(prepared)); setSaveMealSaving(false); return } const { error } = await supabase.from('saved_meals').insert(prepared.payload); if (error) { setSavedMealError(savedMealWriteMessage('persistence_error')); setSaveMealSaving(false); return } setShowSaveMealPopup(false); setSaveMealName(''); setSaveMealSaving(false) }} onCopyDate={setCopyTargetDate} onCopyMealType={setCopyTargetMealType} onCloseCopy={() => setShowCopyMealPopup(false)} onCopy={async () => { await copyMealToDate(copyMealData.foods, copyTargetDate, copyTargetMealType); setShowCopyMealPopup(false) }} onCloseSaved={() => { savedMealReuseRequest.current += 1; savedMealReuseInFlight.current = false; setSavedMealReusing(false); setSavedMealError(null); setShowSavedMeals(false) }} onApplySaved={meal => { void applySavedMeal(meal, useSavedMealTarget) }} />
    </div>
  )
}
