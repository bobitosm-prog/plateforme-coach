'use client'
import { useEffect, useState } from 'react'
import { UtensilsCrossed, Sparkles, SlidersHorizontal, ShoppingCart, ChevronDown, ChevronUp, Check, Clock, Plus, Trash2, Download, ChefHat, List, ClipboardList, Camera, Star } from 'lucide-react'
import { downloadCsv } from '../../../lib/exportCsv'
import NutritionPreferences from '../NutritionPreferences'
import FoodSearch from '../FoodSearch'
import BarcodeScanner from '../BarcodeScanner'
import RecipesSection from '../RecipesSection'
import ShoppingList from '../ShoppingList'
import {
  BG_BASE, BG_CARD, BG_CARD_2, BORDER, ORANGE, GOLD, GOLD_DIM, GOLD_RULE, GOLD_BORDER_STRONG, GREEN, TEXT_PRIMARY, TEXT_MUTED, TEXT_DIM, RADIUS_CARD,
  FONT_DISPLAY, FONT_ALT, FONT_BODY,
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
  const today = new Date().toISOString().split('T')[0]

  const hasPlan = !!coachMealPlan || !!activeMealPlan
  const [subTab, setSubTab] = useState<SubTab>('today')

  useEffect(() => {
    fetchActiveMealPlan()
    fetchTodayTracking()
    fetchTodayMealLogs()
    fetchDailyLogs()
  }, [userId])

  useEffect(() => {
    console.log('=== NUTRITION TAB STATE ===')
    console.log('activeMealPlan:', activeMealPlan ? { id: activeMealPlan.id, is_active: activeMealPlan.is_active, has_plan_data: !!activeMealPlan.plan_data, days: activeMealPlan.plan_data ? Object.keys(activeMealPlan.plan_data) : [] } : null)
    console.log('coachMealPlan:', !!coachMealPlan)
    console.log('nutritionDay:', nutritionDay, 'todayKey:', todayKey)
    console.log('profile calorie_goal:', profile?.calorie_goal, 'tdee:', profile?.tdee)
    console.log('subTab:', subTab, 'hasPlan:', hasPlan)
  }, [activeMealPlan, subTab])

  async function fetchDailyLogs() {
    const { data } = await supabase.from('daily_food_logs').select('*').eq('user_id', userId).eq('date', today).order('created_at', { ascending: true })
    setDailyLogs(data || [])
  }

  async function deleteDailyLog(id: string) {
    await supabase.from('daily_food_logs').delete().eq('id', id)
    setDailyLogs(prev => prev.filter(l => l.id !== id))
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
    console.log('=== FETCH MEAL PLAN ===', { found: !!data, id: data?.id, is_active: data?.is_active, days: data?.plan_data ? Object.keys(data.plan_data) : [] })
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

  // Waiting screen when no plan exists
  function renderWaitingScreen() {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px 24px', textAlign: 'center' }}>
        <div style={{ fontSize: '3.5rem', marginBottom: 24 }}>🍽️</div>
        <h2 style={{ fontFamily: FONT_ALT, fontSize: '1.3rem', fontWeight: 800, letterSpacing: '2px', textTransform: 'uppercase', color: TEXT_PRIMARY, margin: '0 0 10px' }}>Aucun plan alimentaire</h2>
        <p style={{ fontFamily: FONT_BODY, fontSize: '0.82rem', color: TEXT_MUTED, margin: '0 0 24px', lineHeight: 1.6, maxWidth: 300 }}>
          Configure tes preferences puis genere ton plan IA personnalise.
        </p>
        <button onClick={() => setSubTab('prefs')} style={{ padding: '14px 32px', border: 'none', cursor: 'pointer', background: GOLD, fontFamily: FONT_ALT, fontSize: '0.9rem', fontWeight: 800, color: '#0D0B08', letterSpacing: '2px', textTransform: 'uppercase',  }}>
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
      console.log('No data for', nutritionDay, '— available:', availableDays)
      return (
        <div style={{ padding: 20, textAlign: 'center' }}>
          <p style={{ fontFamily: FONT_BODY, fontSize: '0.85rem', color: TEXT_MUTED, marginBottom: 12 }}>Pas de plan pour {nutritionDay}.</p>
          <p style={{ fontFamily: FONT_BODY, fontSize: '0.75rem', color: TEXT_DIM }}>Jours disponibles : {availableDays.join(', ')}</p>
        </div>
      )
    }

    return (
      <>
        {/* Macro targets */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 1, background: BORDER, border: `1px solid ${BORDER}`, borderRadius: RADIUS_CARD, overflow: 'hidden', marginBottom: 16 }}>
          {[
            { label: 'Kcal', value: String(dayData.total_kcal || plan.total_calories || '—') },
            { label: 'Prot', value: `${dayData.total_protein || plan.protein_g || '—'}g` },
            { label: 'Gluc', value: `${dayData.total_carbs || plan.carbs_g || '—'}g` },
            { label: 'Lip', value: `${dayData.total_fat || plan.fat_g || '—'}g` },
          ].map(({ label, value }) => (
            <div key={label} style={{ background: BG_CARD, padding: 20, textAlign: 'center' }}>
              <div style={{ fontFamily: FONT_DISPLAY, fontSize: 28, fontWeight: 400, color: GOLD }}>{value}</div>
              <div style={{ fontFamily: FONT_ALT, fontWeight: 700, fontSize: 11, letterSpacing: '2px', textTransform: 'uppercase', color: TEXT_MUTED, marginTop: 4 }}>{label}</div>
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
                fontFamily: FONT_ALT, fontSize: '0.82rem', fontWeight: 700,
                background: isActive ? GOLD : BG_CARD,
                color: isActive ? '#0D0B08' : isToday ? GOLD : TEXT_MUTED,
                outline: isToday && !isActive ? `2px solid ${GOLD}` : 'none',
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
          padding: '12px 16px', borderRadius: RADIUS_CARD, border: `1.5px solid ${GOLD_RULE}`, cursor: 'pointer',
          background: GOLD_DIM,
          fontFamily: FONT_ALT, fontSize: '0.82rem', fontWeight: 700,
          color: GOLD, marginBottom: 12, transition: 'all 150ms',
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
              <div key={mealType} style={{ background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: RADIUS_CARD, overflow: 'hidden' }}>
                <div style={{ padding: '14px 16px', borderBottom: `1px solid ${BORDER}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontFamily: FONT_DISPLAY, fontWeight: 400, fontSize: 18, letterSpacing: '2px', textTransform: 'uppercase', color: TEXT_PRIMARY }}>
                    {MEAL_LABELS[mealType]}
                  </span>
                  <span style={{ fontFamily: FONT_DISPLAY, fontSize: '0.85rem', color: GOLD }}>{mealKcal} kcal</span>
                </div>
                <div style={{ padding: '8px 16px', borderBottom: `1px solid ${BORDER}`, display: 'flex', gap: 12 }}>
                  {[
                    { l: 'P', v: foodList.reduce((s: number, f: any) => s + (f.proteines || 0), 0), color: GOLD },
                    { l: 'G', v: foodList.reduce((s: number, f: any) => s + (f.glucides || 0), 0), color: '#60A5FA' },
                    { l: 'L', v: foodList.reduce((s: number, f: any) => s + (f.lipides || 0), 0), color: '#F97316' },
                  ].map(({ l, v, color }) => (
                    <span key={l} style={{ fontFamily: FONT_BODY, fontSize: '0.72rem', fontWeight: 700, color: TEXT_MUTED }}>
                      <span style={{ color }}>{l}</span> {Math.round(v)}g
                    </span>
                  ))}
                </div>
                <div>
                  {foodList.map((food: any, fi: number) => (
                    <div key={fi} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px', borderTop: fi > 0 ? `1px solid ${BORDER}` : 'none' }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontFamily: FONT_BODY, fontSize: 14, fontWeight: 400, color: TEXT_PRIMARY }}>{food.aliment}</div>
                        <div style={{ fontFamily: FONT_BODY, fontSize: '0.65rem', color: TEXT_MUTED, marginTop: 2 }}>{food.quantite_g}g</div>
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <div style={{ fontFamily: FONT_DISPLAY, fontSize: '0.85rem', color: GOLD }}>{food.kcal || 0} kcal</div>
                        <div style={{ fontFamily: FONT_BODY, fontSize: '0.6rem', color: TEXT_MUTED }}>P{food.proteines || 0} G{food.glucides || 0} L{food.lipides || 0}</div>
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
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 1, background: BORDER, border: `1px solid ${BORDER}`, borderRadius: RADIUS_CARD, overflow: 'hidden', marginBottom: 16 }}>
          {[
            { label: 'Kcal', value: String(coachMealPlan.calorie_target || '—') },
            { label: 'Prot', value: coachMealPlan.protein_target ? `${coachMealPlan.protein_target}g` : '—' },
            { label: 'Gluc', value: coachMealPlan.carb_target ? `${coachMealPlan.carb_target}g` : '—' },
            { label: 'Lip', value: coachMealPlan.fat_target ? `${coachMealPlan.fat_target}g` : '—' },
          ].map(({ label, value }) => (
            <div key={label} style={{ background: BG_CARD, padding: 20, textAlign: 'center' }}>
              <div style={{ fontFamily: FONT_DISPLAY, fontSize: 28, fontWeight: 400, color: GOLD }}>{value}</div>
              <div style={{ fontFamily: FONT_ALT, fontWeight: 700, fontSize: 11, letterSpacing: '2px', textTransform: 'uppercase', color: TEXT_MUTED, marginTop: 4 }}>{label}</div>
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
                fontFamily: FONT_ALT, fontSize: '0.82rem', fontWeight: 700,
                background: isActive ? GOLD : BG_CARD,
                color: isActive ? '#0D0B08' : isToday ? GOLD : TEXT_MUTED,
                outline: isToday && !isActive ? `2px solid ${GOLD}` : 'none',
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
            <div style={{ background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: RADIUS_CARD, padding: '40px 20px', textAlign: 'center' }}>
              <UtensilsCrossed size={28} color={TEXT_MUTED} style={{ marginBottom: 8 }} />
              <p style={{ fontFamily: FONT_BODY, fontSize: '0.85rem', color: TEXT_MUTED, margin: 0 }}>Aucun repas pour ce jour.</p>
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
                  <div key={mi} style={{ background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: RADIUS_CARD, overflow: 'hidden' }}>
                    <div style={{ padding: '14px 16px', borderBottom: `1px solid ${BORDER}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontFamily: FONT_DISPLAY, fontWeight: 400, fontSize: 18, letterSpacing: '2px', textTransform: 'uppercase', color: TEXT_PRIMARY }}>{meal.name}</span>
                      <span style={{ fontFamily: FONT_DISPLAY, fontSize: '0.85rem', color: GOLD }}>{mealKcal} kcal</span>
                    </div>
                    <div style={{ padding: '8px 16px', borderBottom: `1px solid ${BORDER}`, display: 'flex', gap: 12 }}>
                      {[
                        { label: 'P', value: `${Math.round(mealProt)}g`, color: GOLD },
                        { label: 'G', value: `${Math.round(mealCarb)}g`, color: '#60A5FA' },
                        { label: 'L', value: `${Math.round(mealFat)}g`, color: '#F97316' },
                      ].map(({ label, value, color }) => (
                        <span key={label} style={{ fontFamily: FONT_BODY, fontSize: '0.72rem', fontWeight: 700, color: TEXT_MUTED }}>
                          <span style={{ color }}>{label}</span> {value}
                        </span>
                      ))}
                    </div>
                    <div>
                      {(meal.foods || []).map((food: any, fi: number) => (
                        <div key={fi} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px', borderTop: fi > 0 ? `1px solid ${BORDER}` : 'none' }}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontFamily: FONT_BODY, fontSize: 14, fontWeight: 400, color: TEXT_PRIMARY }}>{food.name}</div>
                            {food.qty && <div style={{ fontFamily: FONT_BODY, fontSize: '0.65rem', color: TEXT_MUTED, marginTop: 2 }}>{food.qty}</div>}
                          </div>
                          <div style={{ textAlign: 'right', flexShrink: 0 }}>
                            <div style={{ fontFamily: FONT_DISPLAY, fontSize: '0.85rem', color: GOLD }}>{food.kcal || 0} kcal</div>
                            {(food.prot || food.carb || food.fat) ? (
                              <div style={{ fontFamily: FONT_BODY, fontSize: '0.6rem', color: TEXT_MUTED }}>P{food.prot || 0} G{food.carb || 0} L{food.fat || 0}</div>
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
        <img src="/images/hero-nutrition.png" alt="Plan nutritionnel MoovX" style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'absolute', inset: 0 }} />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, transparent 20%, rgba(13,11,8,0.85) 100%)' }} />
        <div style={{ position: 'absolute', bottom: 20, left: 20, zIndex: 1 }}>
          <h1 style={{ fontFamily: FONT_DISPLAY, fontSize: 24, letterSpacing: 3, margin: 0, color: TEXT_PRIMARY, lineHeight: 1 }}>VOTRE PLAN NUTRITIONNEL</h1>
          <span style={{ fontFamily: FONT_ALT, fontSize: 12, color: GOLD, fontWeight: 700, letterSpacing: 2 }}>Personnalise par IA</span>
        </div>
      </div>

      {/* PILLS NAVIGATION */}
      <div style={{ display: 'flex', gap: 6, padding: '12px 20px', marginBottom: 16 }}>
        {[
          { id: 'today' as SubTab, label: 'JOURNAL' },
          { id: 'plan' as SubTab, label: 'PLAN IA' },
          { id: 'prefs' as SubTab, label: 'PREFS' },
          { id: 'recipes' as SubTab, label: 'RECETTES' },
        ].map(({ id, label }) => {
          const active = subTab === id
          return (
            <button key={id} onClick={() => setSubTab(id)} style={{
              flex: 1, padding: '10px 8px', border: 'none', cursor: 'pointer',
              fontFamily: FONT_DISPLAY, fontSize: 14, letterSpacing: '1px',
              background: active ? GOLD : BG_CARD,
              color: active ? '#0D0B08' : TEXT_MUTED,
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
          onAdded={() => { setShowFoodSearch(null); fetchTodayMealLogs(); fetchDailyLogs() }}
          onClose={() => setShowFoodSearch(null)}
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
        const pctKcal = Math.min(100, Math.round((consumed.kcal / targetKcal) * 100))

        const ringSize = 180
        const ringStroke = 12
        const ringRadius = (ringSize - ringStroke) / 2
        const ringCircum = 2 * Math.PI * ringRadius
        const ringOffset = ringCircum - (pctKcal / 100) * ringCircum
        const EMOJIS: Record<string, string> = { petit_dejeuner: '🌅', dejeuner: '☀️', collation: '🍎', diner: '🌙' }

        return (
          <div style={{ padding: '0 20px' }}>
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
                  <span style={{ fontFamily: FONT_DISPLAY, fontSize: 40, color: GOLD, lineHeight: 1 }}>{consumed.kcal}</span>
                  <span style={{ fontFamily: FONT_BODY, fontSize: 11, color: TEXT_MUTED }}>/ {targetKcal} kcal</span>
                  <span style={{ fontFamily: FONT_BODY, fontSize: 10, color: TEXT_DIM, marginTop: 2 }}>restantes : {remaining}</span>
                </div>
              </div>
            </div>

            {/* Macros bar */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 24 }}>
              {[
                { label: 'PROT.', current: consumed.protein, target: targetP, color: GOLD },
                { label: 'GLUC.', current: consumed.carbs, target: targetG, color: '#60A5FA' },
                { label: 'LIP.', current: consumed.fat, target: targetL, color: '#F87171' },
              ].map(({ label, current, target, color }) => {
                const pct = Math.min(100, Math.round((current / target) * 100))
                return (
                  <div key={label} style={{ textAlign: 'center' }}>
                    <div style={{ fontFamily: FONT_BODY, fontSize: 10, color: TEXT_MUTED, letterSpacing: '0.1em', marginBottom: 4 }}>{label}</div>
                    <div style={{ fontFamily: FONT_DISPLAY, fontSize: 18, color }}>{Math.round(current)}<span style={{ fontSize: 12, color: TEXT_MUTED }}>/{target}g</span></div>
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
                <div key={mealType} style={{ background: BG_CARD, border: `1px solid ${BORDER}`, marginBottom: 12, overflow: 'hidden' }}>
                  {/* Meal header */}
                  <div style={{ padding: '14px 16px', borderBottom: `1px solid ${BORDER}` }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <span style={{ fontSize: 16 }}>{EMOJIS[mealType] || '🍽'}</span>
                      <span style={{ fontFamily: FONT_DISPLAY, fontSize: 18, letterSpacing: '1px', color: TEXT_PRIMARY }}>{MEAL_LABELS[mealType]}</span>
                      <span style={{ fontFamily: FONT_DISPLAY, fontSize: 14, color: GOLD, marginLeft: 'auto' }}>{con.kcal} kcal</span>
                    </div>
                    {rec && (
                      <div style={{ fontFamily: FONT_BODY, fontSize: 11, color: TEXT_MUTED, fontStyle: 'italic' }}>
                        Recommandé : {rec.kcal} kcal · P:{Math.round(rec.protein)}g · G:{Math.round(rec.carbs)}g · L:{Math.round(rec.fat)}g
                      </div>
                    )}
                    {logs.length > 0 && (
                      <div style={{ fontFamily: FONT_BODY, fontSize: 11, color: con.kcal > (rec?.kcal || 9999) ? '#EF4444' : GOLD, marginTop: 2 }}>
                        Consommé : {con.kcal} kcal · P:{Math.round(con.protein)}g · G:{Math.round(con.carbs)}g · L:{Math.round(con.fat)}g
                      </div>
                    )}
                  </div>

                  {/* Daily food logs for this meal */}
                  <div style={{ padding: '0 16px' }}>
                    {logs.map(log => (
                      <div key={log.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: `1px solid ${BORDER}` }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontFamily: FONT_BODY, fontSize: 14, color: TEXT_PRIMARY }}>{log.custom_name || log.food_name || 'Aliment'}</div>
                          <div style={{ fontFamily: FONT_BODY, fontSize: 11, color: TEXT_MUTED }}>{log.quantity_g}g · P:{Math.round(log.protein || 0)}g G:{Math.round(log.carbs || 0)}g L:{Math.round(log.fat || 0)}g</div>
                        </div>
                        <span style={{ fontFamily: FONT_DISPLAY, fontSize: 14, color: GOLD, flexShrink: 0, marginRight: 8 }}>{Math.round(log.calories)} kcal</span>
                        <button onClick={() => deleteDailyLog(log.id)} style={{ width: 28, height: 28, background: 'rgba(239,68,68,0.08)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <Trash2 size={12} color="#EF4444" />
                        </button>
                      </div>
                    ))}

                    {logs.length === 0 && (
                      <div style={{ padding: '16px 0', textAlign: 'center' }}>
                        <span style={{ fontFamily: FONT_BODY, fontSize: 12, color: TEXT_DIM }}>Aucun aliment ajouté</span>
                      </div>
                    )}

                    {/* Action buttons */}
                    <div style={{ display: 'flex', gap: 8, padding: '8px 0 12px' }}>
                      {hasPlanFoods && logs.length === 0 && (
                        <button onClick={() => setImportingMeal(mealType)} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '10px', border: `1px solid ${GOLD_RULE}`, background: GOLD_DIM, cursor: 'pointer', fontFamily: FONT_BODY, fontSize: 11, color: GOLD }}>
                          🤖 Importer le plan IA
                        </button>
                      )}
                      <button onClick={() => setShowFoodSearch(mealType)} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '10px', border: `1px dashed ${BORDER}`, background: 'transparent', cursor: 'pointer', fontFamily: FONT_BODY, color: TEXT_MUTED, fontSize: 11 }}>
                        <Plus size={12} strokeWidth={2.5} /> Ajouter un aliment
                      </button>
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
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1100 }} onClick={() => setImportingMeal(null)} />
                <div onClick={e => e.stopPropagation()} style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 1200, background: BG_CARD, border: `1px solid ${BORDER}`, borderBottom: 'none', borderRadius: '20px 20px 0 0', padding: '24px 20px', paddingBottom: 'calc(env(safe-area-inset-bottom, 20px) + 24px)', maxHeight: '75vh', overflowY: 'auto' }}>
                  <div style={{ width: 40, height: 4, borderRadius: 2, background: GOLD_RULE, margin: '0 auto 16px' }} />
                  <h3 style={{ fontFamily: FONT_DISPLAY, fontSize: 22, letterSpacing: 2, color: TEXT_PRIMARY, margin: '0 0 4px' }}>IMPORTER LE PLAN IA</h3>
                  <p style={{ fontFamily: FONT_BODY, fontSize: 14, color: TEXT_MUTED, margin: '0 0 20px' }}>Ajouter les aliments recommandes pour {MEAL_LABELS[importingMeal]} ?</p>
                  {foods.map((f: any, i: number) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: i < foods.length - 1 ? `1px solid ${GOLD_DIM}` : 'none' }}>
                      <div>
                        <div style={{ fontFamily: FONT_BODY, fontSize: 14, color: TEXT_PRIMARY, fontWeight: 500 }}>{f.aliment}</div>
                        <div style={{ fontFamily: FONT_BODY, fontSize: 12, color: TEXT_MUTED }}>{f.quantite_g}g</div>
                      </div>
                      <span style={{ fontFamily: FONT_DISPLAY, fontSize: 16, color: GOLD, letterSpacing: 1 }}>{f.kcal} KCAL</span>
                    </div>
                  ))}
                  <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
                    <button onClick={() => setImportingMeal(null)} style={{ flex: 1, padding: 14, background: 'transparent', border: `1.5px solid ${GOLD_BORDER_STRONG}`, borderRadius: 12, color: GOLD, fontFamily: FONT_DISPLAY, fontSize: 16, letterSpacing: 2, cursor: 'pointer' }}>ANNULER</button>
                    <button onClick={() => importMealFromPlan(importingMeal)} style={{ flex: 1, padding: 14, border: 'none', background: 'linear-gradient(135deg, #E8C97A, #D4A843, #C9A84C, #8B6914)', borderRadius: 12, color: '#0D0B08', fontFamily: FONT_DISPLAY, fontSize: 16, letterSpacing: 2, cursor: 'pointer', boxShadow: '0 4px 20px rgba(212,168,67,0.2)' }}>IMPORTER</button>
                  </div>
                </div>
              )
            })()}

            {/* Shopping button */}
            {(activeMealPlan?.plan_data || coachMealPlan) && (
              <button onClick={() => setShowShoppingModal(true)} style={{
                width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                padding: '12px', border: `1px solid ${GOLD_RULE}`, background: GOLD_DIM, cursor: 'pointer',
                fontFamily: FONT_BODY, fontSize: 12, color: GOLD, marginBottom: 20,
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
            {[1,2,3,4].map(i => <div key={i} className="skeleton" style={{ height: 52, borderRadius: RADIUS_CARD }} />)}
          </div>
          {[1,2,3,4].map(i => <div key={i} className="skeleton" style={{ height: 100, borderRadius: RADIUS_CARD }} />)}
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
            <SlidersHorizontal size={18} color={GOLD} />
            <h2 style={{ fontFamily: FONT_ALT, fontSize: '1.1rem', fontWeight: 800, letterSpacing: '2px', textTransform: 'uppercase', color: TEXT_PRIMARY, margin: 0 }}>Preferences nutrition</h2>
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
    </div>
  )
}
