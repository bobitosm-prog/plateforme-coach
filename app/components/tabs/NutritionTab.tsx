'use client'
import { useEffect, useState } from 'react'
import { UtensilsCrossed, Sparkles, SlidersHorizontal } from 'lucide-react'
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

type SubTab = 'plan' | 'prefs'

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

  const hasPlan = !!coachMealPlan || !!activeMealPlan
  const [subTab, setSubTab] = useState<SubTab>(hasPlan ? 'plan' : 'prefs')

  useEffect(() => {
    fetchActiveMealPlan()
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
    if (data && !coachMealPlan) setSubTab('plan')
    setLoadingPlan(false)
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

        {/* Meals */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {Object.entries(dayData.repas || {}).map(([mealName, foods]: [string, any]) => {
            const foodList = Array.isArray(foods) ? foods : []
            const mealKcal = foodList.reduce((s: number, f: any) => s + (f.kcal || 0), 0)
            return (
              <div key={mealName} style={{ background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: RADIUS_CARD, overflow: 'hidden' }}>
                <div style={{ padding: '14px 16px', borderBottom: `1px solid ${BORDER}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, color: TEXT_PRIMARY, fontSize: '1rem' }}>
                    {MEAL_LABELS[mealName] || mealName.replace(/_/g, ' ')}
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
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {[
          { id: 'plan' as SubTab, label: 'Mon plan', icon: UtensilsCrossed },
          { id: 'prefs' as SubTab, label: 'Mes préférences', icon: SlidersHorizontal },
        ].map(({ id, label, icon: Icon }) => {
          const active = subTab === id
          return (
            <button key={id} onClick={() => setSubTab(id)} style={{
              flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              padding: '10px 12px', borderRadius: 10, border: 'none', cursor: 'pointer',
              fontFamily: "'Barlow Condensed', sans-serif", fontSize: '0.82rem', fontWeight: 700,
              letterSpacing: '0.04em', textTransform: 'uppercase',
              background: active ? (id === 'prefs' ? `${GOLD}20` : `${GREEN}20`) : BG_CARD,
              color: active ? (id === 'prefs' ? GOLD : GREEN) : TEXT_MUTED,
              transition: 'all 150ms',
            }}>
              <Icon size={15} strokeWidth={2.5} />
              {label}
            </button>
          )
        })}
      </div>

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
        <p style={{ textAlign: 'center', color: TEXT_MUTED, padding: '40px 0' }}>Chargement...</p>
      )}

      {subTab === 'plan' && !loadingPlan && !coachMealPlan && !activeMealPlan && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: '60px 0' }}>
          <UtensilsCrossed size={40} color={TEXT_MUTED} />
          <p style={{ fontSize: '0.95rem', color: TEXT_MUTED, textAlign: 'center', margin: 0 }}>Ton coach n'a pas encore créé ton plan alimentaire.</p>
          <button onClick={() => setSubTab('prefs')} style={{
            marginTop: 8, padding: '10px 20px', borderRadius: 10, border: `1.5px solid ${GOLD}`,
            background: 'transparent', color: GOLD, cursor: 'pointer',
            fontFamily: "'Barlow Condensed', sans-serif", fontSize: '0.82rem', fontWeight: 700,
            letterSpacing: '0.04em', textTransform: 'uppercase',
          }}>
            Configurer mes préférences
          </button>
        </div>
      )}

      {/* Show AI meal plan from meal_plans table (priority) */}
      {subTab === 'plan' && activeMealPlan && renderAiPlan(activeMealPlan)}

      {/* Show old-style coach meal plan if no AI plan */}
      {subTab === 'plan' && !activeMealPlan && coachMealPlan && renderCoachPlan()}
    </div>
  )
}
