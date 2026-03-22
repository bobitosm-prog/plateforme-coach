'use client'
import { useEffect, useState } from 'react'
import { UtensilsCrossed, Sparkles, SlidersHorizontal, ShoppingCart, ChevronDown, ChevronUp, Check, Clock } from 'lucide-react'
import NutritionPreferences from '../NutritionPreferences'
import {
  BG_BASE, BG_CARD, BORDER, ORANGE, GREEN, TEXT_PRIMARY, TEXT_MUTED, RADIUS_CARD,
  NUTRITION_DAYS, todayNutritionKey,
} from '../../../lib/design-tokens'

const GOLD = '#C9A84C'
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

type SubTab = 'today' | 'plan' | 'prefs'

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
  const today = new Date().toISOString().split('T')[0]

  const hasPlan = !!coachMealPlan || !!activeMealPlan
  const [subTab, setSubTab] = useState<SubTab>(hasPlan ? 'today' : 'prefs')

  useEffect(() => {
    fetchActiveMealPlan()
    fetchTodayTracking()
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
        <h2 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '1.3rem', fontWeight: 700, color: TEXT_PRIMARY, margin: '0 0 10px' }}>Plan en cours de préparation</h2>
        <p style={{ fontSize: '0.82rem', color: TEXT_MUTED, margin: '0 0 24px', lineHeight: 1.6, maxWidth: 300 }}>
          Ton coach analyse ton profil et prépare ton plan alimentaire personnalisé.
        </p>
        <div className="animate-pulse-gold" style={{ padding: '8px 18px', borderRadius: 999, background: `${GOLD}12`, border: `1px solid ${GOLD}30`, marginBottom: 24 }}>
          <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '0.75rem', fontWeight: 700, color: GOLD, letterSpacing: '0.05em', textTransform: 'uppercase' }}>En attente de validation du coach</span>
        </div>
        <div style={{ background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: 14, padding: '14px 18px', width: '100%', maxWidth: 320, display: 'flex', flexDirection: 'column', gap: 10 }}>
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
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 16 }}>
          {[
            { label: 'Kcal', value: String(dayData.total_kcal || plan.total_calories || '—'), color: '#EF4444' },
            { label: 'Prot', value: `${dayData.total_protein || plan.protein_g || '—'}g`, color: '#3B82F6' },
            { label: 'Gluc', value: `${dayData.total_carbs || plan.carbs_g || '—'}g`, color: '#F59E0B' },
            { label: 'Lip', value: `${dayData.total_fat || plan.fat_g || '—'}g`, color: '#22C55E' },
          ].map(({ label, value, color }) => (
            <div key={label} style={{ background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: '12px 8px', textAlign: 'center' }}>
              <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '1.15rem', fontWeight: 700, color }}>{value}</div>
              <div style={{ fontSize: '0.6rem', color: TEXT_MUTED, textTransform: 'uppercase', fontWeight: 700, marginTop: 2 }}>{label}</div>
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
                flexShrink: 0, padding: '8px 14px', borderRadius: 10, border: 'none', cursor: 'pointer',
                fontFamily: "'Barlow Condensed', sans-serif", fontSize: '0.82rem', fontWeight: 700,
                background: isActive ? GREEN : BG_CARD,
                color: isActive ? '#000' : isToday ? GREEN : TEXT_MUTED,
                outline: isToday && !isActive ? `2px solid ${GREEN}` : 'none',
              }}>
                {label}
                {dayKcal > 0 && <span style={{ display: 'block', fontSize: '0.55rem', fontWeight: 700, opacity: 0.8 }}>{dayKcal}</span>}
              </button>
            )
          })}
        </div>

        {/* Shopping list button + panel */}
        <button onClick={() => setShowShoppingList(v => !v)} style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%',
          padding: '10px 16px', borderRadius: 12, border: `1.5px solid ${BORDER}`, cursor: 'pointer',
          background: showShoppingList ? `${GOLD}15` : BG_CARD,
          fontFamily: "'Barlow Condensed', sans-serif", fontSize: '0.82rem', fontWeight: 700,
          color: showShoppingList ? GOLD : TEXT_MUTED, marginBottom: 12, transition: 'all 150ms',
        }}>
          <ShoppingCart size={15} strokeWidth={2.5} />
          Liste de courses (semaine)
          {showShoppingList ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>

        {showShoppingList && (() => {
          const items = generateShoppingList(planData)
          return (
            <div style={{ background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: RADIUS_CARD, padding: '12px 16px', marginBottom: 12 }}>
              <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '0.72rem', fontWeight: 700, color: GOLD, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
                {items.length} aliments pour la semaine
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {items.map(({ name, totalG }) => (
                  <div key={name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 0', borderBottom: `1px solid ${BORDER}` }}>
                    <span style={{ fontSize: '0.82rem', color: TEXT_PRIMARY }}>{name}</span>
                    <span style={{ fontSize: '0.75rem', color: TEXT_MUTED, fontWeight: 600, flexShrink: 0, marginLeft: 8 }}>{totalG}g</span>
                  </div>
                ))}
              </div>
            </div>
          )
        })()}

        {/* Meals */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {MEAL_ORDER.map(mealType => {
            const foodList = Array.isArray(dayData.repas?.[mealType]) ? dayData.repas[mealType] : []
            if (foodList.length === 0) return null
            const mealKcal = foodList.reduce((s: number, f: any) => s + (f.kcal || 0), 0)
            return (
              <div key={mealType} style={{ background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: RADIUS_CARD, overflow: 'hidden' }}>
                <div style={{ padding: '14px 16px', borderBottom: `1px solid ${BORDER}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, color: TEXT_PRIMARY, fontSize: '1rem' }}>
                    {MEAL_LABELS[mealType]}
                  </span>
                  <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '0.85rem', fontWeight: 700, color: GREEN }}>{mealKcal} kcal</span>
                </div>
                <div style={{ padding: '8px 16px', borderBottom: `1px solid ${BORDER}`, display: 'flex', gap: 12 }}>
                  {[
                    { l: 'P', v: foodList.reduce((s: number, f: any) => s + (f.proteines || 0), 0), c: '#3B82F6' },
                    { l: 'G', v: foodList.reduce((s: number, f: any) => s + (f.glucides || 0), 0), c: '#F59E0B' },
                    { l: 'L', v: foodList.reduce((s: number, f: any) => s + (f.lipides || 0), 0), c: '#EF4444' },
                  ].map(({ l, v, c }) => (
                    <span key={l} style={{ fontSize: '0.72rem', fontWeight: 700, color: TEXT_MUTED }}>
                      <span style={{ color: c }}>{l}</span> {Math.round(v)}g
                    </span>
                  ))}
                </div>
                <div>
                  {foodList.map((food: any, fi: number) => (
                    <div key={fi} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px', borderTop: fi > 0 ? `1px solid ${BORDER}` : 'none' }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '0.85rem', color: TEXT_PRIMARY, fontWeight: 500 }}>{food.aliment}</div>
                        <div style={{ fontSize: '0.65rem', color: TEXT_MUTED, marginTop: 2 }}>{food.quantite_g}g</div>
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '0.85rem', fontWeight: 700, color: TEXT_MUTED }}>{food.kcal || 0} kcal</div>
                        <div style={{ fontSize: '0.6rem', color: TEXT_MUTED }}>P{food.proteines || 0} G{food.glucides || 0} L{food.lipides || 0}</div>
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
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 16 }}>
          {[
            { label: 'Kcal', value: String(coachMealPlan.calorie_target || '—'), color: ORANGE },
            { label: 'Prot', value: coachMealPlan.protein_target ? `${coachMealPlan.protein_target}g` : '—', color: '#3B82F6' },
            { label: 'Gluc', value: coachMealPlan.carb_target ? `${coachMealPlan.carb_target}g` : '—', color: '#F59E0B' },
            { label: 'Lip', value: coachMealPlan.fat_target ? `${coachMealPlan.fat_target}g` : '—', color: '#EF4444' },
          ].map(({ label, value, color }) => (
            <div key={label} style={{ background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: '12px 8px', textAlign: 'center' }}>
              <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '1.15rem', fontWeight: 700, color }}>{value}</div>
              <div style={{ fontSize: '0.6rem', color: TEXT_MUTED, textTransform: 'uppercase', fontWeight: 700, marginTop: 2 }}>{label}</div>
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
                flexShrink: 0, padding: '8px 14px', borderRadius: 10, border: 'none', cursor: 'pointer',
                fontFamily: "'Barlow Condensed', sans-serif", fontSize: '0.82rem', fontWeight: 700,
                background: isActive ? GREEN : BG_CARD,
                color: isActive ? '#000' : isToday ? GREEN : TEXT_MUTED,
                outline: isToday && !isActive ? `2px solid ${GREEN}` : 'none',
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
              <p style={{ fontSize: '0.85rem', color: TEXT_MUTED, margin: 0 }}>Aucun repas pour ce jour.</p>
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
                      <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, color: TEXT_PRIMARY, fontSize: '1rem' }}>{meal.name}</span>
                      <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '0.85rem', fontWeight: 700, color: GREEN }}>{mealKcal} kcal</span>
                    </div>
                    <div style={{ padding: '8px 16px', borderBottom: `1px solid ${BORDER}`, display: 'flex', gap: 12 }}>
                      {[
                        { label: 'P', value: `${Math.round(mealProt)}g`, color: '#3B82F6' },
                        { label: 'G', value: `${Math.round(mealCarb)}g`, color: '#F59E0B' },
                        { label: 'L', value: `${Math.round(mealFat)}g`, color: '#EF4444' },
                      ].map(({ label, value, color }) => (
                        <span key={label} style={{ fontSize: '0.72rem', fontWeight: 700, color: TEXT_MUTED }}>
                          <span style={{ color }}>{label}</span> {value}
                        </span>
                      ))}
                    </div>
                    <div>
                      {(meal.foods || []).map((food: any, fi: number) => (
                        <div key={fi} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px', borderTop: fi > 0 ? `1px solid ${BORDER}` : 'none' }}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: '0.85rem', color: TEXT_PRIMARY, fontWeight: 500 }}>{food.name}</div>
                            {food.qty && <div style={{ fontSize: '0.65rem', color: TEXT_MUTED, marginTop: 2 }}>{food.qty}</div>}
                          </div>
                          <div style={{ textAlign: 'right', flexShrink: 0 }}>
                            <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '0.85rem', fontWeight: 700, color: TEXT_MUTED }}>{food.kcal || 0} kcal</div>
                            {(food.prot || food.carb || food.fat) ? (
                              <div style={{ fontSize: '0.6rem', color: TEXT_MUTED }}>P{food.prot || 0} G{food.carb || 0} L{food.fat || 0}</div>
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
        <h1 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '1.6rem', fontWeight: 700, letterSpacing: '0.05em', margin: 0 }}>NUTRITION</h1>
      </div>

      {/* Sub-tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 20 }}>
        {[
          { id: 'today' as SubTab, label: "Aujourd'hui", icon: Check, color: GOLD },
          { id: 'plan' as SubTab, label: 'Mon plan', icon: UtensilsCrossed, color: GREEN },
          { id: 'prefs' as SubTab, label: 'Préférences', icon: SlidersHorizontal, color: GOLD },
        ].map(({ id, label, icon: Icon, color }) => {
          const active = subTab === id
          return (
            <button key={id} onClick={() => setSubTab(id)} style={{
              flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
              padding: '10px 8px', borderRadius: 10, border: 'none', cursor: 'pointer',
              fontFamily: "'Barlow Condensed', sans-serif", fontSize: '0.72rem', fontWeight: 700,
              letterSpacing: '0.04em', textTransform: 'uppercase',
              background: active ? `${color}20` : BG_CARD,
              color: active ? color : TEXT_MUTED,
              transition: 'all 150ms',
            }}>
              <Icon size={14} strokeWidth={2.5} />
              {label}
            </button>
          )
        })}
      </div>

      {/* Today sub-tab — daily tracking */}
      {subTab === 'today' && (() => {
        const todayPlan = getTodayPlanData()
        if (!todayPlan) return renderWaitingScreen()
        const { planData: dayData, planId } = todayPlan
        const consumed = getConsumedMacros(dayData)
        const targetKcal = dayData.total_kcal || profile?.calorie_goal || 2000
        const targetP = dayData.total_protein || profile?.protein_goal || 140
        const targetG = dayData.total_carbs || profile?.carbs_goal || 200
        const targetL = dayData.total_fat || profile?.fat_goal || 60
        const pctKcal = Math.min(100, Math.round((consumed.kcal / targetKcal) * 100))

        const dayLabel = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })

        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* Date header */}
            <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '0.75rem', fontWeight: 700, color: TEXT_MUTED, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              {dayLabel}
            </div>

            {/* Progress card */}
            <div style={{ background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: 16, padding: 16 }}>
              {/* Calories bar */}
              <div style={{ marginBottom: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
                  <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '1.3rem', fontWeight: 700, color: GOLD }}>{consumed.kcal}</span>
                  <span style={{ fontSize: '0.7rem', color: TEXT_MUTED }}>/ {targetKcal} kcal</span>
                </div>
                <div style={{ background: '#242424', borderRadius: 999, height: 8, overflow: 'hidden' }}>
                  <div style={{ height: '100%', borderRadius: 999, background: `linear-gradient(90deg, ${GOLD}, #D4AF37)`, width: `${pctKcal}%`, transition: 'width 300ms ease' }} />
                </div>
              </div>
              {/* Macros */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                {[
                  { label: 'Protéines', current: consumed.protein, target: targetP, color: '#3B82F6' },
                  { label: 'Glucides', current: consumed.carbs, target: targetG, color: '#22C55E' },
                  { label: 'Lipides', current: consumed.fat, target: targetL, color: '#F97316' },
                ].map(({ label, current, target, color }) => {
                  const pct = Math.min(100, Math.round((current / target) * 100))
                  return (
                    <div key={label}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                        <span style={{ fontSize: '0.6rem', fontWeight: 700, color: TEXT_MUTED, textTransform: 'uppercase' }}>{label}</span>
                        <span style={{ fontSize: '0.65rem', fontWeight: 700, color }}>{current}g</span>
                      </div>
                      <div style={{ background: '#242424', borderRadius: 999, height: 5, overflow: 'hidden' }}>
                        <div style={{ height: '100%', borderRadius: 999, background: color, width: `${pct}%`, transition: 'width 300ms ease' }} />
                      </div>
                      <div style={{ fontSize: '0.55rem', color: TEXT_MUTED, textAlign: 'right', marginTop: 2 }}>/ {target}g</div>
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
                <div key={mealType} style={{ background: BG_CARD, border: `1px solid ${done ? `${GREEN}40` : BORDER}`, borderRadius: 16, overflow: 'hidden', transition: 'border-color 200ms' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', borderBottom: `1px solid ${BORDER}` }}>
                    <button onClick={() => toggleMeal(mealType, planId)} style={{
                      width: 32, height: 32, borderRadius: 10, border: 'none', cursor: 'pointer',
                      background: done ? GREEN : '#242424',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      transition: 'background 200ms',
                    }}>
                      <Check size={16} color={done ? '#000' : '#4B5563'} strokeWidth={3} />
                    </button>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, color: done ? GREEN : TEXT_PRIMARY, fontSize: '0.92rem', textDecoration: done ? 'line-through' : 'none' }}>
                        {MEAL_LABELS[mealType]}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Clock size={10} color={TEXT_MUTED} />
                        <span style={{ fontSize: '0.65rem', color: TEXT_MUTED }}>{MEAL_TIMES[mealType]}</span>
                      </div>
                    </div>
                    <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '0.85rem', fontWeight: 700, color: done ? GREEN : TEXT_MUTED }}>{mealKcal} kcal</span>
                  </div>
                  <div style={{ padding: '0 14px' }}>
                    {foods.map((food: any, fi: number) => (
                      <div key={fi} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderTop: fi > 0 ? `1px solid ${BORDER}` : 'none', opacity: done ? 0.5 : 1 }}>
                        <div>
                          <div style={{ fontSize: '0.82rem', color: TEXT_PRIMARY, fontWeight: 500 }}>{food.aliment}</div>
                          <div style={{ fontSize: '0.62rem', color: TEXT_MUTED }}>{food.quantite_g}g</div>
                        </div>
                        <div style={{ fontSize: '0.68rem', color: TEXT_MUTED, textAlign: 'right' }}>
                          <div>{food.kcal} kcal</div>
                          <div style={{ fontSize: '0.58rem' }}>P{food.proteines || 0} G{food.glucides || 0} L{food.lipides || 0}</div>
                        </div>
                      </div>
                    ))}
                    <div style={{ height: 6 }} />
                  </div>
                </div>
              )
            })}

            {/* Summary card */}
            <div style={{ background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: 14, padding: '14px 16px', textAlign: 'center' }}>
              {pctKcal >= 95 ? (
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: GREEN }}>Objectif atteint !</span>
              ) : pctKcal < 50 ? (
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: ORANGE }}>Pense à manger ! {consumed.kcal} / {targetKcal} kcal</span>
              ) : (
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: TEXT_MUTED }}>{consumed.kcal} kcal sur {targetKcal} kcal cibles</span>
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
            <h2 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '1.1rem', fontWeight: 700, color: TEXT_PRIMARY, margin: 0 }}>Personnalise ton plan</h2>
          </div>
          <p style={{ fontSize: '0.82rem', color: TEXT_MUTED, margin: '0 0 16px', lineHeight: 1.5 }}>Indique tes préférences pour que ton coach puisse créer un plan adapté.</p>
          <NutritionPreferences profile={profile} supabase={supabase} userId={userId} onSaved={fetchAll} />
        </div>
      )}

      {/* Plan sub-tab */}
      {subTab === 'plan' && loadingPlan && !coachMealPlan && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
            {[1,2,3,4].map(i => <div key={i} className="skeleton" style={{ height: 52, borderRadius: 12 }} />)}
          </div>
          {[1,2,3,4].map(i => <div key={i} className="skeleton" style={{ height: 100, borderRadius: 16 }} />)}
        </div>
      )}

      {subTab === 'plan' && !loadingPlan && !coachMealPlan && !activeMealPlan && renderWaitingScreen()}

      {/* Show AI meal plan from meal_plans table (priority) */}
      {subTab === 'plan' && activeMealPlan && renderAiPlan(activeMealPlan)}

      {/* Show old-style coach meal plan if no AI plan */}
      {subTab === 'plan' && !activeMealPlan && coachMealPlan && renderCoachPlan()}
    </div>
  )
}
