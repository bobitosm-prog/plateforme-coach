import React from 'react'
import { Cookie, Moon, ShoppingCart, Sun, UtensilsCrossed } from 'lucide-react'

import { bodyStyle, colors, fonts, NUTRITION_DAYS, statSmallStyle, statStyle, subtitleStyle } from '@/lib/design-tokens'
import { computeDayTotals, parseMealPlan, type Day } from '@/lib/meal-plan'

interface Props {
  mode: 'personal' | 'coach'
  plan: object
  planData: unknown
  selectedDay: string
  todayKey: string
  locale: string
  labels: { kcal: string; protein: string; carbs: string; fat: string; noDay: string; noMeals: string; shopping: string; breakfast: string; lunch: string; snack: string; dinner: string }
  onSelectDay: (day: string) => void
  onShopping: () => void
}

const number = (value: unknown) => typeof value === 'number' && Number.isFinite(value) ? value : 0
const display = (primary: number, fallback: unknown, suffix = '') => primary > 0 ? `${primary}${suffix}` : number(fallback) > 0 ? `${number(fallback)}${suffix}` : '—'

export function NutritionPlanContent(props: Props) {
  const plan = props.plan as Record<string, unknown>
  const parsed = parseMealPlan(props.planData)
  const day = parsed[props.selectedDay as Day]
  if (props.mode === 'personal' && !day) return <div style={{ padding: 20, textAlign: 'center' }}><p style={{ ...bodyStyle, fontSize: '0.85rem', marginBottom: 12 }}>{props.labels.noDay}</p></div>
  const totals = day ? (day.totals ?? computeDayTotals(day)) : { kcal: 0, prot: 0, carb: 0, fat: 0 }
  const fallbacks = props.mode === 'personal' ? ['total_calories', 'protein_g', 'carbs_g', 'fat_g'] : ['calorie_target', 'protein_target', 'carb_target', 'fat_target']
  const values = [display(totals.kcal, plan[fallbacks[0]]), display(totals.prot, plan[fallbacks[1]], 'g'), display(totals.carb, plan[fallbacks[2]], 'g'), display(totals.fat, plan[fallbacks[3]], 'g')]
  const labels = [props.labels.kcal, props.labels.protein, props.labels.carbs, props.labels.fat]
  return <>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 16 }}>{labels.map((label, index) => <div key={label} style={{ background: colors.surface2, border: `1px solid ${colors.divider}`, borderRadius: 14, padding: 16, textAlign: 'center' }}><div style={{ ...statStyle, fontSize: 28, fontWeight: 400, color: colors.gold }}>{values[index]}</div><div style={{ ...subtitleStyle, fontSize: 11, letterSpacing: '2px', marginTop: 4 }}>{label}</div></div>)}</div>
    <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 4, marginBottom: 16, scrollbarWidth: 'none' }}>{NUTRITION_DAYS.map(({ key }) => { const selected = props.selectedDay === key; const isToday = props.todayKey === key; const planDay = parsed[key as Day]; const kcal = planDay ? (planDay.totals?.kcal ?? computeDayTotals(planDay).kcal) : 0; const label = new Date(2024, 0, ['lundi','mardi','mercredi','jeudi','vendredi','samedi','dimanche'].indexOf(key) + 1).toLocaleDateString(props.locale, { weekday: 'short' }).replace('.', '').toUpperCase(); return <button key={key} onClick={() => props.onSelectDay(key)} style={{ flexShrink: 0, padding: '8px 14px', borderRadius: 10, cursor: 'pointer', fontFamily: fonts.alt, fontSize: 9, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', background: selected ? 'rgba(230,195,100,0.15)' : 'rgba(255,255,255,0.06)', border: `1px solid ${selected ? colors.gold : isToday ? colors.goldRule : 'rgba(255,255,255,0.1)'}`, color: selected || isToday ? colors.gold : colors.textDim, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>{label}{kcal > 0 && <span style={{ fontSize: '0.55rem', opacity: 0.8 }}>{kcal}</span>}</button> })}</div>
    {props.mode === 'personal' && <button onClick={props.onShopping} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%', padding: '12px 16px', borderRadius: 12, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: colors.gold, marginBottom: 12 }}><ShoppingCart size={16} />{props.labels.shopping}</button>}
    {!day || day.meals.length === 0 ? <div style={{ background: colors.surface, border: `1px solid ${colors.goldBorder}`, borderRadius: 16, padding: '40px 20px', textAlign: 'center' }}><UtensilsCrossed size={28} color={colors.textMuted} /><p style={{ ...bodyStyle, fontSize: '0.85rem', margin: 0 }}>{props.labels.noMeals}</p></div> : <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>{day.meals.map((meal, index) => <MealCard key={`${meal.type}-${index}`} meal={meal} labels={props.labels} />)}</div>}
  </>
}

function MealCard({ meal, labels }: { meal: NonNullable<ReturnType<typeof parseMealPlan>[Day]>['meals'][number]; labels: Props['labels'] }) {
  const icons = { 'Petit-déjeuner': Sun, 'Déjeuner': UtensilsCrossed, 'Collation': Cookie, 'Dîner': Moon }
  const names = { 'Petit-déjeuner': labels.breakfast, 'Déjeuner': labels.lunch, 'Collation': labels.snack, 'Dîner': labels.dinner }
  const Icon = icons[meal.type]
  const totals = meal.foods.reduce((sum, food) => ({ kcal: sum.kcal + food.kcal, prot: sum.prot + food.prot, carb: sum.carb + food.carb, fat: sum.fat + food.fat }), { kcal: 0, prot: 0, carb: 0, fat: 0 })
  return <div style={{ background: colors.surface, border: `1px solid ${colors.goldBorder}`, borderRadius: 16, overflow: 'hidden' }}><div style={{ padding: '14px 16px', borderBottom: `1px solid ${colors.goldBorder}`, display: 'flex', alignItems: 'center', gap: 8 }}><Icon size={18} color={colors.gold} /><span style={{ ...statSmallStyle, color: colors.text, flex: 1 }}>{names[meal.type]}</span><span style={statSmallStyle}>{totals.kcal} kcal</span></div><div style={{ padding: '8px 16px', display: 'flex', gap: 12 }}>P {Math.round(totals.prot)}g · G {Math.round(totals.carb)}g · L {Math.round(totals.fat)}g</div>{meal.foods.map((food, index) => <div key={`${food.name}-${index}`} style={{ display: 'flex', padding: '10px 16px', borderTop: `1px solid ${colors.goldBorder}` }}><div style={{ flex: 1 }}><div>{food.name}</div>{food.qty > 0 && <div style={{ color: colors.textMuted }}>{food.qty}g</div>}</div><div>{food.kcal} kcal<div>P{food.prot} G{food.carb} L{food.fat}</div></div></div>)}</div>
}
