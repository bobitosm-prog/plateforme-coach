'use client'
import React, { useEffect, useState } from 'react'
import { UtensilsCrossed, Sparkles, SlidersHorizontal, ShoppingCart, ChevronDown, ChevronUp, Check, Clock, Plus, Trash2, Download, ChefHat, List, ClipboardList, Camera, Star, Sun, Moon, Cookie, Save, Copy, Pencil, FolderOpen, RefreshCw, CalendarDays, Beef, Wheat, Droplet, X } from 'lucide-react'
import { downloadCsv } from '../../../lib/exportCsv'
import NutritionPreferences from '../NutritionPreferences'
import ImportPlanSheet from './nutrition/ImportPlanSheet'
import FoodSearch from '../FoodSearch'
import { normalizeFoodItem } from '../../../lib/utils/food'
import BarcodeScanner from '../BarcodeScanner'
import RecipesSection from '../RecipesSection'
import ShoppingList from '../ShoppingList'
import {
  fonts, colors, NUTRITION_DAYS, todayNutritionKey, titleStyle, titleLineStyle, subtitleStyle, statStyle, statSmallStyle, bodyStyle, labelStyle, mutedStyle, pageTitleStyle, cardStyle, cardTitleAbove,
} from '../../../lib/design-tokens'
import { parseMealPlan, getMealByKey, computeDayTotals, MEAL_KEYS, MEAL_KEY_TO_TYPE, type Day, type DayPlan, type MealKey } from '../../../lib/meal-plan'
const MEAL_LABELS: Record<string, string> = {
  petit_dejeuner: 'Petit-déjeuner',
  dejeuner: 'Déjeuner',
  collation: 'Collation',
  diner: 'Dîner',
}
const MEAL_TIMES: Record<string, string> = {
  petit_dejeuner: '7h00',
  dejeuner: '12h30',
  collation: '16h00',
  diner: '19h30',
}
const MEAL_ORDER: MealKey[] = ['petit_dejeuner', 'dejeuner', 'collation', 'diner']

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
  const T = titleStyle
  const [nutritionDay, setNutritionDay] = useState<string>(todayNutritionKey())
  const [activeMealPlan, setActiveMealPlan] = useState<any>(null)
  const [loadingPlan, setLoadingPlan] = useState(true)
  const [showShoppingList, setShowShoppingList] = useState(false)
  const [completedMeals, setCompletedMeals] = useState<Set<string>>(new Set())
  const [showFoodSearch, setShowFoodSearch] = useState<string | null>(null) // meal_type or null
  const [showScanner, setShowScanner] = useState(false)
  const [showFridgeScanner, setShowFridgeScanner] = useState(false)
  const [showShoppingModal, setShowShoppingModal] = useState(false)
  const [dailyLogs, setDailyLogs] = useState<any[]>([])
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
  // Mes repas tab state
  const [myMeals, setMyMeals] = useState<any[]>([])
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
  const today = new Date().toISOString().split('T')[0]
  const [selectedDate, setSelectedDate] = useState(today)
  const [daysWithMeals, setDaysWithMeals] = useState<Set<string>>(new Set())
  const calendarDays = React.useMemo(() => {
    const d: string[] = []
    for (let i = -30; i <= 7; i++) { const dt = new Date(); dt.setDate(dt.getDate() + i); d.push(dt.toISOString().split('T')[0]) }
    return d
  }, [])

  const hasPlan = !!coachMealPlan || !!activeMealPlan
  const [subTab, setSubTab] = useState<SubTab>('today')

  useEffect(() => {
    fetchActiveMealPlan()
    fetchTodayTracking()
    fetchDailyLogs()
    // Load days with meals for calendar dots
    const thirtyAgo = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0]
    supabase.from('daily_food_logs').select('date').eq('user_id', userId).gte('date', thirtyAgo)
      .then(({ data }: any) => setDaysWithMeals(new Set((data || []).map((d: any) => d.date))))
    // Auto-scroll calendar to today
    setTimeout(() => { document.getElementById(`cal-${today}`)?.scrollIntoView({ behavior: 'instant', inline: 'center', block: 'nearest' }) }, 100)
  }, [userId])

  // Reload meals when date changes
  useEffect(() => { fetchDailyLogs() }, [selectedDate])

  // Fetch saved meals for "Mes Repas" tab
  useEffect(() => {
    if (subTab === 'meals' && userId) {
      supabase.from('saved_meals').select('*').eq('user_id', userId).order('created_at', { ascending: false })
        .then(({ data }: any) => setMyMeals(data || []))
    }
  }, [subTab, userId])

  useEffect(() => {
  }, [activeMealPlan, subTab])

  async function fetchDailyLogs() {
    const { data } = await supabase.from('daily_food_logs').select('*').eq('user_id', userId).eq('date', selectedDate).order('created_at', { ascending: true })
    setDailyLogs(data || [])
  }

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

  async function applySavedMeal(meal: any, targetMealType: string) {
    for (const food of (meal.foods || [])) {
      await supabase.from('daily_food_logs').insert({
        user_id: userId, date: today, meal_type: targetMealType,
        custom_name: food.name, quantity_g: food.quantity || food.quantity_g || 100,
        calories: food.calories || 0, protein: food.proteins || food.protein || 0,
        carbs: food.carbs || 0, fat: food.fats || food.fat || 0,
      })
    }
    await supabase.from('saved_meals').update({ use_count: (meal.use_count || 0) + 1 }).eq('id', meal.id)
    fetchDailyLogs()
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

  function getMealConsumed(mealType: string) {
    const logs = dailyLogs.filter(l => l.meal_type === mealType)
    return logs.reduce((acc, l) => ({ kcal: acc.kcal + (l.calories || 0), protein: acc.protein + (l.protein || 0), carbs: acc.carbs + (l.carbs || 0), fat: acc.fat + (l.fat || 0) }), { kcal: 0, protein: 0, carbs: 0, fat: 0 })
  }

  async function fetchActiveMealPlan() {
    setLoadingPlan(true)
    const { data } = await supabase
      .from('meal_plans')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    setActiveMealPlan(data)
    if (data && !coachMealPlan) setSubTab('today')
    setLoadingPlan(false)
  }

  async function fetchTodayTracking() {
    const { data } = await supabase
      .from('meal_tracking')
      .select('meal_type')
      .eq('user_id', userId)
      .eq('date', today)
      .eq('is_completed', true)
      .limit(50)
    if (data) {
      setCompletedMeals(new Set(data.map((r: any) => r.meal_type)))
    }
  }



  async function toggleMeal(mealType: string, planId: string | null) {
    const isCompleted = !completedMeals.has(mealType)
    const next = new Set(completedMeals)
    if (isCompleted) next.add(mealType); else next.delete(mealType)
    setCompletedMeals(next)

    await supabase.from('meal_tracking').upsert({
      user_id: userId,
      meal_plan_id: planId,
      date: today,
      meal_type: mealType,
      is_completed: isCompleted,
      completed_at: isCompleted ? new Date().toISOString() : null,
    }, { onConflict: 'user_id,date,meal_type' })
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

  // Calculate consumed macros from completed meals (canonical DayPlan)
  function getConsumedMacros(day: DayPlan): { kcal: number; protein: number; carbs: number; fat: number } {
    const result = { kcal: 0, protein: 0, carbs: 0, fat: 0 }
    for (const key of MEAL_KEYS) {
      if (!completedMeals.has(key)) continue
      const foods = getMealByKey(day, key)
      for (const f of foods) {
        result.kcal += f.kcal
        result.protein += f.prot
        result.carbs += f.carb
        result.fat += f.fat
      }
    }
    return result
  }

  const isInvited = profile?.subscription_type === 'invited'

  // Waiting screen when no plan exists
  function renderWaitingScreen() {
    if (isInvited) {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px 24px', textAlign: 'center' }}>
          <div style={{ fontSize: '3.5rem', marginBottom: 24 }}>🔒</div>
          <h2 style={{ ...subtitleStyle, fontSize: '1.3rem', fontWeight: 800, letterSpacing: '2px', color: colors.text, margin: '0 0 10px' }}>Nutrition gérée par ton coach</h2>
          <p style={{ ...bodyStyle, fontSize: '0.82rem', margin: 0, lineHeight: 1.6, maxWidth: 300 }}>
            Ton coach prépare ton plan nutrition personnalisé. Contacte-le via la messagerie.
          </p>
        </div>
      )
    }
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px 24px', textAlign: 'center' }}>
        <div style={{ fontSize: '3.5rem', marginBottom: 24 }}>🍽️</div>
        <h2 style={{ ...subtitleStyle, fontSize: '1.3rem', fontWeight: 800, letterSpacing: '2px', color: colors.text, margin: '0 0 10px' }}>Aucun plan alimentaire</h2>
        <p style={{ ...bodyStyle, fontSize: '0.82rem', margin: '0 0 24px', lineHeight: 1.6, maxWidth: 300 }}>
          Configure tes preferences puis genere ton plan IA personnalise.
        </p>
        <button onClick={() => setSubTab('prefs')} style={{ padding: '14px 32px', border: 'none', cursor: 'pointer', background: colors.gold, fontFamily: fonts.body, fontSize: '0.9rem', fontWeight: 800, color: '#0D0B08', letterSpacing: '2px', textTransform: 'uppercase',  }}>
          Configurer mes preferences
        </button>
      </div>
    )
  }

  // Generate shopping list from plan_data (client-side, no API)
  function generateShoppingList(planData: any): { name: string; totalG: number }[] {
    const map = new Map<string, number>()
    for (const day of Object.values(planData) as any[]) {
      if (!day?.repas) continue
      for (const foods of Object.values(day.repas) as any[]) {
        if (!Array.isArray(foods)) continue
        for (const f of foods) {
          const name = (f.aliment || '').trim()
          if (!name) continue
          map.set(name, (map.get(name) || 0) + (f.quantite_g || 0))
        }
      }
    }
    return Array.from(map.entries())
      .map(([name, totalG]) => ({ name, totalG }))
      .sort((a, b) => a.name.localeCompare(b.name, 'fr'))
  }

  // Render the AI-generated meal plan (from meal_plans table)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function renderAiPlan(plan: any) {
    if (!plan.plan_data) return null
    const parsed = parseMealPlan(plan.plan_data)
    const dayData = parsed[nutritionDay as Day]
    if (!dayData) {
      return (
        <div style={{ padding: 20, textAlign: 'center' }}>
          <p style={{ ...bodyStyle, fontSize: '0.85rem', marginBottom: 12 }}>Pas de plan pour {nutritionDay}.</p>
        </div>
      )
    }
    const totals = dayData.totals ?? computeDayTotals(dayData)

    return (
      <>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 16 }}>
          {[
            { label: 'Kcal', value: String(totals.kcal || plan.total_calories || '—') },
            { label: 'Prot', value: `${totals.prot || plan.protein_g || '—'}g` },
            { label: 'Gluc', value: `${totals.carb || plan.carbs_g || '—'}g` },
            { label: 'Lip', value: `${totals.fat || plan.fat_g || '—'}g` },
          ].map(({ label, value }) => (
            <div key={label} style={{ background: colors.surface2, border: `1px solid ${colors.divider}`, borderRadius: 14, padding: 16, textAlign: 'center' }}>
              <div style={{ ...statStyle, fontSize: 28, fontWeight: 400, color: colors.gold }}>{value}</div>
              <div style={{ ...subtitleStyle, fontSize: 11, letterSpacing: '2px', marginTop: 4 }}>{label}</div>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 4, marginBottom: 16, scrollbarWidth: 'none' }}>
          {NUTRITION_DAYS.map(({ key, label }) => {
            const isActive = nutritionDay === key
            const isToday = key === todayKey
            const dp = parsed[key as Day]
            const dayKcal = dp ? (dp.totals?.kcal ?? computeDayTotals(dp).kcal) : 0
            return (
              <button key={key} onClick={() => setNutritionDay(key)} style={{
                flexShrink: 0, padding: '8px 14px', borderRadius: 10, cursor: 'pointer', transition: 'all 0.15s',
                fontFamily: fonts.alt, fontSize: 9, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase' as const,
                background: isActive ? 'rgba(230,195,100,0.15)' : 'rgba(255,255,255,0.06)',
                backdropFilter: 'blur(8px)',
                border: `1px solid ${isActive ? colors.gold : isToday ? colors.goldRule : 'rgba(255,255,255,0.1)'}`,
                color: isActive ? colors.gold : isToday ? colors.gold : colors.textDim,
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
              }}>
                {label}
                {dayKcal > 0 && <span style={{ fontSize: '0.55rem', fontWeight: 700, opacity: 0.8 }}>{dayKcal}</span>}
              </button>
            )
          })}
        </div>

        <button onClick={() => setShowShoppingModal(true)} style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%',
          padding: '12px 16px', borderRadius: 12, cursor: 'pointer', transition: 'all 0.15s',
          background: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.1)',
          fontFamily: fonts.alt, fontSize: 11, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase' as const,
          color: colors.gold, marginBottom: 12,
        }}>
          <ShoppingCart size={16} color={colors.gold} />
          Liste de courses
        </button>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {MEAL_KEYS.map(mealKey => {
            const foodList = getMealByKey(dayData, mealKey)
            if (foodList.length === 0) return null
            const mealKcal = foodList.reduce((s, f) => s + f.kcal, 0)
            return (
              <div key={mealKey} style={{ background: colors.surface, border: `1px solid ${colors.goldBorder}`, borderRadius: 16, overflow: 'hidden', boxShadow: '0 4px 24px rgba(0,0,0,0.6)' }}>
                <div style={{ padding: '14px 16px', borderBottom: `1px solid ${colors.goldBorder}`, display: 'flex', alignItems: 'center', gap: 8 }}>
                  {React.createElement(({ petit_dejeuner: Sun, dejeuner: UtensilsCrossed, collation: Cookie, diner: Moon } as Record<string, any>)[mealKey] || UtensilsCrossed, { size: 18, color: colors.gold })}
                  <span style={{ ...statSmallStyle, fontWeight: 400, color: colors.text, letterSpacing: '2px', textTransform: 'uppercase', flex: 1 }}>{MEAL_KEY_TO_TYPE[mealKey]}</span>
                  <span style={{ ...statSmallStyle, fontSize: '0.85rem' }}>{mealKcal} kcal</span>
                </div>
                <div style={{ padding: '8px 16px', borderBottom: `1px solid ${colors.goldBorder}`, display: 'flex', gap: 12 }}>
                  {[
                    { l: 'P', v: foodList.reduce((s, f) => s + f.prot, 0), color: colors.gold },
                    { l: 'G', v: foodList.reduce((s, f) => s + f.carb, 0), color: colors.blue },
                    { l: 'L', v: foodList.reduce((s, f) => s + f.fat, 0), color: colors.orange },
                  ].map(({ l, v, color }) => (
                    <span key={l} style={{ fontFamily: fonts.body, fontSize: '0.72rem', fontWeight: 700, color: colors.textMuted }}>
                      <span style={{ color }}>{l}</span> {Math.round(v)}g
                    </span>
                  ))}
                </div>
                <div>
                  {foodList.map((food, fi) => (
                    <div key={fi} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px', borderTop: fi > 0 ? `1px solid ${colors.goldBorder}` : 'none' }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontFamily: fonts.body, fontSize: 14, fontWeight: 400, color: colors.text }}>{food.name}</div>
                        {food.qty > 0 && <div style={{ fontFamily: fonts.body, fontSize: '0.65rem', color: colors.textMuted, marginTop: 2 }}>{food.qty}g</div>}
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <div style={{ ...statSmallStyle, fontSize: '0.85rem' }}>{food.kcal} kcal</div>
                        <div style={{ fontFamily: fonts.body, fontSize: '0.6rem', color: colors.textMuted }}>P{food.prot} G{food.carb} L{food.fat}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </>
    )
  }

  // Render the coach meal plan (from client_meal_plans)
  function renderCoachPlan() {
    const parsed = parseMealPlan(coachMealPlan)
    const dayPlanData = parsed[nutritionDay as Day]
    const dayTotals = dayPlanData ? computeDayTotals(dayPlanData) : { kcal: 0, prot: 0, carb: 0, fat: 0 }

    return (
      <>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 16 }}>
          {[
            { label: 'Kcal', value: String(dayTotals.kcal || coachMealPlan.calorie_target || '—') },
            { label: 'Prot', value: dayTotals.prot > 0 ? `${dayTotals.prot}g` : (coachMealPlan.protein_target ? `${coachMealPlan.protein_target}g` : '—') },
            { label: 'Gluc', value: dayTotals.carb > 0 ? `${dayTotals.carb}g` : (coachMealPlan.carb_target ? `${coachMealPlan.carb_target}g` : '—') },
            { label: 'Lip', value: dayTotals.fat > 0 ? `${dayTotals.fat}g` : (coachMealPlan.fat_target ? `${coachMealPlan.fat_target}g` : '—') },
          ].map(({ label, value }) => (
            <div key={label} style={{ background: colors.surface2, border: `1px solid ${colors.divider}`, borderRadius: 14, padding: 16, textAlign: 'center' }}>
              <div style={{ ...statStyle, fontSize: 28, fontWeight: 400, color: colors.gold }}>{value}</div>
              <div style={{ ...subtitleStyle, fontSize: 11, letterSpacing: '2px', marginTop: 4 }}>{label}</div>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 4, marginBottom: 16, scrollbarWidth: 'none' }}>
          {NUTRITION_DAYS.map(({ key, label }) => {
            const isActive = nutritionDay === key
            const isToday = key === todayKey
            const dp = parsed[key as Day]
            const dayKcal = dp ? computeDayTotals(dp).kcal : 0
            return (
              <button key={key} onClick={() => setNutritionDay(key)} style={{
                flexShrink: 0, padding: '8px 14px', borderRadius: 10, cursor: 'pointer', transition: 'all 0.15s',
                fontFamily: fonts.alt, fontSize: 9, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase' as const,
                background: isActive ? 'rgba(230,195,100,0.15)' : 'rgba(255,255,255,0.06)',
                backdropFilter: 'blur(8px)',
                border: `1px solid ${isActive ? colors.gold : isToday ? colors.goldRule : 'rgba(255,255,255,0.1)'}`,
                color: isActive ? colors.gold : isToday ? colors.gold : colors.textDim,
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
              }}>
                {label}
                {dayKcal > 0 && <span style={{ fontSize: '0.55rem', fontWeight: 700, opacity: 0.8 }}>{dayKcal}</span>}
              </button>
            )
          })}
        </div>

        {(() => {
          if (!dayPlanData || dayPlanData.meals.length === 0) return (
            <div style={{ background: colors.surface, border: `1px solid ${colors.goldBorder}`, borderRadius: 16, padding: '40px 20px', textAlign: 'center', boxShadow: '0 4px 24px rgba(0,0,0,0.6)' }}>
              <UtensilsCrossed size={28} color={colors.textMuted} style={{ marginBottom: 8 }} />
              <p style={{ ...bodyStyle, fontSize: '0.85rem', margin: 0 }}>Aucun repas pour ce jour.</p>
            </div>
          )
          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {dayPlanData.meals.map((meal, mi) => {
                const mealKcal = meal.foods.reduce((s, f) => s + f.kcal, 0)
                const mealProt = meal.foods.reduce((s, f) => s + f.prot, 0)
                const mealCarb = meal.foods.reduce((s, f) => s + f.carb, 0)
                const mealFat = meal.foods.reduce((s, f) => s + f.fat, 0)
                return (
                  <div key={mi} style={{ background: colors.surface, border: `1px solid ${colors.goldBorder}`, borderRadius: 16, overflow: 'hidden', boxShadow: '0 4px 24px rgba(0,0,0,0.6)' }}>
                    <div style={{ padding: '14px 16px', borderBottom: `1px solid ${colors.goldBorder}`, display: 'flex', alignItems: 'center', gap: 8 }}>
                      {React.createElement(({ 'Petit-déjeuner': Sun, 'Déjeuner': UtensilsCrossed, 'Collation': Cookie, 'Dîner': Moon } as Record<string, any>)[meal.type] || UtensilsCrossed, { size: 18, color: colors.gold })}
                      <span style={{ ...statSmallStyle, fontWeight: 400, color: colors.text, letterSpacing: '2px', textTransform: 'uppercase', flex: 1 }}>{meal.type}</span>
                      <span style={{ ...statSmallStyle, fontSize: '0.85rem' }}>{mealKcal} kcal</span>
                    </div>
                    <div style={{ padding: '8px 16px', borderBottom: `1px solid ${colors.goldBorder}`, display: 'flex', gap: 12 }}>
                      {[
                        { label: 'P', value: `${Math.round(mealProt)}g`, color: colors.gold },
                        { label: 'G', value: `${Math.round(mealCarb)}g`, color: colors.blue },
                        { label: 'L', value: `${Math.round(mealFat)}g`, color: colors.orange },
                      ].map(({ label, value, color }) => (
                        <span key={label} style={{ fontFamily: fonts.body, fontSize: '0.72rem', fontWeight: 700, color: colors.textMuted }}>
                          <span style={{ color }}>{label}</span> {value}
                        </span>
                      ))}
                    </div>
                    <div>
                      {meal.foods.map((food, fi) => (
                        <div key={fi} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px', borderTop: fi > 0 ? `1px solid ${colors.goldBorder}` : 'none' }}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontFamily: fonts.body, fontSize: 14, fontWeight: 400, color: colors.text }}>{food.name}</div>
                            {food.qty > 0 && <div style={{ fontFamily: fonts.body, fontSize: '0.65rem', color: colors.textMuted, marginTop: 2 }}>{food.qty}g</div>}
                          </div>
                          <div style={{ textAlign: 'right', flexShrink: 0 }}>
                            <div style={{ ...statSmallStyle, fontSize: '0.85rem' }}>{food.kcal} kcal</div>
                            {(food.prot || food.carb || food.fat) ? (
                              <div style={{ fontFamily: fonts.body, fontSize: '0.6rem', color: colors.textMuted }}>P{food.prot} G{food.carb} L{food.fat}</div>
                            ) : null}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          )
        })()}
      </>
    )
  }

  return (
    <div style={{ minHeight: '100vh', overflowX: 'hidden', maxWidth: '100%' }}>
      {/* PAGE TITLE */}
      <div style={{ padding: '16px 24px 0' }}>
        <h1 style={{ ...pageTitleStyle, margin: 0 }}>NUTRITION</h1>
      </div>

      {/* PILLS NAVIGATION */}
      <div style={{ display: 'flex', gap: 6, padding: '12px 20px 16px', overflowX: 'auto', scrollbarWidth: 'none' }}>
        {([
          { id: 'today' as SubTab, label: 'JOURNAL' },
          { id: 'plan' as SubTab, label: 'PLAN' },
          ...(!isInvited ? [{ id: 'prefs' as SubTab, label: 'PREFS' }] : []),
          ...(!isInvited ? [{ id: 'recipes' as SubTab, label: 'RECETTES' }] : []),
          { id: 'meals' as SubTab, label: 'REPAS' },
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

      {/* Barcode scanner modal (single scan) */}
      {showScanner && (
        <BarcodeScanner supabase={supabase} userId={userId} defaultMealType="dejeuner"
          onProductAdded={() => { setShowScanner(false); fetchDailyLogs() }}
          onClose={() => setShowScanner(false)} />
      )}

      {/* Fridge scanner (continuous mode) */}
      {showFridgeScanner && (
        <BarcodeScanner supabase={supabase} userId={userId} continuousMode
          onProductAdded={() => { setShowFridgeScanner(false); fetchAll() }}
          onClose={() => setShowFridgeScanner(false)} />
      )}

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
        const isViewingPast = selectedDate < today
        const consumed = getDailyLogsMacros()
        const targetKcal = profile?.calorie_goal || 2000
        const targetP = profile?.protein_goal || 140
        const targetG = profile?.carbs_goal || 200
        const targetL = profile?.fat_goal || 60
        const remaining = Math.max(0, targetKcal - consumed.kcal)
        const pctKcal = Math.min(100, Math.round((consumed.kcal / targetKcal) * 100))

        const ringSize = 180
        const ringStroke = 12
        const ringRadius = (ringSize - ringStroke) / 2
        const ringCircum = 2 * Math.PI * ringRadius
        const ringOffset = ringCircum - (pctKcal / 100) * ringCircum
        const MEAL_ICONS: Record<string, React.ComponentType<any>> = { petit_dejeuner: Sun, dejeuner: UtensilsCrossed, collation: Cookie, diner: Moon }

        return (
          <div style={{ padding: '0 20px' }}>
            {/* ═══ CALENDAR STRIP ═══ */}
            <div style={{ background: colors.surface2, border: `1px solid ${colors.divider}`, borderRadius: 16, padding: 20, marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <span style={{ fontFamily: fonts.alt, fontSize: 11, fontWeight: 700, letterSpacing: '0.18em', color: colors.textDim }}>{new Date(selectedDate + 'T12:00:00').toLocaleDateString('fr-CH', { month: 'long', year: 'numeric' }).toUpperCase()}</span>
                {selectedDate !== today && <button onClick={() => setSelectedDate(today)} style={{ padding: '6px 12px', borderRadius: 10, background: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.1)', color: colors.gold, fontFamily: fonts.alt, fontSize: 9, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase' as const, cursor: 'pointer', transition: 'all 0.15s' }}>AUJOURD&apos;HUI</button>}
              </div>
              <div ref={calScrollRef} style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 4, scrollSnapType: 'x mandatory', scrollbarWidth: 'none' }}>
                {calendarDays.map(dt => {
                  const d = new Date(dt + 'T12:00:00')
                  const sel = dt === selectedDate, isTd = dt === today, hasMl = daysWithMeals.has(dt), fut = dt > today
                  return (
                    <button key={dt} id={`cal-${dt}`} onClick={() => !fut && setSelectedDate(dt)} disabled={fut} title={fut ? 'Date future indisponible' : undefined} aria-disabled={fut} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, padding: '10px 8px', minWidth: 44, borderRadius: 12, border: sel ? `2px solid ${colors.gold}` : isTd ? `1px solid ${colors.goldRule}` : `1px solid ${colors.divider}`, background: sel ? `${colors.gold}12` : 'transparent', cursor: fut ? 'not-allowed' : 'pointer', transition: 'all 0.15s', opacity: fut ? 0.35 : 1, scrollSnapAlign: 'center', flexShrink: 0 }}>
                      <span style={{ fontFamily: fonts.alt, fontSize: 9, fontWeight: 700, letterSpacing: '0.15em', color: sel ? colors.gold : colors.textDim }}>{d.toLocaleDateString('fr-CH', { weekday: 'short' }).replace('.', '').toUpperCase()}</span>
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
                <span style={{ ...bodyStyle, fontSize: 13, color: colors.gold }}>{new Date(selectedDate + 'T12:00:00').toLocaleDateString('fr-CH', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
              </div>
            )}
            {/* Ring */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 24 }}>
              <div style={{ position: 'relative' }}>
                <svg width={ringSize} height={ringSize} style={{ transform: 'rotate(-90deg)' }}>
                  <defs>
                    <linearGradient id="nutRingGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#E8C97A" />
                      <stop offset="100%" stopColor="#D4A843" />
                    </linearGradient>
                  </defs>
                  <circle cx={ringSize/2} cy={ringSize/2} r={ringRadius} fill="none" stroke={colors.surfaceHigh} strokeWidth={ringStroke} />
                  <circle cx={ringSize/2} cy={ringSize/2} r={ringRadius} fill="none" stroke="url(#nutRingGrad)" strokeWidth={ringStroke} strokeLinecap="butt" strokeDasharray={ringCircum} strokeDashoffset={ringOffset} style={{ transition: 'stroke-dashoffset 0.8s ease', filter: `drop-shadow(0 0 8px ${colors.goldRule})` }} />
                </svg>
                <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ ...statStyle, fontSize: 40, color: colors.gold, lineHeight: 1 }}>{consumed.kcal}</span>
                  <span style={{ ...mutedStyle, fontSize: 11 }}>/ {targetKcal} kcal</span>
                  <span style={{ ...mutedStyle, fontSize: 10, marginTop: 2 }}>restantes : {remaining}</span>
                </div>
              </div>
            </div>

            {/* Macros bar */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 24 }}>
              {[
                { label: 'PROT.', current: consumed.protein, target: targetP, color: colors.gold, icon: Beef },
                { label: 'GLUC.', current: consumed.carbs, target: targetG, color: colors.blue, icon: Wheat },
                { label: 'LIP.', current: consumed.fat, target: targetL, color: colors.orange, icon: Droplet },
              ].map(({ label, current, target, color, icon: Icon }) => {
                const pct = Math.min(100, Math.round((current / target) * 100))
                return (
                  <div key={label} style={{ textAlign: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, marginBottom: 4 }}>
                      <Icon size={12} color={color} />
                      <span style={{ ...subtitleStyle, fontSize: 10, letterSpacing: '0.1em' }}>{label}</span>
                    </div>
                    <div style={{ ...statSmallStyle, color }}>{Math.round(current)}<span style={{ fontSize: 12, color: colors.textMuted }}>/{target}g</span></div>
                    <div style={{ height: 4, background: 'rgba(255,255,255,0.04)', borderRadius: 12, overflow: 'hidden', marginTop: 4 }}>
                      <div style={{ height: '100%', background: color, width: `${pct}%`, borderRadius: 12, transition: 'width 300ms' }} />
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Meal sections — start empty, import IA optional */}
            {MEAL_ORDER.map(mealType => {
              const rec = getMealRecommendation(mealType)
              const con = getMealConsumed(mealType)
              const logs = dailyLogs.filter(l => l.meal_type === mealType)
              const hasPlanFoods = !!rec

              return (
                <div key={mealType} style={{ background: colors.surface, border: `1px solid ${colors.goldBorder}`, borderRadius: 16, marginBottom: 12, overflow: 'hidden', boxShadow: '0 4px 24px rgba(0,0,0,0.6)' }}>
                  {/* Meal header */}
                  <div style={{ padding: '14px 16px', borderBottom: `1px solid ${colors.goldBorder}` }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      {React.createElement(MEAL_ICONS[mealType] || UtensilsCrossed, { size: 18, color: colors.gold })}
                      <span style={{ ...statSmallStyle, color: colors.text, letterSpacing: '1px' }}>{MEAL_LABELS[mealType]}</span>
                      <span style={{ ...T, marginLeft: 'auto' }}>{con.kcal} kcal</span>
                      {logs.length > 0 && (
                        <div style={{ position: 'relative' }}>
                          <button onClick={() => setMealMenuOpen(mealMenuOpen === mealType ? null : mealType)} style={{ background: 'none', border: 'none', color: colors.textMuted, fontSize: 18, cursor: 'pointer', padding: '4px 8px' }}>⋯</button>
                          {mealMenuOpen === mealType && (
                            <div style={{ position: 'absolute', top: 36, right: 0, background: colors.surface, border: `1px solid ${colors.goldBorder}`, borderRadius: 12, padding: 6, zIndex: 50, minWidth: 200, boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}>
                              <button onClick={() => { setMealMenuOpen(null); setSaveMealData({ mealType, foods: logs.map((l: any) => ({ name: l.custom_name || l.food_name, quantity: l.quantity_g, calories: l.calories, proteins: l.protein, carbs: l.carbs, fats: l.fat })) }); setSaveMealName(''); setSaveMealType(mealType); setShowSaveMealPopup(true) }} style={{ width: '100%', padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10, background: 'none', border: 'none', borderRadius: 8, cursor: 'pointer', textAlign: 'left' }}><Save size={14} color={colors.textMuted} /><span style={{ fontFamily: fonts.body, fontSize: 13, color: colors.text }}>Sauvegarder le repas</span></button>
                              <button onClick={() => { setMealMenuOpen(null); setCopyMealData({ mealType, foods: logs }); setCopyTargetDate(''); setCopyTargetMealType(mealType); setShowCopyMealPopup(true) }} style={{ width: '100%', padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10, background: 'none', border: 'none', borderRadius: 8, cursor: 'pointer', textAlign: 'left' }}><Copy size={14} color={colors.textMuted} /><span style={{ fontFamily: fonts.body, fontSize: 13, color: colors.text }}>Copier vers un autre jour</span></button>
                              <button onClick={() => { setMealMenuOpen(null); clearMeal(mealType) }} style={{ width: '100%', padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10, background: 'none', border: 'none', borderRadius: 8, cursor: 'pointer', textAlign: 'left' }}><Trash2 size={14} color={colors.error} /><span style={{ fontFamily: fonts.body, fontSize: 13, color: colors.error }}>Vider ce repas</span></button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    {rec && (
                      <div style={{ fontFamily: fonts.body, fontSize: 11, color: colors.textMuted, fontStyle: 'italic' }}>
                        Recommandé : {rec.kcal} kcal · P:{Math.round(rec.protein)}g · G:{Math.round(rec.carbs)}g · L:{Math.round(rec.fat)}g
                      </div>
                    )}
                    {logs.length > 0 && (
                      <div style={{ fontFamily: fonts.body, fontSize: 11, color: con.kcal > (rec?.kcal || 9999) ? colors.error : colors.gold, marginTop: 2 }}>
                        Consommé : {con.kcal} kcal · P:{Math.round(con.protein)}g · G:{Math.round(con.carbs)}g · L:{Math.round(con.fat)}g
                      </div>
                    )}
                  </div>

                  {/* Daily food logs for this meal */}
                  <div style={{ padding: '0 16px' }}>
                    {logs.map(log => (
                      <div key={log.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: `1px solid ${colors.goldBorder}` }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontFamily: fonts.body, fontSize: 14, color: colors.text }}>{log.custom_name || log.food_name || 'Aliment'}</div>
                          {editingFoodId === log.id ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                              <input type="number" value={editQty} onChange={e => setEditQty(e.target.value)} autoFocus onKeyDown={e => { if (e.key === 'Enter') updateFoodQuantity(log.id, parseFloat(editQty)); if (e.key === 'Escape') setEditingFoodId(null) }} style={{ width: 60, padding: '4px 8px', background: colors.background, border: `1px solid ${colors.gold}`, borderRadius: 6, color: colors.text, fontFamily: fonts.headline, fontSize: 16, textAlign: 'center', outline: 'none' }} />
                              <span style={{ fontFamily: fonts.body, fontSize: 12, color: colors.textMuted }}>g</span>
                              <button onClick={() => updateFoodQuantity(log.id, parseFloat(editQty))} style={{ background: colors.gold, border: 'none', borderRadius: 6, color: '#0D0B08', padding: '4px 10px', fontFamily: fonts.body, fontSize: 10, fontWeight: 700, cursor: 'pointer' }}>OK</button>
                              <button onClick={() => setEditingFoodId(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, display: 'flex', alignItems: 'center' }}><X size={14} color={colors.textMuted} /></button>
                            </div>
                          ) : (
                            <div onClick={() => { setEditingFoodId(log.id); setEditQty(String(log.quantity_g || 100)) }} style={{ fontFamily: fonts.body, fontSize: 11, color: colors.textMuted, marginTop: 2, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                              <span>{log.quantity_g}g</span>
                              <Pencil size={10} color={colors.textDim} />
                              <span style={{ fontSize: 10, color: colors.textDim }}>· P:{Math.round(log.protein || 0)}g G:{Math.round(log.carbs || 0)}g L:{Math.round(log.fat || 0)}g</span>
                            </div>
                          )}
                        </div>
                        <span style={{ ...T, flexShrink: 0 }}>{Math.round(log.calories)}</span>
                        <div style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
                          <button onClick={() => { setSwappingFoodId(log.id); setShowFoodSearch(mealType) }} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex', alignItems: 'center' }} title="Remplacer"><RefreshCw size={14} color={colors.textMuted} /></button>
                          <button onClick={() => deleteDailyLog(log.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex', alignItems: 'center' }} title="Supprimer"><Trash2 size={14} color={colors.textMuted} /></button>
                        </div>
                      </div>
                    ))}

                    {logs.length === 0 && (
                      <div style={{ padding: '16px 0', textAlign: 'center' }}>
                        <span style={mutedStyle}>Aucun aliment ajouté</span>
                      </div>
                    )}

                    {/* Action buttons */}
                    <div style={{ display: 'flex', gap: 8, padding: '8px 0 12px', flexWrap: 'wrap' }}>
                      {hasPlanFoods && logs.length === 0 && (() => {
                        const isViewingToday = nutritionDay === todayKey
                        return (
                          <button
                            onClick={() => isViewingToday && setImportingMeal(mealType)}
                            disabled={!isViewingToday}
                            title={!isViewingToday ? 'Disponible uniquement pour aujourd\'hui' : undefined}
                            style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '8px 12px', borderRadius: 10, background: 'rgba(230,195,100,0.15)', backdropFilter: 'blur(8px)', border: `1px solid ${colors.gold}`, color: colors.gold, fontFamily: fonts.alt, fontSize: 10, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase' as const, cursor: isViewingToday ? 'pointer' : 'not-allowed', opacity: isViewingToday ? 1 : 0.4, transition: 'all 0.15s' }}
                          >
                            <Download size={14} /> {isInvited ? 'Importer' : 'Import IA'}
                          </button>
                        )
                      })()}
                      <button onClick={() => setShowFoodSearch(mealType)} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '8px 12px', borderRadius: 10, background: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.1)', color: colors.gold, fontFamily: fonts.alt, fontSize: 10, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase' as const, cursor: 'pointer', transition: 'all 0.15s' }}>
                        <Plus size={14} strokeWidth={2.5} /> Ajouter
                      </button>
                      <button onClick={() => { setPhotoMealTarget(mealType); setShowPhotoCapture(true) }} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '8px 12px', borderRadius: 10, background: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.1)', color: colors.gold, cursor: 'pointer', transition: 'all 0.15s' }}><Camera size={14} /></button>
                      <button onClick={() => { setUseSavedMealTarget(mealType); setShowSavedMeals(true); supabase.from('saved_meals').select('*').eq('user_id', userId).order('use_count', { ascending: false }).then(({ data }: any) => setSavedMeals(data || [])) }} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '8px 12px', borderRadius: 10, background: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.1)', color: colors.gold, cursor: 'pointer', transition: 'all 0.15s' }}><FolderOpen size={14} /></button>
                    </div>
                  </div>
                </div>
              )
            })}

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
                <ShoppingCart size={14} /> Liste de courses
              </button>
            )}
          </div>
        )
      })()}

      {/* Plan sub-tab (kept for backward compatibility) */}
      {subTab === 'plan' && loadingPlan && !coachMealPlan && (
        <div style={{ padding: '0 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 1 }}>
            {[1,2,3,4].map(i => <div key={i} className="skeleton" style={{ height: 52, borderRadius: 16 }} />)}
          </div>
          {[1,2,3,4].map(i => <div key={i} className="skeleton" style={{ height: 100, borderRadius: 16 }} />)}
        </div>
      )}

      {subTab === 'plan' && !loadingPlan && !coachMealPlan && !activeMealPlan && renderWaitingScreen()}

      {/* Show AI meal plan from meal_plans table (priority) */}
      {subTab === 'plan' && activeMealPlan && (
        <div style={{ padding: '0 20px' }}>{renderAiPlan(activeMealPlan)}</div>
      )}

      {/* Show old-style coach meal plan if no AI plan */}
      {subTab === 'plan' && !activeMealPlan && coachMealPlan && (
        <div style={{ padding: '0 20px' }}>{renderCoachPlan()}</div>
      )}

      {/* Preferences sub-tab */}
      {subTab === 'prefs' && (
        <div style={{ padding: '0 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <SlidersHorizontal size={18} color={colors.gold} />
            <h2 style={{ ...subtitleStyle, fontSize: '1.1rem', fontWeight: 800, letterSpacing: '2px', color: colors.text, margin: 0 }}>Preferences nutrition</h2>
          </div>
          <NutritionPreferences profile={profile} supabase={supabase} userId={userId} onSaved={fetchAll} onPlanRegenerated={() => { fetchActiveMealPlan(); setSubTab('today') }} />
        </div>
      )}

      {/* Recipes sub-tab */}
      {subTab === 'recipes' && (
        <div style={{ padding: '0 20px' }}>
          <RecipesSection supabase={supabase} userId={userId} profile={profile} />
        </div>
      )}

      {/* Mes Repas sub-tab */}
      {subTab === 'meals' && (
        <div style={{ padding: '0 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
            <span style={T}>MES REPAS</span>
            <div style={titleLineStyle} />
          </div>
          <div style={{ ...cardStyle, padding: 16 }}>
            {/* Search */}
            <input value={myMealsSearch} onChange={e => setMyMealsSearch(e.target.value)} placeholder="Rechercher un repas..." style={{ width: '100%', background: colors.background, border: `1px solid ${colors.goldBorder}`, borderRadius: 12, padding: '10px 14px', color: colors.text, fontFamily: fonts.body, fontSize: 13, outline: 'none', marginBottom: 12 }} />
            {/* Filter pills */}
            <div style={{ display: 'flex', gap: 6, marginBottom: 16, overflowX: 'auto', scrollbarWidth: 'none' }}>
              {[{ k: 'all', l: 'TOUT' }, { k: 'petit_dejeuner', l: 'PETIT-DÉJ' }, { k: 'dejeuner', l: 'DÉJEUNER' }, { k: 'diner', l: 'DÎNER' }, { k: 'collation', l: 'COLLATION' }].map(({ k, l }) => (
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
                            <div style={{ ...mutedStyle, marginTop: 2 }}>{meal.created_at ? new Date(meal.created_at).toLocaleDateString('fr-FR') : ''}</div>
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
            }} style={{ width: '100%', marginTop: 16, padding: '14px 0', background: `linear-gradient(135deg, ${colors.gold}, ${colors.goldContainer})`, color: '#0D0B08', fontFamily: fonts.headline, fontWeight: 700, borderRadius: 12, border: 'none', cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.12em', fontSize: 13, textAlign: 'center' }}>
              + CRÉER UN REPAS
            </button>
          </div>
        </div>
      )}

      {/* Meal edit modal */}
      {editingMeal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
          <div style={{ background: colors.background, border: `1px solid ${colors.goldBorder}`, borderRadius: '20px 20px 0 0', width: '100%', maxWidth: 480, maxHeight: '85vh', overflow: 'auto', padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <span style={{ ...T, fontSize: 16 }}>{editingMeal.name || 'Modifier le repas'}</span>
              <button onClick={() => setEditingMeal(null)} style={{ background: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '50%', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.15s' }}><X size={16} color={colors.text} /></button>
            </div>
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
                total_calories: foods.reduce((s: number, f: any) => s + (f.calories || 0), 0),
                total_proteins: foods.reduce((s: number, f: any) => s + (f.protein || f.proteins || 0), 0),
                total_carbs: foods.reduce((s: number, f: any) => s + (f.carbs || 0), 0),
                total_fats: foods.reduce((s: number, f: any) => s + (f.fat || f.fats || 0), 0),
              }
              await supabase.from('saved_meals').update({ foods, ...totals }).eq('id', editingMeal.id)
              setMyMeals(prev => prev.map(m => m.id === editingMeal.id ? { ...m, foods, ...totals } : m))
              setEditMealSaving(false)
              setEditMealSaved(true)
              setTimeout(() => setEditMealSaved(false), 2000)
            }} disabled={editMealSaving} style={{ width: '100%', padding: '14px 0', background: `linear-gradient(135deg, ${colors.gold}, ${colors.goldContainer})`, color: '#0D0B08', fontFamily: fonts.headline, fontWeight: 700, borderRadius: 12, border: 'none', cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.12em', fontSize: 13, marginBottom: 8, opacity: editMealSaving ? 0.6 : 1 }}>
              {editMealSaving ? 'SAUVEGARDE...' : editMealSaved ? 'SAUVEGARDÉ ✓' : 'SAUVEGARDER'}
            </button>
            <button onClick={async () => {
              if (confirm('Supprimer ce repas définitivement ?')) {
                await supabase.from('saved_meals').delete().eq('id', editingMeal.id)
                setMyMeals(prev => prev.filter(m => m.id !== editingMeal.id))
                setEditingMeal(null)
              }
            }} style={{ width: '100%', padding: '12px 0', background: 'transparent', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 12, color: colors.error, fontFamily: fonts.body, fontSize: 12, fontWeight: 700, cursor: 'pointer', textAlign: 'center' }}>SUPPRIMER LE REPAS</button>
          </div>
        </div>
      )}

      {/* Shopping list modal */}
      {showShoppingModal && (activeMealPlan?.plan_data || coachMealPlan) && (
        <ShoppingList
          planData={activeMealPlan?.plan_data || coachMealPlan}
          onClose={() => setShowShoppingModal(false)}
        />
      )}

      {/* ═══ PHOTO MEAL SCAN ═══ */}
      {showPhotoCapture && (
        <>
          <div onClick={() => { setShowPhotoCapture(false); setPhotoResults(null) }} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 1100 }} />
          <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: 'calc(100% - 32px)', maxWidth: 440, maxHeight: '80vh', background: colors.surface, border: `1px solid ${colors.goldBorder}`, borderRadius: 16, zIndex: 1101, display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 24px 80px rgba(0,0,0,0.6)' }}>
            <div style={{ padding: '20px 20px 14px', borderBottom: `1px solid ${colors.goldBorder}`, flexShrink: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ ...statSmallStyle, fontSize: 20, color: colors.text, letterSpacing: 2 }}>SCANNER UN REPAS</span>
              <button onClick={() => { setShowPhotoCapture(false); setPhotoResults(null) }} style={{ background: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '50%', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.15s' }}><X size={16} color={colors.text} /></button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
              <input ref={photoInputRef} type="file" accept="image/*" capture="environment" onChange={handlePhotoCapture} style={{ display: 'none' }} />
              {!photoResults && !analyzingPhoto && (
                <button onClick={() => photoInputRef.current?.click()} style={{ width: '100%', padding: '40px 20px', background: colors.goldDim, border: `2px dashed ${colors.goldRule}`, borderRadius: 16, cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                  <Camera size={48} color={colors.gold} />
                  <span style={{ ...statSmallStyle, letterSpacing: 2 }}>PRENDRE UNE PHOTO</span>
                  <span style={mutedStyle}>ou choisir depuis la galerie</span>
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
                  {photoResults.foods.map((f: any, i: number) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: i < photoResults.foods.length - 1 ? `1px solid ${colors.goldDim}` : 'none' }}>
                      <div>
                        <div style={{ fontFamily: fonts.body, fontSize: 14, color: colors.text }}>{f.name}</div>
                        <div style={{ fontFamily: fonts.body, fontSize: 11, color: colors.textMuted }}>{f.quantity_g}g · P:{f.proteins}g G:{f.carbs}g L:{f.fats}g</div>
                      </div>
                      <span style={{ ...statSmallStyle, fontSize: 16 }}>{f.calories}</span>
                    </div>
                  ))}
                  <div style={{ background: colors.goldDim, borderRadius: 12, padding: '12px 16px', marginTop: 16, textAlign: 'center' }}>
                    <span style={{ ...statSmallStyle, fontSize: 24 }}>{photoResults.total_calories} KCAL</span>
                  </div>
                </>
              )}
            </div>
            {photoResults?.foods && (
              <div style={{ padding: '16px 20px', borderTop: `1px solid ${colors.goldDim}`, display: 'flex', gap: 12, flexShrink: 0 }}>
                <button onClick={() => setPhotoResults(null)} style={{ flex: 1, padding: 14, background: 'transparent', border: `1.5px solid rgba(212,168,67,0.5)`, borderRadius: 12, color: colors.gold, fontFamily: fonts.headline, fontSize: 16, letterSpacing: 2, cursor: 'pointer' }}>REPRENDRE</button>
                <button onClick={addPhotoFoods} style={{ flex: 1, padding: 14, border: 'none', background: `linear-gradient(135deg, #E8C97A, #D4A843, ${colors.goldContainer}, #8B6914)`, borderRadius: 12, color: '#0D0B08', fontFamily: fonts.headline, fontSize: 16, letterSpacing: 2, cursor: 'pointer' }}>AJOUTER TOUT</button>
              </div>
            )}
          </div>
        </>
      )}

      {/* ═══ SAVE MEAL POPUP ═══ */}
      {showSaveMealPopup && saveMealData && (
        <>
          <div onClick={() => setShowSaveMealPopup(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 1100 }} />
          <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: 'calc(100% - 32px)', maxWidth: 400, background: colors.surface, border: `1px solid ${colors.goldBorder}`, borderRadius: 16, padding: 24, zIndex: 1101, boxShadow: '0 4px 24px rgba(0,0,0,0.6)' }}>
            <h3 style={{ ...statSmallStyle, fontSize: 22, color: colors.text, letterSpacing: 2, marginBottom: 16 }}>SAUVEGARDER LE REPAS</h3>
            <input type="text" placeholder="Nom du repas..." value={saveMealName} onChange={e => setSaveMealName(e.target.value)} autoFocus style={{ width: '100%', padding: '12px 14px', background: colors.background, border: `1px solid ${colors.goldBorder}`, borderRadius: 10, color: colors.text, fontFamily: fonts.body, fontSize: 14, outline: 'none', marginBottom: 12 }} />
            <div style={{ background: colors.background, borderRadius: 10, padding: 12, marginBottom: 16, border: `1px solid ${colors.goldDim}` }}>
              <div style={{ ...subtitleStyle, fontSize: 9, letterSpacing: 2, marginBottom: 8 }}>{saveMealData.foods.length} ALIMENTS</div>
              {saveMealData.foods.map((f: any, i: number) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', fontFamily: fonts.body, fontSize: 12 }}>
                  <span style={{ color: colors.text }}>{f.name}</span>
                  <span style={{ color: colors.gold }}>{f.calories} kcal</span>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <button onClick={() => setShowSaveMealPopup(false)} style={{ flex: 1, padding: 14, background: 'transparent', border: `1.5px solid rgba(212,168,67,0.5)`, borderRadius: 12, color: colors.gold, fontFamily: fonts.headline, fontSize: 16, letterSpacing: 2, cursor: 'pointer' }}>ANNULER</button>
              <button disabled={!saveMealName.trim()} onClick={async () => {
                await supabase.from('saved_meals').insert({ user_id: userId, name: saveMealName, meal_type: saveMealType, foods: saveMealData.foods, total_calories: saveMealData.foods.reduce((s: number, f: any) => s + (f.calories || 0), 0), total_proteins: saveMealData.foods.reduce((s: number, f: any) => s + (f.proteins || 0), 0), total_carbs: saveMealData.foods.reduce((s: number, f: any) => s + (f.carbs || 0), 0), total_fats: saveMealData.foods.reduce((s: number, f: any) => s + (f.fats || 0), 0) })
                setShowSaveMealPopup(false); setSaveMealName('')
              }} style={{ flex: 1, padding: 14, background: saveMealName.trim() ? `linear-gradient(135deg, #E8C97A, #D4A843, ${colors.goldContainer}, #8B6914)` : colors.surfaceHigh, border: 'none', borderRadius: 12, color: saveMealName.trim() ? '#0D0B08' : colors.textDim, fontFamily: fonts.headline, fontSize: 16, letterSpacing: 2, cursor: 'pointer' }}>SAUVEGARDER</button>
            </div>
          </div>
        </>
      )}

      {/* ═══ COPY MEAL POPUP ═══ */}
      {showCopyMealPopup && copyMealData && (
        <>
          <div onClick={() => setShowCopyMealPopup(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 1100 }} />
          <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: 'calc(100% - 32px)', maxWidth: 400, background: colors.surface, border: `1px solid ${colors.goldBorder}`, borderRadius: 16, padding: 24, zIndex: 1101, boxShadow: '0 4px 24px rgba(0,0,0,0.6)' }}>
            <h3 style={{ ...statSmallStyle, fontSize: 22, color: colors.text, letterSpacing: 2, marginBottom: 16 }}>COPIER LE REPAS</h3>
            <div style={{ ...subtitleStyle, fontSize: 10, letterSpacing: 2, marginBottom: 6 }}>DATE</div>
            <div style={{ display: 'flex', gap: 6, marginBottom: 8, flexWrap: 'wrap' }}>
              {[{ l: 'Demain', d: 1 }, { l: '+2j', d: 2 }, { l: '+3j', d: 3 }, { l: '+1 sem', d: 7 }].map(s => {
                const dt = new Date(Date.now() + s.d * 86400000).toISOString().split('T')[0]
                return <button key={s.l} onClick={() => setCopyTargetDate(dt)} style={{ padding: '6px 12px', borderRadius: 20, border: copyTargetDate === dt ? `1px solid ${colors.gold}` : `1px solid ${colors.goldDim}`, background: copyTargetDate === dt ? colors.goldDim : 'transparent', color: copyTargetDate === dt ? colors.gold : colors.textMuted, fontFamily: fonts.body, fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>{s.l}</button>
              })}
            </div>
            <input type="date" value={copyTargetDate} onChange={e => setCopyTargetDate(e.target.value)} min={today} style={{ width: '100%', padding: '10px 14px', background: colors.background, border: `1px solid ${colors.goldBorder}`, borderRadius: 10, color: colors.text, fontFamily: fonts.body, fontSize: 14, outline: 'none', marginBottom: 12, colorScheme: 'dark' }} />
            <div style={{ ...subtitleStyle, fontSize: 10, letterSpacing: 2, marginBottom: 6 }}>REPAS</div>
            <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
              {MEAL_ORDER.map(t => <button key={t} onClick={() => setCopyTargetMealType(t)} style={{ padding: '6px 12px', borderRadius: 20, border: copyTargetMealType === t ? `1px solid ${colors.gold}` : `1px solid ${colors.goldDim}`, background: copyTargetMealType === t ? colors.goldDim : 'transparent', color: copyTargetMealType === t ? colors.gold : colors.textMuted, fontFamily: fonts.body, fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>{MEAL_LABELS[t]}</button>)}
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <button onClick={() => setShowCopyMealPopup(false)} style={{ flex: 1, padding: 14, background: 'transparent', border: `1.5px solid rgba(212,168,67,0.5)`, borderRadius: 12, color: colors.gold, fontFamily: fonts.headline, fontSize: 16, letterSpacing: 2, cursor: 'pointer' }}>ANNULER</button>
              <button disabled={!copyTargetDate || !copyTargetMealType} onClick={async () => { await copyMealToDate(copyMealData.foods, copyTargetDate, copyTargetMealType); setShowCopyMealPopup(false) }} style={{ flex: 1, padding: 14, background: (copyTargetDate && copyTargetMealType) ? `linear-gradient(135deg, #E8C97A, #D4A843, ${colors.goldContainer}, #8B6914)` : colors.surfaceHigh, border: 'none', borderRadius: 12, color: (copyTargetDate && copyTargetMealType) ? '#0D0B08' : colors.textDim, fontFamily: fonts.headline, fontSize: 16, letterSpacing: 2, cursor: 'pointer' }}>COPIER</button>
            </div>
          </div>
        </>
      )}

      {/* ═══ SAVED MEALS POPUP ═══ */}
      {showSavedMeals && (
        <>
          <div onClick={() => setShowSavedMeals(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 1100 }} />
          <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: 'calc(100% - 32px)', maxWidth: 440, maxHeight: '75vh', background: colors.surface, border: `1px solid ${colors.goldBorder}`, borderRadius: 16, zIndex: 1101, display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 4px 24px rgba(0,0,0,0.6)' }}>
            <div style={{ padding: '20px 20px 14px', borderBottom: `1px solid ${colors.goldBorder}`, flexShrink: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ ...statSmallStyle, fontSize: 20, color: colors.text, letterSpacing: 2 }}>MES REPAS</span>
              <button onClick={() => setShowSavedMeals(false)} style={{ background: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '50%', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.15s' }}><X size={16} color={colors.text} /></button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '8px 20px 20px' }}>
              {savedMeals.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 0', ...bodyStyle }}>Aucun repas sauvegarde.</div>
              ) : savedMeals.map((meal: any) => (
                <button key={meal.id} onClick={async () => { await applySavedMeal(meal, useSavedMealTarget); setShowSavedMeals(false) }} style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 0', background: 'none', border: 'none', borderBottom: `1px solid ${colors.goldDim}`, cursor: 'pointer', textAlign: 'left' }}>
                  <div>
                    <div style={{ ...bodyStyle, color: colors.text, fontWeight: 500 }}>{meal.name}</div>
                    <div style={{ ...mutedStyle, fontSize: 11, marginTop: 2 }}>{(meal.foods || []).length} aliments{meal.use_count > 0 && ` · ${meal.use_count}x utilise`}</div>
                  </div>
                  <div style={statSmallStyle}>{Math.round(meal.total_calories || 0)}</div>
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
