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
  BG_BASE, BG_CARD, BG_CARD_2, BORDER, ORANGE, GOLD, GOLD_DIM, GOLD_RULE, GREEN, TEXT_PRIMARY, TEXT_MUTED, TEXT_DIM, RADIUS_CARD,
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
  const today = new Date().toISOString().split('T')[0]

  const hasPlan = !!coachMealPlan || !!activeMealPlan
  const [subTab, setSubTab] = useState<SubTab>(hasPlan ? 'today' : 'prefs')

  useEffect(() => {
    fetchActiveMealPlan()
    fetchTodayTracking()
    fetchTodayMealLogs()
  }, [userId])

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
      .from('meal_logs')
      .select('*')
      .eq('user_id', userId)
      .eq('date', today)
      .order('created_at', { ascending: true })
      .limit(100)
    setMealLogs(data || [])
  }

  async function deleteMealLog(id: string) {
    await supabase.from('meal_logs').delete().eq('id', id)
    setMealLogs(prev => prev.filter(l => l.id !== id))
  }

  // Get meal_logs macros for today
  function getMealLogsMacros(): { kcal: number; protein: number; carbs: number; fat: number } {
    const result = { kcal: 0, protein: 0, carbs: 0, fat: 0 }
    for (const log of mealLogs) {
      result.kcal += log.calories || 0
      result.protein += log.proteines || 0
      result.carbs += log.glucides || 0
      result.fat += log.lipides || 0
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
      const dayData = activeMealPlan.plan_data[dayKey]
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
        <div className="animate-pulse-gold" style={{ fontSize: '3.5rem', marginBottom: 24 }}>⏳</div>
        <h2 style={{ fontFamily: FONT_ALT, fontSize: '1.3rem', fontWeight: 800, letterSpacing: '2px', textTransform: 'uppercase', color: TEXT_PRIMARY, margin: '0 0 10px' }}>Plan en cours de préparation</h2>
        <p style={{ fontFamily: FONT_BODY, fontSize: '0.82rem', color: TEXT_MUTED, margin: '0 0 24px', lineHeight: 1.6, maxWidth: 300 }}>
          Ton coach analyse ton profil et prépare ton plan alimentaire personnalisé.
        </p>
        <div className="animate-pulse-gold" style={{ padding: '8px 18px', borderRadius: 0, background: GOLD_DIM, border: `1px solid ${GOLD_RULE}`, marginBottom: 24 }}>
          <span style={{ fontFamily: FONT_ALT, fontSize: '0.75rem', fontWeight: 700, color: GOLD, letterSpacing: '2px', textTransform: 'uppercase' }}>En attente de validation du coach</span>
        </div>
        <div style={{ background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: RADIUS_CARD, padding: '14px 18px', width: '100%', maxWidth: 320, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[
            { icon: '✅', text: 'Profil complété', done: true },
            { icon: '✅', text: 'Préférences enregistrées', done: true },
            { icon: '⏳', text: 'Plan alimentaire — en attente', done: false },
          ].map(({ icon, text, done }) => (
            <div key={text} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: '1rem' }}>{icon}</span>
              <span style={{ fontSize: '0.82rem', color: done ? GREEN : GOLD, fontWeight: 500 }}>{text}</span>
            </div>
          ))}
        </div>
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
  function renderAiPlan(plan: any) {
    const planData = plan.plan_data
    if (!planData) return null

    const dayData = planData[nutritionDay]
    if (!dayData) return null

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
            const dayKcal = planData[key]?.total_kcal || 0
            return (
              <button key={key} onClick={() => setNutritionDay(key)} style={{
                flexShrink: 0, padding: '8px 14px', borderRadius: 0, border: 'none', cursor: 'pointer',
                fontFamily: FONT_ALT, fontSize: '0.82rem', fontWeight: 700,
                background: isActive ? GOLD : BG_CARD,
                color: isActive ? '#080808' : isToday ? GOLD : TEXT_MUTED,
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
                flexShrink: 0, padding: '8px 14px', borderRadius: 0, border: 'none', cursor: 'pointer',
                fontFamily: FONT_ALT, fontSize: '0.82rem', fontWeight: 700,
                background: isActive ? GOLD : BG_CARD,
                color: isActive ? '#080808' : isToday ? GOLD : TEXT_MUTED,
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
    <div style={{ padding: '20px 20px 20px', minHeight: '100vh', overflowX: 'hidden', maxWidth: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h1 style={{ fontFamily: FONT_DISPLAY, fontSize: 40, fontWeight: 400, letterSpacing: '2px', margin: 0, textTransform: 'uppercase', color: TEXT_PRIMARY }}>NUTRITION</h1>
      </div>
      <div style={{ height: 120, overflow: 'hidden', margin: '12px 0', position: 'relative' }}>
        <img src="/images/nutrition-hero.jpg" alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.4, filter: 'grayscale(60%)' }} />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, transparent 0%, #080808 100%)' }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        {coachMealPlan && (
          <button onClick={() => {
            const rows: (string | number)[][] = []
            const days = ['lundi','mardi','mercredi','jeudi','vendredi','samedi','dimanche']
            days.forEach(day => {
              const d = coachMealPlan[day]
              if (!d) return
              MEAL_ORDER.forEach(mt => {
                const foods = Array.isArray(d.repas?.[mt]) ? d.repas[mt] : []
                foods.forEach((f: any) => rows.push([day, MEAL_LABELS[mt] || mt, f.aliment || f.name || '', f.quantite_g || '', f.kcal || '', f.proteines || f.prot || '', f.glucides || f.carb || '', f.lipides || f.fat || '']))
              })
            })
            downloadCsv('plan-alimentaire.csv', ['Jour', 'Repas', 'Aliment', 'Quantité (g)', 'Kcal', 'Protéines (g)', 'Glucides (g)', 'Lipides (g)'], rows)
          }} style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'transparent', border: `1px solid ${BORDER}`, borderRadius: RADIUS_CARD, padding: '6px 10px', cursor: 'pointer', color: TEXT_MUTED, fontFamily: FONT_ALT, fontSize: '0.68rem', fontWeight: 600 }}>
            <Download size={12} /> Exporter
          </button>
        )}
      </div>

      {/* Sub-tabs — pills */}
      <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4, scrollbarWidth: 'none', msOverflowStyle: 'none' as any, marginBottom: 20 }}>
        {([
          { id: 'today' as SubTab, label: "Aujourd'hui", icon: List },
          { id: 'plan' as SubTab, label: 'Mon plan', icon: ClipboardList },
          { id: 'scanner' as SubTab, label: 'Scanner', icon: Camera },
          { id: 'prefs' as SubTab, label: 'Préférences', icon: SlidersHorizontal },
          { id: 'recipes' as SubTab, label: 'Recettes', icon: Star },
        ]).map(({ id, label, icon: Icon }) => {
          const active = subTab === id
          return (
            <button key={id} onClick={() => setSubTab(id)} style={{
              flexShrink: 0, display: 'flex', alignItems: 'center', gap: 7,
              padding: '8px 16px', borderRadius: 0, border: 'none',
              fontFamily: FONT_ALT, fontSize: '0.75rem', fontWeight: 700,
              letterSpacing: '0.04em', textTransform: 'uppercase',
              cursor: 'pointer', whiteSpace: 'nowrap' as any,
              transition: 'all 0.15s',
              background: active ? GOLD : BG_CARD,
              color: active ? '#080808' : TEXT_MUTED,
            }}>
              <Icon size={14} strokeWidth={2} />
              {label}
            </button>
          )
        })}
      </div>

      {/* Scanner sub-tab */}
      {subTab === 'scanner' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
          <button onClick={() => setShowScanner(true)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%', padding: '14px', borderRadius: 0, border: `1px solid ${GOLD_RULE}`, background: GOLD_DIM, cursor: 'pointer', transition: 'all 150ms' }}>
            <span style={{ fontSize: '1.1rem' }}>📷</span>
            <span style={{ fontFamily: FONT_ALT, fontSize: '0.82rem', fontWeight: 700, color: GOLD, letterSpacing: '0.04em', textTransform: 'uppercase' }}>Scanner un code-barres</span>
          </button>
          <button onClick={() => setShowFridgeScanner(true)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%', padding: '12px', borderRadius: 0, border: `1px solid ${BORDER}`, background: BG_CARD, cursor: 'pointer', transition: 'all 150ms' }}>
            <span style={{ fontSize: '0.95rem' }}>🛒</span>
            <span style={{ fontFamily: FONT_ALT, fontSize: '0.75rem', fontWeight: 700, color: TEXT_MUTED, letterSpacing: '0.04em', textTransform: 'uppercase' }}>Scanne ton frigo</span>
          </button>
        </div>
      )}

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

      {/* Today sub-tab — daily tracking */}
      {/* Food search modal */}
      {showFoodSearch && (
        <FoodSearch
          supabase={supabase}
          userId={userId}
          defaultMealType={showFoodSearch}
          onAdded={() => { setShowFoodSearch(null); fetchTodayMealLogs() }}
          onClose={() => setShowFoodSearch(null)}
        />
      )}

      {subTab === 'today' && (() => {
        const todayPlan = getTodayPlanData()
        if (!todayPlan) return renderWaitingScreen()
        const { planData: dayData, planId } = todayPlan
        const planMacros = getConsumedMacros(dayData)
        const logMacros = getMealLogsMacros()
        const consumed = {
          kcal: planMacros.kcal + logMacros.kcal,
          protein: planMacros.protein + logMacros.protein,
          carbs: planMacros.carbs + logMacros.carbs,
          fat: planMacros.fat + logMacros.fat,
        }
        const targetKcal = dayData.total_kcal || profile?.calorie_goal || 2000
        const targetP = dayData.total_protein || profile?.protein_goal || 140
        const targetG = dayData.total_carbs || profile?.carbs_goal || 200
        const targetL = dayData.total_fat || profile?.fat_goal || 60
        const pctKcal = Math.min(100, Math.round((consumed.kcal / targetKcal) * 100))

        const dayLabel = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })

        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* Date header */}
            <div style={{ fontFamily: FONT_ALT, fontSize: '0.75rem', fontWeight: 700, color: TEXT_MUTED, textTransform: 'uppercase', letterSpacing: '2px' }}>
              {dayLabel}
            </div>

            {/* Progress card */}
            <div style={{ background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: RADIUS_CARD, padding: 16 }}>
              {/* Calories bar */}
              <div style={{ marginBottom: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                    <span style={{ fontFamily: FONT_DISPLAY, fontSize: '3rem', color: GOLD }}>{consumed.kcal}</span>
                    <span style={{ fontFamily: FONT_ALT, fontSize: '0.85rem', fontWeight: 700, color: GOLD, letterSpacing: '0.05em', textTransform: 'uppercase', opacity: 0.7 }}>KCAL</span>
                  </div>
                  <span style={{ fontFamily: FONT_ALT, fontSize: '0.72rem', fontWeight: 700, color: TEXT_MUTED, letterSpacing: '0.08em', textTransform: 'uppercase' }}>OBJECTIF {targetKcal.toLocaleString('fr-FR')}</span>
                </div>
                <div style={{ background: BORDER, height: 2, overflow: 'hidden' }}>
                  <div style={{ height: '100%', background: GOLD, width: `${pctKcal}%`, transition: 'width 300ms ease' }} />
                </div>
              </div>
              {/* Macros */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1, background: BORDER, border: `1px solid ${BORDER}`, borderRadius: RADIUS_CARD, overflow: 'hidden' }}>
                {[
                  { label: 'Protéines', current: consumed.protein, target: targetP, color: GOLD },
                  { label: 'Glucides', current: consumed.carbs, target: targetG, color: '#60A5FA' },
                  { label: 'Lipides', current: consumed.fat, target: targetL, color: '#F97316' },
                ].map(({ label, current, target, color }) => {
                  const pct = Math.min(100, Math.round((current / target) * 100))
                  return (
                    <div key={label} style={{ background: BG_CARD, padding: '12px 10px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                        <span style={{ fontFamily: FONT_ALT, fontSize: 10, fontWeight: 700, color: TEXT_MUTED, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{label}</span>
                      </div>
                      <div style={{ fontFamily: FONT_DISPLAY, fontSize: 22, color, marginBottom: 4 }}>{current}g</div>
                      <div style={{ background: BORDER, height: 3, borderRadius: 2, overflow: 'hidden' }}>
                        <div style={{ height: '100%', background: color, width: `${pct}%`, transition: 'width 300ms ease', borderRadius: 2 }} />
                      </div>
                      <div style={{ fontFamily: FONT_BODY, fontSize: '0.55rem', color: TEXT_MUTED, textAlign: 'right', marginTop: 2 }}>/ {target}g</div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Meals with checkboxes */}
            {MEAL_ORDER.map(mealType => {
              const foods = Array.isArray(dayData.repas?.[mealType]) ? dayData.repas[mealType] : []
              if (foods.length === 0) return null
              const done = completedMeals.has(mealType)
              const mealKcal = foods.reduce((s: number, f: any) => s + (f.kcal || 0), 0)
              return (
                <div key={mealType} style={{ background: BG_CARD, border: `1px solid ${done ? `${GREEN}40` : BORDER}`, borderRadius: RADIUS_CARD, overflow: 'hidden', transition: 'border-color 200ms' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', borderBottom: `1px solid ${BORDER}` }}>
                    <button onClick={() => toggleMeal(mealType, planId)} style={{
                      width: 32, height: 32, borderRadius: RADIUS_CARD, border: 'none', cursor: 'pointer',
                      background: done ? GREEN : '#242424',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      transition: 'background 200ms',
                    }}>
                      <Check size={16} color={done ? '#000' : '#4B5563'} strokeWidth={3} />
                    </button>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 400, fontSize: 18, letterSpacing: '2px', textTransform: 'uppercase', color: done ? GREEN : TEXT_PRIMARY, textDecoration: done ? 'line-through' : 'none' }}>
                        {MEAL_LABELS[mealType]}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Clock size={10} color={TEXT_MUTED} />
                        <span style={{ fontFamily: FONT_BODY, fontSize: '0.65rem', color: TEXT_MUTED }}>{MEAL_TIMES[mealType]}</span>
                      </div>
                    </div>
                    <span style={{ fontFamily: FONT_DISPLAY, fontSize: '0.85rem', color: done ? GREEN : GOLD }}>{mealKcal} kcal</span>
                  </div>
                  <div style={{ padding: '0 14px' }}>
                    {/* Plan foods */}
                    {foods.map((food: any, fi: number) => (
                      <div key={fi} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderTop: fi > 0 ? `1px solid ${BORDER}` : 'none', opacity: done ? 0.5 : 1 }}>
                        <div>
                          <div style={{ fontFamily: FONT_BODY, fontSize: 14, fontWeight: 400, color: TEXT_PRIMARY }}>{food.aliment}</div>
                          <div style={{ fontFamily: FONT_BODY, fontSize: '0.62rem', color: TEXT_MUTED }}>{food.quantite_g}g</div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontFamily: FONT_DISPLAY, fontSize: '0.85rem', color: GOLD }}>{food.kcal} kcal</div>
                          <div style={{ fontFamily: FONT_BODY, fontSize: '0.58rem', color: TEXT_MUTED }}>P{food.proteines || 0} G{food.glucides || 0} L{food.lipides || 0}</div>
                        </div>
                      </div>
                    ))}
                    {/* Meal logs (manually added foods) */}
                    {mealLogs.filter(l => l.meal_type === mealType).map(log => (
                      <div key={log.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderTop: `1px solid ${BORDER}` }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontFamily: FONT_BODY, fontSize: 14, fontWeight: 500, color: GOLD }}>{log.food_name}</div>
                          <div style={{ fontFamily: FONT_BODY, fontSize: '0.62rem', color: TEXT_MUTED }}>{log.quantity_g}g</div>
                        </div>
                        <div style={{ textAlign: 'right', marginRight: 8 }}>
                          <div style={{ fontFamily: FONT_DISPLAY, fontSize: '0.68rem', color: GOLD }}>{Math.round(log.calories)} kcal</div>
                        </div>
                        <button onClick={() => deleteMealLog(log.id)} style={{ width: 28, height: 28, borderRadius: RADIUS_CARD, background: 'rgba(239,68,68,0.08)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Trash2 size={12} color="#EF4444" />
                        </button>
                      </div>
                    ))}
                    {/* Add food button */}
                    <button onClick={() => setShowFoodSearch(mealType)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, width: '100%', padding: '8px', margin: '4px 0 6px', borderRadius: RADIUS_CARD, border: `1px dashed ${BORDER}`, background: 'transparent', cursor: 'pointer', fontFamily: FONT_ALT, color: GOLD, fontSize: '0.72rem', fontWeight: 600 }}>
                      <Plus size={12} strokeWidth={2.5} /> Ajouter un aliment
                    </button>
                  </div>
                </div>
              )
            })}

            {/* Summary card */}
            <div style={{ background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: RADIUS_CARD, padding: '14px 16px', textAlign: 'center' }}>
              {pctKcal >= 95 ? (
                <span style={{ fontFamily: FONT_ALT, fontSize: '0.85rem', fontWeight: 700, color: GREEN }}>Objectif atteint !</span>
              ) : pctKcal < 50 ? (
                <span style={{ fontFamily: FONT_ALT, fontSize: '0.85rem', fontWeight: 700, color: GOLD }}>Pense à manger ! {consumed.kcal} / {targetKcal} kcal</span>
              ) : (
                <span style={{ fontFamily: FONT_BODY, fontSize: '0.85rem', fontWeight: 600, color: TEXT_MUTED }}>{consumed.kcal} kcal sur {targetKcal} kcal cibles</span>
              )}
            </div>
          </div>
        )
      })()}

      {/* Preferences sub-tab */}
      {subTab === 'prefs' && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <Sparkles size={18} color={GOLD} />
            <h2 style={{ fontFamily: FONT_ALT, fontSize: '1.1rem', fontWeight: 800, letterSpacing: '2px', textTransform: 'uppercase', color: TEXT_PRIMARY, margin: 0 }}>Personnalise ton plan</h2>
          </div>
          <p style={{ fontFamily: FONT_BODY, fontSize: '0.82rem', color: TEXT_MUTED, margin: '0 0 16px', lineHeight: 1.5 }}>Indique tes préférences pour que ton coach puisse créer un plan adapté.</p>
          <NutritionPreferences profile={profile} supabase={supabase} userId={userId} onSaved={fetchAll} />
        </div>
      )}

      {/* Plan sub-tab */}
      {subTab === 'plan' && loadingPlan && !coachMealPlan && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 1 }}>
            {[1,2,3,4].map(i => <div key={i} className="skeleton" style={{ height: 52, borderRadius: RADIUS_CARD }} />)}
          </div>
          {[1,2,3,4].map(i => <div key={i} className="skeleton" style={{ height: 100, borderRadius: RADIUS_CARD }} />)}
        </div>
      )}

      {subTab === 'plan' && !loadingPlan && !coachMealPlan && !activeMealPlan && renderWaitingScreen()}

      {/* Show AI meal plan from meal_plans table (priority) */}
      {subTab === 'plan' && activeMealPlan && renderAiPlan(activeMealPlan)}

      {/* Show old-style coach meal plan if no AI plan */}
      {subTab === 'plan' && !activeMealPlan && coachMealPlan && renderCoachPlan()}

      {/* Recipes sub-tab */}
      {subTab === 'recipes' && (
        <RecipesSection supabase={supabase} userId={userId} profile={profile} />
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
