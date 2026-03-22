'use client'
import { useState } from 'react'
import { UtensilsCrossed, Sparkles } from 'lucide-react'
import NutritionPreferences from '../NutritionPreferences'
import {
  BG_BASE, BG_CARD, BORDER, ORANGE, GREEN, TEXT_PRIMARY, TEXT_MUTED, RADIUS_CARD,
  NUTRITION_DAYS, todayNutritionKey,
} from '../../../lib/design-tokens'

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

  return (
    <div style={{ padding: '20px 20px 20px', minHeight: '100vh', overflowX: 'hidden', maxWidth: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h1 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '1.6rem', fontWeight: 700, letterSpacing: '0.05em', margin: 0 }}>PLAN ALIMENTAIRE</h1>
      </div>

      {!coachMealPlan ? (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <Sparkles size={18} color="#C9A84C" />
            <h2 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '1.1rem', fontWeight: 700, color: TEXT_PRIMARY, margin: 0 }}>Personnalise ton plan</h2>
          </div>
          <p style={{ fontSize: '0.82rem', color: TEXT_MUTED, margin: '0 0 16px', lineHeight: 1.5 }}>Indique tes préférences pour que ton coach puisse créer un plan adapté.</p>
          <NutritionPreferences profile={profile} supabase={supabase} userId={userId} onSaved={fetchAll} />
        </div>
      ) : (
        <>
          {/* Macro targets */}
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

          {/* Day tabs */}
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

          {/* Selected day meals */}
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
                      {/* Meal header */}
                      <div style={{ padding: '14px 16px', borderBottom: `1px solid ${BORDER}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, color: TEXT_PRIMARY, fontSize: '1rem' }}>{meal.name}</span>
                        <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '0.85rem', fontWeight: 700, color: GREEN }}>{mealKcal} kcal</span>
                      </div>
                      {/* Macro bar */}
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
                      {/* Food items */}
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
      )}
    </div>
  )
}
