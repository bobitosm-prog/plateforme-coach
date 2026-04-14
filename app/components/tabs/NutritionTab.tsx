'use client'
import React, { useEffect, useState } from 'react'
import { UtensilsCrossed, Sparkles, SlidersHorizontal, ShoppingCart, ChevronDown, ChevronUp, Check, Clock, Plus, Trash2, Download, ChefHat, List, ClipboardList, Camera, Star } from 'lucide-react'
import { downloadCsv } from '../../../lib/exportCsv'
import NutritionPreferences from '../NutritionPreferences'
import ImportPlanSheet from './nutrition/ImportPlanSheet'
import FoodSearch from '../FoodSearch'
import BarcodeScanner from '../BarcodeScanner'
import RecipesSection from '../RecipesSection'
import ShoppingList from '../ShoppingList'
import {
  NUTRITION_DAYS, todayNutritionKey,
} from '../../../lib/design-tokens'
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
const MEAL_ORDER = ['petit_dejeuner', 'dejeuner', 'collation', 'diner']

type SubTab = 'today' | 'plan' | 'scanner' | 'prefs' | 'recipes'

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
  const [nutritionDay, setNutritionDay] = useState<string>(todayNutritionKey())
  const [activeMealPlan, setActiveMealPlan] = useState<any>(null)
  const [loadingPlan, setLoadingPlan] = useState(true)
  const [showShoppingList, setShowShoppingList] = useState(false)
  const [completedMeals, setCompletedMeals] = useState<Set<string>>(new Set())
  const [mealLogs, setMealLogs] = useState<any[]>([])
  const [showFoodSearch, setShowFoodSearch] = useState<string | null>(null) // meal_type or null
  const [showScanner, setShowScanner] = useState(false)
  const [showFridgeScanner, setShowFridgeScanner] = useState(false)
  const [showShoppingModal, setShowShoppingModal] = useState(false)
  const [dailyLogs, setDailyLogs] = useState<any[]>([])
  const [importingMeal, setImportingMeal] = useState<string | null>(null)
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
    fetchTodayMealLogs()
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
    await supabase.from('saved_meals').update({ use_count: (meal.use_count || 0) + 1 }).eq('id', meal.id).catch(() => {})
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

  async function importMealFromPlan(mealType: string) {
    const todayPlan = getTodayPlanData()
    if (!todayPlan) return
    const foods = Array.isArray(todayPlan.planData.repas?.[mealType]) ? todayPlan.planData.repas[mealType] : []
    if (!foods.length) return
    setImportingMeal(null)
    const inserts = foods.map((f: any) => ({
      user_id: userId, date: today, meal_type: mealType,
      custom_name: f.aliment || 'Aliment', quantity_g: f.quantite_g || 100,
      calories: f.kcal || 0, protein: f.proteines || 0, carbs: f.glucides || 0, fat: f.lipides || 0,
    }))
    await supabase.from('daily_food_logs').insert(inserts)
    fetchDailyLogs()
  }

  function getDailyLogsMacros() {
    const r = { kcal: 0, protein: 0, carbs: 0, fat: 0 }
    for (const l of dailyLogs) { r.kcal += l.calories || 0; r.protein += l.protein || 0; r.carbs += l.carbs || 0; r.fat += l.fat || 0 }
    return r
  }

  function getMealRecommendation(mealType: string) {
    const todayPlan = getTodayPlanData()
    if (!todayPlan) return null
    const foods = Array.isArray(todayPlan.planData.repas?.[mealType]) ? todayPlan.planData.repas[mealType] : []
    if (!foods.length) return null
    return foods.reduce((acc: any, f: any) => ({ kcal: acc.kcal + (f.kcal || 0), protein: acc.protein + (f.proteines || 0), carbs: acc.carbs + (f.glucides || 0), fat: acc.fat + (f.lipides || 0) }), { kcal: 0, protein: 0, carbs: 0, fat: 0 })
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

  async function fetchTodayMealLogs() {
    const { data } = await supabase
      .from('daily_food_logs')
      .select('*')
      .eq('user_id', userId)
      .eq('date', today)
      .order('created_at', { ascending: true })
      .limit(100)
    setMealLogs(data || [])
  }

  async function deleteMealLog(id: string) {
    await supabase.from('daily_food_logs').delete().eq('id', id)
    setMealLogs(prev => prev.filter(l => l.id !== id))
  }

  // Get daily_food_logs macros for today
  function getMealLogsMacros(): { kcal: number; protein: number; carbs: number; fat: number } {
    const result = { kcal: 0, protein: 0, carbs: 0, fat: 0 }
    for (const log of mealLogs) {
      result.kcal += log.calories || 0
      result.protein += log.protein || 0
      result.carbs += log.carbs || 0
      result.fat += log.fat || 0
    }
    return result
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

  // Get today's plan data from either source
  function getTodayPlanData(): { planData: any; planId: string | null } | null {
    if (activeMealPlan?.plan_data) {
      const dayKey = todayNutritionKey()
      const dayData = findDayData(activeMealPlan.plan_data, dayKey)
      if (dayData) return { planData: dayData, planId: activeMealPlan.id }
    }
    return null
  }

  // Calculate consumed macros from completed meals
  function getConsumedMacros(dayData: any): { kcal: number; protein: number; carbs: number; fat: number } {
    const result = { kcal: 0, protein: 0, carbs: 0, fat: 0 }
    if (!dayData?.repas) return result
    for (const [mealType, foods] of Object.entries(dayData.repas)) {
      if (!completedMeals.has(mealType) || !Array.isArray(foods)) continue
      for (const f of foods as any[]) {
        result.kcal += f.kcal || 0
        result.protein += f.proteines || 0
        result.carbs += f.glucides || 0
        result.fat += f.lipides || 0
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
          <h2 style={{ fontFamily: "'Inter', sans-serif", fontSize: '1.3rem', fontWeight: 800, letterSpacing: '2px', textTransform: 'uppercase', color: '#e5e2e1', margin: '0 0 10px' }}>Nutrition gérée par ton coach</h2>
          <p style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.82rem', color: '#d0c5b2', margin: 0, lineHeight: 1.6, maxWidth: 300 }}>
            Ton coach prépare ton plan nutrition personnalisé. Contacte-le via la messagerie.
          </p>
        </div>
      )
    }
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px 24px', textAlign: 'center' }}>
        <div style={{ fontSize: '3.5rem', marginBottom: 24 }}>🍽️</div>
        <h2 style={{ fontFamily: "'Inter', sans-serif", fontSize: '1.3rem', fontWeight: 800, letterSpacing: '2px', textTransform: 'uppercase', color: '#e5e2e1', margin: '0 0 10px' }}>Aucun plan alimentaire</h2>
        <p style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.82rem', color: '#d0c5b2', margin: '0 0 24px', lineHeight: 1.6, maxWidth: 300 }}>
          Configure tes preferences puis genere ton plan IA personnalise.
        </p>
        <button onClick={() => setSubTab('prefs')} style={{ padding: '14px 32px', border: 'none', cursor: 'pointer', background: '#e6c364', fontFamily: "'Inter', sans-serif", fontSize: '0.9rem', fontWeight: 800, color: '#0D0B08', letterSpacing: '2px', textTransform: 'uppercase',  }}>
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

  // Case-insensitive day lookup in plan_data
  function findDayData(planData: any, dayKey: string) {
    if (!planData) return null
    if (planData[dayKey]) return planData[dayKey]
    const lower = dayKey.toLowerCase()
    if (planData[lower]) return planData[lower]
    // Try matching any key case-insensitively
    const match = Object.keys(planData).find(k => k.toLowerCase() === lower)
    if (match) return planData[match]
    return null
  }

  // Render the AI-generated meal plan (from meal_plans table)
  function renderAiPlan(plan: any) {
    const planData = plan.plan_data
    if (!planData) return null

    const dayData = findDayData(planData, nutritionDay)
    if (!dayData) {
      // Show available days for debugging + prompt to pick one
      const availableDays = Object.keys(planData)
      return (
        <div style={{ padding: 20, textAlign: 'center' }}>
          <p style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.85rem', color: '#d0c5b2', marginBottom: 12 }}>Pas de plan pour {nutritionDay}.</p>
          <p style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.75rem', color: '#99907e' }}>Jours disponibles : {availableDays.join(', ')}</p>
        </div>
      )
    }

    return (
      <>
        {/* Macro targets */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 1, background: 'rgba(201,168,76,0.15)', border: '1px solid rgba(201,168,76,0.15)', borderRadius: 16, overflow: 'hidden', marginBottom: 16 }}>
          {[
            { label: 'Kcal', value: String(dayData.total_kcal || plan.total_calories || '—') },
            { label: 'Prot', value: `${dayData.total_protein || plan.protein_g || '—'}g` },
            { label: 'Gluc', value: `${dayData.total_carbs || plan.carbs_g || '—'}g` },
            { label: 'Lip', value: `${dayData.total_fat || plan.fat_g || '—'}g` },
          ].map(({ label, value }) => (
            <div key={label} style={{ background: '#0e0e0e', padding: 20, textAlign: 'center' }}>
              <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 28, fontWeight: 400, color: '#e6c364' }}>{value}</div>
              <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: 11, letterSpacing: '2px', textTransform: 'uppercase', color: '#d0c5b2', marginTop: 4 }}>{label}</div>
            </div>
          ))}
        </div>

        {/* Day tabs */}
        <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 4, marginBottom: 16 }}>
          {NUTRITION_DAYS.map(({ key, label }) => {
            const isActive = nutritionDay === key
            const isToday = key === todayKey
            const dayKcal = findDayData(planData, key)?.total_kcal || 0
            return (
              <button key={key} onClick={() => setNutritionDay(key)} style={{
                flexShrink: 0, padding: '8px 14px', borderRadius: 12, border: 'none', cursor: 'pointer',
                fontFamily: "'Inter', sans-serif", fontSize: '0.82rem', fontWeight: 700,
                background: isActive ? '#e6c364' : '#0e0e0e',
                color: isActive ? '#0D0B08' : isToday ? '#e6c364' : '#d0c5b2',
                outline: isToday && !isActive ? '2px solid #e6c364' : 'none',
              }}>
                {label}
                {dayKcal > 0 && <span style={{ display: 'block', fontSize: '0.55rem', fontWeight: 700, opacity: 0.8 }}>{dayKcal}</span>}
              </button>
            )
          })}
        </div>

        {/* Shopping list button */}
        <button onClick={() => setShowShoppingModal(true)} style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%',
          padding: '12px 16px', borderRadius: 16, border: '1.5px solid rgba(201,168,76,0.25)', cursor: 'pointer',
          background: 'rgba(230,195,100,0.08)',
          fontFamily: "'Inter', sans-serif", fontSize: '0.82rem', fontWeight: 700,
          color: '#e6c364', marginBottom: 12, transition: 'all 150ms',
        }}>
          <ShoppingCart size={15} strokeWidth={2.5} />
          Liste de courses
        </button>

        {/* Meals */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {MEAL_ORDER.map(mealType => {
            const foodList = Array.isArray(dayData.repas?.[mealType]) ? dayData.repas[mealType] : []
            if (foodList.length === 0) return null
            const mealKcal = foodList.reduce((s: number, f: any) => s + (f.kcal || 0), 0)
            return (
              <div key={mealType} style={{ background: '#0e0e0e', border: '1px solid rgba(201,168,76,0.15)', borderRadius: 16, overflow: 'hidden' }}>
                <div style={{ padding: '14px 16px', borderBottom: '1px solid rgba(201,168,76,0.15)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 400, fontSize: 18, letterSpacing: '2px', textTransform: 'uppercase', color: '#e5e2e1' }}>
                    {MEAL_LABELS[mealType]}
                  </span>
                  <span style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '0.85rem', color: '#e6c364' }}>{mealKcal} kcal</span>
                </div>
                <div style={{ padding: '8px 16px', borderBottom: '1px solid rgba(201,168,76,0.15)', display: 'flex', gap: 12 }}>
                  {[
                    { l: 'P', v: foodList.reduce((s: number, f: any) => s + (f.proteines || 0), 0), color: '#e6c364' },
                    { l: 'G', v: foodList.reduce((s: number, f: any) => s + (f.glucides || 0), 0), color: '#60A5FA' },
                    { l: 'L', v: foodList.reduce((s: number, f: any) => s + (f.lipides || 0), 0), color: '#F97316' },
                  ].map(({ l, v, color }) => (
                    <span key={l} style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.72rem', fontWeight: 700, color: '#d0c5b2' }}>
                      <span style={{ color }}>{l}</span> {Math.round(v)}g
                    </span>
                  ))}
                </div>
                <div>
                  {foodList.map((food: any, fi: number) => (
                    <div key={fi} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px', borderTop: fi > 0 ? '1px solid rgba(201,168,76,0.15)' : 'none' }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 14, fontWeight: 400, color: '#e5e2e1' }}>{food.aliment}</div>
                        <div style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.65rem', color: '#d0c5b2', marginTop: 2 }}>{food.quantite_g}g</div>
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '0.85rem', color: '#e6c364' }}>{food.kcal || 0} kcal</div>
                        <div style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.6rem', color: '#d0c5b2' }}>P{food.proteines || 0} G{food.glucides || 0} L{food.lipides || 0}</div>
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

  // Render the old-style coachMealPlan (from client_meal_plans)
  function renderCoachPlan() {
    return (
      <>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 1, background: 'rgba(201,168,76,0.15)', border: '1px solid rgba(201,168,76,0.15)', borderRadius: 16, overflow: 'hidden', marginBottom: 16 }}>
          {[
            { label: 'Kcal', value: String(coachMealPlan.calorie_target || '—') },
            { label: 'Prot', value: coachMealPlan.protein_target ? `${coachMealPlan.protein_target}g` : '—' },
            { label: 'Gluc', value: coachMealPlan.carb_target ? `${coachMealPlan.carb_target}g` : '—' },
            { label: 'Lip', value: coachMealPlan.fat_target ? `${coachMealPlan.fat_target}g` : '—' },
          ].map(({ label, value }) => (
            <div key={label} style={{ background: '#0e0e0e', padding: 20, textAlign: 'center' }}>
              <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 28, fontWeight: 400, color: '#e6c364' }}>{value}</div>
              <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: 11, letterSpacing: '2px', textTransform: 'uppercase', color: '#d0c5b2', marginTop: 4 }}>{label}</div>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 4, marginBottom: 16 }}>
          {NUTRITION_DAYS.map(({ key, label }) => {
            const isActive = nutritionDay === key
            const isToday = key === todayKey
            const dayMeals: any[] = coachMealPlan[key]?.meals ?? []
            const dayKcal = dayMeals.reduce((s: number, m: any) => s + (m.foods || []).reduce((fs: number, f: any) => fs + (f.kcal || 0), 0), 0)
            return (
              <button key={key} onClick={() => setNutritionDay(key)} style={{
                flexShrink: 0, padding: '8px 14px', borderRadius: 12, border: 'none', cursor: 'pointer',
                fontFamily: "'Inter', sans-serif", fontSize: '0.82rem', fontWeight: 700,
                background: isActive ? '#e6c364' : '#0e0e0e',
                color: isActive ? '#0D0B08' : isToday ? '#e6c364' : '#d0c5b2',
                outline: isToday && !isActive ? '2px solid #e6c364' : 'none',
              }}>
                {label}
                {dayKcal > 0 && <span style={{ display: 'block', fontSize: '0.55rem', fontWeight: 700, opacity: 0.8 }}>{dayKcal}</span>}
              </button>
            )
          })}
        </div>

        {(() => {
          const dayPlan = coachMealPlan[nutritionDay]
          const meals: any[] = dayPlan?.meals ?? []
          if (!meals.length) return (
            <div style={{ background: '#0e0e0e', border: '1px solid rgba(201,168,76,0.15)', borderRadius: 16, padding: '40px 20px', textAlign: 'center' }}>
              <UtensilsCrossed size={28} color={'#d0c5b2'} style={{ marginBottom: 8 }} />
              <p style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.85rem', color: '#d0c5b2', margin: 0 }}>Aucun repas pour ce jour.</p>
            </div>
          )
          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {meals.map((meal: any, mi: number) => {
                const mealKcal = (meal.foods || []).reduce((s: number, f: any) => s + (f.kcal || 0), 0)
                const mealProt = (meal.foods || []).reduce((s: number, f: any) => s + (f.prot || 0), 0)
                const mealCarb = (meal.foods || []).reduce((s: number, f: any) => s + (f.carb || 0), 0)
                const mealFat = (meal.foods || []).reduce((s: number, f: any) => s + (f.fat || 0), 0)
                return (
                  <div key={mi} style={{ background: '#0e0e0e', border: '1px solid rgba(201,168,76,0.15)', borderRadius: 16, overflow: 'hidden' }}>
                    <div style={{ padding: '14px 16px', borderBottom: '1px solid rgba(201,168,76,0.15)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 400, fontSize: 18, letterSpacing: '2px', textTransform: 'uppercase', color: '#e5e2e1' }}>{meal.name}</span>
                      <span style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '0.85rem', color: '#e6c364' }}>{mealKcal} kcal</span>
                    </div>
                    <div style={{ padding: '8px 16px', borderBottom: '1px solid rgba(201,168,76,0.15)', display: 'flex', gap: 12 }}>
                      {[
                        { label: 'P', value: `${Math.round(mealProt)}g`, color: '#e6c364' },
                        { label: 'G', value: `${Math.round(mealCarb)}g`, color: '#60A5FA' },
                        { label: 'L', value: `${Math.round(mealFat)}g`, color: '#F97316' },
                      ].map(({ label, value, color }) => (
                        <span key={label} style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.72rem', fontWeight: 700, color: '#d0c5b2' }}>
                          <span style={{ color }}>{label}</span> {value}
                        </span>
                      ))}
                    </div>
                    <div>
                      {(meal.foods || []).map((food: any, fi: number) => (
                        <div key={fi} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px', borderTop: fi > 0 ? '1px solid rgba(201,168,76,0.15)' : 'none' }}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 14, fontWeight: 400, color: '#e5e2e1' }}>{food.name}</div>
                            {food.qty && <div style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.65rem', color: '#d0c5b2', marginTop: 2 }}>{food.qty}</div>}
                          </div>
                          <div style={{ textAlign: 'right', flexShrink: 0 }}>
                            <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '0.85rem', color: '#e6c364' }}>{food.kcal || 0} kcal</div>
                            {(food.prot || food.carb || food.fat) ? (
                              <div style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.6rem', color: '#d0c5b2' }}>P{food.prot || 0} G{food.carb || 0} L{food.fat || 0}</div>
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
      {/* HERO BANNER */}
      <div style={{ margin: '0 20px 0', height: 180, borderRadius: 16, overflow: 'hidden', position: 'relative' }}>
        <img src="/images/hero-nutrition.webp" alt="Plan nutritionnel MoovX" style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'absolute', inset: 0 }} />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, transparent 20%, rgba(13,11,8,0.85) 100%)' }} />
        <div style={{ position: 'absolute', bottom: 20, left: 20, zIndex: 1 }}>
          <h1 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 24, letterSpacing: 3, margin: 0, color: '#e5e2e1', lineHeight: 1 }}>VOTRE PLAN NUTRITIONNEL</h1>
          <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: '#e6c364', fontWeight: 700, letterSpacing: 2 }}>Personnalise par IA</span>
        </div>
      </div>

      {/* PILLS NAVIGATION */}
      <div style={{ display: 'flex', gap: 6, padding: '12px 20px', marginBottom: 16 }}>
        {([
          { id: 'today' as SubTab, label: 'JOURNAL' },
          { id: 'plan' as SubTab, label: 'PLAN IA' },
          ...(!isInvited ? [{ id: 'prefs' as SubTab, label: 'PREFS' }] : []),
          ...(!isInvited ? [{ id: 'recipes' as SubTab, label: 'RECETTES' }] : []),
        ]).map(({ id, label }) => {
          const active = subTab === id
          return (
            <button key={id} onClick={() => setSubTab(id)} style={{
              flex: 1, padding: '10px 8px', border: 'none', cursor: 'pointer',
              fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 14, letterSpacing: '1px',
              background: active ? '#e6c364' : '#0e0e0e',
              color: active ? '#0D0B08' : '#d0c5b2',
            }}>
              {label}
            </button>
          )
        })}
      </div>

      {/* Barcode scanner modal (single scan) */}
      {showScanner && (
        <BarcodeScanner supabase={supabase} userId={userId} defaultMealType="dejeuner"
          onProductAdded={() => { setShowScanner(false); fetchTodayMealLogs() }}
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
          onAdded={async () => { if (swappingFoodId) { await supabase.from('daily_food_logs').delete().eq('id', swappingFoodId); setSwappingFoodId(null) }; setShowFoodSearch(null); fetchTodayMealLogs(); fetchDailyLogs() }}
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
        const EMOJIS: Record<string, string> = { petit_dejeuner: '🥐', dejeuner: '☀️', collation: '🍎', diner: '🌙' }

        return (
          <div style={{ padding: '0 20px' }}>
            {/* ═══ CALENDAR STRIP ═══ */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <span style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 16, letterSpacing: 2, color: '#e5e2e1' }}>{new Date(selectedDate + 'T12:00:00').toLocaleDateString('fr-CH', { month: 'long', year: 'numeric' }).toUpperCase()}</span>
                {selectedDate !== today && <button onClick={() => setSelectedDate(today)} style={{ padding: '4px 12px', borderRadius: 8, background: 'rgba(230,195,100,0.08)', border: '1px solid rgba(201,168,76,0.25)', color: '#e6c364', fontFamily: "'Inter', sans-serif", fontSize: 10, fontWeight: 700, letterSpacing: 2, cursor: 'pointer' }}>AUJOURD&apos;HUI</button>}
              </div>
              <div ref={calScrollRef} style={{ display: 'flex', gap: 4, overflowX: 'auto', paddingBottom: 8, scrollSnapType: 'x mandatory' }}>
                {calendarDays.map(dt => {
                  const d = new Date(dt + 'T12:00:00')
                  const sel = dt === selectedDate, isTd = dt === today, hasMl = daysWithMeals.has(dt), fut = dt > today
                  return (
                    <button key={dt} id={`cal-${dt}`} onClick={() => setSelectedDate(dt)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, padding: '8px 10px', minWidth: 44, borderRadius: 12, border: sel ? '1.5px solid #e6c364' : isTd ? '1px solid rgba(201,168,76,0.25)' : '1px solid transparent', background: sel ? 'rgba(230,195,100,0.08)' : 'transparent', cursor: 'pointer', transition: 'all 0.2s', opacity: fut ? 0.35 : 1, scrollSnapAlign: 'center', flexShrink: 0 }}>
                      <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 9, fontWeight: 700, letterSpacing: 1, color: sel ? '#e6c364' : '#d0c5b2' }}>{d.toLocaleDateString('fr-CH', { weekday: 'short' }).replace('.', '').toUpperCase()}</span>
                      <span style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 20, color: sel ? '#e6c364' : isTd ? '#e5e2e1' : '#d0c5b2' }}>{d.getDate()}</span>
                      <div style={{ width: 4, height: 4, borderRadius: '50%', background: hasMl ? '#e6c364' : 'transparent' }} />
                    </button>
                  )
                })}
              </div>
            </div>
            {isViewingPast && (
              <div style={{ background: 'rgba(230,195,100,0.08)', border: '1px solid rgba(201,168,76,0.25)', borderRadius: 12, padding: '10px 16px', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 16 }}>📅</span>
                <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: '#e6c364' }}>{new Date(selectedDate + 'T12:00:00').toLocaleDateString('fr-CH', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
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
                  <circle cx={ringSize/2} cy={ringSize/2} r={ringRadius} fill="none" stroke="#1c1b1b" strokeWidth={ringStroke} />
                  <circle cx={ringSize/2} cy={ringSize/2} r={ringRadius} fill="none" stroke="url(#nutRingGrad)" strokeWidth={ringStroke} strokeLinecap="butt" strokeDasharray={ringCircum} strokeDashoffset={ringOffset} style={{ transition: 'stroke-dashoffset 0.8s ease', filter: 'drop-shadow(0 0 8px rgba(201,168,76,0.3))' }} />
                </svg>
                <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 40, color: '#e6c364', lineHeight: 1 }}>{consumed.kcal}</span>
                  <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, color: '#d0c5b2' }}>/ {targetKcal} kcal</span>
                  <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 10, color: '#99907e', marginTop: 2 }}>restantes : {remaining}</span>
                </div>
              </div>
            </div>

            {/* Macros bar */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 24 }}>
              {[
                { label: 'PROT.', current: consumed.protein, target: targetP, color: '#e6c364' },
                { label: 'GLUC.', current: consumed.carbs, target: targetG, color: '#60A5FA' },
                { label: 'LIP.', current: consumed.fat, target: targetL, color: '#F87171' },
              ].map(({ label, current, target, color }) => {
                const pct = Math.min(100, Math.round((current / target) * 100))
                return (
                  <div key={label} style={{ textAlign: 'center' }}>
                    <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 10, color: '#d0c5b2', letterSpacing: '0.1em', marginBottom: 4 }}>{label}</div>
                    <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 18, color }}>{Math.round(current)}<span style={{ fontSize: 12, color: '#d0c5b2' }}>/{target}g</span></div>
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
                <div key={mealType} style={{ background: '#0e0e0e', border: '1px solid rgba(201,168,76,0.15)', marginBottom: 12, overflow: 'hidden' }}>
                  {/* Meal header */}
                  <div style={{ padding: '14px 16px', borderBottom: '1px solid rgba(201,168,76,0.15)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <span style={{ fontSize: 16 }}>{EMOJIS[mealType] || '🍽'}</span>
                      <span style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 18, letterSpacing: '1px', color: '#e5e2e1' }}>{MEAL_LABELS[mealType]}</span>
                      <span style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 14, color: '#e6c364', marginLeft: 'auto' }}>{con.kcal} kcal</span>
                      {logs.length > 0 && (
                        <div style={{ position: 'relative' }}>
                          <button onClick={() => setMealMenuOpen(mealMenuOpen === mealType ? null : mealType)} style={{ background: 'none', border: 'none', color: '#d0c5b2', fontSize: 18, cursor: 'pointer', padding: '4px 8px' }}>⋯</button>
                          {mealMenuOpen === mealType && (
                            <div style={{ position: 'absolute', top: 36, right: 0, background: '#0e0e0e', border: '1px solid rgba(201,168,76,0.15)', borderRadius: 12, padding: 6, zIndex: 50, minWidth: 200, boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}>
                              <button onClick={() => { setMealMenuOpen(null); setSaveMealData({ mealType, foods: logs.map((l: any) => ({ name: l.custom_name || l.food_name, quantity: l.quantity_g, calories: l.calories, proteins: l.protein, carbs: l.carbs, fats: l.fat })) }); setSaveMealName(''); setSaveMealType(mealType); setShowSaveMealPopup(true) }} style={{ width: '100%', padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10, background: 'none', border: 'none', borderRadius: 8, cursor: 'pointer', textAlign: 'left' }}><span style={{ fontSize: 16 }}>💾</span><span style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: '#e5e2e1' }}>Sauvegarder le repas</span></button>
                              <button onClick={() => { setMealMenuOpen(null); setCopyMealData({ mealType, foods: logs }); setCopyTargetDate(''); setCopyTargetMealType(mealType); setShowCopyMealPopup(true) }} style={{ width: '100%', padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10, background: 'none', border: 'none', borderRadius: 8, cursor: 'pointer', textAlign: 'left' }}><span style={{ fontSize: 16 }}>📋</span><span style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: '#e5e2e1' }}>Copier vers un autre jour</span></button>
                              <button onClick={() => { setMealMenuOpen(null); clearMeal(mealType) }} style={{ width: '100%', padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10, background: 'none', border: 'none', borderRadius: 8, cursor: 'pointer', textAlign: 'left' }}><span style={{ fontSize: 16 }}>🗑️</span><span style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: '#EF4444' }}>Vider ce repas</span></button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    {rec && (
                      <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, color: '#d0c5b2', fontStyle: 'italic' }}>
                        Recommandé : {rec.kcal} kcal · P:{Math.round(rec.protein)}g · G:{Math.round(rec.carbs)}g · L:{Math.round(rec.fat)}g
                      </div>
                    )}
                    {logs.length > 0 && (
                      <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, color: con.kcal > (rec?.kcal || 9999) ? '#EF4444' : '#e6c364', marginTop: 2 }}>
                        Consommé : {con.kcal} kcal · P:{Math.round(con.protein)}g · G:{Math.round(con.carbs)}g · L:{Math.round(con.fat)}g
                      </div>
                    )}
                  </div>

                  {/* Daily food logs for this meal */}
                  <div style={{ padding: '0 16px' }}>
                    {logs.map(log => (
                      <div key={log.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: '1px solid rgba(201,168,76,0.15)' }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 14, color: '#e5e2e1' }}>{log.custom_name || log.food_name || 'Aliment'}</div>
                          {editingFoodId === log.id ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                              <input type="number" value={editQty} onChange={e => setEditQty(e.target.value)} autoFocus onKeyDown={e => { if (e.key === 'Enter') updateFoodQuantity(log.id, parseFloat(editQty)); if (e.key === 'Escape') setEditingFoodId(null) }} style={{ width: 60, padding: '4px 8px', background: '#131313', border: '1px solid #e6c364', borderRadius: 6, color: '#e5e2e1', fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 16, textAlign: 'center', outline: 'none' }} />
                              <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: '#d0c5b2' }}>g</span>
                              <button onClick={() => updateFoodQuantity(log.id, parseFloat(editQty))} style={{ background: '#e6c364', border: 'none', borderRadius: 6, color: '#0D0B08', padding: '4px 10px', fontFamily: "'Inter', sans-serif", fontSize: 10, fontWeight: 700, cursor: 'pointer' }}>OK</button>
                              <button onClick={() => setEditingFoodId(null)} style={{ background: 'none', border: 'none', color: '#d0c5b2', fontSize: 14, cursor: 'pointer' }}>✕</button>
                            </div>
                          ) : (
                            <div onClick={() => { setEditingFoodId(log.id); setEditQty(String(log.quantity_g || 100)) }} style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, color: '#d0c5b2', marginTop: 2, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                              <span>{log.quantity_g}g</span>
                              <span style={{ fontSize: 10, color: '#99907e' }}>✏️</span>
                              <span style={{ fontSize: 10, color: '#99907e' }}>· P:{Math.round(log.protein || 0)}g G:{Math.round(log.carbs || 0)}g L:{Math.round(log.fat || 0)}g</span>
                            </div>
                          )}
                        </div>
                        <span style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 14, color: '#e6c364', flexShrink: 0 }}>{Math.round(log.calories)}</span>
                        <div style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
                          <button onClick={() => { setSwappingFoodId(log.id); setShowFoodSearch(mealType) }} style={{ background: 'none', border: 'none', color: '#d0c5b2', fontSize: 14, cursor: 'pointer', padding: 4 }} title="Remplacer">🔄</button>
                          <button onClick={() => deleteDailyLog(log.id)} style={{ background: 'none', border: 'none', color: '#d0c5b2', fontSize: 14, cursor: 'pointer', padding: 4 }} title="Supprimer">🗑️</button>
                        </div>
                      </div>
                    ))}

                    {logs.length === 0 && (
                      <div style={{ padding: '16px 0', textAlign: 'center' }}>
                        <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: '#99907e' }}>Aucun aliment ajouté</span>
                      </div>
                    )}

                    {/* Action buttons */}
                    <div style={{ display: 'flex', gap: 8, padding: '8px 0 12px' }}>
                      {hasPlanFoods && logs.length === 0 && (
                        <button onClick={() => setImportingMeal(mealType)} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '10px', border: '1px solid rgba(201,168,76,0.25)', background: 'rgba(230,195,100,0.08)', cursor: 'pointer', fontFamily: "'Inter', sans-serif", fontSize: 11, color: '#e6c364' }}>
                          🤖 Importer le plan IA
                        </button>
                      )}
                      <button onClick={() => setShowFoodSearch(mealType)} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '10px', border: '1px dashed rgba(201,168,76,0.15)', background: 'transparent', cursor: 'pointer', fontFamily: "'Inter', sans-serif", color: '#d0c5b2', fontSize: 11 }}>
                        <Plus size={12} strokeWidth={2.5} /> Ajouter
                      </button>
                      <button onClick={() => { setPhotoMealTarget(mealType); setShowPhotoCapture(true) }} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, padding: '10px 12px', background: 'rgba(230,195,100,0.08)', border: '1px solid rgba(201,168,76,0.25)', borderRadius: 10, cursor: 'pointer', fontFamily: "'Inter', sans-serif", fontSize: 11, color: '#e6c364' }}>📸</button>
                      <button onClick={() => { setUseSavedMealTarget(mealType); setShowSavedMeals(true); supabase.from('saved_meals').select('*').eq('user_id', userId).order('use_count', { ascending: false }).then(({ data }: any) => setSavedMeals(data || [])) }} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, padding: '10px 12px', border: '1px dashed rgba(201,168,76,0.25)', background: 'transparent', borderRadius: 10, cursor: 'pointer', fontFamily: "'Inter', sans-serif", fontSize: 11, color: '#e6c364' }}>📂</button>
                    </div>
                  </div>
                </div>
              )
            })}

            {/* Import confirmation modal */}
            {importingMeal && (() => {
              const todayPlan = getTodayPlanData()
              const foods = todayPlan ? (Array.isArray(todayPlan.planData.repas?.[importingMeal]) ? todayPlan.planData.repas[importingMeal] : []) : []
              return (
                <ImportPlanSheet mealLabel={MEAL_LABELS[importingMeal]} foods={foods} onImport={() => importMealFromPlan(importingMeal)} onClose={() => setImportingMeal(null)} />
              )
            })()}

            {/* Shopping button */}
            {(activeMealPlan?.plan_data || coachMealPlan) && (
              <button onClick={() => setShowShoppingModal(true)} style={{
                width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                padding: '12px', border: '1px solid rgba(201,168,76,0.25)', background: 'rgba(230,195,100,0.08)', cursor: 'pointer',
                fontFamily: "'Inter', sans-serif", fontSize: 12, color: '#e6c364', marginBottom: 20,
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
            <SlidersHorizontal size={18} color={'#e6c364'} />
            <h2 style={{ fontFamily: "'Inter', sans-serif", fontSize: '1.1rem', fontWeight: 800, letterSpacing: '2px', textTransform: 'uppercase', color: '#e5e2e1', margin: 0 }}>Preferences nutrition</h2>
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
          <div onClick={() => { setShowPhotoCapture(false); setPhotoResults(null) }} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1100 }} />
          <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: 'calc(100% - 32px)', maxWidth: 440, maxHeight: '80vh', background: '#0e0e0e', border: '1px solid rgba(201,168,76,0.15)', borderRadius: 16, zIndex: 1101, display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 24px 80px rgba(0,0,0,0.6)' }}>
            <div style={{ padding: '20px 20px 14px', borderBottom: '1px solid rgba(201,168,76,0.15)', flexShrink: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 20, letterSpacing: 2, color: '#e5e2e1' }}>SCANNER UN REPAS</span>
              <button onClick={() => { setShowPhotoCapture(false); setPhotoResults(null) }} style={{ background: 'none', border: 'none', color: '#d0c5b2', fontSize: 22, cursor: 'pointer' }}>✕</button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
              <input ref={photoInputRef} type="file" accept="image/*" capture="environment" onChange={handlePhotoCapture} style={{ display: 'none' }} />
              {!photoResults && !analyzingPhoto && (
                <button onClick={() => photoInputRef.current?.click()} style={{ width: '100%', padding: '40px 20px', background: 'rgba(230,195,100,0.08)', border: '2px dashed rgba(201,168,76,0.25)', borderRadius: 16, cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: 48 }}>📷</span>
                  <span style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 18, letterSpacing: 2, color: '#e6c364' }}>PRENDRE UNE PHOTO</span>
                  <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: '#d0c5b2' }}>ou choisir depuis la galerie</span>
                </button>
              )}
              {analyzingPhoto && (
                <div style={{ textAlign: 'center', padding: '40px 0' }}>
                  <div style={{ width: 48, height: 48, borderRadius: '50%', border: '3px solid rgba(230,195,100,0.08)', borderTopColor: '#e6c364', animation: 'spin 1s linear infinite', margin: '0 auto 16px' }} />
                  <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 18, color: '#e6c364', letterSpacing: 2 }}>ANALYSE EN COURS...</div>
                </div>
              )}
              {photoResults?.foods && (
                <>
                  <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 10, fontWeight: 700, letterSpacing: 3, color: '#e6c364', textTransform: 'uppercase', marginBottom: 12 }}>{photoResults.foods.length} aliments detectes</div>
                  {photoResults.foods.map((f: any, i: number) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: i < photoResults.foods.length - 1 ? '1px solid rgba(230,195,100,0.08)' : 'none' }}>
                      <div>
                        <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 14, color: '#e5e2e1' }}>{f.name}</div>
                        <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, color: '#d0c5b2' }}>{f.quantity_g}g · P:{f.proteins}g G:{f.carbs}g L:{f.fats}g</div>
                      </div>
                      <span style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 16, color: '#e6c364' }}>{f.calories}</span>
                    </div>
                  ))}
                  <div style={{ background: 'rgba(230,195,100,0.08)', borderRadius: 12, padding: '12px 16px', marginTop: 16, textAlign: 'center' }}>
                    <span style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 24, color: '#e6c364' }}>{photoResults.total_calories} KCAL</span>
                  </div>
                </>
              )}
            </div>
            {photoResults?.foods && (
              <div style={{ padding: '16px 20px', borderTop: '1px solid rgba(230,195,100,0.08)', display: 'flex', gap: 12, flexShrink: 0 }}>
                <button onClick={() => setPhotoResults(null)} style={{ flex: 1, padding: 14, background: 'transparent', border: `1.5px solid rgba(212,168,67,0.5)`, borderRadius: 12, color: '#e6c364', fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 16, letterSpacing: 2, cursor: 'pointer' }}>REPRENDRE</button>
                <button onClick={addPhotoFoods} style={{ flex: 1, padding: 14, border: 'none', background: 'linear-gradient(135deg, #E8C97A, #D4A843, #C9A84C, #8B6914)', borderRadius: 12, color: '#0D0B08', fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 16, letterSpacing: 2, cursor: 'pointer' }}>AJOUTER TOUT</button>
              </div>
            )}
          </div>
        </>
      )}

      {/* ═══ SAVE MEAL POPUP ═══ */}
      {showSaveMealPopup && saveMealData && (
        <>
          <div onClick={() => setShowSaveMealPopup(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1100 }} />
          <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: 'calc(100% - 32px)', maxWidth: 400, background: '#0e0e0e', border: '1px solid rgba(201,168,76,0.15)', borderRadius: 16, padding: 24, zIndex: 1101 }}>
            <h3 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 22, letterSpacing: 2, color: '#e5e2e1', marginBottom: 16 }}>SAUVEGARDER LE REPAS</h3>
            <input type="text" placeholder="Nom du repas..." value={saveMealName} onChange={e => setSaveMealName(e.target.value)} autoFocus style={{ width: '100%', padding: '12px 14px', background: '#131313', border: '1px solid rgba(201,168,76,0.15)', borderRadius: 10, color: '#e5e2e1', fontFamily: "'Inter', sans-serif", fontSize: 14, outline: 'none', marginBottom: 12 }} />
            <div style={{ background: '#131313', borderRadius: 10, padding: 12, marginBottom: 16, border: '1px solid rgba(230,195,100,0.08)' }}>
              <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 9, fontWeight: 700, letterSpacing: 2, color: '#d0c5b2', marginBottom: 8 }}>{saveMealData.foods.length} ALIMENTS</div>
              {saveMealData.foods.map((f: any, i: number) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', fontFamily: "'Inter', sans-serif", fontSize: 12 }}>
                  <span style={{ color: '#e5e2e1' }}>{f.name}</span>
                  <span style={{ color: '#e6c364' }}>{f.calories} kcal</span>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <button onClick={() => setShowSaveMealPopup(false)} style={{ flex: 1, padding: 14, background: 'transparent', border: `1.5px solid rgba(212,168,67,0.5)`, borderRadius: 12, color: '#e6c364', fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 16, letterSpacing: 2, cursor: 'pointer' }}>ANNULER</button>
              <button disabled={!saveMealName.trim()} onClick={async () => {
                await supabase.from('saved_meals').insert({ user_id: userId, name: saveMealName, meal_type: saveMealType, foods: saveMealData.foods, total_calories: saveMealData.foods.reduce((s: number, f: any) => s + (f.calories || 0), 0), total_proteins: saveMealData.foods.reduce((s: number, f: any) => s + (f.proteins || 0), 0), total_carbs: saveMealData.foods.reduce((s: number, f: any) => s + (f.carbs || 0), 0), total_fats: saveMealData.foods.reduce((s: number, f: any) => s + (f.fats || 0), 0) })
                setShowSaveMealPopup(false); setSaveMealName('')
              }} style={{ flex: 1, padding: 14, background: saveMealName.trim() ? 'linear-gradient(135deg, #E8C97A, #D4A843, #C9A84C, #8B6914)' : '#1c1b1b', border: 'none', borderRadius: 12, color: saveMealName.trim() ? '#0D0B08' : '#99907e', fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 16, letterSpacing: 2, cursor: 'pointer' }}>SAUVEGARDER</button>
            </div>
          </div>
        </>
      )}

      {/* ═══ COPY MEAL POPUP ═══ */}
      {showCopyMealPopup && copyMealData && (
        <>
          <div onClick={() => setShowCopyMealPopup(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1100 }} />
          <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: 'calc(100% - 32px)', maxWidth: 400, background: '#0e0e0e', border: '1px solid rgba(201,168,76,0.15)', borderRadius: 16, padding: 24, zIndex: 1101 }}>
            <h3 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 22, letterSpacing: 2, color: '#e5e2e1', marginBottom: 16 }}>COPIER LE REPAS</h3>
            <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 10, fontWeight: 700, letterSpacing: 2, color: '#d0c5b2', marginBottom: 6 }}>DATE</div>
            <div style={{ display: 'flex', gap: 6, marginBottom: 8, flexWrap: 'wrap' }}>
              {[{ l: 'Demain', d: 1 }, { l: '+2j', d: 2 }, { l: '+3j', d: 3 }, { l: '+1 sem', d: 7 }].map(s => {
                const dt = new Date(Date.now() + s.d * 86400000).toISOString().split('T')[0]
                return <button key={s.l} onClick={() => setCopyTargetDate(dt)} style={{ padding: '6px 12px', borderRadius: 20, border: copyTargetDate === dt ? '1px solid #e6c364' : '1px solid rgba(230,195,100,0.08)', background: copyTargetDate === dt ? 'rgba(230,195,100,0.08)' : 'transparent', color: copyTargetDate === dt ? '#e6c364' : '#d0c5b2', fontFamily: "'Inter', sans-serif", fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>{s.l}</button>
              })}
            </div>
            <input type="date" value={copyTargetDate} onChange={e => setCopyTargetDate(e.target.value)} min={today} style={{ width: '100%', padding: '10px 14px', background: '#131313', border: '1px solid rgba(201,168,76,0.15)', borderRadius: 10, color: '#e5e2e1', fontFamily: "'Inter', sans-serif", fontSize: 14, outline: 'none', marginBottom: 12, colorScheme: 'dark' }} />
            <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 10, fontWeight: 700, letterSpacing: 2, color: '#d0c5b2', marginBottom: 6 }}>REPAS</div>
            <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
              {MEAL_ORDER.map(t => <button key={t} onClick={() => setCopyTargetMealType(t)} style={{ padding: '6px 12px', borderRadius: 20, border: copyTargetMealType === t ? '1px solid #e6c364' : '1px solid rgba(230,195,100,0.08)', background: copyTargetMealType === t ? 'rgba(230,195,100,0.08)' : 'transparent', color: copyTargetMealType === t ? '#e6c364' : '#d0c5b2', fontFamily: "'Inter', sans-serif", fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>{MEAL_LABELS[t]}</button>)}
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <button onClick={() => setShowCopyMealPopup(false)} style={{ flex: 1, padding: 14, background: 'transparent', border: `1.5px solid rgba(212,168,67,0.5)`, borderRadius: 12, color: '#e6c364', fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 16, letterSpacing: 2, cursor: 'pointer' }}>ANNULER</button>
              <button disabled={!copyTargetDate || !copyTargetMealType} onClick={async () => { await copyMealToDate(copyMealData.foods, copyTargetDate, copyTargetMealType); setShowCopyMealPopup(false) }} style={{ flex: 1, padding: 14, background: (copyTargetDate && copyTargetMealType) ? 'linear-gradient(135deg, #E8C97A, #D4A843, #C9A84C, #8B6914)' : '#1c1b1b', border: 'none', borderRadius: 12, color: (copyTargetDate && copyTargetMealType) ? '#0D0B08' : '#99907e', fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 16, letterSpacing: 2, cursor: 'pointer' }}>COPIER</button>
            </div>
          </div>
        </>
      )}

      {/* ═══ SAVED MEALS POPUP ═══ */}
      {showSavedMeals && (
        <>
          <div onClick={() => setShowSavedMeals(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1100 }} />
          <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: 'calc(100% - 32px)', maxWidth: 440, maxHeight: '75vh', background: '#0e0e0e', border: '1px solid rgba(201,168,76,0.15)', borderRadius: 16, zIndex: 1101, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ padding: '20px 20px 14px', borderBottom: '1px solid rgba(201,168,76,0.15)', flexShrink: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 20, letterSpacing: 2, color: '#e5e2e1' }}>MES REPAS</span>
              <button onClick={() => setShowSavedMeals(false)} style={{ background: 'none', border: 'none', color: '#d0c5b2', fontSize: 22, cursor: 'pointer' }}>✕</button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '8px 20px 20px' }}>
              {savedMeals.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 0', color: '#d0c5b2', fontFamily: "'Inter', sans-serif", fontSize: 14 }}>Aucun repas sauvegarde.</div>
              ) : savedMeals.map((meal: any) => (
                <button key={meal.id} onClick={async () => { await applySavedMeal(meal, useSavedMealTarget); setShowSavedMeals(false) }} style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 0', background: 'none', border: 'none', borderBottom: '1px solid rgba(230,195,100,0.08)', cursor: 'pointer', textAlign: 'left' }}>
                  <div>
                    <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 14, color: '#e5e2e1', fontWeight: 500 }}>{meal.name}</div>
                    <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, color: '#d0c5b2', marginTop: 2 }}>{(meal.foods || []).length} aliments{meal.use_count > 0 && ` · ${meal.use_count}x utilise`}</div>
                  </div>
                  <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 18, color: '#e6c364' }}>{Math.round(meal.total_calories || 0)}</div>
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
