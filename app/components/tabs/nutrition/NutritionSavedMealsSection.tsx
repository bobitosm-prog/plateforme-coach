import { Pencil, Trash2 } from 'lucide-react'

import { bodyStyle, cardStyle, colors, fonts, mutedStyle } from '@/lib/design-tokens'
import SectionTitle from '@/app/components/ui/SectionTitle'

export interface NutritionSavedMealFood { calories?: number; protein?: number; carbs?: number; fat?: number }
export interface NutritionSavedMealView { id: string; name?: string | null; meal_type?: string | null; foods?: NutritionSavedMealFood[] | null; created_at?: string | null }

interface NutritionSavedMealsSectionProps {
  meals: NutritionSavedMealView[]
  search: string
  filter: string
  locale: string
  labels: { title: string; search: string; all: string; breakfast: string; lunch: string; dinner: string; snack: string; empty: string; create: string }
  mealLabels: Record<string, string>
  confirmDeleteId: string | null
  onSearchChange: (value: string) => void
  onFilterChange: (value: string) => void
  onEdit: (meal: NutritionSavedMealView) => void
  onAskDelete: (id: string) => void
  onDelete: (id: string) => void
  onCreate: () => void
}

export function NutritionSavedMealsSection(props: NutritionSavedMealsSectionProps) {
  const filtered = props.meals.filter(meal => {
    if (props.filter !== 'all' && meal.meal_type !== props.filter) return false
    return !props.search || meal.name?.toLowerCase().includes(props.search.toLowerCase())
  })
  const filters = [{ key: 'all', label: props.labels.all }, { key: 'petit_dejeuner', label: props.labels.breakfast }, { key: 'dejeuner', label: props.labels.lunch }, { key: 'diner', label: props.labels.dinner }, { key: 'collation', label: props.labels.snack }]
  return <div style={{ padding: '0 20px', paddingBottom: 'calc(160px + env(safe-area-inset-bottom, 0px))' }}>
    <SectionTitle noPadding title={props.labels.title} />
    <div style={{ ...cardStyle, padding: 16 }}>
      <input value={props.search} onChange={event => props.onSearchChange(event.target.value)} placeholder={props.labels.search} style={{ width: '100%', background: colors.background, border: `1px solid ${colors.goldBorder}`, borderRadius: 12, padding: '10px 14px', color: colors.text, fontFamily: fonts.body, fontSize: 13, outline: 'none', marginBottom: 12 }} />
      <div style={{ display: 'flex', gap: 6, marginBottom: 16, overflowX: 'auto', scrollbarWidth: 'none' }}>{filters.map(item => <button key={item.key} onClick={() => props.onFilterChange(item.key)} style={{ fontSize: 9, fontFamily: fonts.alt, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.18em', padding: '8px 14px', borderRadius: 10, whiteSpace: 'nowrap', cursor: 'pointer', background: props.filter === item.key ? 'rgba(230,195,100,0.15)' : 'rgba(255,255,255,0.06)', border: `1px solid ${props.filter === item.key ? colors.gold : 'rgba(255,255,255,0.1)'}`, color: props.filter === item.key ? colors.gold : colors.textDim }}>{item.label}</button>)}</div>
      {filtered.length ? <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>{filtered.map(meal => {
        const foods = meal.foods ?? []
        const sum = (field: keyof NutritionSavedMealFood) => foods.reduce((total, food) => total + (food[field] ?? 0), 0)
        return <div key={meal.id} style={{ background: colors.surfaceHigh, border: `1px solid ${colors.goldBorder}`, borderRadius: 12, padding: 12 }}><div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}><div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 13, fontWeight: 700, color: colors.text, fontFamily: fonts.body }}>{meal.name || 'Repas sans nom'}</div>{meal.meal_type && <span style={{ fontSize: 9, fontFamily: fonts.body, fontWeight: 700, color: colors.gold, background: colors.goldDim, padding: '1px 6px', borderRadius: 999, textTransform: 'uppercase' }}>{props.mealLabels[meal.meal_type] || meal.meal_type}</span>}<div style={{ ...bodyStyle, marginTop: 4, fontSize: 11 }}>{Math.round(sum('calories'))} kcal · {Math.round(sum('protein'))}g P · {Math.round(sum('carbs'))}g G · {Math.round(sum('fat'))}g L</div><div style={{ ...mutedStyle, marginTop: 2 }}>{meal.created_at ? new Date(meal.created_at).toLocaleDateString(props.locale) : ''}</div></div><div style={{ display: 'flex', gap: 6 }}>{<button onClick={() => props.onEdit(meal)} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, width: 32, height: 32, cursor: 'pointer' }}><Pencil size={14} color={colors.textMuted} /></button>}{props.confirmDeleteId === meal.id ? <button onClick={() => props.onDelete(meal.id)} style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '4px 8px', cursor: 'pointer', fontSize: 10, color: colors.error, fontWeight: 700 }}>CONFIRMER</button> : <button onClick={() => props.onAskDelete(meal.id)} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, width: 32, height: 32, cursor: 'pointer' }}><Trash2 size={14} color={colors.error} /></button>}</div></div></div>
      })}</div> : <div style={{ ...bodyStyle, textAlign: 'center', padding: '24px 16px', fontStyle: 'italic', lineHeight: 1.6 }}>{props.labels.empty}</div>}
      <button onClick={props.onCreate} style={{ width: '100%', marginTop: 16, padding: '14px 0', background: `linear-gradient(135deg, ${colors.gold}, ${colors.goldContainer})`, color: colors.onGold, fontFamily: fonts.headline, fontWeight: 700, borderRadius: 12, border: 'none', cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.12em', fontSize: 13 }}>{props.labels.create}</button>
    </div>
  </div>
}
